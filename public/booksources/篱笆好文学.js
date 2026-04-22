// @name        篱笆好文学
// @version     2.0.0
// @author      Legado
// @url         https://m.libahao.com
// @enabled     true
// @tags        小说,免费,文学
// @description 篱笆好文学（m.libahao.com），免费网文小说站。搜索功能已暂停，bookInfo/chapterList/chapterContent/explore可用。

var BASE = 'https://m.libahao.com';

async function search(keyword, page) {
    legado.log('search: ' + keyword);
    // 网站搜索功能暂停，返回空
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

        result.name = legado.dom.selectAttr(doc, 'meta[property="og:novel:book_name"]', 'content')
                   || legado.dom.selectText(doc, '.book-info-title')
                   || '';
        result.author = legado.dom.selectAttr(doc, 'meta[property="og:novel:author"]', 'content') || '';
        result.intro = legado.dom.selectAttr(doc, 'meta[property="og:description"]', 'content') || '';
        result.kind = legado.dom.selectAttr(doc, 'meta[property="og:novel:category"]', 'content') || '';
        result.lastChapter = legado.dom.selectAttr(doc, 'meta[property="og:novel:lastest_chapter_name"]', 'content') || '';
        var ogImg = legado.dom.selectAttr(doc, 'meta[property="og:image"]', 'content');
        if (ogImg) {
            result.coverUrl = ogImg.indexOf('http') === 0 ? ogImg : BASE + ogImg;
        } else {
            var coverEl = legado.dom.select(doc, '.book-info-cover');
            if (coverEl) {
                var src = legado.dom.attr(coverEl, 'src');
                result.coverUrl = src && src.indexOf('http') === 0 ? src : BASE + (src || '');
            }
        }

        legado.dom.free(doc);
    } catch (e) {
        legado.log('bookInfo error: ' + e.message);
    }
    return result;
}

async function chapterList(tocUrl) {
    legado.log('chapterList: ' + tocUrl);
    var chapters = [];
    try {
        var html = await legado.http.get(tocUrl);
        var doc = legado.dom.parse(html);

        var chapterLists = legado.dom.selectAll(doc, '.chapter-list');
        var best = null;
        var bestCount = 0;
        for (var l = 0; l < chapterLists.length; l++) {
            var links = legado.dom.selectAll(chapterLists[l], 'a');
            if (links && links.length > bestCount) {
                bestCount = links.length;
                best = chapterLists[l];
            }
        }
        var container = best || doc;
        var items = legado.dom.selectAll(container, 'a');
        var seen = {};
        for (var i = 0; i < items.length; i++) {
            var href = legado.dom.attr(items[i], 'href') || '';
            if (!href || href.indexOf('.html') === -1) continue;
            var url = href.indexOf('http') === 0 ? href : BASE + href;
            var name = (legado.dom.text(items[i]) || '').trim();
            if (name && url && !seen[url]) {
                seen[url] = true;
                chapters.push({ name: name, url: url });
            }
        }

        legado.dom.free(doc);
        legado.log('chapterList cnt=' + chapters.length);
    } catch (e) {
        legado.log('chapterList error: ' + e.message);
    }
    return chapters;
}

async function chapterContent(chapterUrl) {
    legado.log('chapterContent: ' + chapterUrl);
    var content = '';
    try {
        var html = await legado.http.get(chapterUrl);
        var doc = legado.dom.parse(html);

        var contentEl = legado.dom.select(doc, '#chapterContent');
        if (!contentEl) contentEl = legado.dom.select(doc, '.chapter-content');

        if (contentEl) {
            var contentHtml = legado.dom.html(contentEl) || '';
            var parts = [];
            // 先按</p>分割
            var segs = contentHtml.split(/<\/p>/i);
            for (var i = 0; i < segs.length; i++) {
                var text = segs[i].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\u3000/g, ' ').replace(/\s+/g, ' ').trim();
                if (text && !/本章未完|加入书签|章节报错/.test(text)) {
                    parts.push(text);
                }
            }
            content = parts.join('\n');
        }

        legado.dom.free(doc);
    } catch (e) {
        legado.log('chapterContent error: ' + e.message);
    }
    return content;
}

async function explore(page, category) {
    legado.log('explore: page=' + page + ' category=' + category);
    var result = [];
    var catMap = {
        '玄幻魔法': '/xuanhuan/',
        '武侠修真': '/xiuzhen/',
        '都市言情': '/dushi/',
        '历史军事': '/lishi/',
        '游戏竞技': '/wangyou/',
        '科幻灵异': '/kehuan/',
        '女生言情': '/nvpin/',
        '其他小说': '/qita/'
    };
    var path = catMap[category] || '/xuanhuan/';
    var url = BASE + path;

    try {
        var html = await legado.http.get(url);
        var doc = legado.dom.parse(html);

        var items = legado.dom.selectAll(doc, '.book-item');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            // .book-item 本身是 <a> 标签
            var href = legado.dom.attr(item, 'href');
            var nameEl = legado.dom.select(item, '.book-title');
            var imgEl = legado.dom.select(item, 'img');
            if (href && nameEl) {
                var name = legado.dom.text(nameEl);
                var cover = imgEl ? (legado.dom.attr(imgEl, 'data-original') || legado.dom.attr(imgEl, 'src')) : '';
                if (name) {
                    if (href.indexOf('http') !== 0) href = BASE + href;
                    result.push({
                        name: name.trim(),
                        author: '',
                        bookUrl: href,
                        coverUrl: cover && cover.indexOf('http') === 0 ? cover : BASE + (cover || ''),
                        kind: category || '玄幻魔法',
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
        return ['explore', 'bookInfo', 'chapterList', 'chapterContent'];
    }
    if (type === 'explore') {
        var r = await explore(1, '玄幻魔法');
        return { passed: r.length > 0, message: 'explore cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
    }
    if (type === 'bookInfo') {
        var r = await bookInfo('https://m.libahao.com/book/4825961_647996/');
        return { passed: !!r.name, message: 'bookInfo name=' + r.name + ' author=' + r.author };
    }
    if (type === 'chapterList') {
        var r = await chapterList('https://m.libahao.com/book/4825961_647996/');
        return { passed: r.length > 0, message: 'chapterList cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
    }
    if (type === 'chapterContent') {
        var r = await chapterContent('https://m.libahao.com/book/4825961_647996/1.html');
        return { passed: r.length > 100, message: 'chapterContent len=' + r.length + ' first=' + r.substring(0, 40) };
    }
}
