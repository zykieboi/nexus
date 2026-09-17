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
        '#nx-announce-banner{background:#393b3d;color:#fff;padding:12px 16px;font-size:15px;font-weight:400;line-height:1.4;position:relative;text-align:center;font-family:inherit}',
        '#nx-maintenance-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:999997;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
        '#nx-maintenance-overlay .nx-maint-box{background:#232527;border:1px solid #343638;border-radius:12px;padding:32px 40px;max-width:480px;text-align:center;color:#e0e0e0}',
        '#nx-maintenance-overlay h2{margin:0 0 10px;font-size:22px;font-weight:600;color:#fff}',
        '#nx-maintenance-overlay p{margin:0;font-size:14px;line-height:1.55;color:#9a9da0}'
    ].join('');

    var pollTimer = null;
    var lastRendered = null;

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function getMeId() {
        if (window.NX && typeof window.NX.getMeId === 'function') {
            return window.NX.getMeId();
        }
        return parseInt(localStorage.getItem('nx_me_id') || '0', 10);
    }

    function getSlot() {
        return document.querySelector('.fakeAlert-0-2-41')
            || document.querySelector('[class*="fakeAlert-"]');
    }

    function removeBanner() {
        var b = document.getElementById(BANNER_ID);
        if (b) b.remove();
        var slot = getSlot();
        if (slot) slot.style.height = '';
    }

    function renderAnnouncement(announcement) {
        if (!announcement || !announcement.text) {
            removeBanner();
            lastRendered = null;
            return;
        }

        if (lastRendered === announcement.updatedAt) return;

        var slot = getSlot();
        if (!slot) return;

        removeBanner();

        var banner = document.createElement('div');
        banner.id = BANNER_ID;
        banner.textContent = announcement.text;

        slot.style.height = 'auto';
        slot.appendChild(banner);
        lastRendered = announcement.updatedAt;
    }

    function renderMaintenance(config) {
        var existing = document.getElementById(MAINT_ID);
        var on = !!(config && config.maintenance);

        if (!on || getMeId() === 59420) {
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

        FEATURE_KEYS.forEach(function(key) {
            if (config[key] === false) {
                var wasOn = window.NX.settings.get(key);
                if (wasOn) {
                    window.NX.settings.set(key, false);
                    if (window.NX.features[key] && typeof window.NX.features[key].teardown === 'function') {
                        try { window.NX.features[key].teardown(); } catch (e) {}
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
            renderAnnouncement(res.data.announcement);
            renderMaintenance(res.data.config);
        }).catch(function() {});
    }

    window.NX.features.announcement = {
        apply: function() {
            ensureStyle();
            pull();
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = setInterval(pull, POLL_MS);
        },
        teardown: function() {
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            removeBanner();
            lastRendered = null;
            var m = document.getElementById(MAINT_ID);
            if (m) m.remove();
        }
    };

})();
