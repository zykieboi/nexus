(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var HASH = '#nexus-admin';
    var gateConfirmed = false;
    var gatePromise = null;

    function getMeId() {
        if (window.NX && typeof window.NX.getMeId === 'function') {
            return window.NX.getMeId();
        }
        return parseInt(localStorage.getItem('nx_me_id') || '0', 10);
    }

    function checkAdmin() {
        if (gatePromise) return gatePromise;
        if (!window.NX.server || typeof window.NX.server.me !== 'function') {
            return Promise.resolve(false);
        }
        gatePromise = window.NX.server.me().then(function(res) {
            if (!res || res.status !== 200) return false;
            if (!res.data || !res.data.user) return false;
            if (!res.data.user.isAdmin) return false;
            gateConfirmed = true;
            return true;
        }).catch(function() {
            gatePromise = null;
            return false;
        });
        return gatePromise;
    }

    function onHashChange() {
        if (location.hash !== HASH) return;
        if (gateConfirmed) return;
        checkAdmin().then(function(ok) {
            if (!ok) {
                var stale = document.querySelector('.nxp-root');
                if (stale) stale.remove();
                return;
            }
            if (window.NX.features.nexusPanel && typeof window.NX.features.nexusPanel.apply === 'function') {
                window.NX.features.nexusPanel.apply();
            }
        });
    }

    window.NX.adminGate = {
        isAdmin: function() { return gateConfirmed; },
        check: checkAdmin
    };

    function boot() {
        var meId = getMeId();
        if (!meId) return;
        if (location.hash === HASH) {
            checkAdmin().then(function(ok) {
                if (!ok) return;
                if (window.NX.features.nexusPanel && typeof window.NX.features.nexusPanel.apply === 'function') {
                    window.NX.features.nexusPanel.apply();
                }
            });
        }
        window.addEventListener('hashchange', onHashChange);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
