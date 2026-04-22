// @name        笔趣阁来了
// @version     2.0.0
// @author      Legado
// @url         https://m.bqgl.cc
// @enabled     true
// @tags        小说,免费
// @description 笔趣阁来了移动版小说网站。注意：章节列表和章节内容受反爬保护，只有bookInfo和explore可用。

var BASE = 'https://m.bqgl.cc';

async function search(keyword, page) {
    legado.log('search: ' + keyword);
    // 搜索API受服务器反爬保护，HTTP直连只返回"1"
    return [];
}

async function bookInfo(bookUrl) {
    legado.log('bookInfo: ' + bookUrl);
    var result = {
        name: '',
        author: '',
        bookUrl: bookUrl,
        coverUrl: '',
        intro: '',
        kind: '',
        lastChapter: '',
        tocUrl: bookUrl
    };
    try {
        var html = await legado.http.get(bookUrl);
        var doc = legado.dom.parse(html);

        var nameEl = legado.dom.select(doc, 'dt.name');
        if (nameEl) result.name = legado.dom.text(nameEl);

        var spans = legado.dom.selectAll(doc, '.dd_box span');
        if (spans && spans.length > 0) {
            var s0 = legado.dom.text(spans[0]);
            result.author = s0.replace('作者：', '').trim();
        }
        if (spans && spans.length > 1) {
            var s1 = legado.dom.text(spans[1]);
            result.kind = s1.replace('分类：', '').trim();
        }

        var coverEl = legado.dom.select(doc, '.cover img');
        if (coverEl) result.coverUrl = legado.dom.attr(coverEl, 'src');

        var introEl = legado.dom.select(doc, '.book_about dd');
        if (introEl) result.intro = legado.dom.text(introEl).trim();

        var lastEl = legado.dom.select(doc, '.book_last dd a');
        if (lastEl) result.lastChapter = legado.dom.text(lastEl);

        legado.dom.free(doc);
    } catch (e) {
        legado.log('bookInfo error: ' + e.message);
    }
    return result;
}

async function chapterList(tocUrl) {
    legado.log('chapterList: ' + tocUrl);
    // 章节列表页面受反爬保护，无法通过HTTP直连访问
    return [];
}

async function chapterContent(chapterUrl) {
    legado.log('chapterContent: ' + chapterUrl);
    // 章节内容页面受反爬保护（Cookie验证），无法直接获取
    return '章节内容受反爬保护，无法直接获取。';
}

async function explore(page, category) {
    legado.log('explore: page=' + page + ' category=' + category);
    var result = [];
    var catMap = {
        '玄幻': '/xuanhuan/',
        '武侠': '/wuxia/',
        '都市': '/dushi/',
        '历史': '/lishi/',
        '网游': '/wangyou/',
        '科幻': '/kehuan/',
        '女生': '/mm/'
    };
    var path = catMap[category] || '/xuanhuan/';
    var url = BASE + path;

    try {
        var html = await legado.http.get(url);
        var doc = legado.dom.parse(html);

        var items = legado.dom.selectAll(doc, '.item');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var linkEl = legado.dom.select(item, 'dt a');
            var imgEl = legado.dom.select(item, 'img');
            var authorEl = legado.dom.select(item, 'dt span');
            if (linkEl) {
                var href = legado.dom.attr(linkEl, 'href');
                var name = legado.dom.text(linkEl);
                var author = authorEl ? legado.dom.text(authorEl) : '';
                var cover = imgEl ? legado.dom.attr(imgEl, 'src') : '';
                if (href && name) {
                    if (href.indexOf('http') !== 0) href = BASE + href;
                    result.push({
                        name: name,
                        author: author,
                        bookUrl: href,
                        coverUrl: cover,
                        kind: category || '玄幻',
                        tocUrl: href
                    });
                }
            }
        }
        legado.dom.free(doc);
    } catch (e) {
        legado.log('explore error: ' + e.message);
    }
    return result;
}

async function TEST(type) {
    if (type === '__list__') {
        return ['explore', 'bookInfo'];
    }
    if (type === 'explore') {
        var r = await explore(1, '玄幻');
        return { passed: r.length > 0, message: 'explore cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
    }
    if (type === 'bookInfo') {
        var r = await bookInfo('https://m.bqgl.cc/look/6824/');
        return { passed: !!r.name, message: 'bookInfo name=' + r.name + ' author=' + r.author };
    }
}
