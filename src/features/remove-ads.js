(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-remove-ads';

    window.NX.features.removeAds = {
        apply: function() {
            if (!document.getElementById(STYLE_ID)) {
                var s = document.createElement('style');
                s.id = STYLE_ID;
                s.textContent = [
                    '.abp,',
                    '[class*="abp-"],',
                    '[class*="leaderboard-abp"],',
                    '[class*="right-abp"],',
                    '[class*="skyscraper-abp"],',
                    '.adWrapper-0-2-106,',
                    '[class*="adWrapper-"],',
                    '[class*="ad-"],',
                    '[class*="Ad-"],',
                    '[id*="ad-"],',
                    '[id*="ad_"],',
                    '[id$="-Abp"],',
                    '[id^="Leaderboard-Abp"],',
                    '[id^="Skyscraper-Abp"],',
                    '[id^="Banner-Abp"],',
                    'iframe[data-ad-slot],',
                    'iframe[data-js-adtype="iframead"],',
                    'iframe[src*="/user-sponsorship/"]',
                    '{display:none !important;}'
                ].join('');
                (document.head || document.documentElement).appendChild(s);
            }

            var frames = document.querySelectorAll('iframe');
            for (var i = 0; i < frames.length; i++) {
                var f = frames[i];
                var src = f.src || '';
                var slot = f.getAttribute('data-ad-slot') || '';
                var adtype = f.getAttribute('data-js-adtype') || '';
                if (src.indexOf('/user-sponsorship/') !== -1 ||
                    slot ||
                    adtype === 'iframead') {
                    f.style.display = 'none';
                    var parent = f.parentElement;
                    if (parent && (parent.id || '').toLowerCase().indexOf('abp') !== -1) {
                        parent.style.display = 'none';
                    }
                }
            }
        },
        teardown: function() {
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
        }
    };
})();
