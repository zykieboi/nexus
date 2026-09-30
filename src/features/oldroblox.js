(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var FAVICON = 'https://images.rbxcdn.com/23421382939a9f4ae8bbe60dbe2a3e7e.ico.gzip';
    var NAV_LOGO = 'https://files.catbox.moe/2sx3l1.png';
    var NAV_ICON = 'https://images.rbxcdn.com/23421382939a9f4ae8bbe60dbe2a3e7e.ico.gzip';

    var CSS_ID = 'nx-rblx-theme';
    var CSS = [
        '.left-col-logo a,',
        '.navbar-brand,',
        'a.navbar-brand,',
        '.rbx-header .logo{',
        'visibility:hidden !important;',
        'position:relative !important;',
        'display:inline-block !important;',
        'width:140px !important;',
        'height:40px !important}',
        '.left-col-logo a::before,',
        '.navbar-brand::before,',
        'a.navbar-brand::before,',
        '.rbx-header .logo::before{',
        'content:"" !important;',
        'visibility:visible !important;',
        'position:absolute !important;',
        'left:0 !important;top:0 !important;',
        'width:100% !important;height:100% !important;',
        'background-image:url("' + NAV_LOGO + '") !important;',
        'background-size:contain !important;',
        'background-repeat:no-repeat !important;',
        'background-position:left center !important}',
        '@media (max-width:991px){',
        '#navigation-container .navbar-brand,',
        '#navigation-container a.navbar-brand,',
        '#navigation-container .rbx-header .logo,',
        '#navigation-container .left-col-logo a{',
        'width:38px !important;height:32px !important}',
        '#navigation-container .navbar-brand::before,',
        '#navigation-container a.navbar-brand::before,',
        '#navigation-container .rbx-header .logo::before,',
        '#navigation-container .left-col-logo a::before{',
        'background-image:url("' + NAV_ICON + '") !important;',
        'background-size:contain !important;',
        'background-position:center !important}}',
        '.icon-nav-tix{',
        'background-image:url("https://images.rbxcdn.com/53374db5b6c1b349a20d0471ea032868-navigation_dark.svg") !important;',
        'background-position:0 -56px !important}',
        '#nav-tix-icon .icon-nav-tix:hover{background-position:-28px -56px !important}',
        '#notifications-bell-badge.bell-red-badge{background-color:#fff;border-color:#fff}',
        '.dark-theme #notifications-bell-badge.bell-red-badge{color:#141313}',
        '#nav-robux-icon .notification-red.robux-badge{background-color:#fff;border-color:#fff}',
        '.rbx-header .rbx-navbar-icon-group .buy-robux-link-container .new-item-pill.small{background-color:#f90707;color:#fff}'
    ].join('');

    var titleObserver = null;
    var bodyObserver = null;
    var titlePatched = false;
    var origTitleDesc = null;
    var loaded = false;

    function injectCSS() {
        if (document.getElementById(CSS_ID)) return;
        var s = document.createElement('style');
        s.id = CSS_ID;
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }

    function removeCSS() {
        var s = document.getElementById(CSS_ID);
        if (s) s.remove();
    }

    function setFavicon() {
        var link = document.querySelector('link[rel="icon"]');
        if (link) {
            if (link.getAttribute('href') !== FAVICON) {
                link.setAttribute('href', FAVICON);
                link.setAttribute('type', 'image/png');
            }
            return;
        }
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.href = FAVICON;
        (document.head || document.documentElement).appendChild(link);
    }

    function swapText(text) {
        return text ? text.replace(/Octane/g, 'ROBLOX') : text;
    }

    function patchTitle() {
        if (titlePatched) return;
        try {
            origTitleDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'title')
                || Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'title');
            if (origTitleDesc && origTitleDesc.set) {
                Object.defineProperty(document, 'title', {
                    configurable: true,
                    get: function () { return origTitleDesc.get.call(document); },
                    set: function (v) { origTitleDesc.set.call(document, swapText(v)); }
                });
                titlePatched = true;
            }
        } catch (e) {}
    }

    function unpatchTitle() {
        if (!titlePatched) return;
        try {
            if (origTitleDesc) {
                Object.defineProperty(document, 'title', origTitleDesc);
            }
        } catch (e) {}
        titlePatched = false;
    }

    function fixTitleEl(el) {
        if (!el) return;
        var t = el.textContent;
        if (!t || t.indexOf('Octane') === -1) return;
        el.textContent = swapText(t);
    }

    function watchTitle() {
        var head = document.head;
        if (!head || titleObserver) return;
        titleObserver = new MutationObserver(function () {
            var titles = head.getElementsByTagName('title');
            for (var i = 0; i < titles.length; i++) fixTitleEl(titles[i]);
        });
        titleObserver.observe(head, { childList: true, subtree: true, characterData: true });
    }

    function unwatchTitle() {
        if (titleObserver) { titleObserver.disconnect(); titleObserver = null; }
    }

    function fixTextNode(node) {
        var v = node.nodeValue;
        if (!v || v.indexOf('Octane') === -1) return;
        node.nodeValue = v.replace(/Octane/g, 'ROBLOX');
    }

    function walk(node) {
        if (node.nodeType === 3) { fixTextNode(node); return; }
        if (node.nodeType !== 1) return;
        var tag = node.tagName;
        if (tag === 'IFRAME' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TITLE') return;
        var kids = node.childNodes;
        for (var i = 0, l = kids.length; i < l; i++) walk(kids[i]);
    }

    function onBodyMutations(mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            if (m.type === 'characterData') { fixTextNode(m.target); continue; }
            var added = m.addedNodes;
            for (var j = 0; j < added.length; j++) {
                var n = added[j];
                if (n.nodeType === 3) fixTextNode(n);
                else if (n.nodeType === 1) walk(n);
            }
        }
    }

    function startBodyObserver() {
        if (!document.body || bodyObserver) return;
        bodyObserver = new MutationObserver(onBodyMutations);
        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        walk(document.body);
    }

    function stopBodyObserver() {
        if (bodyObserver) { bodyObserver.disconnect(); bodyObserver = null; }
    }

    function onLoad() {
        loaded = true;
        injectCSS();
        setFavicon();
        watchTitle();
        if (document.body) walk(document.body);
    }

    function apply() {
        injectCSS();
        setFavicon();
        patchTitle();
        watchTitle();
        var titles = document.getElementsByTagName('title');
        for (var i = 0; i < titles.length; i++) fixTitleEl(titles[i]);
        if (document.body) startBodyObserver();
        else document.addEventListener('DOMContentLoaded', startBodyObserver, { once: true });
        if (!loaded) {
            window.addEventListener('load', onLoad, { once: true });
        }
    }

    function teardown() {
        removeCSS();
        unwatchTitle();
        stopBodyObserver();
        unpatchTitle();
    }

    window.NX.features.roblox2019 = {
        apply: apply,
        teardown: teardown
    };
})();
