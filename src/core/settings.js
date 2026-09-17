(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};
    window.NX.settings = {
        get: function(key) {
            var val = GM_getValue('nx_' + key);
            return val !== undefined ? val : false;
        },
        set: function(key, val) {
            GM_setValue('nx_' + key, val);
        }
    };

})();
