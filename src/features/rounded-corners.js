(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-rounded-style';
    var RADIUS_KEY = 'nx_rounded_radius';

    var watchIv = null;

    function getRadius() {
        var v = parseInt(GM_getValue(RADIUS_KEY, '8'), 10);
        return isNaN(v) ? 8 : Math.max(2, Math.min(24, v));
    }

    function ensureStyle() {
        var old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        var r = getRadius();
        var rSmall = Math.max(2, Math.round(r * 0.5));
        var rPill = Math.round(r * 2.5);

        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '[class*="card-0-2-"], [class*="card-d"]{border-radius:' + r + 'px !important;}',
            '[class*="cardWrapper-0-2-"], [class*="friendCardWrapper-"]{border-radius:' + r + 'px !important;}',
            '[class*="imageWrapper-0-2-"], [class*="imgWrap-0-2-"], [class*="imgCont-0-2-"]{border-radius:' + r + 'px !important;overflow:hidden;}',
            '[class*="thumbnailWrapper-0-2-"], [class*="thumbnailMask-0-2-"]{border-radius:' + rPill + 'px !important;overflow:hidden;}',
            '[class*="avatarWrapper-0-2-"], [class*="headshotWrapper-0-2-"], [class*="iconWrapper-0-2-"]{border-radius:' + rPill + 'px !important;overflow:hidden;}',
            'button, .btn, [class*="btn-0-2-"]{border-radius:' + rSmall + 'px !important;}',
            'input, select, textarea, [class*="input-0-2-"], [class*="select-0-2-"]{border-radius:' + rSmall + 'px !important;}',
            '[class*="searchWrap-0-2-"] [class*="wrapper-0-2-"]{border-radius:' + rPill + 'px !important;}',
            '[class*="alertBg-0-2-"], #nx-announce-banner{border-radius:' + r + 'px !important;}',
            '[class*="modalWrapper-0-2-"], [class*="innerSection-0-2-"]{border-radius:' + r + 'px !important;}',
            '[class*="vTab-0-2-"]{border-radius:' + rSmall + 'px ' + rSmall + 'px 0 0 !important;}',
            '[class*="dropdown-0-2-"], [class*="boxDropdown-0-2-"]{border-radius:' + rSmall + 'px !important;overflow:hidden;}',
            '[class*="adWrapper-0-2-"] img, [class*="adImage-0-2-"]{border-radius:' + r + 'px !important;}',
            'img[class*="image-0-2-"]{border-radius:' + r + 'px !important;}',
            '[class*="labelWrapper-0-2-"], [class*="overlayLimited-"]{border-radius:' + rSmall + 'px !important;}',
            '[class*="gameCard-0-2-"], [class*="gameCardContainer-0-2-"]{border-radius:' + r + 'px !important;overflow:hidden;}',
            '[class*="iconCard-0-2-"]{border-radius:' + r + 'px !important;overflow:hidden;}',
            '[class*="box-0-2-"]{border-radius:' + rSmall + 'px !important;}',
            '[class*="pagerButton-0-2-"]{border-radius:' + rPill + 'px !important;}',
            '[class*="pagination-0-2-"] span{border-radius:' + rPill + 'px !important;}',
            '[class*="sidebar"] [class*="link"], [class*="link-0-2-"]{border-radius:' + rSmall + 'px !important;}',
            '[class*="promocode"], [class*="Promocode"]{border-radius:' + rSmall + 'px !important;}',
            '[class*="panel"][class*="card"]{border-radius:' + r + 'px !important;}',
            '.generic{border-radius:' + rPill + 'px !important;}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function startWatching() {
        if (watchIv) clearInterval(watchIv);
        var last = location.href;
        watchIv = setInterval(function() {
            if (location.href !== last) {
                last = location.href;
                if (!document.getElementById(STYLE_ID)) ensureStyle();
            }
        }, 400);
    }

    function stopWatching() {
        if (watchIv) {
            clearInterval(watchIv);
            watchIv = null;
        }
    }

    window.NX.features.roundedCorners = {
        apply: function() {
            ensureStyle();
            startWatching();
        },
        teardown: function() {
            stopWatching();
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
        },
        setRadius: function(r) {
            GM_setValue(RADIUS_KEY, String(r));
            ensureStyle();
        },
        getRadius: getRadius
    };

})();
