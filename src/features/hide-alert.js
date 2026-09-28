(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-hide-alert';

    window.NX.features.hideAlert = {
        apply: function() {
            if (document.getElementById(STYLE_ID)) return;
            var s = document.createElement('style');
            s.id = STYLE_ID;
            s.textContent = [
                '.alertBg-0-2-1,',
                '[class*="alertBg-0-2-"]',
                '{display:none !important;}',
                '.fakeAlert-0-2-4,',
                '[class*="fakeAlert-"]',
                '{height:0 !important;}'
            ].join('');
            (document.head || document.documentElement).appendChild(s);
        },
        teardown: function() {
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
        }
    };
})();
