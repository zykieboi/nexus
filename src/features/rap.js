(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-rap-style';

    function fmt(n) {
        n = Number(n) || 0;
        if (n < 1000) return String(n);
        if (n < 1000000) {
            var k = n / 1000;
            return (k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')) + 'K';
        }
        var m = n / 1000000;
        return (m >= 100 ? Math.round(m) : m.toFixed(2).replace(/\.?0+$/, '')) + 'M';
    }

    function style(doc) {
        var d = doc || document;
        if (d.getElementById(STYLE_ID)) return;
        var s = d.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.nx-rap-stat{min-width:0!important;flex-shrink:0}',
            '.nx-rap-stat [class*="statValue-"]{white-space:nowrap}'
        ].join('');
        (d.head || d.documentElement).appendChild(s);
    }

    function applyTo(doc, userId) {
        if (!doc || !doc.body) return;
        if (doc.querySelector('.nx-rap-stat')) return;
        if (doc.__nxRapLoading) return;

        var headers = doc.querySelectorAll('[class*="statHeader-"]');
        if (!headers.length) return;

        var following = null;
        for (var i = 0; i < headers.length; i++) {
            if (headers[i].textContent.trim() === 'Following') {
                following = headers[i];
                break;
            }
        }
        if (!following) return;

        var row = following.closest('[class*="statRow-"]');
        if (!row) return;

        var col = row.closest('[class*="wrapper-"]') || row.parentElement;
        if (!col || !col.parentElement) return;

        doc.__nxRapLoading = true;

        fetch('/users/' + userId + '/limiteds', { credentials: 'include' })
            .then(function(r) { return r.text(); })
            .then(function(html) {
                doc.__nxRapLoading = false;
                if (doc.querySelector('.nx-rap-stat')) return;

                var match = html.match(/Total RAP:[\s\S]{0,200}?([\d,]+)/i);
                if (!match) return;

                var raw = parseInt(match[1].replace(/,/g, ''), 10);
                if (isNaN(raw)) return;

                var wrap = col.cloneNode(true);
                wrap.classList.add('nx-rap-stat');

                var val = wrap.querySelector('[class*="statValue-"]');
                var head = wrap.querySelector('[class*="statHeader-"]');

                if (val) {
                    val.innerHTML = '';
                    var link = doc.createElement('a');
                    link.href = '/users/' + userId + '/limiteds';
                    link.textContent = fmt(raw);
                    val.appendChild(link);
                }
                if (head) head.textContent = 'RAP';

                style(doc);
                col.parentElement.insertBefore(wrap, col.nextSibling);
            })
            .catch(function() {
                doc.__nxRapLoading = false;
            });
    }

    function assetUserId() {
        var m = location.pathname.match(/\/users\/(\d+)\/profile/);
        if (m) return m[1];
        var p = new URLSearchParams(location.search);
        return p.get('userId') || p.get('viewerId');
    }

    function scan() {
        var id = assetUserId();
        if (!id) return;

        applyTo(document, id);

        var frames = document.querySelectorAll('iframe[src*="/theme2020/users/"]');
        for (var i = 0; i < frames.length; i++) {
            var f = frames[i];
            try {
                var d = f.contentDocument;
                if (d) applyTo(d, id);
            } catch (e) {}
        }
    }

    var scanner = null;
    var observer = null;

    window.NX.features.rap = {
        apply: function() {
            scan();
            if (!scanner) scanner = setInterval(scan, 250);
            if (observer) return;

            var target = document.body || document.documentElement;
            if (!target) return;
            observer = new MutationObserver(scan);
            observer.observe(target, { childList: true, subtree: true });
        },
        teardown: function() {
            if (scanner) { clearInterval(scanner); scanner = null; }
            if (observer) { observer.disconnect(); observer = null; }
            document.querySelectorAll('.nx-rap-stat').forEach(function(el) { el.remove(); });
            var frames = document.querySelectorAll('iframe[src*="/theme2020/users/"]');
            for (var i = 0; i < frames.length; i++) {
                try {
                    var d = frames[i].contentDocument;
                    if (!d) continue;
                    d.querySelectorAll('.nx-rap-stat').forEach(function(el) { el.remove(); });
                } catch (e) {}
            }
        }
    };
})();
