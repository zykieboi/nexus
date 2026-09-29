(function() {
    'use strict';

    window.NX_CSRF = window.NX_CSRF || GM_getValue('nx_csrf', '') || '';

    function save(value) {
        if (value && value !== window.NX_CSRF) {
            window.NX_CSRF = value;
            try { GM_setValue('nx_csrf', value); } catch (e) {}
        }
    }

    var origFetch = window.fetch;
    window.fetch = function() {
        var args = arguments;
        var p = origFetch.apply(this, args);
        p.then(function(res) {
            try {
                var t = res.headers.get('x-csrf-token');
                if (t) save(t);
            } catch (e) {}
        }).catch(function() {});
        return p;
    };

    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        var self = this;
        self.addEventListener('load', function() {
            try {
                var t = self.getResponseHeader('x-csrf-token');
                if (t) save(t);
            } catch (e) {}
        });
        return origOpen.apply(this, arguments);
    };
})();
