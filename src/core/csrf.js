(function() {
    'use strict';

    window.NX_CSRF = window.NX_CSRF || GM_getValue('nx_csrf', '') || '';

    function capture(value) {
        if (value && value !== window.NX_CSRF) {
            window.NX_CSRF = value;
            try { GM_setValue('nx_csrf', value); } catch (e) {}
        }
    }

    var origFetch = window.fetch;
    window.fetch = function(input, init) {
        var p = origFetch.apply(this, arguments);
        try {
            p.then(function(res) {
                try {
                    var t = res && res.headers && res.headers.get('x-csrf-token');
                    if (t) capture(t);
                } catch (e) {}
            }).catch(function() {});
        } catch (e) {}
        return p;
    };

    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        var self = this;
        self.addEventListener('load', function() {
            try {
                var t = self.getResponseHeader('x-csrf-token');
                if (t) capture(t);
            } catch (e) {}
        });
        return origOpen.apply(this, arguments);
    };
})();
