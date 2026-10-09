// src/features/UserBadge.js

(function () {
    'use strict';

    var STYLE_ID = 'nx-ub-style';

    var BADGES = {
        '1043': {
            label: 'Nexus Contributor',
            icon: 'https://github.com/zykieboi/nexus/blob/main/img/opsec.png?raw=true'
        }
    };

    var CSS =
        '.nx-ub{flex:0 0 auto;float:none;display:inline-block;' +
        'background-repeat:no-repeat;background-size:contain;' +
        'background-position:center center;vertical-align:middle;' +
        'margin-left:-4px;margin-right:0}';

    function addStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function profileId() {
        var q = new URLSearchParams(location.search).get('userId');
        if (q) return q;
        var m = location.pathname.match(/\/theme2020\/users\/(\d+)/);
        return m ? m[1] : null;
    }

    function makeBadge(info, size) {
        var el = document.createElement('span');
        el.className = 'nx-ub';
        el.title = info.label;
        el.style.backgroundImage = 'url("' + info.icon + '")';
        el.style.width = size;
        el.style.height = size;
        return el;
    }

    function place(header) {
        var id = profileId();
        var info = BADGES[id];
        var existing = header.querySelector('.nx-ub');

        if (!info) {
            if (existing) existing.remove();
            return;
        }

        var h2 = header.querySelector('h2.profile-name');
        if (!h2) return;

        var size = Math.round(parseFloat(getComputedStyle(h2).fontSize) || 26) + 'px';

        if (existing) {
            existing.style.width = size;
            existing.style.height = size;
            return;
        }

        var badge = makeBadge(info, size);
        var h3 = header.querySelector('h3.profile-name');

        if (h3) h3.parentNode.insertBefore(badge, h3);
        else h2.parentNode.insertBefore(badge, h2.nextSibling);
    }

    function scan() {
        var headers = document.querySelectorAll('.header-title');
        for (var i = 0; i < headers.length; i++) place(headers[i]);
    }

    function apply() {
        addStyle();
        scan();

        if (!window.__nxUbObs) {
            window.__nxUbObs = new MutationObserver(scan);
            window.__nxUbObs.observe(document.documentElement, { childList: true, subtree: true });
        }
        if (!window.__nxUbInt) {
            window.__nxUbInt = setInterval(scan, 1500);
        }
    }

    apply();
})();
