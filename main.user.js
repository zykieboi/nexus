// ==UserScript==
// @name         Nexus - NX
// @namespace    https://github.com/zykieboi/nexus
// @version      1.0.7.0
// @icon         https://github.com/zykieboi/nexus/blob/main/img/icon.png?raw=true
// @author       zykieboi
// @description  Testing stuff :)
// @match        https://octane.wtf/theme2020/*
// @match        https://octane.wtf/*
// @match        https://*.octane.wtf/*
// @match        https://*.octane.wtf/theme2020/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      octane.wtf
// @connect      nexus-admin.masonreed-exe.workers.dev
// @connect      tcdn.octane.wtf
// @connect      raw.githubusercontent.com
// @run-at       document-start
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/core/settings.js?v=3
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/core/csrf.js?v=3
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/core/server.js?v=3
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/remove-ads.js?v=4
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/hide-alert.js?v=3
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/rap.js?v=3
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/inventory-search.js?v=3
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/bulk-unfriend.js?v=3
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/announcement.js?v=3
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/explorer.js?v=3
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/custom-background.js?v=3
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/features/custom-logo.js?v=3
// @require      https://raw.githubusercontent.com/zykieboi/nexus/main/src/ui/modal.js?v=3
// @downloadURL  https://raw.githubusercontent.com/zykieboi/nexus/main/main.user.js
// @updateURL    https://raw.githubusercontent.com/zykieboi/nexus/main/main.user.js
// ==/UserScript==

(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};
    window.NX.ui = window.NX.ui || {};

    var hosts = ['octane.wtf', 'nexus-admin.masonreed-exe.workers.dev'];

    hosts.forEach(function (host) {
        GM_xmlhttpRequest({
            method: 'HEAD',
            url: 'https://' + host + '/',
            timeout: 4000,
            onerror: function () { GM_setValue('nx_host_fail', host); }
        });
    });

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

    function sidebarList() {
        return document.querySelector('#left-navigation-container .left-col-list')
            || document.querySelector('.left-col-list');
    }

    function groupsItem(list) {
        var links = list.querySelectorAll('a');
        for (var i = 0; i < links.length; i++) {
            if (links[i].getAttribute('href') === '/groups') {
                return links[i].closest('li');
            }
        }
        return null;
    }

    function injectSidebar() {
        var list = sidebarList();
        if (!list) return;
        var anchor = groupsItem(list);
        if (!anchor) return;

        if (!document.getElementById('nav-nexus')) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.className = 'dynamic-overflow-container text-nav';
            a.id = 'nav-nexus';
            a.href = '/#';

            var wrap = document.createElement('div');
            var ic = document.createElement('span');
            ic.className = 'icon-nav-blog';
            wrap.appendChild(ic);

            var txt = document.createElement('span');
            txt.className = 'font-header-2 dynamic-ellipsis-item';
            txt.textContent = 'Nexus';

            a.appendChild(wrap);
            a.appendChild(txt);

            a.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.NX.ui.modal.build();
            }, true);

            li.appendChild(a);
            anchor.parentNode.insertBefore(li, anchor.nextSibling);
        }
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
        if (s.get('explorer') && f.explorer) f.explorer.apply();
        if (s.get('customBackground') && f.customBackground) f.customBackground.apply();
        if (s.get('customLogo') && f.customLogo) f.customLogo.apply();
        if (f.announcement) f.announcement.apply();
    }

    function tick() {
        injectSidebar();

        var f = window.NX.features;
        var s = window.NX.settings;
        if (!f || !s) return;

        if (s.get('removeAds') && f.removeAds) f.removeAds.apply();
        if (s.get('hideAlert') && f.hideAlert) f.hideAlert.apply();
        if (s.get('rap') && f.rap) f.rap.apply();
        if (s.get('inventorySearch') && f.inventorySearch) f.inventorySearch.apply();
        if (s.get('bulkUnfriend') && f.bulkUnfriend) f.bulkUnfriend.apply();
        if (s.get('explorer') && f.explorer) f.explorer.apply();
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

    function boot() {
        applyAll();
        tick();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
    setTimeout(boot, 1200);
})();
