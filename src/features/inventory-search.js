(function() {
    'use strict';

    if (window.top !== window.self) return;

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var WRAP_ID = 'nx-inv-search-wrap';
    var STYLE_ID = 'nx-inv-search-style';
    var TRY_LIMIT = 20;

    function onInventoryPage() {
        var path = location.pathname;
        if (/^\/my\/avatar\/?$/.test(path)) return true;
        if (/^\/users\/\d+\/inventory\/?$/.test(path)) return true;
        return false;
    }

    function findContentIframe() {
        var frames = document.querySelectorAll('iframe');
        for (var i = 0; i < frames.length; i++) {
            var src = frames[i].getAttribute('src') || '';
            if (src.indexOf('/theme2020/chat') !== -1) continue;
            if (src.indexOf('/theme2020/avatar') !== -1) return frames[i];
            if (src.indexOf('/theme2020/inventory') !== -1) return frames[i];
        }
        return null;
    }

    function injectStyle(doc) {
        if (doc.getElementById(STYLE_ID)) return;
        var s = doc.createElement('style');
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
        (doc.head || doc.documentElement).appendChild(s);
    }

    function findContainer(doc) {
        var cards = doc.querySelectorAll('.item-card');
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

    function filter(doc, query) {
        var q = (query || '').toLowerCase().trim();
        var cards = doc.querySelectorAll('.item-card');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var nameEl = card.querySelector('.item-card-name');
            if (!nameEl) continue;
            var name = (nameEl.textContent || '').toLowerCase();
            card.style.display = (!q || name.indexOf(q) !== -1) ? '' : 'none';
        }
    }

    function build() {
        if (!onInventoryPage()) return false;

        var frame = findContentIframe();
        if (!frame) return false;

        var doc;
        try {
            doc = frame.contentDocument;
        } catch (e) {
            return false;
        }
        if (!doc || !doc.body) return false;

        if (doc.getElementById(WRAP_ID)) return true;

        var container = findContainer(doc);
        if (!container) return false;

        injectStyle(doc);

        var wrap = doc.createElement('div');
        wrap.id = WRAP_ID;

        var input = doc.createElement('input');
        input.type = 'text';
        input.placeholder = 'Search inventory\u2026';
        input.addEventListener('input', function() {
            filter(doc, input.value);
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
        if (!onInventoryPage()) return;
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
            if (onInventoryPage()) scheduleRetry();
        }, 800);
    }

    window.NX.features.inventorySearch = {
        apply: function() {
            if (!onInventoryPage()) return;
            if (build()) return;
            scheduleRetry();
        },
        teardown: function() {
            stopScanner();
            var frame = findContentIframe();
            if (!frame) return;
            var doc;
            try { doc = frame.contentDocument; } catch (e) { return; }
            if (!doc) return;

            var w = doc.getElementById(WRAP_ID);
            if (w) w.remove();
            var s = doc.getElementById(STYLE_ID);
            if (s) s.remove();
            var cards = doc.querySelectorAll('.item-card');
            for (var i = 0; i < cards.length; i++) cards[i].style.display = '';
        }
    };

    if (!window.nxInvSearchNavBound) {
        window.nxInvSearchNavBound = true;
        watchNavigation();
    }
})();
