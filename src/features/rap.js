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

    function addRap() {
        var userId = userFromUrl();
        if (!userId) return true;

        var list = document.querySelector('.details-info');
        if (!list) return false;
        if (list.querySelector('.nx-rap-row')) return true;

        var items = list.querySelectorAll('li');
        var followingLi = null;
        for (var i = 0; i < items.length; i++) {
            var label = items[i].querySelector('.text-label');
            if (label && (label.textContent || '').trim() === 'Following') {
                followingLi = items[i];
                break;
            }
        }
        if (!followingLi) return false;

        var li = followingLi.cloneNode(true);
        li.classList.add('nx-rap-row');

        var lbl = li.querySelector('.text-label');
        if (lbl) {
            lbl.textContent = 'RAP';
            lbl.removeAttribute('ng-bind');
            lbl.removeAttribute('data-ng-bind');
            lbl.classList.remove('ng-binding');
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

    var scanner = null;

    window.NX.features.rap = {
        apply: function() {
            if (!addRap() && !scanner) {
                var tries = 0;
                scanner = setInterval(function() {
                    if (addRap() || ++tries > 60) {
                        clearInterval(scanner);
                        scanner = null;
                    }
                }, 250);
            }
        },
        teardown: function() {
            if (scanner) { clearInterval(scanner); scanner = null; }
            var r = document.querySelector('.nx-rap-row');
            if (r) r.remove();
        }
    };
})();
