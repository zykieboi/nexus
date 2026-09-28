(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var POLL_MS = 60000;
    var STYLE_ID = 'nx-announce-style';
    var BANNER_ID = 'nx-announce-banner';
    var MAINT_ID = 'nx-maintenance-overlay';

    var FEATURE_KEYS = [
        'removeAds',
        'hideAlert',
        'rap',
        'inventorySearch',
        'bulkUnfriend',
        'trade2020'
    ];

    var CSS = [
        '#nx-announce-banner{background:#393b3d;color:#fff;padding:12px 16px;',
        'font-size:15px;line-height:1.4;position:relative;text-align:center;',
        'font-family:inherit}',
        '#nx-maintenance-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);',
        'z-index:999997;display:flex;align-items:center;justify-content:center;',
        'font-family:inherit}',
        '#nx-maintenance-overlay .nx-maint-box{background:#232527;border:1px solid #343638;',
        'border-radius:12px;padding:32px 40px;max-width:480px;text-align:center;color:#e0e0e0}',
        '#nx-maintenance-overlay h2{margin:0 0 10px;font-size:22px;font-weight:600;color:#fff}',
        '#nx-maintenance-overlay p{margin:0;font-size:14px;line-height:1.55;color:#9a9da0}'
    ].join('');

    var timer = null;
    var lastShown = null;

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function meId() {
        if (window.NX && typeof window.NX.getMeId === 'function') {
            return window.NX.getMeId();
        }
        return parseInt(localStorage.getItem('nx_me_id') || '0', 10);
    }

    function slot() {
        return document.querySelector('.fakeAlert-0-2-4')
            || document.querySelector('[class*="fakeAlert-"]');
    }

    function clearBanner() {
        var b = document.getElementById(BANNER_ID);
        if (b) b.remove();
        var s = slot();
        if (s) s.style.height = '';
    }

    function showBanner(ann) {
        if (!ann || !ann.text) {
            clearBanner();
            lastShown = null;
            return;
        }
        if (lastShown === ann.updatedAt) return;

        var s = slot();
        if (!s) return;

        clearBanner();

        var b = document.createElement('div');
        b.id = BANNER_ID;
        b.textContent = ann.text;

        s.style.height = 'auto';
        s.appendChild(b);
        lastShown = ann.updatedAt;
    }

    function showMaintenance(config) {
        var existing = document.getElementById(MAINT_ID);
        var on = !!(config && config.maintenance);

        if (!on || meId() === 1043) {
            if (existing) existing.remove();
            return;
        }
        if (existing) return;

        var overlay = document.createElement('div');
        overlay.id = MAINT_ID;

        var box = document.createElement('div');
        box.className = 'nx-maint-box';

        var h = document.createElement('h2');
        h.textContent = 'Under maintenance';

        var p = document.createElement('p');
        p.textContent = 'Nexus is currently under maintenance. Please check back shortly.';

        box.appendChild(h);
        box.appendChild(p);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    function applyOverrides(config) {
        if (!config || typeof config !== 'object') return;
        if (!window.NX.settings) return;

        FEATURE_KEYS.forEach(function(key) {
            if (config[key] === false) {
                if (window.NX.settings.get(key)) {
                    window.NX.settings.set(key, false);
                    var f = window.NX.features[key];
                    if (f && typeof f.teardown === 'function') {
                        try { f.teardown(); } catch (e) {}
                    }
                }
            }
        });
    }

    function pull() {
        if (!window.NX.server || typeof window.NX.server.config !== 'function') return;
        window.NX.server.config().then(function(res) {
            if (!res || res.status !== 200 || !res.data) return;
            applyOverrides(res.data.config);
            showBanner(res.data.announcement);
            showMaintenance(res.data.config);
        }).catch(function() {});
    }

    window.NX.features.announcement = {
        apply: function() {
            style();
            pull();
            if (timer) clearInterval(timer);
            timer = setInterval(pull, POLL_MS);
        },
        teardown: function() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            clearBanner();
            lastShown = null;
            var m = document.getElementById(MAINT_ID);
            if (m) m.remove();
        }
    };
})();
