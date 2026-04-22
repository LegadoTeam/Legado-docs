// @name        笔趣阁365
// @version     1.0.0
// @author      Legado
// @url         https://www.biquge365.net/
// @type        novel
// @enabled     true
// @tags        小说,笔趣阁
// @description 笔趣阁365小说网书源，支持搜索、阅读

var BASE = 'https://www.biquge365.net';

async function search(keyword, page) {
    legado.log('search: ' + keyword + ' page: ' + page);

    var results = [];
    var html = await legado.http.post(BASE + '/s.php', 'type=articlename&s=' + encodeURIComponent(keyword), {
        'Content-Type': 'application/x-www-form-urlencoded'
    });

    var doc = legado.dom.parse(html);
    var items = legado.dom.selectAll(doc, 'ul.search li');

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var nameEl = legado.dom.select(item, 'span.name a');
        var authorEl = legado.dom.select(item, 'span.zuo a');
        var kindEl = legado.dom.select(item, 'span.lei');
        var chapterEl = legado.dom.select(item, 'span.jie a');
        var bookUrl = nameEl ? legado.dom.attr(nameEl, 'href') : '';
        var author = authorEl ? legado.dom.text(authorEl) : '';
        var kind = kindEl ? legado.dom.text(kindEl) : '';
        var lastChapter = chapterEl ? legado.dom.text(chapterEl) : '';

        if (nameEl && bookUrl) {
            var coverUrl = '';
            var bookPage = await legado.http.get(BASE + bookUrl);
            var bookDoc = legado.dom.parse(bookPage);
            var coverImg = legado.dom.select(bookDoc, '.zhutu img');
            if (coverImg) {
                coverUrl = legado.dom.attr(coverImg, 'src');
            }

            results.push({
                name: legado.dom.text(nameEl),
                author: author,
                bookUrl: BASE + bookUrl,
                coverUrl: coverUrl || '',
                kind: kind,
                lastChapter: lastChapter,
                tocUrl: BASE + '/newbook/' + getBookId(bookUrl) + '/'
            });
        }
    }

    legado.log('search results: ' + results.length);
    return results;
}

function getBookId(url) {
    var match = url.match(/\/book\/(\d+)\//);
    if (match) return match[1];
    match = url.match(/\/newbook\/(\d+)\//);
    return match ? match[1] : '';
}

async function bookInfo(bookUrl) {
    legado.log('bookInfo: ' + bookUrl);

    var html = await legado.http.get(bookUrl);
    var doc = legado.dom.parse(html);

    var name = '';
    var nameEl = legado.dom.select(doc, 'h1');
    if (nameEl) {
        name = legado.dom.text(nameEl);
    }

    var author = '';
    var authorEl = legado.dom.select(doc, '.xinxi span.x1 a');
    if (!authorEl) {
        var spans = legado.dom.selectAll(doc, '.xinxi span');
        for (var i = 0; i < spans.length; i++) {
            var txt = legado.dom.text(spans[i]);
            if (txt.indexOf('作者') >= 0) {
                var link = legado.dom.select(spans[i], 'a');
                if (link) author = legado.dom.text(link);
                else author = txt.replace('作者：', '');
                break;
            }
        }
    } else {
        author = legado.dom.text(authorEl);
    }

    var coverUrl = '';
    var coverImg = legado.dom.select(doc, '.zhutu img');
    if (coverImg) {
        coverUrl = legado.dom.attr(coverImg, 'src');
    }

    var intro = '';
    var introEl = legado.dom.select(doc, '.xinxi .x3');
    if (introEl) {
        intro = legado.dom.text(introEl);
    }

    var bookId = getBookId(bookUrl);
    var tocUrl = BASE + '/newbook/' + bookId + '/';

    legado.log('bookInfo: ' + name + ' author: ' + author);

    return {
        name: name,
        author: author,
        bookUrl: bookUrl,
        coverUrl: coverUrl,
        intro: intro,
        tocUrl: tocUrl
    };
}

async function chapterList(tocUrl) {
    legado.log('chapterList: ' + tocUrl);

    var chapters = [];
    var html = await legado.http.get(tocUrl);
    var doc = legado.dom.parse(html);

    var items = legado.dom.selectAll(doc, 'ul.info li a');

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var name = legado.dom.text(item);
        var url = legado.dom.attr(item, 'href');

        if (name && url) {
            chapters.push({
                name: name,
                url: BASE + url
            });
        }
    }

    legado.log('chapterList: ' + chapters.length + ' chapters');
    return chapters;
}

async function chapterContent(chapterUrl) {
    legado.log('chapterContent: ' + chapterUrl);

    var html = await legado.http.get(chapterUrl);
    var doc = legado.dom.parse(html);

    var contentEl = legado.dom.select(doc, '#txt');
    var content = '';

    if (contentEl) {
        content = legado.dom.html(contentEl);
        content = content.replace(/<p[^>]*style[^>]*>.*?<\/p>/gi, function(match) {
            var text = match.replace(/<[^>]+>/g, '');
            return text + '\n\n';
        });
        content = content.replace(/<br\s*\/?>/gi, '\n');
        content = content.replace(/<[^>]+>/g, '');
        content = content.replace(/&nbsp;/g, ' ');
        content = content.replace(/&amp;/g, '&');
        content = content.replace(/&lt;/g, '<');
        content = content.replace(/&gt;/g, '>');
        content = content.replace(/&quot;/g, '"');
        content = content.replace(/&#39;/g, "'");
        content = content.replace(/笔趣阁/g, '');
        content = content.trim();
    }

    legado.log('chapterContent length: ' + content.length);
    return content;
}

async function explore(page, category) {
    legado.log('explore: page=' + page + ' category=' + category);

    var results = [];

    // 分类URL映射
    var sortMap = {
        'xuanhuan': { name: '玄幻魔法', url: '/sort/1_' },
        'wuxia': { name: '仙侠修真', url: '/sort/2_' },
        'dushi': { name: '都市言情', url: '/sort/3_' },
        'lishi': { name: '历史军事', url: '/sort/7_' },
        'wangyou': { name: '网游动漫', url: '/sort/4_' },
        'kehuan': { name: '科幻小说', url: '/sort/5_' },
        'mm': { name: '女生', url: '/sort/8_' },
        'finish': { name: '完本', url: '/full/' }
    };

    var sortInfo = sortMap[category] || { name: '玄幻魔法', url: '/sort/1_' };
    var url = BASE + sortInfo.url + page + '/';

    legado.log('explore url: ' + url);

    var html = await legado.http.get(url);
    var doc = legado.dom.parse(html);

    // 从分类页面的 wanben 列表获取书籍
    var items = legado.dom.selectAll(doc, 'ul.wanben li');

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var nameEl = legado.dom.select(item, 'h3.p2 a');
        var imgEl = legado.dom.select(item, 'img');
        var bookUrl = nameEl ? legado.dom.attr(nameEl, 'href') : '';
        var bookId = getBookId(bookUrl);

        if (nameEl && bookId) {
            results.push({
                name: legado.dom.text(nameEl),
                author: '',
                bookUrl: BASE + bookUrl,
                coverUrl: imgEl ? BASE + legado.dom.attr(imgEl, 'src') : '',
                kind: sortInfo.name,
                tocUrl: BASE + '/newbook/' + bookId + '/'
            });
        }
    }

    // 如果 wanben 为空，尝试从 qiangtui 获取
    if (results.length === 0) {
        items = legado.dom.selectAll(doc, 'ul.qiangtui li');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var nameEl = legado.dom.select(item, 'h3.p2 a');
            var imgEl = legado.dom.select(item, 'img');
            var bookUrl = nameEl ? legado.dom.attr(nameEl, 'href') : '';
            var bookId = getBookId(bookUrl);

            if (nameEl && bookId) {
                results.push({
                    name: legado.dom.text(nameEl),
                    author: '',
                    bookUrl: BASE + bookUrl,
                    coverUrl: imgEl ? BASE + legado.dom.attr(imgEl, 'src') : '',
                    kind: sortInfo.name,
                    tocUrl: BASE + '/newbook/' + bookId + '/'
                });
            }
        }
    }

    // 如果 qiangtui 也为空，尝试从 gengxin 获取（完本页面）
    if (results.length === 0) {
        items = legado.dom.selectAll(doc, 'ul.gengxin li');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var nameEl = legado.dom.select(item, 'a');
            var bookUrl = nameEl ? legado.dom.attr(nameEl, 'href') : '';
            var bookId = getBookId(bookUrl);

            if (nameEl && bookId) {
                results.push({
                    name: legado.dom.text(nameEl),
                    author: '',
                    bookUrl: BASE + bookUrl,
                    coverUrl: '',
                    kind: sortInfo.name,
                    tocUrl: BASE + '/newbook/' + bookId + '/'
                });
            }
        }
    }

    legado.log('explore results: ' + results.length);
    return results;
}

async function TEST(type) {
    if (type === '__list__') {
        return ['search', 'explore', 'bookInfo', 'chapterList', 'chapterContent'];
    }
    if (type === 'search') {
        var r = await search('斗破苍穹', 1);
        return { passed: r.length > 0, message: 'search cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
    }
    if (type === 'explore') {
        var r = await explore(1, 'xuanhuan');
        return { passed: r.length > 0, message: 'explore cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
    }
    if (type === 'bookInfo') {
        var r = await bookInfo('https://www.biquge365.net/book/63611/');
        return { passed: !!r.name, message: 'bookInfo name=' + r.name + ' author=' + r.author };
    }
    if (type === 'chapterList') {
        var r = await chapterList('https://www.biquge365.net/newbook/63611/');
        return { passed: r.length > 100, message: 'chapterList cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
    }
    if (type === 'chapterContent') {
        var r = await chapterContent('https://www.biquge365.net/chapter/63611/5936401.html');
        return { passed: r.length > 100, message: 'chapterContent len=' + r.length + ' first=' + r.substring(0, 30) };
    }
}
