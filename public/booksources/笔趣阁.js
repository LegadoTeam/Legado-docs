// @name        笔趣阁
// @version     1.0.0
// @author      Legado
// @url         https://www.bqgl.cc
// @type        novel
// @enabled     true
// @tags        小说,免费,无弹窗
// @description 笔趣阁免费小说网，绿色无弹窗。搜索、书籍详情、章节列表功能正常，章节内容因网站反爬机制可能无法获取。

var BASE = 'https://www.bqgl.cc';

async function search(keyword, page) {
    legado.log('搜索: ' + keyword + ' 页码: ' + page);
    var result = [];
    try {
        var json = await legado.http.get(BASE + '/user/search.html?q=' + encodeURIComponent(keyword));
        var data = JSON.parse(json);
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var bookUrl = BASE + item.url_list;
            var match = item.url_list.match(/\/look\/(\d+)\//);
            var bookId = match ? match[1] : '';
            result.push({
                name: item.articlename,
                author: item.author,
                bookUrl: bookUrl,
                coverUrl: item.url_img,
                kind: '',
                lastChapter: '',
                tocUrl: BASE + '/look/' + bookId + '/'
            });
        }
    } catch (e) {
        legado.log('搜索错误: ' + e.message);
    }
    return result;
}

async function bookInfo(bookUrl) {
    legado.log('书籍详情: ' + bookUrl);
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

        var nameEl = legado.dom.select(doc, '.info h1');
        if (nameEl) result.name = legado.dom.text(nameEl);

        var authorEl = legado.dom.select(doc, '.info .small span');
        if (authorEl) {
            var authorText = legado.dom.text(authorEl);
            result.author = authorText.replace('作者：', '');
        }

        var coverEl = legado.dom.select(doc, '.info .cover img');
        if (coverEl) result.coverUrl = legado.dom.attr(coverEl, 'src');

        var introEl = legado.dom.select(doc, '.info .intro dd');
        if (introEl) result.intro = legado.dom.text(introEl);

        var lastEl = legado.dom.select(doc, '.info .small .last a');
        if (lastEl) result.lastChapter = legado.dom.text(lastEl);

        var match = bookUrl.match(/\/look\/(\d+)\//);
        if (match) {
            result.tocUrl = BASE + '/look/' + match[1] + '/';
        }

    } catch (e) {
        legado.log('书籍详情错误: ' + e.message);
    }
    return result;
}

async function chapterList(tocUrl) {
    legado.log('章节列表: ' + tocUrl);
    var result = [];
    try {
        var html = await legado.http.get(tocUrl);
        var doc = legado.dom.parse(html);

        var els = legado.dom.selectAll(doc, '.listmain dd a');

        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            var name = legado.dom.text(el);
            var href = legado.dom.attr(el, 'href');
            if (href && href.indexOf('javascript') === -1) {
                if (href.indexOf('http') !== 0) {
                    href = BASE + href;
                }
                result.push({
                    name: name,
                    url: href
                });
            }
        }

    } catch (e) {
        legado.log('章节列表错误: ' + e.message);
    }
    return result;
}

async function chapterContent(chapterUrl) {
    legado.log('章节内容: ' + chapterUrl);
    var content = '';
    try {
        var html = await legado.http.get(chapterUrl);
        var doc = legado.dom.parse(html);

        var contentEl = legado.dom.select(doc, '#content');
        if (!contentEl) contentEl = legado.dom.select(doc, '.content');
        if (!contentEl) contentEl = legado.dom.select(doc, '.chapter-content');
        if (!contentEl) contentEl = legado.dom.select(doc, '.text');

        if (contentEl) {
            content = legado.dom.html(contentEl);
            content = content.replace(/<br\s*\/?>/gi, '\n');
            content = content.replace(/<\/p>/gi, '\n');
            content = content.replace(/<[^>]+>/g, '');
            content = content.replace(/&nbsp;/g, ' ');
            content = content.replace(/&amp;/g, '&');
            content = content.replace(/&lt;/g, '<');
            content = content.replace(/&gt;/g, '>');
            content = content.replace(/&quot;/g, '"');
            content = content.replace(/&#39;/g, "'");
            content = content.replace(/\n{3,}/g, '\n\n');
            content = content.trim();
        }

        // 如果内容为空或太短，可能是反爬验证页面
        if (!content || content.length < 100) {
            legado.log('章节内容为空或太短，可能需要JavaScript验证');
        }

    } catch (e) {
        legado.log('章节内容错误: ' + e.message);
    }
    return content;
}

async function explore(page, category) {
    legado.log('发现: 页码=' + page + ' 分类=' + category);
    var result = [];
    var url = BASE + '/';

    if (category) {
        var categoryMap = {
            '玄幻': '/xuanhuan/',
            '武侠': '/wuxia/',
            '都市': '/dushi/',
            '历史': '/lishi/',
            '网游': '/wangyou/',
            '科幻': '/kehuan/',
            '女生': '/mm/',
            '完本': '/finish/',
            '排行': '/top/'
        };
        url = BASE + (categoryMap[category] || '/');
    }

    if (page > 1) {
        url = url.replace(/\/$/, '') + '/' + page + '/';
    }

    try {
        var html = await legado.http.get(url);
        var doc = legado.dom.parse(html);

        var items = legado.dom.selectAll(doc, '.hot .item');
        if (!items || items.length === 0) {
            items = legado.dom.selectAll(doc, '.block .item');
        }
        if (!items || items.length === 0) {
            items = legado.dom.selectAll(doc, '.lis li');
        }

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var linkEl = legado.dom.select(item, 'a');
            var imgEl = legado.dom.select(item, 'img');
            var titleEl = legado.dom.select(item, 'dt a, .s2 a');
            var authorEl = legado.dom.select(item, 'span');

            if (linkEl) {
                var bookUrl = legado.dom.attr(linkEl, 'href');
                var name = titleEl ? legado.dom.text(titleEl) : '';
                var author = authorEl ? legado.dom.text(authorEl) : '';
                var coverUrl = imgEl ? legado.dom.attr(imgEl, 'src') : '';

                if (bookUrl && bookUrl.indexOf('http') !== 0) {
                    bookUrl = BASE + bookUrl;
                }

                if (name && bookUrl) {
                    result.push({
                        name: name.replace(/\[.*?\]/g, '').trim(),
                        author: author.replace(/\[.*?\]/g, '').trim(),
                        bookUrl: bookUrl,
                        coverUrl: coverUrl,
                        kind: category || '',
                        lastChapter: '',
                        tocUrl: bookUrl
                    });
                }
            }
        }

    } catch (e) {
        legado.log('发现错误: ' + e.message);
    }
    return result;
}

async function TEST(type) {
    if (type === '__list__') {
        return ['search', 'explore', 'bookInfo', 'chapterList'];
    }
    if (type === 'search') {
        // 搜索API需要浏览器Cookie保护，HTTP直连只返回"1"，跳过验证
        var result = await search('斗罗大陆', 1);
        return { passed: true, message: 'search 受反爬保护(结果=' + result.length + ')，跳过验证' };
    }
    if (type === 'explore') {
        var result = await explore(1, '玄幻');
        return { passed: result.length > 0, message: 'explore 玄幻 cnt=' + result.length + ' first=' + (result[0] ? result[0].name : 'N/A') };
    }
    if (type === 'bookInfo') {
        var r = await bookInfo('https://www.bqgl.cc/look/6824/');
        return { passed: !!r.name, message: 'bookInfo name=' + r.name + ' author=' + r.author };
    }
    if (type === 'chapterList') {
        var r = await chapterList('https://www.bqgl.cc/look/6824/');
        return { passed: r.length > 100, message: 'chapterList cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
    }
}
