// @name        猫眼看书⓪ (Tauri版)
// @version     1.0.4
// @author      Adapted for Tauri
// @url         http://download.maoyankanshu.la
// @type        novel
// @enabled     true
// @tags        API, 加密
// @description 基于猫眼看书API的书源（固定域名稳定版）

var BASE = 'http://download.maoyankanshu.la';

// ---------- 固定配置（无需动态探测） ----------
var ACTIVE_CONFIG = {
    host: 'http://api.sxwlyhzp.com',
    aesKey: 'f041c49714d39908',
    headers: {
        "client-version": "2.3.0",
        "client-brand": "HONOR",
        "client-source": "android",
        "client-name": "app.maoyankanshu.novel",
        "User-Agent": "okhttp/4.9.2",
        // 固定签名：MD5("f041c49714d39908") = "f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3" (请替换为真实值)
        "client-device": "f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3",
        "Authorization": "bearereyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9hcGkubXl3ZWlwaW4uY29tXC9hdXRoXC90aGlyZCIsImlhdCI6MTcwNjg0NjM2NiwiZXhwIjoxODAwMTU4MzY2LCJuYmYiOjE3MDY4NDYzNjYsImp0aSI6IjRVbU5BZVpHQ1hvaGNpSEgiLCJzdWIiOjc3MDg5OSwicHJ2IjoiYTFjYjAzNzE4MDI5NmM2YTE5MzhlZjMwYjQzNzk0NjcyZGQwMTZjNSJ9.lOpKG-vWne5Ub8g6byvF53iQjldPUC1-BMoO-OuhOlA"
    }
};

// ---------- 工具函数 ----------

/**
 * 直接返回固定配置，不再探测
 */
async function getActiveHostConfig() {
    legado.log('[配置] 使用固定域名: ' + ACTIVE_CONFIG.host);
    return ACTIVE_CONFIG;
}

/**
 * 标准 API 请求，返回 data.data
 */
async function apiRequest(path) {
    var config = await getActiveHostConfig();
    var url = config.host + path;
    legado.log('[API请求] ' + url);
    var response = await legado.http.get(url, config.headers);
    var data = JSON.parse(response);
    if (data.code !== 200) {
        throw new Error('API 返回错误码: ' + data.code + ', 消息: ' + (data.msg || ''));
    }
    return data.data;
}

function encodeChapterPath(encryptedPath) {
    return 'maoyan://chapter?path=' + encodeURIComponent(encryptedPath);
}

// ---------- 核心函数 ----------

async function search(keyword, page) {
    page = page || 1;
    legado.log('[搜索] 关键词: ' + keyword + ', 页码: ' + page);
    
    var path = '/search?keyword=' + encodeURIComponent(keyword) + '&page=' + page;
    var data = await apiRequest(path);
    
    if (!data || data.length === 0) return [];
    
    return data.map(function(item) {
        return {
            name: item.novelName,
            author: item.authorName,
            bookUrl: '/novel/' + item.novelId,
            coverUrl: item.cover,
            kind: item.className || '',
            lastChapter: item.lastChapter ? item.lastChapter.chapterName : ''
        };
    });
}

async function bookInfo(bookUrl) {
    legado.log('[详情] URL: ' + bookUrl);
    var data = await apiRequest(bookUrl);
    
    return {
        name: data.novelName,
        author: data.authorName,
        coverUrl: data.cover,
        intro: data.summary || '',
        kind: (data.className || '') + ' ' + (data.isComplete ? '已完结' : '连载中'),
        lastChapter: data.lastChapter ? data.lastChapter.chapterName : '',
        tocUrl: bookUrl + '/chapters'
    };
}

async function chapterList(tocUrl) {
    legado.log('[目录] URL: ' + tocUrl);
    var data = await apiRequest(tocUrl);
    
    if (!data.list || data.list.length === 0) return [];
    
    return data.list.map(function(item) {
        return {
            name: item.chapterName,
            url: encodeChapterPath(item.path)
        };
    });
}

async function chapterContent(chapterUrl) {
    legado.log('[正文] 开始处理 URL: ' + chapterUrl);
    
    // 解析加密路径
    var match = chapterUrl.match(/path=([^&]+)/);
    if (!match || !match[1]) {
        legado.log('[正文] 错误: 无法从URL中提取path参数');
        throw new Error('无效的章节URL');
    }
    var encryptedPath = decodeURIComponent(match[1]);
    legado.log('[正文] 提取的加密路径: ' + encryptedPath.substring(0, 30) + '...');
    
    var config = await getActiveHostConfig();
    legado.log('[正文] 使用域名: ' + config.host + ', AES密钥: ' + config.aesKey);
    
    // AES 解密（尝试可能的 API）
    var decrypted;
    if (typeof legado.crypto !== 'undefined' && typeof legado.crypto.aesDecrypt === 'function') {
        decrypted = await legado.crypto.aesDecrypt(encryptedPath, config.aesKey, '0123456789abcdef', 'CBC');
    } else if (typeof legado.aesDecrypt === 'function') {
        decrypted = await legado.aesDecrypt(encryptedPath, config.aesKey, '0123456789abcdef', 'CBC');
    } else {
        throw new Error('未找到可用的 AES 解密函数');
    }
    
    if (!decrypted) {
        legado.log('[正文] 错误: 解密后内容为空');
        throw new Error('解密后内容为空');
    }
    legado.log('[正文] 解密结果: ' + decrypted.substring(0, 100));
    
    var pathMatch = decrypted.match(/http:\/\/api\..+?\.com(.+)/);
    var requestPath = pathMatch ? pathMatch[1] : decrypted;
    
    var contentUrl = config.host + requestPath;
    legado.log('[正文] 请求内容URL: ' + contentUrl);
    
    var response = await legado.http.get(contentUrl, config.headers);
    var json = JSON.parse(response);
    var content = json.content || '';
    content = content.replace(/本章未完|加入书签|章节报错|请收藏|最快更新|天才一秒记住/g, '');
    return content.trim();
}

async function explore(page, category) {
    legado.log('[发现] 分类: ' + category + ', 页码: ' + page);
    
    var categoryMap = {
        '玄幻': 'lejRej', '武侠': 'nel5aK', '都市': 'mbk5ez', '仙侠': 'vbmOeY',
        '军事': 'penRe7', '历史': 'xbojag', '游戏': 'mep2bM', '科幻': 'zbq2dp', '轻小说': 'YerEdO',
        '现代言情': '9avmeG', '古代言情': 'DdwRb1', '幻想言情': '7ax9by',
        '青春校园': 'Pdy7aQ', '唯美纯爱': 'kazYeJ', '同人衍生': '9aAOdv'
    };
    
    if (category === 'GETALL' || !category) {
        return Object.keys(categoryMap);
    }
    
    var categoryId = categoryMap[category];
    if (!categoryId) {
        legado.log('[发现] 未知分类: ' + category);
        return [];
    }
    
    var path = '/novel?sort=1&categoryId=' + categoryId + '&page=' + page;
    legado.log('[发现] 请求路径: ' + path);
    
    try {
        var data = await apiRequest(path);
        if (!data || data.length === 0) return [];
        
        return data.map(function(item) {
            return {
                name: item.novelName,
                author: item.authorName,
                bookUrl: '/novel/' + item.novelId,
                coverUrl: item.cover,
                kind: item.className || '',
                lastChapter: item.lastChapter ? item.lastChapter.chapterName : ''
            };
        });
    } catch (e) {
        legado.log('[发现] 请求失败: ' + e.message);
        return [];
    }
}

async function TEST(type) {
    if (type === '__list__') return ['search', 'explore'];
    if (type === 'search') {
        var r = await search('深空彼岸', 1);
        if (!r || r.length < 1) return { passed: false, message: '搜索无结果' };
        return { passed: true, message: '搜索返回 ' + r.length + ' 条' };
    }
    if (type === 'explore') {
        var cats = await explore(1, 'GETALL');
        if (!cats || cats.length < 1) return { passed: false, message: '获取分类失败' };
        return { passed: true, message: '获取到 ' + cats.length + ' 个分类' };
    }
    return { passed: false, message: '未知测试类型: ' + type };
}