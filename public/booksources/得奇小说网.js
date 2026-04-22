// @name        得奇小说网
// @version     1.0.2
// @author      Auto Generated
// @url         https://www.deqixs.co
// @type        novel
// @enabled     true
// @tags        小说,免费,连载
// @description 得奇小说网，免费在线阅读小说

var BASE = 'https://www.deqixs.co';

function _trim(s) {
    if (!s) return '';
    return s.replace(/^[\s\u3000\u00A0]+|[\s\u3000\u00A0]+$/g, '');
}

async function search(keyword, page) {
    legado.log('searching: ' + keyword);
    var headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': BASE + '/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    var body = 'searchkey=' + encodeURIComponent(keyword) + '&action=search&searchtype=articlename';
    var html = await legado.http.post(BASE + '/modules/article/search.php', body, headers);
    if (!html) {
        legado.log('search returned empty response');
        return [];
    }

    legado.log('search response length: ' + html.length);

    var doc = legado.dom.parse(html);

    var ogTitle = legado.dom.selectAttr(doc, 'meta[property="og:novel:book_name"]', 'content');
    var ogUrl = legado.dom.selectAttr(doc, 'meta[property="og:novel:read_url"]', 'content');
    var ogAuthor = legado.dom.selectAttr(doc, 'meta[property="og:novel:author"]', 'content');
    var ogCover = legado.dom.selectAttr(doc, 'meta[property="og:image"]', 'content');
    var ogLatest = legado.dom.selectAttr(doc, 'meta[property="og:novel:latest_chapter_name"]', 'content');

    if (ogTitle && ogUrl) {
        legado.log('single result: ' + ogTitle);
        return [{
            name: _trim(ogTitle),
            author: _trim(ogAuthor),
            bookUrl: ogUrl,
            coverUrl: ogCover || '',
            kind: '小说',
            lastChapter: _trim(ogLatest)
        }];
    }

    var items = legado.dom.selectAll(doc, 'div.bookbox');
    if (!items || items.length === 0) {
        legado.log('no results found');
        return [];
    }

    legado.log('found ' + items.length + ' results');
    var results = [];
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var titleEl = legado.dom.select(item, 'h4.bookname a');
        var title = legado.dom.text(titleEl);
        var url = legado.dom.attr(titleEl, 'href');
        if (!title || !url) continue;
        if (url.indexOf('http') !== 0) {
            url = BASE + url;
        }

        var authorText = legado.dom.text(legado.dom.select(item, 'div.author'));
        var author = authorText.replace('作者：', '');

        var lastChapterEl = legado.dom.select(item, 'div.cat a');
        var lastChapter = legado.dom.text(lastChapterEl);

        var articleIdMatch = url.match(/\/books\/(\d+)\//);
        var articleId = articleIdMatch ? articleIdMatch[1] : '';
        var coverUrl = articleId ? (BASE + '/files/article/image/0/' + articleId + '/' + articleId + 's.jpg') : '';

        results.push({
            name: _trim(title),
            author: _trim(author),
            bookUrl: url,
            coverUrl: coverUrl,
            kind: '小说',
            lastChapter: _trim(lastChapter)
        });
    }
    return results;
}

async function bookInfo(bookUrl) {
    legado.log('bookInfo: ' + bookUrl);
    var html = await legado.http.get(bookUrl);
    if (!html) {
        legado.log('bookInfo returned empty');
        return null;
    }

    var doc = legado.dom.parse(html);

    var title = legado.dom.selectText(doc, 'h1.booktitle');
    var authorEl = legado.dom.select(doc, 'a.red[title^="作者"]');
    var author = legado.dom.attr(authorEl, 'title');
    if (author) {
        author = author.replace('作者：', '');
    }
    var coverUrl = legado.dom.attr(legado.dom.select(doc, 'img.thumbnail'), 'src');

    var introDoc = legado.dom.select(doc, 'p.bookintro');
    legado.dom.remove(introDoc, 'img');
    var intro = legado.dom.text(introDoc);

    var kind = legado.dom.selectText(doc, 'ol.breadcrumb li:nth-child(2) a');

    var statusEls = legado.dom.selectAll(doc, 'span.red');
    var status = '';
    if (statusEls && statusEls.length > 0) {
        status = legado.dom.text(statusEls[0]);
    }

    var latestEl = legado.dom.select(doc, 'a.bookchapter');
    var lastChapter = legado.dom.text(latestEl);

    return {
        name: _trim(title),
        author: _trim(author),
        coverUrl: coverUrl || '',
        intro: _trim(intro),
        kind: _trim(kind) || _trim(status) || '小说',
        lastChapter: _trim(lastChapter),
        tocUrl: bookUrl
    };
}

async function chapterList(tocUrl) {
    legado.log('chapterList: ' + tocUrl);
    var html = await legado.http.get(tocUrl);
    if (!html) {
        legado.log('chapterList returned empty');
        return [];
    }

    var doc = legado.dom.parse(html);

    var chapters = [];
    var seen = {};
    var links = legado.dom.selectAll(doc, 'dl.chapterlist a');

    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var url = legado.dom.attr(link, 'href');
        var name = legado.dom.text(link);

        if (!url || url.indexOf('javascript') === 0) {
            continue;
        }
        if (url.indexOf('http') !== 0) {
            url = BASE + url;
        }
        if (seen[url]) {
            continue;
        }
        var nameTrim = _trim(name);
        if (nameTrim === '开始阅读' || nameTrim === '加入书架' || nameTrim === '推荐本书' || nameTrim === 'TXT下载') {
            continue;
        }

        seen[url] = true;
        chapters.push({
            name: nameTrim,
            url: url
        });
    }

    chapters.sort(function(a, b) {
        var idA = parseInt(a.url.replace(/.*\/(\d+)\.html.*/, '$1'), 10);
        var idB = parseInt(b.url.replace(/.*\/(\d+)\.html.*/, '$1'), 10);
        return idA - idB;
    });

    legado.log('chapterList: ' + chapters.length + ' chapters');
    return chapters;
}

async function chapterContent(chapterUrl) {
    legado.log('chapterContent: ' + chapterUrl);

    var articleId = '';
    var chapterId = '';
    var parts = chapterUrl.split('/');
    for (var i = 0; i < parts.length; i++) {
        if (parts[i] === 'books' && i + 1 < parts.length) {
            articleId = parts[i + 1];
        }
    }
    var cidMatch = chapterUrl.match(/\/(\d+)\.html/);
    if (cidMatch) {
        chapterId = cidMatch[1];
    }

    if (!articleId || !chapterId) {
        legado.log('Cannot extract IDs from URL: ' + chapterUrl);
        return '解析章节ID失败';
    }

    legado.log('articleId=' + articleId + ' chapterId=' + chapterId);

    var headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': BASE + '/',
    };

    var pageHtml = await legado.http.get(chapterUrl, headers);
    if (!pageHtml) {
        legado.log('chapter page returned empty');
        return '获取章节页面失败';
    }
    legado.log('chapter page loaded, length: ' + pageHtml.length);

    var tokenUrl = BASE + '/scripts/chapter.js.php?aid=' + articleId + '&cid=' + chapterId + '&referrer=' + encodeURIComponent(chapterUrl);
    var tokenHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': chapterUrl,
        'Accept': '*/*',
    };
    var tokenHtml = await legado.http.get(tokenUrl, tokenHeaders);

    if (!tokenHtml) {
        legado.log('Token request returned empty');
        return '获取Token失败';
    }

    legado.log('token response: ' + tokenHtml.substring(0, 150));

    var tokenMatch = tokenHtml.match(/var chapterToken = '([^']+)'/);
    var tsMatch = tokenHtml.match(/var timestamp = (\d+)/);
    var nonceMatch = tokenHtml.match(/var nonce = '([^']+)'/);

    if (!tokenMatch || !tsMatch || !nonceMatch) {
        legado.log('Token parse failed');
        return '获取章节Token失败';
    }

    var token = tokenMatch[1];
    var timestamp = tsMatch[1];
    var nonce = nonceMatch[1];

    legado.log('token=' + token + ' ts=' + timestamp + ' nonce=' + nonce);

    var apiUrl = BASE + '/modules/article/ajax2.php?aid=' + articleId + '&cid=' + chapterId + '&token=' + token + '&timestamp=' + timestamp + '&nonce=' + nonce;
    var apiHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': chapterUrl,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
    };
    var apiResponse = await legado.http.get(apiUrl, apiHeaders);

    legado.log('API response: ' + apiResponse.substring(0, 200));

    try {
        var data = JSON.parse(apiResponse);
        if (data && data.status === 1 && data.data && data.data.content) {
            var content = data.data.content;
            content = content.replace(/<br\s*\/?>/gi, '\n');
            content = content.replace(/<[^>]+>/g, '');
            content = content.replace(/&emsp;/g, '    ');
            content = content.replace(/&nbsp;/g, ' ');
            content = content.replace(/&amp;/g, '&');
            content = content.replace(/&lt;/g, '<');
            content = content.replace(/&gt;/g, '>');
            content = content.replace(/&quot;/g, '"');
            content = content.replace(/&#39;/g, "'");
            content = content.replace(/\n{3,}/g, '\n\n');
            content = content.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
            content = _trim(content);
            legado.log('content length: ' + content.length);
            return content;
        } else {
            var msg = '获取章节内容失败';
            if (data && data.message) {
                msg = msg + ': ' + data.message;
            }
            legado.log(msg);
            return msg;
        }
    } catch (e) {
        legado.log('JSON parse error: ' + e);
        return '解析章节内容失败';
    }
}

async function explore(page, category) {
    legado.log('explore: page=' + page + ' category=' + category);

    if (category === 'GETALL' || !category) {
        return ['全部', '玄幻', '都市', '仙侠', '历史', '科幻', '诸天', '悬疑', '体育', '游戏', '综合'];
    }

    var categoryMap = {
        '全部': '0',
        '玄幻': '1',
        '都市': '2',
        '仙侠': '3',
        '历史': '4',
        '科幻': '5',
        '诸天': '6',
        '悬疑': '7',
        '体育': '8',
        '游戏': '9',
        '综合': '10'
    };

    var sortId = categoryMap[category];
    if (!sortId) {
        legado.log('unknown category: ' + category);
        return [];
    }

    var url = BASE + '/sort/' + sortId + '/' + page + '.html';
    legado.log('explore url: ' + url);

    var html = await legado.http.get(url);
    if (!html) {
        legado.log('explore returned empty');
        return [];
    }

    var doc = legado.dom.parse(html);
    var items = legado.dom.selectAll(doc, 'div.bookbox');
    if (!items || items.length === 0) {
        legado.log('no books found');
        return [];
    }

    var results = [];
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var titleEl = legado.dom.select(item, 'h4.bookname a');
        var title = legado.dom.text(titleEl);
        var bUrl = legado.dom.attr(titleEl, 'href');
        if (!title || !bUrl) continue;
        if (bUrl.indexOf('http') !== 0) {
            bUrl = BASE + bUrl;
        }

        var authorEls = legado.dom.selectAll(item, 'div.author');
        var author = '';
        for (var j = 0; j < authorEls.length; j++) {
            var at = legado.dom.text(authorEls[j]);
            if (at.indexOf('作者：') === 0) {
                author = at.replace('作者：', '');
                break;
            }
        }

        var lastChapterEl = legado.dom.select(item, 'div.cat a');
        var lastChapter = legado.dom.text(lastChapterEl);

        var articleIdMatch = bUrl.match(/\/books\/(\d+)\//);
        var articleId = articleIdMatch ? articleIdMatch[1] : '';
        var coverUrl = articleId ? (BASE + '/files/article/image/0/' + articleId + '/' + articleId + 's.jpg') : '';

        results.push({
            name: _trim(title),
            author: _trim(author),
            bookUrl: bUrl,
            coverUrl: coverUrl,
            kind: category,
            lastChapter: _trim(lastChapter)
        });
    }

    legado.log('explore results: ' + results.length);
    return results;
}

async function TEST(type) {
    if (type === '__list__') return ['search', 'explore', 'info', 'toc', 'content'];
    if (type === 'search') {
        var r = await search('斗破', 1);
        if (!r || r.length < 1) return { passed: false, message: '搜索无结果' };
        return { passed: true, message: '搜索返回 ' + r.length + ' 条' };
    }
    if (type === 'explore') {
        var b = await explore(1, '玄幻');
        if (!b || b.length < 1) return { passed: false, message: '发现页为空' };
        return { passed: true, message: '发现页 ' + b.length + ' 条' };
    }
    return { passed: false, message: '未知: ' + type };
}
