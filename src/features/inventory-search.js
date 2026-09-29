(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var WRAP_ID = 'nx-inv-search-wrap';
    var STYLE_ID = 'nx-inv-search-style';
    var TRY_LIMIT = 40;

    function onBlockedPage() {
        return /^\/catalog\/?$/.test(location.pathname);
    }

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '#' + WRAP_ID + '{padding:10px 0;width:100%;}',
            '#' + WRAP_ID + ' input{',
            'padding:8px 14px;',
            'border:1px solid #c7cbce;',
            'border-radius:6px;',
            'font-size:14px;',
            'width:100%;max-width:400px;',
            'background:#ffffff;color:#232527;',
            'outline:none;box-sizing:border-box;font-family:inherit;',
            '}',
            '#' + WRAP_ID + ' input:focus{border-color:#0a84ff;}',
            'html.octane-dark #' + WRAP_ID + ' input{',
            'background:#2a2c2e;color:#e0e0e0;border-color:#3a3c3e;',
            '}',
            'html.octane-dark #' + WRAP_ID + ' input:focus{border-color:#0a84ff;}'
        ].join('');
        (document.head || document.documentElement).appendChild(s);
    }

    function findContainer() {
        var cards = document.querySelectorAll('.item-card');
        if (!cards.length) return null;

        var parent = cards[0].parentElement;
        var depth = 0;
        while (parent && depth < 6) {
            var cls = parent.className || '';
            if (
                cls.indexOf('item-cards') !== -1 ||
                cls.indexOf('hlist') !== -1 ||
                cls.indexOf('grid') !== -1 ||
                cls.indexOf('items-') !== -1
            ) {
                return parent;
            }
            parent = parent.parentElement;
            depth++;
        }
        return cards[0].parentElement;
    }

    function filter(query) {
        var q = (query || '').toLowerCase().trim();
        var cards = document.querySelectorAll('.item-card');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var nameEl = card.querySelector('.item-card-name');
            if (!nameEl) continue;
            var name = (nameEl.textContent || '').toLowerCase();
            card.style.display = (!q || name.indexOf(q) !== -1) ? '' : 'none';
        }
    }

    function build() {
        if (document.getElementById(WRAP_ID)) return true;
        if (onBlockedPage()) return false;

        var container = findContainer();
        if (!container) return false;

        var wrap = document.createElement('div');
        wrap.id = WRAP_ID;

        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Search inventory\u2026';
        input.addEventListener('input', function() {
            filter(input.value);
        });

        wrap.appendChild(input);
        container.parentNode.insertBefore(wrap, container);
        return true;
    }

    var scanner = null;

    function stopScanner() {
        if (scanner) {
            clearInterval(scanner);
            scanner = null;
        }
    }

    function scheduleRetry() {
        stopScanner();
        if (onBlockedPage()) return;
        var tries = 0;
        scanner = setInterval(function() {
            tries++;
            if (build() || tries >= TRY_LIMIT) stopScanner();
        }, 500);
    }

    function watchNavigation() {
        var last = location.href;
        setInterval(function() {
            if (location.href === last) return;
            last = location.href;

            var w = document.getElementById(WRAP_ID);
            if (w) w.remove();

            if (onBlockedPage()) return;
            scheduleRetry();
        }, 800);
    }

    window.NX.features.inventorySearch = {
        apply: function() {
            if (onBlockedPage()) return;
            if (document.getElementById(WRAP_ID)) return;
            style();
            if (build()) return;
            scheduleRetry();
        },
        teardown: function() {
            stopScanner();
            var w = document.getElementById(WRAP_ID);
            if (w) w.remove();
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
            var cards = document.querySelectorAll('.item-card');
            for (var i = 0; i < cards.length; i++) cards[i].style.display = '';
        }
    };

    if (!window.nxInvSearchNavBound) {
        window.nxInvSearchNavBound = true;
        watchNavigation();
    }
})();
