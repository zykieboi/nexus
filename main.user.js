// ==UserScript==
// @name         Nexus - NX
// @namespace    https://github.com/zykieboi/nexus
// @version      1.0.2
// @icon         https://github.com/zykieboi/nexus/blob/main/img/icon.png?raw=true
// @author       zykieboi
// @description  Testing stuff :)
// @match        https://www.aisaka.me/*
// @match        aisaka.me/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      nexus-admin.masonreed-exe.workers.dev
// @run-at       document-end
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/core/settings.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/core/csrf.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/core/server.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/remove-ads.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/hide-alert.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/rap.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/inventory-search.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/bulk-unfriend.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/trade-2020.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/offsale.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/announcement.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/admin/panel.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/admin/gate.js
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/ui/modal.js
// @downloadURL  https://raw.githubusercontent.com/zykieboi/nexus/main/main.user.js
// @updateURL    https://raw.githubusercontent.com/zykieboi/nexus/main/main.user.js
// ==/UserScript==

(function() {
    'use strict';

    var DEV_ID = 59420;

    var style = document.createElement('style');
    style.textContent = `
        #nx-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.6);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #nx-modal {
            background: #232527;
            border-radius: 12px;
            width: 90%;
            max-width: 520px;
            max-height: 78vh;
            color: #e0e0e0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            border: 1px solid #343638;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        #nx-modal .nx-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding: 22px 26px 14px;
            border-bottom: 1px solid #343638;
            flex-shrink: 0;
        }
        #nx-modal .title-block {
            display: flex;
            flex-direction: column;
        }
        #nx-modal h2 {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
            color: #fff;
            letter-spacing: -0.2px;
        }
        #nx-modal .sub {
            color: #7a7d80;
            font-size: 13px;
            margin-top: 3px;
        }
        #nx-modal .close {
            font-size: 24px;
            line-height: 1;
            cursor: pointer;
            color: #6a6d70;
            background: none;
            border: none;
            padding: 0 4px;
            margin-top: -2px;
            transition: color 0.15s;
        }
        #nx-modal .close:hover {
            color: #fff;
        }
        #nx-modal .nx-content {
            padding: 8px 26px 4px;
            overflow-y: auto;
            flex: 1 1 auto;
        }
        #nx-modal .nx-content::-webkit-scrollbar {
            width: 8px;
        }
        #nx-modal .nx-content::-webkit-scrollbar-track {
            background: transparent;
        }
        #nx-modal .nx-content::-webkit-scrollbar-thumb {
            background: #3a3d40;
            border-radius: 4px;
        }
        #nx-modal .nx-content::-webkit-scrollbar-thumb:hover {
            background: #4a4d50;
        }
        .nx-cat {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            color: #7a7d80;
            margin: 20px 0 6px 0;
            padding-bottom: 6px;
            border-bottom: 1px solid #2f3133;
        }
        .nx-cat.first {
            margin-top: 12px;
        }
        .nx-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding: 11px 10px;
            gap: 16px;
            border-radius: 6px;
            transition: background 0.12s;
        }
        .nx-row:hover {
            background: #2a2c2e;
        }
        .nx-row-text {
            flex: 1;
            min-width: 0;
        }
        .nx-row-text .nx-label {
            font-size: 14px;
            font-weight: 500;
            color: #e8e8e8;
            display: block;
        }
        .nx-row-text .nx-desc {
            font-size: 12px;
            color: #85888b;
            display: block;
            margin-top: 3px;
            line-height: 1.45;
        }
        .nx-toggle {
            position: relative;
            width: 40px;
            height: 22px;
            flex-shrink: 0;
            cursor: pointer;
            margin-top: 1px;
        }
        .nx-toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .nx-toggle .slider {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #3d4043;
            border-radius: 22px;
            transition: background 0.2s;
        }
        .nx-toggle .slider::before {
            content: '';
            position: absolute;
            height: 16px;
            width: 16px;
            left: 3px;
            top: 3px;
            background: #c8cacc;
            border-radius: 50%;
            transition: transform 0.2s, background 0.2s;
        }
        .nx-toggle input:checked + .slider {
            background: #22a24a;
        }
        .nx-toggle input:checked + .slider::before {
            transform: translateX(18px);
            background: #fff;
        }
        #nx-modal .nx-footer {
            padding: 14px 26px 20px;
            border-top: 1px solid #343638;
            flex-shrink: 0;
        }
        #nx-modal .save-btn {
            padding: 10px 24px;
            background: #0a84ff;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: background 0.15s;
        }
        #nx-modal .save-btn:hover {
            background: #0a76e0;
        }
    `;
    document.head.appendChild(style);

    function getMeId() {
        var cached = parseInt(localStorage.getItem('nx_me_id') || '0', 10);
        if (cached) return cached;
        try {
            var me = window.__NEXT_DATA__
                && window.__NEXT_DATA__.props
                && window.__NEXT_DATA__.props.pageProps
                && window.__NEXT_DATA__.props.pageProps.user;
            if (me && me.id) {
                localStorage.setItem('nx_me_id', String(me.id));
                return me.id;
            }
        } catch (e) {}
        var link = document.querySelector('a[href*="/users/"][href*="/profile"]');
        if (link) {
            var m = (link.getAttribute('href') || '').match(/\/users\/(\d+)\/profile/);
            if (m) {
                var id = parseInt(m[1], 10);
                localStorage.setItem('nx_me_id', String(id));
                return id;
            }
        }
        return 0;
    }

    function getMeName() {
        try {
            var me = window.__NEXT_DATA__
                && window.__NEXT_DATA__.props
                && window.__NEXT_DATA__.props.pageProps
                && window.__NEXT_DATA__.props.pageProps.user;
            if (me && me.name) return me.name;
            if (me && me.username) return me.username;
        } catch (e) {}
        var el = document.querySelector('.helloMessage-0-2-50 span:last-child');
        if (el && el.textContent) return el.textContent.trim();
        var nameEl = document.querySelector('[class*="helloMessage-"] span:last-child');
        if (nameEl && nameEl.textContent) return nameEl.textContent.trim();
        return '';
    }

    window.NX.getMeId = getMeId;
    window.NX.getMeName = getMeName;

    function renameRobuxTab() {
        var selectors = [
            '.navlinks-0-2-4 .linkEntry-0-2-20',
            '.navlinksRow-0-2-7 .linkEntry-0-2-20'
        ];
        var links = document.querySelectorAll(selectors.join(','));
        links.forEach(function(tab) {
            if (tab.dataset.nxRenamed) return;
            var href = tab.getAttribute('href');
            var text = (tab.textContent || '').trim();
            if (href !== '/transactions' && text !== 'Robux') return;
            tab.dataset.nxRenamed = '1';
            tab.textContent = 'Nexus';
            tab.removeAttribute('href');
            tab.style.cursor = 'pointer';
        });
    }

    document.addEventListener('click', function(e) {
        var target = e.target.closest('[data-nx-renamed="1"]');
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.NX.ui.modal.build();
    }, true);

    function makeLogoClickable() {
        document.querySelectorAll('.imgDesktop-0-2-12, .imgMobile-0-2-13').forEach(function(logo) {
            if (logo.dataset.nxLogo) return;
            logo.dataset.nxLogo = '1';
            logo.style.cursor = 'pointer';
            logo.addEventListener('click', function() {
                window.location.href = '/home';
            });
        });
    }

    function injectPanelLink() {
        var existing = document.getElementById('nx-panel-link');

        if (getMeId() !== DEV_ID || !window.NX.settings.get('nexusPanel')) {
            if (existing) existing.remove();
            return;
        }
        if (existing) return;

        var sidebarLinks = document.querySelectorAll('a[href="/home"], a[href="/groups"], a[href="/trades"]');
        var card = null;
        for (var i = 0; i < sidebarLinks.length; i++) {
            var p = sidebarLinks[i].parentNode;
            if (p && p.className && /card-0-2-/.test(p.className)) {
                card = p;
                break;
            }
        }
        if (!card) return;

        var anyLink = card.querySelector('a[class*="link-0-2-"]');
        var linkClass = anyLink ? anyLink.className : 'link-0-2-162';
        var wrapperClass = 'wrapper-0-2-161 hover-icon-nav-group';
        var entryClass = 'linkEntry-0-2-159';
        var nameClass = 'name-0-2-160';

        if (anyLink) {
            var w = anyLink.querySelector('[class*="wrapper-0-2-"]');
            if (w) wrapperClass = w.className;
            var e = anyLink.querySelector('[class*="linkEntry-0-2-"]');
            if (e) entryClass = e.className;
            var n = anyLink.querySelector('[class*="name-0-2-"]');
            if (n) nameClass = n.className;
        }

        var a = document.createElement('a');
        a.className = linkClass + ' link-nx-panel';
        a.href = '/home#nexus-admin';
        a.id = 'nx-panel-link';
        a.style.cursor = 'pointer';

        var wrapper = document.createElement('div');
        wrapper.className = wrapperClass;

        var p2 = document.createElement('p');
        p2.className = entryClass;

        var icon = document.createElement('span');
        icon.className = 'icon-nav-group';

        var name = document.createElement('span');
        name.className = nameClass;
        name.textContent = 'Nexus Panel';

        p2.appendChild(icon);
        p2.appendChild(document.createTextNode(' '));
        p2.appendChild(name);
        wrapper.appendChild(p2);
        a.appendChild(wrapper);

        var promo = null;
        var anchors = card.querySelectorAll('a');
        for (var j = 0; j < anchors.length; j++) {
            if (!anchors[j].getAttribute('href')) { promo = anchors[j]; break; }
        }
        if (promo) card.insertBefore(a, promo);
        else card.appendChild(a);
    }

    function applyAll() {
        if (window.NX.settings.get('removeAds')) window.NX.features.removeAds.apply();
        if (window.NX.settings.get('hideAlert')) window.NX.features.hideAlert.apply();
        if (window.NX.settings.get('rap')) window.NX.features.rap.apply();
        if (window.NX.settings.get('inventorySearch')) window.NX.features.inventorySearch.apply();
        if (window.NX.settings.get('bulkUnfriend')) window.NX.features.bulkUnfriend.apply();
        if (window.NX.settings.get('trade2020')) window.NX.features.trade2020.apply();
        if (window.NX.features.offsale) window.NX.features.offsale.apply();
        if (window.NX.settings.get('nexusPanel')) window.NX.features.nexusPanel.apply();
        if (window.NX.features.announcement) window.NX.features.announcement.apply();
    }

    setTimeout(function() {
        renameRobuxTab();
        makeLogoClickable();
        injectPanelLink();
        applyAll();
    }, 1000);

    var observer = new MutationObserver(function() {
        renameRobuxTab();
        makeLogoClickable();
        injectPanelLink();
        if (window.NX.settings.get('rap')) window.NX.features.rap.apply();
        if (window.NX.settings.get('bulkUnfriend')) window.NX.features.bulkUnfriend.apply();
        if (window.NX.features.offsale) window.NX.features.offsale.apply();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
