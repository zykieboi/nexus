// ==UserScript==
// @name         Nexus [TESTER EXTENSION]
// @namespace    https://github.com/zykieboi/nexus
// @version      1.4
// @icon         https://github.com/zykieboi/nexus/blob/main/img/icon.png?raw=true
// @author       zykieboi
// @description  Testing stuff :)
// @match        https://octane.wtf/*
// @match        https://*.octane.wtf/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      octane.wtf
// @connect      tcdn.octane.wtf
// @connect      api.coolpixels.net
// @connect      www.roblox.com
// @connect      roblox.com
// @connect      raw.githubusercontent.com
// @run-at       document-start
// @require      https://raw.githubusercontent.com/zykieboi/nexus/testing/build/bundle.js?v=15
// @downloadURL  https://raw.githubusercontent.com/zykieboi/nexus/testing/main.user.js
// @updateURL    https://raw.githubusercontent.com/zykieboi/nexus/testing/main.user.js
// ==/UserScript==
(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};
    window.NX.ui = window.NX.ui || {};
    window.NX.role = null;

    var TAB_ID = 'nx-tab';
    var TAB_CONTENT_HIDE_CLASS = 'nx-hiding';
    var HEADER_FLAG = 'data-nx-swapped';
    var REOPEN_KEY = 'nx_reopen';
    var BASE_TITLE = null;

    var nxOpen = false;
    var reopenConsumed = false;

    function meId() {
        var id = parseInt(localStorage.getItem('nx_me_id') || '0', 10);
        if (id) return id;
        try {
            var u = window.__NEXT_DATA__ && window.__NEXT_DATA__.props
                && window.__NEXT_DATA__.props.pageProps
                && window.__NEXT_DATA__.props.pageProps.user;
            if (u && u.id) {
                localStorage.setItem('nx_me_id', String(u.id));
                return u.id;
            }
        } catch (e) {}
        var a = document.querySelector('a[href*="/users/"][href*="/profile"]');
        if (a) {
            var m = (a.getAttribute('href') || '').match(/\/users\/(\d+)\/profile/);
            if (m) {
                id = parseInt(m[1], 10);
                localStorage.setItem('nx_me_id', String(id));
                return id;
            }
        }
        return 0;
    }

    function meName() {
        try {
            var u = window.__NEXT_DATA__ && window.__NEXT_DATA__.props
                && window.__NEXT_DATA__.props.pageProps
                && window.__NEXT_DATA__.props.pageProps.user;
            if (u && (u.name || u.username)) return u.name || u.username;
        } catch (e) {}
        var el = document.querySelector('.age-bracket-label-username');
        if (el && el.textContent) return el.textContent.trim().replace(/^@/, '');
        return '';
    }

    window.NX.getMeId = meId;
    window.NX.getMeName = meName;

    function refreshRole() {
        return Promise.resolve(null);
    }
    window.NX.refreshRole = refreshRole;

    function accountStyle() {
        if (document.getElementById('nx-account-style')) return;
        var s = document.createElement('style');
        s.id = 'nx-account-style';
        s.textContent = [
            '#settings-container .tab-content.' + TAB_CONTENT_HIDE_CLASS + ' > [ui-view]{display:none}',
            '#settings-container .tab-content.' + TAB_CONTENT_HIDE_CLASS + '{overflow:visible!important;height:auto!important;max-height:none!important}',
            '#settings-container:has(.tab-content.' + TAB_CONTENT_HIDE_CLASS + '){overflow:visible!important;height:auto!important;max-height:none!important}',
            '#' + TAB_ID + '{cursor:pointer}'
        ].join('');
        (document.head || document.documentElement).appendChild(s);
    }

    function makeTabLi() {
        var li = document.createElement('li');
        li.id = TAB_ID;
        li.className = 'menu-option';

        var a = document.createElement('a');
        a.className = 'rbx-tab-heading';
        a.href = '#';
        var span = document.createElement('span');
        span.className = 'font-caption-header';
        span.textContent = 'Nexus';
        a.appendChild(span);
        li.appendChild(a);

        li.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            try { sessionStorage.removeItem(REOPEN_KEY); } catch (err) {}
            openNexus();
        }, true);

        return li;
    }

    function ensureTab() {
        var list = document.getElementById('vertical-menu');
        if (!list) return false;
        if (document.getElementById(TAB_ID)) return true;
        list.appendChild(makeTabLi());
        return true;
    }

    function markActive() {
        var list = document.getElementById('vertical-menu');
        if (!list) return;
        requestAnimationFrame(function () {
            list.querySelectorAll('.menu-option').forEach(function (li) {
                if (li.id === TAB_ID) li.classList.add('active');
                else li.classList.remove('active');
            });
        });
    }

    function clearActive() {
        var tab = document.getElementById(TAB_ID);
        if (tab) tab.classList.remove('active');
    }

    function setTitle() {
        if (BASE_TITLE === null) BASE_TITLE = document.title;
        document.title = BASE_TITLE + ' — Nexus';
    }

    function restoreTitle() {
        if (BASE_TITLE !== null) document.title = BASE_TITLE;
    }

    function swapHeader() {
        var h1 = document.querySelector('.user-account-header');
        if (!h1) return;
        if (h1.getAttribute(HEADER_FLAG) === '1') return;
        h1.setAttribute(HEADER_FLAG, '1');
        h1.setAttribute('data-nx-original', h1.textContent);
        h1.textContent = 'My Nexus Settings';
    }

    function restoreHeader() {
        var h1 = document.querySelector('.user-account-header');
        if (!h1) return;
        if (h1.getAttribute(HEADER_FLAG) !== '1') return;
        var orig = h1.getAttribute('data-nx-original');
        if (orig) h1.textContent = orig;
        h1.removeAttribute(HEADER_FLAG);
        h1.removeAttribute('data-nx-original');
    }

    function ensurePanel() {
        var tabContent = document.querySelector('#settings-container .tab-content');
        if (!tabContent) return null;

        var existing = document.getElementById('nx-panel');
        if (existing && existing.parentNode === tabContent) return existing;

        if (existing) existing.remove();
        if (!window.NX.ui.settingsPage || typeof window.NX.ui.settingsPage.build !== 'function') return null;

        var panel = window.NX.ui.settingsPage.build();
        tabContent.appendChild(panel);
        return panel;
    }

    function openNexus() {
        nxOpen = true;

        var tabContent = document.querySelector('#settings-container .tab-content');
        if (!tabContent) return;

        var panel = ensurePanel();
        if (!panel) return;

        tabContent.classList.add(TAB_CONTENT_HIDE_CLASS);
        panel.classList.add('nx-active');

        ensureTab();
        markActive();
        setTitle();
        swapHeader();
    }

    function closeNexus() {
        nxOpen = false;

        var tabContent = document.querySelector('#settings-container .tab-content');
        if (tabContent) tabContent.classList.remove(TAB_CONTENT_HIDE_CLASS);
        var panel = document.getElementById('nx-panel');
        if (panel) panel.classList.remove('nx-active');
        clearActive();
        restoreTitle();
        restoreHeader();
    }

    function purgeNexusPanel() {
        nxOpen = false;
        var panel = document.getElementById('nx-panel');
        if (panel) panel.remove();
        var tab = document.getElementById(TAB_ID);
        if (tab) tab.remove();
        var tabContent = document.querySelector('#settings-container .tab-content');
        if (tabContent) tabContent.classList.remove(TAB_CONTENT_HIDE_CLASS);
        restoreTitle();
        restoreHeader();
    }

    function isAccountPage() {
        var p = location.pathname;
        return p === '/my/account'
            || p === '/my/settings'
            || p === '/theme2020/setting';
    }

    function isSettingsPage() {
        return isAccountPage() && !!document.getElementById('vertical-menu');
    }

    document.addEventListener('click', function (e) {
        var li = e.target.closest && e.target.closest('#vertical-menu .menu-option');
        if (!li) return;
        if (li.id === TAB_ID) return;
        try { sessionStorage.removeItem(REOPEN_KEY); } catch (err) {}
        closeNexus();
    }, true);

    function consumeReopen() {
        if (reopenConsumed) return false;
        var flag;
        try { flag = sessionStorage.getItem(REOPEN_KEY); } catch (e) {}
        if (flag !== '1') { reopenConsumed = true; return false; }
        try { sessionStorage.removeItem(REOPEN_KEY); } catch (e) {}
        reopenConsumed = true;
        return true;
    }

    function panelTick() {
        accountStyle();

        if (!isAccountPage()) {
            if (document.getElementById(TAB_ID) || document.getElementById('nx-panel')) purgeNexusPanel();
            return;
        }

        if (!isSettingsPage()) return;

        ensureTab();
        observeMenu();

        if (consumeReopen()) { openNexus(); return; }

        if (nxOpen) {
            var tabContent = document.querySelector('#settings-container .tab-content');
            var panel = document.getElementById('nx-panel');
            if (!panel || panel.parentNode !== tabContent) {
                var p = ensurePanel();
                if (p && tabContent) {
                    tabContent.classList.add(TAB_CONTENT_HIDE_CLASS);
                    p.classList.add('nx-active');
                }
            }
        }
    }

    function observeMenu() {
        var list = document.getElementById('vertical-menu');
        if (!list || list.__nxWatched) return;
        list.__nxWatched = true;
        new MutationObserver(function () {
            if (!document.getElementById(TAB_ID)) ensureTab();
        }).observe(list, { childList: true });
    }

    function applyAll() {
        var f = window.NX.features;
        var s = window.NX.settings;
        if (!f || !s) return;

        if (s.get('removeAds') && f.removeAds) f.removeAds.apply();
        if (s.get('hideAlert') && f.hideAlert) f.hideAlert.apply();
        if (s.get('rap') && f.rap) f.rap.apply();
        if (s.get('inventorySearch') && f.inventorySearch) f.inventorySearch.apply();
        if (s.get('bulkUnfriend') && f.bulkUnfriend) f.bulkUnfriend.apply();
        if (s.get('customLogo') && f.customLogo) f.customLogo.apply();
        if (s.get('roblox2019') && f.roblox2019) f.roblox2019.apply();
        if (s.get('hideChat') && f.hideChat) f.hideChat.apply();
        if (s.get('customFont') && f.customFont) f.customFont.apply();
        if (s.get('nexusPanel') && f.nexusPanel) f.nexusPanel.apply();
        if (s.get('background') && f.background) f.background.apply();
        if (s.get('userBadge') && f.userBadge) f.userBadge.apply();
        if (s.get('tradeValues') && f.tradeValues) f.tradeValues.apply();
        if (s.get('itemOwners') && f.itemOwners) f.itemOwners.apply();
        if (s.get('quickSearch') && f.quickSearch) f.quickSearch.apply();
        if (s.get('rblxImport') && f.rblxImport) f.rblxImport.apply();
        if (f.announcement) f.announcement.apply();
    }

    function tick() {
        var isFrame = location.pathname.indexOf('/theme2020/') === 0;

        panelTick();

        var f = window.NX.features;
        var s = window.NX.settings;
        if (!f || !s) return;

        if (isFrame) {
            var fb = f.background;
            var ub = f.userBadge;
            var tv = f.tradeValues;
            var ri = f.rblxImport;
            if (s.get('background') && fb) fb.apply();
            if (s.get('userBadge') && ub) ub.apply();
            if (s.get('tradeValues') && tv) tv.apply();
            if (s.get('rblxImport') && ri) ri.apply();
            return;
        }

        if (s.get('removeAds') && f.removeAds) f.removeAds.apply();
        if (s.get('hideAlert') && f.hideAlert) f.hideAlert.apply();
        if (s.get('rap') && f.rap) f.rap.apply();
        if (s.get('inventorySearch') && f.inventorySearch) f.inventorySearch.apply();
        if (s.get('bulkUnfriend') && f.bulkUnfriend) f.bulkUnfriend.apply();
        if (s.get('tradeValues') && f.tradeValues) f.tradeValues.apply();
        if (s.get('quickSearch') && f.quickSearch) f.quickSearch.apply();
    }

    var tries = 0;
    var burst = setInterval(function () {
        tick();
        if (++tries > 40) clearInterval(burst);
    }, 50);

    setInterval(tick, 500);

    new MutationObserver(tick).observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    function wrapHistory(name) {
        var orig = history[name];
        history[name] = function () {
            var r = orig.apply(this, arguments);
            setTimeout(tick, 0);
            setTimeout(tick, 100);
            setTimeout(tick, 400);
            return r;
        };
    }
    wrapHistory('pushState');
    wrapHistory('replaceState');
    window.addEventListener('popstate', function () { setTimeout(tick, 0); });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) clearInterval(burst);
    });

    var booted = false;
    function boot() {
        if (booted) return;
        booted = true;
        refreshRole().then(function () {
            applyAll();
            tick();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
    setTimeout(boot, 1200);
})();
