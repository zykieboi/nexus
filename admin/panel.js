(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var CSS_ID = 'nx-panel-style';
    var THEME_CSS_ID = 'nx-panel-theme-style';
    var HASH = '#nexus-admin';
    var SEARCH_API = '/search/users/results';

    var ROLE_RANK = { user: 0, panel: 1, moderator: 2, admin: 3, dev: 4 };

    var FEATURES = [
        { key: 'removeAds', label: 'Remove Ads', desc: 'Hides all advertisement banners and skyscrapers across the site.' },
        { key: 'hideAlert', label: 'Hide Alert', desc: 'Hides the alert banner under the navigation bar.' },
        { key: 'rap', label: 'RAP on Profile', desc: 'Shows the user\'s total RAP next to their friends/followers stats.' },
        { key: 'inventorySearch', label: 'Inventory Search', desc: 'Adds a search bar to your inventory so you can filter items by name.' },
        { key: 'bulkUnfriend', label: 'Bulk Unfriend', desc: 'Select multiple friends and remove them all at once from the friends page.' },
        { key: 'trade2020', label: '2020 Trade Theme', desc: 'Replaces the default trade list and window with the 2020 Roblox layout.' },
        { key: 'explorer', label: 'Explorer', desc: 'View the instance tree of any catalog asset.' }
    ];

    var BASE_CSS = [
        '.nxp-root{min-height:calc(100vh - 60px);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px;box-sizing:border-box}',
        '.nxp-root *{box-sizing:border-box}',
        '.nxp-shell{max-width:1100px;margin:0 auto}',
        '.nxp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px}',
        '.nxp-title{font-size:26px;font-weight:600;margin:0}',
        '.nxp-sub{font-size:13px;margin-top:4px}',
        '.nxp-back{border-radius:6px;padding:8px 14px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none !important}',
        '.nxp-tabs{display:flex;gap:4px;margin-bottom:20px;flex-wrap:wrap}',
        '.nxp-tab{background:transparent;border:0;font-size:14px;font-weight:500;padding:8px 14px;border-radius:6px;cursor:pointer;font-family:inherit}',
        '.nxp-panel{border-radius:10px;padding:20px}',
        '.nxp-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;gap:16px}',
        '.nxp-row:last-child{border-bottom:0}',
        '.nxp-user{display:flex;flex-direction:column;min-width:0;flex:1}',
        '.nxp-name{font-size:14px;font-weight:500}',
        '.nxp-meta{font-size:12px;margin-top:2px;word-break:break-all}',
        '.nxp-tag{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;margin-left:8px;vertical-align:middle}',
        '.nxp-tag.dev{background:#7a4ce0;color:#fff}',
        '.nxp-tag.admin{background:#0a84ff;color:#fff}',
        '.nxp-tag.moderator{background:#0a84ff;color:#fff;opacity:0.75}',
        '.nxp-tag.panel{background:#4a4d50;color:#e0e0e0}',
        '.nxp-tag.banned{background:#e5484d;color:#fff}',
        '.nxp-tag.ok{background:#2a6b3a;color:#d6f5dd}',
        '.nxp-tag.warn{background:#6b5a2a;color:#f5e5c0}',
        '.nxp-tag.off{background:#4a2a2a;color:#f5c0c0}',
        '.nxp-btn{border-radius:6px;padding:6px 12px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit}',
        '.nxp-btn.danger{border-color:#e5484d;color:#e5484d}',
        '.nxp-btn.danger:hover{background:#e5484d;color:#fff}',
        '.nxp-btn.primary{background:#0a84ff;border-color:#0a84ff;color:#fff}',
        '.nxp-btn.primary:hover{background:#0a76e0}',
        '.nxp-btn:disabled{opacity:0.5;cursor:not-allowed}',
        '.nxp-btn-group{display:flex;gap:8px;flex-wrap:wrap}',
        '.nxp-input{border-radius:6px;padding:8px 10px;font-family:inherit;font-size:13px;width:100%}',
        '.nxp-input:focus{outline:none;border-color:#0a84ff}',
        '.nxp-select{border-radius:6px;padding:8px 10px;font-family:inherit;font-size:13px}',
        '.nxp-textarea{width:100%;min-height:110px;border-radius:6px;padding:10px;font-family:inherit;font-size:13px;resize:vertical;line-height:1.5}',
        '.nxp-textarea:focus{outline:none;border-color:#0a84ff}',
        '.nxp-empty{font-size:13px;text-align:center;padding:32px 0}',
        '.nxp-feedback{margin-top:14px;font-size:13px;padding:10px 12px;border-radius:6px}',
        '.nxp-feedback.ok{color:#3ecf5a;background:rgba(62,207,90,0.08);border:1px solid rgba(62,207,90,0.3)}',
        '.nxp-feedback.err{color:#e5484d;background:rgba(229,72,77,0.08);border:1px solid rgba(229,72,77,0.3)}',
        '.nxp-stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}',
        '.nxp-stat{border-radius:8px;padding:14px}',
        '.nxp-stat-label{font-size:11px;text-transform:uppercase;letter-spacing:0.6px;font-weight:600}',
        '.nxp-stat-value{font-size:24px;font-weight:600;margin-top:6px}',
        '.nxp-section-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.7px;margin:0 0 12px}',
        '.nxp-detail-grid{display:grid;grid-template-columns:160px 1fr;gap:8px 16px;margin-top:8px}',
        '.nxp-detail-key{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding-top:2px}',
        '.nxp-detail-val{font-size:13px;word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
        '.nxp-log{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;padding:8px 0;word-break:break-all;line-height:1.5}',
        '.nxp-log:last-child{border-bottom:0}',
        '.nxp-toggle{display:flex;align-items:center;gap:10px;padding:12px 0}',
        '.nxp-toggle:last-child{border-bottom:0}',
        '.nxp-toggle-info{flex:1;min-width:0}',
        '.nxp-switch{position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0}',
        '.nxp-switch input{opacity:0;width:0;height:0}',
        '.nxp-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#3a3d40;border-radius:22px;transition:0.15s}',
        '.nxp-slider:before{position:absolute;content:"";height:16px;width:16px;left:3px;bottom:3px;background:#d5d7d9;border-radius:50%;transition:0.15s}',
        '.nxp-switch input:checked + .nxp-slider{background:#0a84ff}',
        '.nxp-switch input:checked + .nxp-slider:before{transform:translateX(18px);background:#fff}',
        '.nxp-status-box{border-radius:8px;padding:14px;margin-bottom:16px}',
        '.nxp-status-line{display:flex;align-items:center;gap:8px;font-size:13px}',
        '.nxp-status-meta{font-size:12px;margin-top:6px}',
        '.nxp-crumbs{display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:13px}',
        '.nxp-crumb-link{color:#0a84ff;cursor:pointer;text-decoration:none}',
        '.nxp-crumb-link:hover{text-decoration:underline}',
        '.nxp-feature-desc{font-size:12px;margin-top:3px}',
        '.nxp-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}',
        '.nxp-field-label{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}',
        '.nxp-search{display:flex;gap:8px;margin-bottom:16px}',
        '.nxp-search .nxp-input{flex:1}',
        '.nxp-hits{border-radius:8px;padding:8px 14px;margin-bottom:16px}',
        '.nxp-hit{display:flex;align-items:center;justify-content:space-between;padding:10px 0;gap:12px}',
        '.nxp-hit:last-child{border-bottom:0}',
        '.nxp-role-row{display:grid;grid-template-columns:1fr 200px auto;gap:12px;align-items:end;margin-bottom:20px}'
    ].join('');

    function buildThemeCss(dark) {
        if (dark) {
            return [
                '.nxp-root{background:#1a1c1e;color:#e0e0e0}',
                '.nxp-head{border-bottom:1px solid #2f3133}',
                '.nxp-title{color:#fff}',
                '.nxp-sub{color:#7a7d80}',
                '.nxp-back{background:#2a2c2e;color:#d5d7d9;border:1px solid #3a3d40}',
                '.nxp-back:hover{background:#333538;color:#fff}',
                '.nxp-tab{color:#7a7d80}',
                '.nxp-tab:hover{background:#232527;color:#b8bcbf}',
                '.nxp-tab.active{background:#2a2c2e;color:#fff}',
                '.nxp-panel{background:#232527;border:1px solid #2f3133}',
                '.nxp-row{border-bottom:1px solid #2a2c2e}',
                '.nxp-name{color:#e8e8e8}',
                '.nxp-meta{color:#7a7d80}',
                '.nxp-tag.panel{background:#4a4d50;color:#e0e0e0}',
                '.nxp-btn{background:#2a2c2e;color:#d5d7d9;border:1px solid #3a3d40}',
                '.nxp-btn:hover{background:#333538;color:#fff}',
                '.nxp-input{background:#1a1c1e;color:#e0e0e0;border:1px solid #3a3d40}',
                '.nxp-select{background:#1a1c1e;color:#e0e0e0;border:1px solid #3a3d40}',
                '.nxp-textarea{background:#1a1c1e;color:#e0e0e0;border:1px solid #3a3d40}',
                '.nxp-empty{color:#7a7d80}',
                '.nxp-stat{background:#1a1c1e;border:1px solid #2f3133}',
                '.nxp-stat-label{color:#7a7d80}',
                '.nxp-stat-value{color:#fff}',
                '.nxp-section-title{color:#7a7d80}',
                '.nxp-detail-key{color:#7a7d80}',
                '.nxp-detail-val{color:#e0e0e0}',
                '.nxp-log{color:#c8cbcd;border-bottom:1px solid #2a2c2e}',
                '.nxp-log-time{color:#7a7d80;margin-right:10px}',
                '.nxp-toggle{border-bottom:1px solid #2a2c2e}',
                '.nxp-status-box{background:#1a1c1e;border:1px solid #2f3133}',
                '.nxp-status-line{color:#e0e0e0}',
                '.nxp-status-meta{color:#7a7d80}',
                '.nxp-crumbs{color:#7a7d80}',
                '.nxp-feature-desc{color:#7a7d80}',
                '.nxp-field-label{color:#7a7d80}',
                '.nxp-hits{background:#1a1c1e;border:1px solid #2f3133}',
                '.nxp-hit{border-bottom:1px solid #2a2c2e}'
            ].join('');
        }
        return [
            '.nxp-root{background:#f2f4f5;color:#232527}',
            '.nxp-head{border-bottom:1px solid #c7cbce}',
            '.nxp-title{color:#232527}',
            '.nxp-sub{color:#6a6d70}',
            '.nxp-back{background:#ffffff;color:#232527;border:1px solid #c7cbce}',
            '.nxp-back:hover{background:#e8eef5;color:#000}',
            '.nxp-tab{color:#6a6d70}',
            '.nxp-tab:hover{background:#e1e4e8;color:#232527}',
            '.nxp-tab.active{background:#ffffff;color:#232527}',
            '.nxp-panel{background:#ffffff;border:1px solid #c7cbce}',
            '.nxp-row{border-bottom:1px solid #e1e4e8}',
            '.nxp-name{color:#232527}',
            '.nxp-meta{color:#6a6d70}',
            '.nxp-tag.panel{background:#c7cbce;color:#232527}',
            '.nxp-btn{background:#ffffff;color:#232527;border:1px solid #c7cbce}',
            '.nxp-btn:hover{background:#e8eef5;color:#000}',
            '.nxp-input{background:#ffffff;color:#232527;border:1px solid #c7cbce}',
            '.nxp-select{background:#ffffff;color:#232527;border:1px solid #c7cbce}',
            '.nxp-textarea{background:#ffffff;color:#232527;border:1px solid #c7cbce}',
            '.nxp-empty{color:#6a6d70}',
            '.nxp-stat{background:#ffffff;border:1px solid #c7cbce}',
            '.nxp-stat-label{color:#6a6d70}',
            '.nxp-stat-value{color:#232527}',
            '.nxp-section-title{color:#6a6d70}',
            '.nxp-detail-key{color:#6a6d70}',
            '.nxp-detail-val{color:#232527}',
            '.nxp-log{color:#3a3d40;border-bottom:1px solid #e1e4e8}',
            '.nxp-log-time{color:#6a6d70;margin-right:10px}',
            '.nxp-toggle{border-bottom:1px solid #e1e4e8}',
            '.nxp-status-box{background:#ffffff;border:1px solid #c7cbce}',
            '.nxp-status-line{color:#232527}',
            '.nxp-status-meta{color:#6a6d70}',
            '.nxp-crumbs{color:#6a6d70}',
            '.nxp-feature-desc{color:#6a6d70}',
            '.nxp-field-label{color:#6a6d70}',
            '.nxp-hits{background:#ffffff;border:1px solid #c7cbce}',
            '.nxp-hit{border-bottom:1px solid #e1e4e8}'
        ].join('');
    }

    var S = {
        tab: 'overview',
        role: null,
        users: null,
        loading: false,
        error: null,
        feedback: null,
        announceDraft: '',
        selectedUser: null,
        logs: null,
        logsLoading: false,
        logsError: null,
        config: null,
        configLoading: false,
        configError: null,
        serverState: null,
        serverStateLoading: false,
        query: '',
        searchHits: null,
        searching: false,
        searchError: null,
        banReason: '',
        banHours: '',
        tokens: null,
        tokensLoading: false,
        tokensError: null,
        roleIdInput: '',
        roleSelectValue: 'admin',
        roleSubmitting: false,
        roleLastResult: null
    };

    function el(tag, props) {
        var e = document.createElement(tag);
        props = props || {};
        for (var k in props) {
            var v = props[k];
            if (k === 'class') e.className = v;
            else if (k === 'style') e.setAttribute('style', v);
            else if (k.indexOf('on') === 0 && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
            else if (v === true) e.setAttribute(k, '');
            else if (v != null && v !== false) e.setAttribute(k, v);
        }
        for (var i = 2; i < arguments.length; i++) {
            var c = arguments[i];
            if (c == null || c === false) continue;
            e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        }
        return e;
    }

    function isDarkTheme() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    function ensureStyle() {
        if (!document.getElementById(CSS_ID)) {
            var s = document.createElement('style');
            s.id = CSS_ID;
            s.textContent = BASE_CSS;
            document.head.appendChild(s);
        }
        var old = document.getElementById(THEME_CSS_ID);
        if (old) old.remove();
        var t = document.createElement('style');
        t.id = THEME_CSS_ID;
        t.textContent = buildThemeCss(isDarkTheme());
        document.head.appendChild(t);
    }

    function timeAgo(ts) {
        if (!ts) return '—';
        var s = Math.floor((Date.now() - ts) / 1000);
        if (s < 5) return 'just now';
        if (s < 60) return s + 's ago';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        return Math.floor(s / 86400) + 'd ago';
    }

    function fmtTime(ts) {
        if (!ts) return '—';
        try { return new Date(ts).toISOString().replace('T', ' ').slice(0, 19); }
        catch (e) { return String(ts); }
    }

    function setFeedback(ok, text) {
        S.feedback = { ok: ok, text: text };
        render();
    }

    function clearFeedback() {
        S.feedback = null;
    }

    function callServer(name, args) {
        var srv = window.NX && window.NX.server;
        if (!srv || typeof srv[name] !== 'function') {
            return Promise.reject(new Error('server.' + name + ' unavailable'));
        }
        try {
            return Promise.resolve(srv[name].apply(srv, args || []));
        } catch (e) {
            return Promise.reject(e);
        }
    }

    function normaliseRes(res) {
        if (!res) return { status: 0, data: {} };
        if (typeof res === 'object' && typeof res.status === 'number') return res;
        if (typeof res === 'object' && res.ok !== undefined) {
            return { status: res.ok ? 200 : 500, data: res };
        }
        return { status: 0, data: res };
    }

    function rankOf(role) { return ROLE_RANK[role] || 0; }
    function isDev() { return S.role === 'dev'; }
    function can(role) { return rankOf(S.role) >= rankOf(role); }

    function render() {
        ensureStyle();
        var existing = document.querySelector('.nxp-root');
        var next = build();
        if (existing) existing.replaceWith(next);
        else {
            var host = document.querySelector('.main-0-2-45')
                || document.querySelector('main')
                || document.querySelector('#__next > div > div')
                || document.querySelector('#__next');
            if (host) { host.innerHTML = ''; host.appendChild(next); }
        }
    }

    function build() {
        var root = el('div', { class: 'nxp-root' });
        var shell = el('div', { class: 'nxp-shell' });

        var head = el('div', { class: 'nxp-head' });
        var titleWrap = el('div', {});
        titleWrap.appendChild(el('h1', { class: 'nxp-title' }, 'Nexus Panel'));
        var roleLabel = S.role ? ('Signed in as ' + S.role + '.') : 'Loading…';
        titleWrap.appendChild(el('div', { class: 'nxp-sub' }, roleLabel));
        head.appendChild(titleWrap);
        head.appendChild(el('a', { class: 'nxp-back', href: '/home' }, '← Back to site'));
        shell.appendChild(head);

        var tabs = el('div', { class: 'nxp-tabs' });
        var tabList = [['overview', 'Overview']];
        if (can('panel')) tabList.push(['logs', 'Logs']);
        if (can('moderator')) tabList.push(['users', 'Users']);
        if (isDev()) tabList.push(['features', 'Features']);
        if (isDev()) tabList.push(['config', 'Config']);
        if (isDev()) tabList.push(['announce', 'Announcement']);
        if (isDev()) tabList.push(['admins', 'Admins']);
        if (isDev()) tabList.push(['tokens', 'Tokens']);

        if (tabList.map(function(t) { return t[0]; }).indexOf(S.tab) === -1) {
            S.tab = 'overview';
        }

        tabList.forEach(function(t) {
            tabs.appendChild(el('button', {
                class: 'nxp-tab' + (S.tab === t[0] ? ' active' : ''),
                onclick: function() {
                    S.tab = t[0];
                    S.selectedUser = null;
                    clearFeedback();
                    if (t[0] === 'logs' && !S.logs && !S.logsLoading) loadLogs();
                    if (t[0] === 'users' && !S.users && !S.loading) loadUsers();
                    if (t[0] === 'features' && !S.config && !S.configLoading) loadConfig();
                    if (t[0] === 'config' && !S.config && !S.configLoading) loadConfig();
                    if (t[0] === 'announce' && !S.serverState && !S.serverStateLoading) loadServerState();
                    if (t[0] === 'tokens' && !S.tokens && !S.tokensLoading) loadTokens();
                    render();
                }
            }, t[1]));
        });
        shell.appendChild(tabs);

        var panel = el('div', { class: 'nxp-panel' });
        if (S.tab === 'overview') panel.appendChild(renderOverview());
        else if (S.tab === 'logs' && can('panel')) panel.appendChild(renderLogs());
        else if (S.tab === 'users' && can('moderator')) panel.appendChild(renderUsers());
        else if (S.tab === 'features' && isDev()) panel.appendChild(renderFeatures());
        else if (S.tab === 'config' && isDev()) panel.appendChild(renderConfig());
        else if (S.tab === 'announce' && isDev()) panel.appendChild(renderAnnounce());
        else if (S.tab === 'admins' && isDev()) panel.appendChild(renderAdmins());
        else if (S.tab === 'tokens' && isDev()) panel.appendChild(renderTokens());
        shell.appendChild(panel);

        if (S.feedback) {
            shell.appendChild(el('div', {
                class: 'nxp-feedback ' + (S.feedback.ok ? 'ok' : 'err')
            }, S.feedback.text));
        }

        root.appendChild(shell);
        return root;
    }

    function roleTag(role) {
        if (role === 'dev') return el('span', { class: 'nxp-tag dev' }, 'DEV');
        if (role === 'admin') return el('span', { class: 'nxp-tag admin' }, 'ADMIN');
        if (role === 'moderator') return el('span', { class: 'nxp-tag moderator' }, 'MOD');
        if (role === 'panel') return el('span', { class: 'nxp-tag panel' }, 'PANEL');
        return null;
    }

    function renderOverview() {
        if (S.selectedUser) return renderUserDetail();

        var wrap = el('div', {});
        var stats = el('div', { class: 'nxp-stat-row' });

        var total = S.users ? S.users.length : 0;
        var admins = S.users ? S.users.filter(function(u) { return u.role === 'dev' || u.role === 'admin'; }).length : 0;
        var banned = S.users ? S.users.filter(function(u) { return u.banned; }).length : 0;

        [['Total users', total], ['Admins', admins], ['Banned', banned]].forEach(function(s) {
            var card = el('div', { class: 'nxp-stat' });
            card.appendChild(el('div', { class: 'nxp-stat-label' }, s[0]));
            card.appendChild(el('div', { class: 'nxp-stat-value' }, String(s[1])));
            stats.appendChild(card);
        });
        wrap.appendChild(stats);

        wrap.appendChild(el('div', { class: 'nxp-section-title' }, 'Status'));
        var statusText = S.loading ? 'Loading…' : (S.error ? S.error : 'Connected.');
        wrap.appendChild(el('div', { class: 'nxp-sub' }, statusText));

        return wrap;
    }

    function renderUserDetail() {
        var u = S.selectedUser;
        var wrap = el('div', {});

        var crumbs = el('div', { class: 'nxp-crumbs' });
        crumbs.appendChild(el('span', {
            class: 'nxp-crumb-link',
            onclick: function() { S.selectedUser = null; clearFeedback(); render(); }
        }, 'Users'));
        crumbs.appendChild(el('span', {}, '/'));
        crumbs.appendChild(el('span', {}, u.username || u.Name || 'Unknown'));
        wrap.appendChild(crumbs);

        var name = el('div', { class: 'nxp-name', style: 'font-size:18px;margin-bottom:4px' }, u.username || u.Name || 'Unknown');
        var tag = roleTag(u.role);
        if (tag) name.appendChild(tag);
        if (u.banned) name.appendChild(el('span', { class: 'nxp-tag banned' }, 'BANNED'));
        wrap.appendChild(name);
        wrap.appendChild(el('div', { class: 'nxp-meta' }, 'Aisaka ID #' + (u.aisakaId || u.UserId || '—')));

        var grid = el('div', { class: 'nxp-detail-grid', style: 'margin-top:20px' });
        function addRow(k, v) {
            grid.appendChild(el('div', { class: 'nxp-detail-key' }, k));
            grid.appendChild(el('div', { class: 'nxp-detail-val' }, v == null || v === '' ? '—' : String(v)));
        }
        addRow('Username', u.username || u.Name);
        addRow('Aisaka ID', u.aisakaId || u.UserId);
        addRow('Role', u.role || 'user');
        if (u.tokenPreview) addRow('Token preview', u.tokenPreview);
        addRow('Banned', u.banned ? 'yes' : 'no');
        if (u.banned) {
            addRow('Ban reason', u.banReason);
            addRow('Ban expires', u.banExpiresAt ? fmtTime(u.banExpiresAt) + ' (' + timeAgo(u.banExpiresAt) + ')' : 'permanent');
        }
        if (u.firstSeen) addRow('First seen', fmtTime(u.firstSeen) + ' (' + timeAgo(u.firstSeen) + ')');
        if (u.lastSeen) addRow('Last seen', fmtTime(u.lastSeen) + ' (' + timeAgo(u.lastSeen) + ')');
        addRow('Profile', '/users/' + (u.aisakaId || u.UserId) + '/profile');
        wrap.appendChild(grid);

        if (isDev() && u.tokenPreview && u.role !== 'dev') {
            wrap.appendChild(el('div', { class: 'nxp-section-title', style: 'margin-top:24px' }, 'Role'));
            var roleRow = el('div', { class: 'nxp-toggle' });
            var roleInfo = el('div', { class: 'nxp-toggle-info' });
            roleInfo.appendChild(el('div', { class: 'nxp-name' }, 'Assign role'));
            roleInfo.appendChild(el('div', { class: 'nxp-meta' }, 'Dev only.'));
            roleRow.appendChild(roleInfo);

            var sel = el('select', {
                class: 'nxp-select',
                onchange: function(e) {
                    var next = e.currentTarget.value;
                    if (next === (u.role || 'user')) return;
                    callServer('adminRole', [u.tokenPreview, next]).then(function(raw) {
                        var res = normaliseRes(raw);
                        if (res.status === 200 && res.data && res.data.ok) {
                            u.role = res.data.role;
                            u.isAdmin = rankOf(u.role) >= rankOf('admin');
                            setFeedback(true, 'Role updated to ' + u.role);
                            loadUsers();
                        } else {
                            setFeedback(false, (res.data && res.data.error) || 'Failed');
                        }
                    }).catch(function(err) { setFeedback(false, err.message); });
                }
            });
            ['user', 'panel', 'moderator', 'admin', 'dev'].forEach(function(r) {
                var o = el('option', { value: r }, r);
                if ((u.role || 'user') === r) o.selected = true;
                sel.appendChild(o);
            });
            roleRow.appendChild(sel);
            wrap.appendChild(roleRow);
        }

        var actions = el('div', { class: 'nxp-btn-group', style: 'margin-top:24px' });

        if (can('admin')) {
            if (u.banned) {
                actions.appendChild(el('button', {
                    class: 'nxp-btn primary',
                    onclick: function() {
                        if (!u.tokenPreview) { setFeedback(false, 'No token preview for this user.'); return; }
                        callServer('adminUnban', [u.tokenPreview]).then(function(raw) {
                            var res = normaliseRes(raw);
                            if (res.status === 200 && res.data && res.data.ok) {
                                setFeedback(true, 'Unbanned ' + (u.username || u.Name));
                                S.selectedUser = null;
                                loadUsers();
                            } else {
                                setFeedback(false, (res.data && res.data.error) || 'Failed');
                            }
                        }).catch(function(e) { setFeedback(false, e.message); });
                    }
                }, 'Unban'));
            } else {
                var canBan = !(rankOf(u.role) >= rankOf('admin') && !isDev());
                if (canBan) {
                    wrap.appendChild(el('div', { class: 'nxp-section-title', style: 'margin-top:24px' }, 'Ban options'));

                    var reasonField = el('div', { class: 'nxp-field' });
                    reasonField.appendChild(el('div', { class: 'nxp-field-label' }, 'Reason'));
                    reasonField.appendChild(el('input', {
                        class: 'nxp-input',
                        type: 'text',
                        placeholder: 'Optional reason',
                        value: S.banReason || '',
                        oninput: function(e) { S.banReason = e.currentTarget.value; }
                    }));
                    wrap.appendChild(reasonField);

                    var hoursField = el('div', { class: 'nxp-field' });
                    hoursField.appendChild(el('div', { class: 'nxp-field-label' }, 'Expires in (hours, blank = permanent)'));
                    hoursField.appendChild(el('input', {
                        class: 'nxp-input',
                        type: 'number',
                        min: '1',
                        placeholder: 'e.g. 24',
                        value: S.banHours || '',
                        oninput: function(e) { S.banHours = e.currentTarget.value; }
                    }));
                    wrap.appendChild(hoursField);

                    actions.appendChild(el('button', {
                        class: 'nxp-btn danger',
                        onclick: function() {
                            if (!u.tokenPreview) { setFeedback(false, 'No token preview for this user.'); return; }
                            var payload = {};
                            if (S.banReason) payload.reason = S.banReason;
                            var h = parseFloat(S.banHours);
                            if (!isNaN(h) && h > 0) payload.expiresAt = Date.now() + h * 3600000;
                            callServer('adminBan', [u.tokenPreview, payload]).then(function(raw) {
                                var res = normaliseRes(raw);
                                if (res.status === 200 && res.data && res.data.ok) {
                                    setFeedback(true, 'Banned ' + (u.username || u.Name));
                                    S.banReason = '';
                                    S.banHours = '';
                                    S.selectedUser = null;
                                    loadUsers();
                                } else {
                                    setFeedback(false, (res.data && res.data.error) || 'Failed');
                                }
                            }).catch(function(e) { setFeedback(false, e.message); });
                        }
                    }, 'Ban user'));
                }
            }
        }

        actions.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() { S.selectedUser = null; clearFeedback(); render(); }
        }, 'Close'));
        wrap.appendChild(actions);

        return wrap;
    }

    function renderUsers() {
        if (S.selectedUser) return renderUserDetail();

        var wrap = el('div', {});

        var searchRow = el('div', { class: 'nxp-search' });
        var input = el('input', {
            class: 'nxp-input',
            type: 'text',
            placeholder: 'Search by username or aisakaId (Aisaka search)',
            value: S.query || '',
            oninput: function(e) { S.query = e.currentTarget.value; }
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') doSearch();
        });
        searchRow.appendChild(input);
        searchRow.appendChild(el('button', {
            class: 'nxp-btn primary',
            onclick: doSearch
        }, 'Search'));
        wrap.appendChild(searchRow);

        if (S.searching) wrap.appendChild(el('div', { class: 'nxp-empty' }, 'Searching…'));
        else if (S.searchError) wrap.appendChild(el('div', { class: 'nxp-empty' }, S.searchError));
        else if (S.searchHits && S.searchHits.length) {
            var hits = el('div', { class: 'nxp-hits' });
            S.searchHits.forEach(function(h) {
                var row = el('div', { class: 'nxp-hit' });
                var info = el('div', { class: 'nxp-user' });
                var nm = el('div', { class: 'nxp-name' }, h.Name);
                if (h.Name !== h.DisplayName) nm.appendChild(el('span', { class: 'nxp-tag' }, h.DisplayName));
                info.appendChild(nm);
                info.appendChild(el('div', { class: 'nxp-meta' }, 'Aisaka ID #' + h.UserId + ' • ' + (h.UserProfilePageUrl || '')));
                row.appendChild(info);
                var acts = el('div', { class: 'nxp-btn-group' });
                acts.appendChild(el('button', {
                    class: 'nxp-btn',
                    onclick: function() {
                        var local = S.users && S.users.filter(function(x) { return String(x.aisakaId) === String(h.UserId); })[0];
                        S.selectedUser = local || { aisakaId: h.UserId, username: h.Name, role: 'user', banned: false };
                        S.banReason = '';
                        S.banHours = '';
                        clearFeedback();
                        render();
                    }
                }, 'Open'));
                acts.appendChild(el('a', {
                    class: 'nxp-btn',
                    href: h.UserProfilePageUrl || ('/users/' + h.UserId + '/profile'),
                    target: '_blank'
                }, 'Profile'));
                row.appendChild(acts);
                hits.appendChild(row);
            });
            wrap.appendChild(hits);
        } else if (S.searchHits && !S.searchHits.length && !S.searching && S.searchError == null && S.query) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'No users matched.'));
        }

        if (S.loading) { wrap.appendChild(el('div', { class: 'nxp-empty' }, 'Loading Nexus users…')); return wrap; }
        if (S.error) { wrap.appendChild(el('div', { class: 'nxp-empty' }, S.error)); return wrap; }
        if (!S.users || !S.users.length) { wrap.appendChild(el('div', { class: 'nxp-empty' }, 'No Nexus users yet.')); return wrap; }

        wrap.appendChild(el('div', { class: 'nxp-section-title', style: 'margin-top:8px' }, 'Nexus users'));

        S.users.forEach(function(u) {
            var row = el('div', { class: 'nxp-row' });
            var info = el('div', { class: 'nxp-user' });
            var name = el('div', { class: 'nxp-name' }, (u.username || 'Unknown') + ' #' + u.aisakaId);
            var tag = roleTag(u.role);
            if (tag) name.appendChild(tag);
            if (u.banned) name.appendChild(el('span', { class: 'nxp-tag banned' }, 'BANNED'));
            info.appendChild(name);
            var metaText = 'Last seen ' + timeAgo(u.lastSeen);
            if (u.tokenPreview) metaText += ' • ' + u.tokenPreview;
            info.appendChild(el('div', { class: 'nxp-meta' }, metaText));
            row.appendChild(info);

            var actions = el('div', { class: 'nxp-btn-group' });
            actions.appendChild(el('button', {
                class: 'nxp-btn',
                onclick: function() { S.selectedUser = u; S.banReason = ''; S.banHours = ''; clearFeedback(); render(); }
            }, 'View'));

            if (can('admin')) {
                var canBan = !(rankOf(u.role) >= rankOf('admin') && !isDev());
                actions.appendChild(el('button', {
                    class: 'nxp-btn ' + (u.banned ? 'primary' : 'danger'),
                    disabled: !u.banned && !canBan,
                    onclick: function() {
                        if (!u.tokenPreview) { setFeedback(false, 'No token preview for this user.'); return; }
                        var fn = u.banned ? 'adminUnban' : 'adminBan';
                        var args = u.banned ? [u.tokenPreview] : [u.tokenPreview, {}];
                        callServer(fn, args).then(function(raw) {
                            var res = normaliseRes(raw);
                            if (res.status === 200 && res.data && res.data.ok) {
                                setFeedback(true, (u.banned ? 'Unbanned ' : 'Banned ') + u.username);
                                loadUsers();
                            } else {
                                setFeedback(false, (res.data && res.data.error) || 'Failed');
                            }
                        }).catch(function(e) { setFeedback(false, e.message); });
                    }
                }, u.banned ? 'Unban' : 'Ban'));
            }
            row.appendChild(actions);
            wrap.appendChild(row);
        });
        return wrap;
    }

    function doSearch() {
        var q = (S.query || '').trim();
        if (!q) return;

        S.searching = true;
        S.searchHits = null;
        S.searchError = null;
        render();

        if (/^\d+$/.test(q) && S.users && S.users.length) {
            var local = S.users.filter(function(u) { return String(u.aisakaId) === q; });
            if (local.length === 1) {
                S.searching = false;
                S.selectedUser = local[0];
                S.banReason = '';
                S.banHours = '';
                render();
                return;
            }
        }

        var url = SEARCH_API + '?keyword=' + encodeURIComponent(q) + '&maxRows=12&startIndex=0';
        fetch(url, { credentials: 'include' })
            .then(function(r) { return r.json(); })
            .then(function(j) {
                S.searching = false;
                S.searchHits = (j && j.UserSearchResults) || [];
                render();
            })
            .catch(function(e) {
                S.searching = false;
                S.searchError = e.message || 'Search failed';
                render();
            });
    }

    function renderLogs() {
        var wrap = el('div', {});

        var toolbar = el('div', { class: 'nxp-btn-group', style: 'margin-bottom:16px' });
        toolbar.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() { loadLogs(); }
        }, 'Refresh'));
        wrap.appendChild(toolbar);

        if (S.logsLoading) { wrap.appendChild(el('div', { class: 'nxp-empty' }, 'Loading logs…')); return wrap; }
        if (S.logsError) { wrap.appendChild(el('div', { class: 'nxp-empty' }, S.logsError)); return wrap; }
        if (!S.logs || !S.logs.length) { wrap.appendChild(el('div', { class: 'nxp-empty' }, 'No log entries.')); return wrap; }

        S.logs.forEach(function(l) {
            var line = el('div', { class: 'nxp-log' });
            line.appendChild(el('span', { class: 'nxp-log-time' }, fmtTime(l.ts)));
            var who = l.actor || 'unknown';
            var what = l.action || '';
            var meta = l.meta ? ' — ' + l.meta : '';
            line.appendChild(document.createTextNode(who + ' · ' + what + meta));
            wrap.appendChild(line);
        });
        return wrap;
    }

    function renderFeatures() {
        var wrap = el('div', {});

        if (S.configLoading) return el('div', { class: 'nxp-empty' }, 'Loading features…');
        if (S.configError) return el('div', { class: 'nxp-empty' }, S.configError);

        var config = S.config || {};

        wrap.appendChild(el('div', { class: 'nxp-sub', style: 'margin-bottom:16px' },
            'Master on/off for each feature. Turning one off disables it for every Nexus user, regardless of their local setting.'));

        FEATURES.forEach(function(f) {
            var on = config[f.key] !== false;
            var row = el('div', { class: 'nxp-toggle' });

            var info = el('div', { class: 'nxp-toggle-info' });
            info.appendChild(el('div', { class: 'nxp-name' }, f.label));
            info.appendChild(el('div', { class: 'nxp-feature-desc' }, f.desc));
            row.appendChild(info);

            row.appendChild(el('span', {
                class: 'nxp-tag ' + (on ? 'ok' : 'off')
            }, on ? 'ON' : 'OFF'));

            var sw = el('label', { class: 'nxp-switch' });
            var input = el('input', {
                type: 'checkbox',
                onchange: function(e) {
                    var next = !!e.currentTarget.checked;
                    var patch = {};
                    patch[f.key] = next;
                    callServer('adminConfig', [patch]).then(function(raw) {
                        var res = normaliseRes(raw);
                        if (res.status === 200 && res.data && res.data.ok) {
                            S.config = Object.assign({}, S.config, patch);
                            setFeedback(true, f.label + ' ' + (next ? 'enabled.' : 'disabled.'));
                        } else {
                            setFeedback(false, (res.data && res.data.error) || 'Failed');
                            render();
                        }
                    }).catch(function(err) {
                        setFeedback(false, err.message);
                        render();
                    });
                }
            });
            input.checked = on;
            sw.appendChild(input);
            sw.appendChild(el('span', { class: 'nxp-slider' }));
            row.appendChild(sw);

            wrap.appendChild(row);
        });

        var actions = el('div', { class: 'nxp-btn-group', style: 'margin-top:16px' });
        actions.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() { loadConfig(); }
        }, 'Refresh'));
        wrap.appendChild(actions);

        return wrap;
    }

    function renderConfig() {
        var wrap = el('div', {});

        if (S.configLoading) return el('div', { class: 'nxp-empty' }, 'Loading config…');
        if (S.configError) return el('div', { class: 'nxp-empty' }, S.configError);

        var config = S.config || {};

        wrap.appendChild(el('div', { class: 'nxp-section-title' }, 'Maintenance mode'));

        var maintRow = el('div', { class: 'nxp-toggle' });
        var maintInfo = el('div', { class: 'nxp-toggle-info' });
        maintInfo.appendChild(el('div', { class: 'nxp-name' }, 'Put Nexus into maintenance'));
        maintInfo.appendChild(el('div', { class: 'nxp-meta' }, 'When ON, non-dev Nexus users see a fullscreen overlay.'));
        maintRow.appendChild(maintInfo);

        var maintOn = config.maintenance === true;
        maintRow.appendChild(el('span', {
            class: 'nxp-tag ' + (maintOn ? 'warn' : 'ok')
        }, maintOn ? 'ON' : 'OFF'));

        var maintSwitch = el('label', { class: 'nxp-switch' });
        var maintInput = el('input', {
            type: 'checkbox',
            onchange: function(e) {
                var next = !!e.currentTarget.checked;
                callServer('adminConfig', [{ maintenance: next }]).then(function(raw) {
                    var res = normaliseRes(raw);
                    if (res.status === 200 && res.data && res.data.ok) {
                        S.config = Object.assign({}, S.config, { maintenance: next });
                        setFeedback(true, 'Maintenance ' + (next ? 'enabled.' : 'disabled.'));
                    } else {
                        setFeedback(false, (res.data && res.data.error) || 'Failed');
                        render();
                    }
                }).catch(function(err) {
                    setFeedback(false, err.message);
                    render();
                });
            }
        });
        maintInput.checked = maintOn;
        maintSwitch.appendChild(maintInput);
        maintSwitch.appendChild(el('span', { class: 'nxp-slider' }));
        maintRow.appendChild(maintSwitch);
        wrap.appendChild(maintRow);

        wrap.appendChild(el('div', { class: 'nxp-section-title', style: 'margin-top:24px' }, 'All config keys'));
        wrap.appendChild(el('div', { class: 'nxp-sub', style: 'margin-bottom:12px' },
            'Raw view. Features are toggled in the Features tab.'));

        var keys = Object.keys(config).sort();
        if (!keys.length) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'Config is empty.'));
            return wrap;
        }

        keys.forEach(function(k) {
            var row = el('div', { class: 'nxp-row' });
            var info = el('div', { class: 'nxp-user' });
            info.appendChild(el('div', { class: 'nxp-name' }, k));
            info.appendChild(el('div', { class: 'nxp-meta' }, JSON.stringify(config[k])));
            row.appendChild(info);
            wrap.appendChild(row);
        });

        return wrap;
    }

    function renderAnnounce() {
        var wrap = el('div', {});

        if (S.serverStateLoading) return el('div', { class: 'nxp-empty' }, 'Loading current announcement…');

        var current = S.serverState && S.serverState.announcement;

        var status = el('div', { class: 'nxp-status-box' });
        var line = el('div', { class: 'nxp-status-line' });

        if (current && current.text) {
            if (current.test) {
                line.appendChild(el('span', { class: 'nxp-tag warn' }, 'TEST'));
            } else {
                line.appendChild(el('span', { class: 'nxp-tag ok' }, 'LIVE'));
            }
            line.appendChild(document.createTextNode(' ' + current.text.slice(0, 80) + (current.text.length > 80 ? '…' : '')));
            status.appendChild(line);
            var meta = el('div', { class: 'nxp-status-meta' },
                'Updated ' + timeAgo(current.updatedAt) + ' (' + fmtTime(current.updatedAt) + ')' +
                (current.test ? ' • visible only to you' : ''));
            status.appendChild(meta);
        } else {
            line.appendChild(el('span', { class: 'nxp-tag' }, 'NONE'));
            line.appendChild(document.createTextNode(' No announcement is currently live.'));
            status.appendChild(line);
        }
        wrap.appendChild(status);

        wrap.appendChild(el('div', { class: 'nxp-section-title' }, current && current.text ? 'Replace announcement' : 'New announcement'));

        var ta = el('textarea', {
            class: 'nxp-textarea',
            placeholder: 'Announcement text…',
            oninput: function(e) { S.announceDraft = e.currentTarget.value; }
        });
        ta.value = S.announceDraft || '';
        wrap.appendChild(ta);

        var actions = el('div', { class: 'nxp-btn-group', style: 'margin-top:12px' });

        actions.appendChild(el('button', {
            class: 'nxp-btn primary',
            onclick: function() {
                callServer('adminAnnounce', [S.announceDraft || '']).then(function(raw) {
                    var res = normaliseRes(raw);
                    if (res.status === 200 && res.data && res.data.ok) {
                        setFeedback(true, 'Announcement posted.');
                        S.announceDraft = '';
                        loadServerState();
                    } else {
                        setFeedback(false, (res.data && res.data.error) || 'Failed');
                    }
                }).catch(function(e) { setFeedback(false, e.message); });
            }
        }, 'Post announcement'));

        actions.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() {
                callServer('adminAnnounce', [S.announceDraft || '', true]).then(function(raw) {
                    var res = normaliseRes(raw);
                    if (res.status === 200 && res.data && res.data.ok) {
                        setFeedback(true, 'Test announcement posted. Only you will see it.');
                        S.announceDraft = '';
                        loadServerState();
                    } else {
                        setFeedback(false, (res.data && res.data.error) || 'Failed');
                    }
                }).catch(function(e) { setFeedback(false, e.message); });
            }
        }, 'Send test'));

        var clearBtn = el('button', {
            class: 'nxp-btn',
            disabled: !(current && current.text),
            onclick: function() {
                S.announceDraft = '';
                callServer('adminAnnounce', ['']).then(function(raw) {
                    var res = normaliseRes(raw);
                    if (res.status === 200 && res.data && res.data.ok) {
                        setFeedback(true, 'Announcement cleared.');
                        loadServerState();
                    } else {
                        setFeedback(false, (res.data && res.data.error) || 'Failed');
                    }
                }).catch(function(e) { setFeedback(false, e.message); });
            }
        }, 'Clear');
        actions.appendChild(clearBtn);

        actions.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() { loadServerState(); }
        }, 'Refresh'));
        wrap.appendChild(actions);

        return wrap;
    }

    function renderAdmins() {
        var wrap = el('div', {});

        wrap.appendChild(el('div', { class: 'nxp-section-title' }, 'Assign role by Aisaka ID'));
        wrap.appendChild(el('div', { class: 'nxp-sub', style: 'margin-bottom:16px' },
            'Works for claimed and unclaimed users. If the user has not opened Nexus yet, the role is stored and applied on their first claim. The dev (source-code) cannot be changed here.'));

        var row = el('div', { class: 'nxp-role-row' });

        var idField = el('div', { class: 'nxp-field' });
        idField.appendChild(el('div', { class: 'nxp-field-label' }, 'Aisaka ID'));
        idField.appendChild(el('input', {
            class: 'nxp-input',
            type: 'text',
            placeholder: 'e.g. 12345',
            value: S.roleIdInput || '',
            oninput: function(e) { S.roleIdInput = e.currentTarget.value; }
        }));
        row.appendChild(idField);

        var roleField = el('div', { class: 'nxp-field' });
        roleField.appendChild(el('div', { class: 'nxp-field-label' }, 'Role'));
        var sel = el('select', {
            class: 'nxp-select',
            onchange: function(e) { S.roleSelectValue = e.currentTarget.value; }
        });
        ['user', 'panel', 'moderator', 'admin', 'dev'].forEach(function(r) {
            var o = el('option', { value: r }, r);
            if (S.roleSelectValue === r) o.selected = true;
            sel.appendChild(o);
        });
        roleField.appendChild(sel);
        row.appendChild(roleField);

        var applyWrap = el('div', { class: 'nxp-field' });
        applyWrap.appendChild(el('div', { class: 'nxp-field-label' }, '\u00a0'));
        applyWrap.appendChild(el('button', {
            class: 'nxp-btn primary',
            disabled: S.roleSubmitting,
            onclick: function() {
                var id = parseInt(S.roleIdInput, 10);
                if (!id) { setFeedback(false, 'Enter a valid Aisaka ID.'); return; }
                S.roleSubmitting = true;
                render();
                callServer('adminRoleById', [id, S.roleSelectValue]).then(function(raw) {
                    S.roleSubmitting = false;
                    var res = normaliseRes(raw);
                    if (res.status === 200 && res.data && res.data.ok) {
                        S.roleLastResult = { id: id, role: res.data.role, applied: !!res.data.applied };
                        setFeedback(true, res.data.applied
                            ? ('Updated #' + id + ' → ' + res.data.role)
                            : ('Pending: #' + id + ' → ' + res.data.role + ' (applies on first claim)'));
                        S.roleIdInput = '';
                        loadUsers();
                    } else {
                        setFeedback(false, (res.data && res.data.error) || 'Failed');
                    }
                }).catch(function(err) {
                    S.roleSubmitting = false;
                    setFeedback(false, err.message);
                });
            }
        }, S.roleSubmitting ? 'Applying…' : 'Apply'));
        row.appendChild(applyWrap);

        wrap.appendChild(row);

        if (S.roleLastResult) {
            wrap.appendChild(el('div', { class: 'nxp-status-box' },
                el('div', { class: 'nxp-status-line' },
                    el('span', { class: 'nxp-tag ' + (S.roleLastResult.applied ? 'ok' : 'warn') },
                        S.roleLastResult.applied ? 'APPLIED' : 'PENDING'),
                    document.createTextNode(' #' + S.roleLastResult.id + ' → ' + S.roleLastResult.role)
                )
            ));
        }

        return wrap;
    }

    function renderTokens() {
        var wrap = el('div', {});

        var toolbar = el('div', { class: 'nxp-btn-group', style: 'margin-bottom:16px' });
        toolbar.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() { loadTokens(); }
        }, 'Refresh'));
        wrap.appendChild(toolbar);

        wrap.appendChild(el('div', { class: 'nxp-sub', style: 'margin-bottom:12px' },
            'Dev only. Every claimed Nexus token.'));

        if (S.tokensLoading) { wrap.appendChild(el('div', { class: 'nxp-empty' }, 'Loading tokens…')); return wrap; }
        if (S.tokensError) { wrap.appendChild(el('div', { class: 'nxp-empty' }, S.tokensError)); return wrap; }
        if (!S.tokens || !S.tokens.length) { wrap.appendChild(el('div', { class: 'nxp-empty' }, 'No tokens.')); return wrap; }

        S.tokens.forEach(function(t) {
            var row = el('div', { class: 'nxp-row' });
            var info = el('div', { class: 'nxp-user' });
            var name = el('div', { class: 'nxp-name' }, (t.username || 'Unknown') + ' #' + t.aisakaId);
            var tag = roleTag(t.role);
            if (tag) name.appendChild(tag);
            info.appendChild(name);
            info.appendChild(el('div', { class: 'nxp-meta', style: 'font-family:ui-monospace,Menlo,Consolas,monospace' }, t.token));
            row.appendChild(info);
            wrap.appendChild(row);
        });

        return wrap;
    }

    function loadUsers() {
        S.loading = true;
        S.error = null;
        render();
        callServer('adminUsers').then(function(raw) {
            var res = normaliseRes(raw);
            S.loading = false;
            if (res.status === 200) S.users = (res.data && res.data.users) || [];
            else if (res.status === 403) S.error = 'Not authorised.';
            else S.error = (res.data && res.data.error) || 'Failed to load users.';
            render();
        }).catch(function(e) {
            S.loading = false;
            S.error = e.message || 'Network error';
            render();
        });
    }

    function loadLogs() {
        S.logsLoading = true;
        S.logsError = null;
        render();
        callServer('adminLogs').then(function(raw) {
            var res = normaliseRes(raw);
            S.logsLoading = false;
            if (res.status === 200) S.logs = (res.data && res.data.logs) || [];
            else S.logsError = (res.data && res.data.error) || 'Failed to load logs.';
            render();
        }).catch(function(e) {
            S.logsLoading = false;
            S.logsError = e.message || 'Network error';
            render();
        });
    }

    function loadConfig() {
        S.configLoading = true;
        S.configError = null;
        render();
        callServer('config').then(function(raw) {
            var res = normaliseRes(raw);
            S.configLoading = false;
            if (res.status === 200) S.config = (res.data && res.data.config) || {};
            else S.configError = (res.data && res.data.error) || 'Failed to load config.';
            render();
        }).catch(function(e) {
            S.configLoading = false;
            S.configError = e.message || 'Network error';
            render();
        });
    }

    function loadServerState() {
        S.serverStateLoading = true;
        render();
        callServer('config').then(function(raw) {
            var res = normaliseRes(raw);
            S.serverStateLoading = false;
            if (res.status === 200 && res.data) {
                S.serverState = {
                    announcement: res.data.announcement || null,
                    config: res.data.config || {}
                };
            } else {
                S.serverState = { announcement: null, config: {} };
            }
            render();
        }).catch(function() {
            S.serverStateLoading = false;
            S.serverState = { announcement: null, config: {} };
            render();
        });
    }

    function loadTokens() {
        S.tokensLoading = true;
        S.tokensError = null;
        render();
        callServer('adminTokens').then(function(raw) {
            var res = normaliseRes(raw);
            S.tokensLoading = false;
            if (res.status === 200) S.tokens = (res.data && res.data.tokens) || [];
            else if (res.status === 403) S.tokensError = 'Not authorised. Dev only.';
            else S.tokensError = (res.data && res.data.error) || 'Failed to load tokens.';
            render();
        }).catch(function(e) {
            S.tokensLoading = false;
            S.tokensError = e.message || 'Network error';
            render();
        });
    }

    window.NX.features.nexusPanel = {
        apply: function() {
            if (location.hash !== HASH) {
                var stale = document.querySelector('.nxp-root');
                if (stale) stale.remove();
                return;
            }
            if (document.querySelector('.nxp-root')) return;

            var meId = (window.NX && typeof window.NX.getMeId === 'function')
                ? window.NX.getMeId()
                : parseInt(localStorage.getItem('nx_me_id') || '0', 10);
            var meName = (window.NX && typeof window.NX.getMeName === 'function')
                ? window.NX.getMeName()
                : '';

            callServer('claim', [meId, meName]).then(function() {
                callServer('me').then(function(raw) {
                    var res = normaliseRes(raw);
                    if (res.status === 200 && res.data && res.data.user) {
                        S.role = res.data.user.role || (res.data.user.isAdmin ? 'admin' : 'user');
                        window.NX.role = S.role;
                    }
                    render();
                    loadLogs();
                    if (can('moderator')) loadUsers();
                }).catch(function(e) {
                    S.error = e.message || 'Could not reach server.';
                    render();
                });
            }).catch(function(e) {
                S.error = e.message || 'Could not reach server.';
                render();
            });
        }
    };

})();
