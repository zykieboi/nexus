(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-remove-ads';

    var CSS = [
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

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }

    function killAds() {
        var frames = document.querySelectorAll('iframe');
        for (var i = 0; i < frames.length; i++) {
            var f = frames[i];
            var src = f.src || '';
            var slot = f.getAttribute('data-ad-slot') || '';
            var adtype = f.getAttribute('data-js-adtype') || '';
            if (src.indexOf('/user-sponsorship/') !== -1 || slot || adtype === 'iframead') {
                f.style.display = 'none';
                var parent = f.parentElement;
                if (parent) {
                    var pid = (parent.id || '').toLowerCase();
                    var pcls = (parent.className || '') + '';
                    if (pid.indexOf('abp') !== -1 || pcls.indexOf('abp') !== -1) {
                        parent.style.display = 'none';
                    }
                }
                try {
                    var inner = f.contentDocument;
                    if (inner && inner.body) {
                        inner.body.style.display = 'none';
                        var ads = inner.querySelectorAll('a.ad, .ad-annotations, .ad-identification');
                        for (var j = 0; j < ads.length; j++) ads[j].style.display = 'none';
                    }
                } catch (e) {}
            }
        }
    }

    var scanner = null;

    window.NX.features.removeAds = {
        apply: function() {
            style();
            killAds();
            if (!scanner) scanner = setInterval(killAds, 400);
        },
        teardown: function() {
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
            if (scanner) { clearInterval(scanner); scanner = null; }
        }
    };
})();
