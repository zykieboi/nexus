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

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.nx-rap-stat{min-width:0!important;flex-shrink:0}',
            '.nx-rap-stat [class*="statValue-"]{white-space:nowrap}'
        ].join('');
        document.head.appendChild(s);
    }

    window.NX.features.rap = {
        apply: function() {
            if (document.querySelector('.nx-rap-stat')) return;
            if (window.NX._rapLoading) return;

            var m = location.pathname.match(/\/users\/(\d+)\/profile/);
            if (!m) return;
            var userId = m[1];

            var headers = document.querySelectorAll('[class*="statHeader-"]');
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

            window.NX._rapLoading = true;

            fetch('/internal/limiteds?userId=' + userId, { credentials: 'include' })
                .then(function(r) { return r.text(); })
                .then(function(html) {
                    window.NX._rapLoading = false;
                    if (document.querySelector('.nx-rap-stat')) return;

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
                        var link = document.createElement('a');
                        link.href = '/internal/limiteds?userId=' + userId;
                        link.textContent = fmt(raw);
                        val.appendChild(link);
                    }
                    if (head) head.textContent = 'RAP';

                    style();
                    col.parentElement.insertBefore(wrap, col.nextSibling);
                })
                .catch(function() {
                    window.NX._rapLoading = false;
                });
        },
        teardown: function() {
            var el = document.querySelector('.nx-rap-stat');
            if (el) el.remove();
            window.NX._rapLoading = false;
        }
    };
})();
