(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-rap-style';

    function formatRap(n) {
        n = Number(n) || 0;
        if (n < 1000) return String(n);
        if (n < 1000000) {
            var k = n / 1000;
            var s = k >= 100 ? Math.round(k).toString() : k.toFixed(1).replace(/\.0$/, '');
            return s + 'K';
        }
        var m = n / 1000000;
        var s2 = m >= 100 ? Math.round(m).toString() : m.toFixed(2).replace(/\.?0+$/, '');
        return s2 + 'M';
    }

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent =
            '.nx-rap-stat{min-width:0!important;flex-shrink:0}' +
            '.nx-rap-stat [class*="statValue-"]{white-space:nowrap}' +
            '.nx-rap-stat ~ .col-6.col-lg-2{flex:0 0 auto!important;width:auto!important;padding-left:8px!important;padding-right:8px!important}' +
            '.nx-rap-stat ~ [class*="offset-lg-2"]{margin-left:0!important}';
        document.head.appendChild(s);
    }

    window.NX.features.rap = {
        apply: function() {
            if (document.querySelector('.nx-rap-stat')) return;
            if (window.NX._rapLoading) return;

            var pathMatch = window.location.pathname.match(/\/users\/(\d+)\/profile/);
            if (!pathMatch) return;
            var userId = pathMatch[1];

            var statHeaders = document.querySelectorAll('[class*="statHeader-"]');
            if (!statHeaders.length) {
                setTimeout(window.NX.features.rap.apply, 500);
                return;
            }

            var followingHeader = null;
            for (var i = 0; i < statHeaders.length; i++) {
                if (statHeaders[i].textContent.trim() === 'Following') {
                    followingHeader = statHeaders[i];
                    break;
                }
            }
            if (!followingHeader) {
                setTimeout(window.NX.features.rap.apply, 500);
                return;
            }

            var followingStatRow = followingHeader.closest('[class*="statRow-"]');
            if (!followingStatRow) return;

            var followingCol = followingStatRow.closest('[class*="wrapper-"]');
            if (!followingCol) followingCol = followingStatRow.parentElement;
            if (!followingCol || !followingCol.parentElement) return;

            window.NX._rapLoading = true;

            fetch('/internal/limiteds?userId=' + userId, { credentials: 'include' })
                .then(function(r) { return r.text(); })
                .then(function(html) {
                    window.NX._rapLoading = false;
                    if (document.querySelector('.nx-rap-stat')) return;

                    var match = html.match(/Total RAP:[\s\S]{0,200}?([\d,]+)/i);
                    if (!match) return;

                    var raw = parseInt(match[1].replace(/,/g, ''), 10);
                    if (!raw && raw !== 0) return;

                    var wrapper = followingCol.cloneNode(true);
                    wrapper.classList.add('nx-rap-stat');

                    var valueEl = wrapper.querySelector('[class*="statValue-"]');
                    var headerEl = wrapper.querySelector('[class*="statHeader-"]');

                    if (valueEl) {
                        valueEl.innerHTML = '';
                        var link = document.createElement('a');
                        link.href = '/internal/limiteds?userId=' + userId;
                        link.textContent = formatRap(raw);
                        valueEl.appendChild(link);
                    }
                    if (headerEl) headerEl.textContent = 'RAP';

                    ensureStyle();
                    followingCol.parentElement.insertBefore(wrapper, followingCol.nextSibling);
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
