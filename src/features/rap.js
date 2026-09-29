(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

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

    function userFromUrl() {
        var m = location.pathname.match(/\/users\/(\d+)\/profile/);
        if (m) return m[1];
        var p = new URLSearchParams(location.search);
        return p.get('userId') || p.get('viewerId');
    }

    function addRapRow() {
        var userId = userFromUrl();
        if (!userId) return true;

        var list = document.querySelector('.details-info');
        if (!list) return false;

        if (list.querySelector('.nx-rap-row')) return true;

        var items = list.querySelectorAll('li');
        var followingLi = null;
        for (var i = 0; i < items.length; i++) {
            var lbl = items[i].querySelector('.text-label');
            if (lbl && (lbl.textContent || '').trim() === 'Following') {
                followingLi = items[i];
                break;
            }
        }
        if (!followingLi) return false;

        var li = followingLi.cloneNode(true);
        li.classList.add('nx-rap-row');

        var label = li.querySelector('.text-label');
        if (label) {
            label.textContent = 'RAP';
            label.removeAttribute('ng-bind');
            label.removeAttribute('data-ng-bind');
            label.classList.remove('ng-binding');
        }

        var span = li.querySelector('.font-header-2');
        if (span) {
            span.textContent = '…';
            span.removeAttribute('ng-bind');
            span.removeAttribute('data-ng-bind');
            span.classList.remove('ng-binding');
        }

        var link = li.querySelector('a.text-name');
        if (link) link.setAttribute('href', '/users/' + userId + '/limiteds');

        list.appendChild(li);

        fetch('/users/' + userId + '/limiteds', { credentials: 'include' })
            .then(function(r) { return r.text(); })
            .then(function(html) {
                var m = html.match(/Total RAP:[\s\S]{0,400}?([\d,]+)/i);
                if (!m) { if (span) span.textContent = '0'; return; }
                var n = parseInt(m[1].replace(/,/g, ''), 10);
                if (isNaN(n)) { if (span) span.textContent = '0'; return; }
                if (span) {
                    span.textContent = fmt(n);
                    span.setAttribute('title', String(n));
                }
            })
            .catch(function() { if (span) span.textContent = '0'; });

        return true;
    }

    function start() {
        if (addRapRow()) return;

        var tries = 0;
        var iv = setInterval(function() {
            if (addRapRow() || ++tries > 120) clearInterval(iv);
        }, 250);
    }

    var mo = null;

    window.NX.features.rap = {
        apply: function() {
            start();
            if (mo) return;
            var target = document.body || document.documentElement;
            if (!target) return;
            mo = new MutationObserver(function() {
                if (!document.querySelector('.nx-rap-row')) addRapRow();
            });
            mo.observe(target, { childList: true, subtree: true });
        },
        teardown: function() {
            if (mo) { mo.disconnect(); mo = null; }
            var r = document.querySelector('.nx-rap-row');
            if (r) r.remove();
        }
    };
})();
