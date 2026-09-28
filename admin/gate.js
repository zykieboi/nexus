(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var HASH = '#nexus-admin';
    var confirmed = false;
    var promise = null;

    function meId() {
        if (window.NX && typeof window.NX.getMeId === 'function') {
            return window.NX.getMeId();
        }
        return parseInt(localStorage.getItem('nx_me_id') || '0', 10);
    }

    function check() {
        if (promise) return promise;
        if (!window.NX.server || typeof window.NX.server.me !== 'function') {
            return Promise.resolve(false);
        }
        promise = window.NX.server.me().then(function(res) {
            if (!res || res.status !== 200) return false;
            if (!res.data || !res.data.user) return false;
            if (!res.data.user.isAdmin) return false;
            confirmed = true;
            return true;
        }).catch(function() {
            promise = null;
            return false;
        });
        return promise;
    }

    function onHash() {
        if (location.hash !== HASH) return;
        if (confirmed) return;
        check().then(function(ok) {
            if (!ok) {
                var stale = document.querySelector('.nxp-root');
                if (stale) stale.remove();
                return;
            }
            if (window.NX.features.nexusPanel
                && typeof window.NX.features.nexusPanel.apply === 'function') {
                window.NX.features.nexusPanel.apply();
            }
        });
    }

    window.NX.adminGate = {
        isAdmin: function() { return confirmed; },
        check: check
    };

    function boot() {
        var id = meId();
        if (!id) return;
        if (location.hash === HASH) {
            check().then(function(ok) {
                if (!ok) return;
                if (window.NX.features.nexusPanel
                    && typeof window.NX.features.nexusPanel.apply === 'function') {
                    window.NX.features.nexusPanel.apply();
                }
            });
        }
        window.addEventListener('hashchange', onHash);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
