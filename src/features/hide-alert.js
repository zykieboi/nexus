(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    window.NX.features.hideAlert = {
        apply: function() {
            if (document.getElementById('nx-hide-alert')) return;
            var s = document.createElement('style');
            s.id = 'nx-hide-alert';
            s.textContent = `
                .fakeAlert-0-2-41 > *:not(#nx-announce-banner),
                [class*="fakeAlert-"] > *:not(#nx-announce-banner),
                .alertBg-0-2-38,
                [class*="alertBg-"] {
                    display: none !important;
                }
            `;
            document.head.appendChild(s);
        },
        teardown: function() {
            var s = document.getElementById('nx-hide-alert');
            if (s) s.remove();
        }
    };

})();
