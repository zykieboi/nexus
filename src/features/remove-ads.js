(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    window.NX.features.removeAds = {
        apply: function() {
            if (document.getElementById('nx-remove-ads')) return;
            var s = document.createElement('style');
            s.id = 'nx-remove-ads';
            s.textContent = '.adWrapper-0-2-106, [class*="adWrapper-"], [class*="ad-"] { display: none !important; }';
            document.head.appendChild(s);
        }
    };

})();
