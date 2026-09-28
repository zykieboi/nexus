(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var CSS_ID = 'nx-panel-style';
    var THEME_ID = 'nx-panel-theme-style';
    var HASH = '#nexus-admin';
    var SEARCH_API = '/search/users/results';

    var RANKS = { user: 0, panel: 1, moderator: 2, admin: 3, dev: 4 };

    var FEATURES = [
        { key: 'removeAds', label: 'Remove Ads', desc: 'Hides all advertisement banners and skyscrapers across the site.' },
        { key: 'hideAlert', label: 'Hide Alert', desc: 'Hides the alert banner under the navigation bar.' },
        { key: 'rap', label: 'RAP on Profile', desc: 'Shows the user\'s total RAP next to their friends/followers stats.' },
        { key: 'inventorySearch', label: 'Inventory Search', desc: 'Adds a search bar to your inventory so you can filter items by name.' },
        { key: 'bulkUnfriend', label: 'Bulk Unfriend', desc: 'Select multiple friends and remove them all at once from the friends page.' },
        { key: 'trade2020', label: '2020 Trade Theme', desc: 'Replaces the default trade list and window with the 2020 Roblox layout.' },
        { key: 'explorer', label: 'Explorer', desc: 'View the instance tree of any catalog asset.' },
        { key: 'customBackground', label: 'Custom Background', desc: 'Replaces the site background with an image chosen by the user.' },
        { key: 'customLogo', label: 'Custom Logo', desc: 'Replaces the navbar logo with an image chosen by the user.' }
    ];

    var BASE = [
        '.nxp-root{min-height:calc(100vh - 60px);font-family:inherit;padding:24px;box-sizing:border-box}',
        '.nxp-root *{box-sizing:border-box}',
        '.nxp-shell{max-width:1100px;margin:0 auto}',
        '.nxp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px}',
        '.nxp-title{font-size:26px;font-weight:600;margin:0}',
        '.nxp-sub{font-size:13px;margin-top:4px}',
        '.nxp-head-actions{display:flex;gap:8px;align-items:center}',
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
        '.nxp-stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}',
        '.nxp-stat{border-radius:8px;padding:14px}',
        '.nxp-stat-label{font-size:11px;text-transform:uppercase;letter-spacing:0.6px;font-weight:600}',
        '.nxp-stat-value{font-size:24px;font-weight:600;margin-top:6px}',
        '.nxp-section-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.7px;margin:0 0 12px}',
        '.nxp-detail-grid{display:grid;grid-template-columns:160px 1fr;gap:8px 16px;margin-top:8px}',
        '.nxp-detail-key{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding-top:2px}',
        '.nxp-detail-val{font-size:13px;word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace;display:flex;align-items:center;gap:6px}',
        '.nxp-copy-btn{background:transparent;border:1px solid;border-radius:3px;padding:1px 6px;font-size:10px;cursor:pointer;font-family:inherit;font-weight:600}',
        '.nxp-log{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;padding:8px 0;word-break:break-all;line-height:1.5}',
        '.nxp-log:last-child{border-bottom:0}',
        '.nxp-toggle{display:flex;align-items:center;gap:10px;padding:12px 0}',
        '.nxp-toggle:last-child{border-bottom:0}',
        '.nxp-toggle-info{flex:1;min-width:0}',
        '.nxp-switch{position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0}',
        '.nxp-switch input{opacity:0;width:0;height:0}',
        '.nxp-slider{position:absolute;cursor:pointer;inset:0;background:#3a3d40;border-radius:22px;transition:0.15s}',
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
        '.nxp-search{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}',
        '.nxp-search .nxp-input{flex:1;min-width:180px}',
        '.nxp-hits{border-radius:8px;padding:8px 14px;margin-bottom:16px}',
        '.nxp-hit{display:flex;align-items:center;justify-content:space-between;padding:10px 0;gap:12px}',
        '.nxp-hit:last-child{border-bottom:0}',
        '.nxp-role-row{display:grid;grid-template-columns:1fr 200px auto;gap:12px;align-items:end;margin-bottom:12px}',
        '.nxp-checkbox{width:16px;height:16px;flex-shrink:0;cursor:pointer;margin-right:10px}',
        '.nxp-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px}',
        '.nxp-toolbar .nxp-select{padding:6px 10px;font-size:12px}',
        '.nxp-chip{padding:5px 12px;font-size:12px;border-radius:20px;cursor:pointer;font-family:inherit;border:1px solid}',
        '.nxp-chip.active{border-color:#0a84ff;background:#0a84ff;color:#fff}',
        '.nxp-bulk-bar{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;margin-bottom:16px}',
        '.nxp-bulk-count{font-size:13px;font-weight:600}',
        '.nxp-preview{border-radius:8px;padding:12px 48px 12px 16px;font-size:15px;text-align:center;position:relative;margin-top:12px}',
        '.nxp-lookup-result{margin-top:8px;font-size:12px}',
        '.nxp-announce-counter{font-size:11px;text-align:right;margin-top:4px;opacity:0.7}'
    ].join('');

    function theme(dark) {
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
                '.nxp-copy-btn{border-color:#3a3d40;color:#9a9da0}',
                '.nxp-copy-btn:hover{background:#2a2c2e;color:#fff}',
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
                '.nxp-hit{border-bottom:1px solid #2a2c2e}',
                '.nxp-chip{border-color:#3a3d40;color:#d5d7d9;background:transparent}',
                '.nxp-bulk-bar{background:#1a1c1e;border:1px solid #2f3133}',
                '.nxp-bulk-count{color:#fff}',
                '.nxp-preview{background:#393b3d;color:#fff;border:1px solid #2f3133}',
                '.nxp-lookup-result{color:#7a7d80}'
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
            '.nxp-copy-btn{border-color:#c7cbce;color:#6a6d70}',
            '.nxp-copy-btn:hover{background:#e8eef5;color:#000}',
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
            '.nxp-hit{border-bottom:1px solid #e1e4e8}',
            '.nxp-chip{border-color:#c7cbce;color:#232527;background:transparent}',
            '.nxp-bulk-bar{background:#ffffff;border:1px solid #c7cbce}',
            '.nxp-bulk-count{color:#232527}',
            '.nxp-preview{background:#393b3d;color:#fff;border:1px solid #c7cbce}',
            '.nxp-lookup-result{color:#6a6d70}'
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
        roleLastResult: null,
        usersSort: 'lastSeen',
        usersFilter: 'all',
        selectedIds: {},
        bulkWorking: false,
        lookupResult: null,
        lookupTimer: null,
        lookupCache: null
    };

    function el(tag, props) {
        var e = document.createElement(tag);
        props = props || {};
        for (var k in props) {
            var v = props[k];
            if (k === 'class') e.className = v;
            else if (k === 'style') e.setAttribute('style', v);
            else if (k.indexOf('on') === 0 && typeof v === 'function') {
                e.addEventListener(k.slice(2).toLowerCase(), v);
            }
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

    function dark() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    function style() {
        if (!document.getElementById(CSS_ID)) {
            var s = document.createElement('style');
            s.id = CSS_ID;
            s.textContent = BASE;
            document.head.appendChild(s);
        }
        var old = document.getElementById(THEME_ID);
        if (old) old.remove();
        var t = document.createElement('style');
        t.id = THEME_ID;
        t.textContent = theme(dark());
        document.head.appendChild(t);
    }

    function ago(ts) {
        if (!ts) return '\u2014';
        var s = Math.floor((Date.now() - ts) / 1000);
        if (s < 5) return 'just now';
        if (s < 60) return s + 's ago';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        return Math.floor(s / 86400) + 'd ago';
    }

    function time(ts) {
        if (!ts) return '\u2014';
        try { return new Date(ts).toISOString().replace('T', ' ').slice(0, 19); }
        catch (e) { return String(ts); }
    }

    function feedback(ok, text) {
        S.feedback = { ok: ok, text: text };
        render();
    }

    function clearFeedback() { S.feedback = null; }

    function call(name, args) {
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

    function norm(res) {
        if (!res) return { status: 0, data: {} };
        if (typeof res === 'object' && typeof res.status === 'number') return res;
        if (typeof res === 'object' && res.ok !== undefined) {
            return { status: res.ok ? 200 : 500, data: res };
        }
        return { status: 0, data: res };
    }

    function rank(r) { return RANKS[r] || 0; }
    function isDev() { return S.role === 'dev'; }
    function can(r) { return rank(S.role) >= rank(r); }

    function copy(text, btn) {
        var done = function() {
            if (!btn) return;
            var old = btn.textContent;
            btn.textContent = 'copied';
            setTimeout(function() { btn.textContent = old; }, 900);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, done);
        } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta);
            done();
        }
    }

    function render() {
        style();
        var existing = document.querySelector('.nxp-root');
        var next = build();
        if (existing) existing.replaceWith(next);
        else {
            var host = document.querySelector('.main-0-2-8')
                || document.querySelector('main')
                || document.querySelector('#__next > div > div')
                || document.querySelector('#__next');
            if (host) { host.innerHTML = ''; host.appendChild(next); }
        }
    }

    function reloadAll() {
        clearFeedback();
        loadUsers();
        loadLogs();
        loadConfig();
        loadState();
    }

    function build() {
        var root = el('div', { class: 'nxp-root' });
        var shell = el('div', { class: 'nxp-shell' });

        var head = el('div', { class: 'nxp-head' });
        var titleWrap = el('div', {});
        titleWrap.appendChild(el('h1', { class: 'nxp-title' }, 'Nexus Panel'));
        var roleLabel = S.role ? 'Signed in as ' + S.role + '.' : 'Loading\u2026';
        titleWrap.appendChild(el('div', { class: 'nxp-sub' }, roleLabel));
        head.appendChild(titleWrap);

        var actions = el('div', { class: 'nxp-head-actions' });
        actions.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() { reloadAll(); }
        }, '\u21bb Reload'));
        actions.appendChild(el('a', { class: 'nxp-back', href: '/home' }, '\u2190 Back to site'));
        head.appendChild(actions);
        shell.appendChild(head);

        var tabs = el('div', { class: 'nxp-tabs' });
        var list = [['overview', 'Overview']];
        if (can('panel')) list.push(['logs', 'Logs']);
        if (can('moderator')) list.push(['users', 'Users']);
        if (isDev()) list.push(['features', 'Features']);
        if (isDev()) list.push(['config', 'Config']);
        if (isDev()) list.push(['announce', 'Announcement']);
        if (isDev()) list.push(['admins', 'Admins']);
        if (isDev()) list.push(['tokens', 'Tokens']);

        var has = list.map(function(t) { return t[0]; });
        if (has.indexOf(S.tab) === -1) S.tab = 'overview';

        list.forEach(function(t) {
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
                    if (t[0] === 'announce' && !S.serverState && !S.serverStateLoading) loadState();
                    if (t[0] === 'tokens' && !S.tokens && !S.tokensLoading) loadTokens();
                    render();
                }
            }, t[1]));
        });
        shell.appendChild(tabs);

        var panel = el('div', { class: 'nxp-panel' });
        if (S.tab === 'overview') panel.appendChild(overview());
        else if (S.tab === 'logs' && can('panel')) panel.appendChild(logsView());
        else if (S.tab === 'users' && can('moderator')) panel.appendChild(usersView());
        else if (S.tab === 'features' && isDev()) panel.appendChild(featuresView());
        else if (S.tab === 'config' && isDev()) panel.appendChild(configView());
        else if (S.tab === 'announce' && isDev()) panel.appendChild(announceView());
        else if (S.tab === 'admins' && isDev()) panel.appendChild(adminsView());
        else if (S.tab === 'tokens' && isDev()) panel.appendChild(tokensView());
        shell.appendChild(panel);

        if (S.feedback) {
            shell.appendChild(el('div', {
                class: 'nxp-feedback ' + (S.feedback.ok ? 'ok' : 'err')
            }, S.feedback.text));
        }

        root.appendChild(shell);
        return root;
    }

    function roleTag(r) {
        if (r === 'dev') return el('span', { class: 'nxp-tag dev' }, 'DEV');
        if (r === 'admin') return el('span', { class: 'nxp-tag admin' }, 'ADMIN');
        if (r === 'moderator') return el('span', { class: 'nxp-tag moderator' }, 'MOD');
        if (r === 'panel') return el('span', { class: 'nxp-tag panel' }, 'PANEL');
        return null;
    }

    function activeToday() {
        if (!S.users) return 0;
        var cut = Date.now() - 86400000;
        return S.users.filter(function(u) { return u.lastSeen > cut; }).length;
    }

    function overview() {
        if (S.selectedUser) return userDetail();

        var wrap = el('div', {});
        var stats = el('div', { class: 'nxp-stat-row' });

        var total = S.users ? S.users.length : 0;
        var admins = S.users ? S.users.filter(function(u) {
            return u.role === 'dev' || u.role === 'admin';
        }).length : 0;
        var banned = S.users ? S.users.filter(function(u) { return u.banned; }).length : 0;
        var active = activeToday();

        [['Total users', total], ['Active today', active],
            ['Admins', admins], ['Banned', banned]].forEach(function(s) {
            var card = el('div', { class: 'nxp-stat' });
            card.appendChild(el('div', { class: 'nxp-stat-label' }, s[0]));
            card.appendChild(el('div', { class: 'nxp-stat-value' }, String(s[1])));
            stats.appendChild(card);
        });
        wrap.appendChild(stats);

        wrap.appendChild(el('div', { class: 'nxp-section-title' }, 'Recent activity'));
        if (!S.logs || !S.logs.length) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'No log entries yet.'));
        } else {
            S.logs.slice(0, 10).forEach(function(l) {
                var line = el('div', { class: 'nxp-log' });
                line.appendChild(el('span', { class: 'nxp-log-time' }, time(l.ts)));
                line.appendChild(document.createTextNode(
                    (l.actor || 'unknown') + ' \u00b7 ' + (l.action || '') +
                    (l.meta ? ' \u2014 ' + l.meta : '')
                ));
                wrap.appendChild(line);
            });
        }
        return wrap;
    }

    function copyRow(v) {
        if (v == null || v === '') return document.createTextNode('\u2014');
        var t = String(v);
        var wrap = el('div', { class: 'nxp-detail-val' });
        wrap.appendChild(document.createTextNode(t));
        var btn = el('button', { class: 'nxp-copy-btn', title: 'Copy' }, 'copy');
        btn.addEventListener('click', function() { copy(t, btn); });
        wrap.appendChild(btn);
        return wrap;
    }

    function userDetail() {
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

        var name = el('div', {
            class: 'nxp-name',
            style: 'font-size:18px;margin-bottom:4px'
        }, u.username || u.Name || 'Unknown');
        var tag = roleTag(u.role);
        if (tag) name.appendChild(tag);
        if (u.banned) name.appendChild(el('span', { class: 'nxp-tag banned' }, 'BANNED'));
        wrap.appendChild(name);
        wrap.appendChild(el('div', { class: 'nxp-meta' },
            'Aisaka ID #' + (u.aisakaId || u.UserId || '\u2014')));

        var grid = el('div', { class: 'nxp-detail-grid', style: 'margin-top:20px' });
        function kv(k, node) {
            grid.appendChild(el('div', { class: 'nxp-detail-key' }, k));
            grid.appendChild(node);
        }
        kv('Username', copyRow(u.username || u.Name));
        kv('Aisaka ID', copyRow(u.aisakaId || u.UserId));
        kv('Role', el('div', { class: 'nxp-detail-val' }, u.role || 'user'));
        if (u.tokenPreview) kv('Token preview', copyRow(u.tokenPreview));
        kv('Banned', el('div', { class: 'nxp-detail-val' }, u.banned ? 'yes' : 'no'));
        if (u.banned) {
            kv('Ban reason', el('div', { class: 'nxp-detail-val' }, u.banReason || '\u2014'));
            kv('Ban expires', el('div', { class: 'nxp-detail-val' },
                u.banExpiresAt
                    ? time(u.banExpiresAt) + ' (' + ago(u.banExpiresAt) + ')'
                    : 'permanent'));
        }
        if (u.firstSeen) kv('First seen', el('div', { class: 'nxp-detail-val' },
            time(u.firstSeen) + ' (' + ago(u.firstSeen) + ')'));
        if (u.lastSeen) kv('Last seen', el('div', { class: 'nxp-detail-val' },
            time(u.lastSeen) + ' (' + ago(u.lastSeen) + ')'));
        kv('Profile', copyRow('/users/' + (u.aisakaId || u.UserId) + '/profile'));
        wrap.appendChild(grid);

        if (isDev() && u.tokenPreview && u.role !== 'dev') {
            wrap.appendChild(el('div', {
                class: 'nxp-section-title',
                style: 'margin-top:24px'
            }, 'Role'));
            var row = el('div', { class: 'nxp-toggle' });
            var info = el('div', { class: 'nxp-toggle-info' });
            info.appendChild(el('div', { class: 'nxp-name' }, 'Assign role'));
            info.appendChild(el('div', { class: 'nxp-meta' }, 'Dev only.'));
            row.appendChild(info);
            var sel = el('select', {
                class: 'nxp-select',
                onchange: function(e) {
                    var next = e.currentTarget.value;
                    if (next === (u.role || 'user')) return;
                    call('adminRole', [u.tokenPreview, next]).then(function(raw) {
                        var res = norm(raw);
                        if (res.status === 200 && res.data && res.data.ok) {
                            u.role = res.data.role;
                            u.isAdmin = rank(u.role) >= rank('admin');
                            feedback(true, 'Role updated to ' + u.role);
                            loadUsers();
                        } else {
                            feedback(false, (res.data && res.data.error) || 'Failed');
                        }
                    }).catch(function(err) { feedback(false, err.message); });
                }
            });
            ['user', 'panel', 'moderator', 'admin', 'dev'].forEach(function(r) {
                var o = el('option', { value: r }, r);
                if ((u.role || 'user') === r) o.selected = true;
                sel.appendChild(o);
            });
            row.appendChild(sel);
            wrap.appendChild(row);
        }

        var actions = el('div', { class: 'nxp-btn-group', style: 'margin-top:24px' });
        actions.appendChild(el('a', {
            class: 'nxp-btn',
            href: '/users/' + (u.aisakaId || u.UserId) + '/profile',
            target: '_blank'
        }, 'Open profile'));

        if (can('admin')) {
            if (u.banned) {
                actions.appendChild(el('button', {
                    class: 'nxp-btn primary',
                    onclick: function() {
                        if (!u.tokenPreview) {
                            feedback(false, 'No token preview for this user.');
                            return;
                        }
                        call('adminUnban', [u.tokenPreview]).then(function(raw) {
                            var res = norm(raw);
                            if (res.status === 200 && res.data && res.data.ok) {
                                feedback(true, 'Unbanned ' + (u.username || u.Name));
                                S.selectedUser = null;
                                loadUsers();
                            } else {
                                feedback(false, (res.data && res.data.error) || 'Failed');
                            }
                        }).catch(function(e) { feedback(false, e.message); });
                    }
                }, 'Unban'));
            } else {
                var banOk = !(rank(u.role) >= rank('admin') && !isDev());
                if (banOk) {
                    wrap.appendChild(el('div', {
                        class: 'nxp-section-title',
                        style: 'margin-top:24px'
                    }, 'Ban options'));

                    var reason = el('div', { class: 'nxp-field' });
                    reason.appendChild(el('div', { class: 'nxp-field-label' }, 'Reason'));
                    reason.appendChild(el('input', {
                        class: 'nxp-input',
                        type: 'text',
                        placeholder: 'Optional reason',
                        value: S.banReason || '',
                        oninput: function(e) { S.banReason = e.currentTarget.value; }
                    }));
                    wrap.appendChild(reason);

                    var hours = el('div', { class: 'nxp-field' });
                    hours.appendChild(el('div', { class: 'nxp-field-label' },
                        'Expires in (hours, blank = permanent)'));
                    hours.appendChild(el('input', {
                        class: 'nxp-input',
                        type: 'number',
                        min: '1',
                        placeholder: 'e.g. 24',
                        value: S.banHours || '',
                        oninput: function(e) { S.banHours = e.currentTarget.value; }
                    }));
                    wrap.appendChild(hours);

                    actions.appendChild(el('button', {
                        class: 'nxp-btn danger',
                        onclick: function() {
                            if (!u.tokenPreview) {
                                feedback(false, 'No token preview for this user.');
                                return;
                            }
                            var payload = {};
                            if (S.banReason) payload.reason = S.banReason;
                            var h = parseFloat(S.banHours);
                            if (!isNaN(h) && h > 0) {
                                payload.expiresAt = Date.now() + h * 3600000;
                            }
                            call('adminBan', [u.tokenPreview, payload]).then(function(raw) {
                                var res = norm(raw);
                                if (res.status === 200 && res.data && res.data.ok) {
                                    feedback(true, 'Banned ' + (u.username || u.Name));
                                    S.banReason = '';
                                    S.banHours = '';
                                    S.selectedUser = null;
                                    loadUsers();
                                } else {
                                    feedback(false, (res.data && res.data.error) || 'Failed');
                                }
                            }).catch(function(e) { feedback(false, e.message); });
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

    function sortUsers(list) {
        var s = S.usersSort;
        var c = list.slice();
        c.sort(function(a, b) {
            if (s === 'firstSeen') return (a.firstSeen || 0) - (b.firstSeen || 0);
            if (s === 'aisakaId') return (a.aisakaId || 0) - (b.aisakaId || 0);
            if (s === 'username') return String(a.username || '')
                .localeCompare(String(b.username || ''));
            return (b.lastSeen || 0) - (a.lastSeen || 0);
        });
        return c;
    }

    function filterUsers(list) {
        var cut = Date.now() - 86400000;
        if (S.usersFilter === 'active') return list.filter(function(u) { return u.lastSeen > cut; });
        if (S.usersFilter === 'banned') return list.filter(function(u) { return !!u.banned; });
        if (S.usersFilter === 'admins') return list.filter(function(u) {
            return u.role === 'dev' || u.role === 'admin';
        });
        return list;
    }

    function selectedList() {
        var ids = Object.keys(S.selectedIds).filter(function(k) { return S.selectedIds[k]; });
        if (!S.users) return [];
        return S.users.filter(function(u) {
            return ids.indexOf(String(u.tokenPreview)) !== -1;
        });
    }

    function bulkBar() {
        var sel = selectedList();
        if (!sel.length) return null;
        var bar = el('div', { class: 'nxp-bulk-bar' });
        bar.appendChild(el('div', { class: 'nxp-bulk-count' }, sel.length + ' selected'));
        bar.appendChild(el('button', {
            class: 'nxp-btn danger',
            disabled: S.bulkWorking,
            onclick: function() { bulkBan(true); }
        }, 'Ban selected'));
        bar.appendChild(el('button', {
            class: 'nxp-btn primary',
            disabled: S.bulkWorking,
            onclick: function() { bulkBan(false); }
        }, 'Unban selected'));
        bar.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() { S.selectedIds = {}; render(); }
        }, 'Clear'));
        return bar;
    }

    function bulkBan(ban) {
        var sel = selectedList();
        if (!sel.length) return;
        if (!confirm((ban ? 'Ban' : 'Unban') + ' ' + sel.length + ' user(s)?')) return;
        S.bulkWorking = true;
        render();
        var jobs = sel.map(function(u) {
            if (!u.tokenPreview) return Promise.resolve(false);
            var fn = ban ? 'adminBan' : 'adminUnban';
            var args = ban ? [u.tokenPreview, {}] : [u.tokenPreview];
            return call(fn, args).then(function(raw) {
                var res = norm(raw);
                return res.status === 200 && res.data && res.data.ok;
            }).catch(function() { return false; });
        });
        Promise.all(jobs).then(function(results) {
            S.bulkWorking = false;
            S.selectedIds = {};
            var ok = results.filter(Boolean).length;
            feedback(ok === results.length,
                (ban ? 'Banned ' : 'Unbanned ') + ok + '/' + results.length);
            loadUsers();
        });
    }

    function usersView() {
        if (S.selectedUser) return userDetail();

        var wrap = el('div', {});

        var search = el('div', { class: 'nxp-search' });
        var input = el('input', {
            class: 'nxp-input',
            type: 'text',
            placeholder: 'Search by username or aisakaId',
            value: S.query || '',
            oninput: function(e) { S.query = e.currentTarget.value; }
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') doSearch();
        });
        search.appendChild(input);
        search.appendChild(el('button', {
            class: 'nxp-btn primary',
            onclick: doSearch
        }, 'Search'));
        wrap.appendChild(search);

        if (S.searching) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'Searching\u2026'));
        } else if (S.searchError) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, S.searchError));
        } else if (S.searchHits && S.searchHits.length) {
            var hits = el('div', { class: 'nxp-hits' });
            S.searchHits.forEach(function(h) {
                var row = el('div', { class: 'nxp-hit' });
                var info = el('div', { class: 'nxp-user' });
                var nm = el('div', { class: 'nxp-name' }, h.Name);
                if (h.Name !== h.DisplayName) {
                    nm.appendChild(el('span', { class: 'nxp-tag' }, h.DisplayName));
                }
                info.appendChild(nm);
                info.appendChild(el('div', { class: 'nxp-meta' },
                    'Aisaka ID #' + h.UserId + ' \u2022 ' + (h.UserProfilePageUrl || '')));
                row.appendChild(info);

                var acts = el('div', { class: 'nxp-btn-group' });
                acts.appendChild(el('button', {
                    class: 'nxp-btn',
                    onclick: function() {
                        var local = S.users && S.users.filter(function(x) {
                            return String(x.aisakaId) === String(h.UserId);
                        })[0];
                        S.selectedUser = local || {
                            aisakaId: h.UserId,
                            username: h.Name,
                            role: 'user',
                            banned: false
                        };
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
        } else if (S.searchHits && !S.searchHits.length && !S.searching
            && S.searchError == null && S.query) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'No users matched.'));
        }

        if (S.loading) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'Loading Nexus users\u2026'));
            return wrap;
        }
        if (S.error) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, S.error));
            return wrap;
        }
        if (!S.users || !S.users.length) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'No Nexus users yet.'));
            return wrap;
        }

        var toolbar = el('div', { class: 'nxp-toolbar' });
        var sort = el('select', {
            class: 'nxp-select',
            onchange: function(e) { S.usersSort = e.currentTarget.value; render(); }
        });
        [['lastSeen', 'Last seen'], ['firstSeen', 'First seen'],
            ['aisakaId', 'Aisaka ID'], ['username', 'Username']].forEach(function(o) {
            var opt = el('option', { value: o[0] }, o[1]);
            if (S.usersSort === o[0]) opt.selected = true;
            sort.appendChild(opt);
        });
        toolbar.appendChild(sort);

        [['all', 'All'], ['active', 'Active today'], ['admins', 'Admins'], ['banned', 'Banned']]
            .forEach(function(f) {
                toolbar.appendChild(el('button', {
                    class: 'nxp-chip' + (S.usersFilter === f[0] ? ' active' : ''),
                    onclick: function() { S.usersFilter = f[0]; render(); }
                }, f[1]));
            });
        wrap.appendChild(toolbar);

        var bulk = bulkBar();
        if (bulk) wrap.appendChild(bulk);

        var list = sortUsers(filterUsers(S.users));
        if (!list.length) {
            wrap.appendChild(el('div', { class: 'nxp-empty' },
                'No users match the current filter.'));
            return wrap;
        }

        list.forEach(function(u) {
            var row = el('div', { class: 'nxp-row' });

            var cb = el('input', { class: 'nxp-checkbox', type: 'checkbox' });
            cb.checked = !!S.selectedIds[String(u.tokenPreview)];
            cb.addEventListener('change', function() {
                S.selectedIds[String(u.tokenPreview)] = cb.checked;
                render();
            });
            row.appendChild(cb);

            var info = el('div', { class: 'nxp-user' });
            var name = el('div', { class: 'nxp-name' },
                (u.username || 'Unknown') + ' #' + u.aisakaId);
            var tag = roleTag(u.role);
            if (tag) name.appendChild(tag);
            if (u.banned) name.appendChild(el('span', { class: 'nxp-tag banned' }, 'BANNED'));
            info.appendChild(name);
            var meta = 'Last seen ' + ago(u.lastSeen);
            if (u.tokenPreview) meta += ' \u2022 ' + u.tokenPreview;
            info.appendChild(el('div', { class: 'nxp-meta' }, meta));
            row.appendChild(info);

            var acts = el('div', { class: 'nxp-btn-group' });
            acts.appendChild(el('button', {
                class: 'nxp-btn',
                onclick: function() {
                    S.selectedUser = u;
                    S.banReason = '';
                    S.banHours = '';
                    clearFeedback();
                    render();
                }
            }, 'View'));

            if (can('admin')) {
                var banOk = !(rank(u.role) >= rank('admin') && !isDev());
                acts.appendChild(el('button', {
                    class: 'nxp-btn ' + (u.banned ? 'primary' : 'danger'),
                    disabled: !u.banned && !banOk,
                    onclick: function() {
                        if (!u.tokenPreview) {
                            feedback(false, 'No token preview for this user.');
                            return;
                        }
                        var fn = u.banned ? 'adminUnban' : 'adminBan';
                        var args = u.banned ? [u.tokenPreview] : [u.tokenPreview, {}];
                        call(fn, args).then(function(raw) {
                            var res = norm(raw);
                            if (res.status === 200 && res.data && res.data.ok) {
                                feedback(true, (u.banned ? 'Unbanned ' : 'Banned ') + u.username);
                                loadUsers();
                            } else {
                                feedback(false, (res.data && res.data.error) || 'Failed');
                            }
                        }).catch(function(e) { feedback(false, e.message); });
                    }
                }, u.banned ? 'Unban' : 'Ban'));
            }
            row.appendChild(acts);
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

    function download(name, data) {
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }

    function logsView() {
        var wrap = el('div', {});

        var bar = el('div', { class: 'nxp-btn-group', style: 'margin-bottom:16px' });
        bar.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() { loadLogs(); }
        }, 'Refresh'));
        bar.appendChild(el('button', {
            class: 'nxp-btn',
            disabled: !S.logs || !S.logs.length,
            onclick: function() { download('nexus-logs-' + Date.now() + '.json', S.logs || []); }
        }, 'Export JSON'));
        wrap.appendChild(bar);

        if (S.logsLoading) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'Loading logs\u2026'));
            return wrap;
        }
        if (S.logsError) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, S.logsError));
            return wrap;
        }
        if (!S.logs || !S.logs.length) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'No log entries.'));
            return wrap;
        }

        S.logs.forEach(function(l) {
            var line = el('div', { class: 'nxp-log' });
            line.appendChild(el('span', { class: 'nxp-log-time' }, time(l.ts)));
            line.appendChild(document.createTextNode(
                (l.actor || 'unknown') + ' \u00b7 ' + (l.action || '') +
                (l.meta ? ' \u2014 ' + l.meta : '')
            ));
            wrap.appendChild(line);
        });
        return wrap;
    }

    function featuresView() {
        var wrap = el('div', {});
        if (S.configLoading) return el('div', { class: 'nxp-empty' }, 'Loading features\u2026');
        if (S.configError) return el('div', { class: 'nxp-empty' }, S.configError);

        var cfg = S.config || {};

        wrap.appendChild(el('div', { class: 'nxp-sub', style: 'margin-bottom:16px' },
            'Master on/off for each feature.'));

        FEATURES.forEach(function(f) {
            var on = cfg[f.key] !== false;
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
                    call('adminConfig', [patch]).then(function(raw) {
                        var res = norm(raw);
                        if (res.status === 200 && res.data && res.data.ok) {
                            S.config = Object.assign({}, S.config, patch);
                            feedback(true, f.label + ' ' + (next ? 'enabled.' : 'disabled.'));
                        } else {
                            feedback(false, (res.data && res.data.error) || 'Failed');
                            render();
                        }
                    }).catch(function(err) {
                        feedback(false, err.message);
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

    function configView() {
        var wrap = el('div', {});
        if (S.configLoading) return el('div', { class: 'nxp-empty' }, 'Loading config\u2026');
        if (S.configError) return el('div', { class: 'nxp-empty' }, S.configError);

        var cfg = S.config || {};
        wrap.appendChild(el('div', { class: 'nxp-section-title' }, 'Maintenance mode'));

        var row = el('div', { class: 'nxp-toggle' });
        var info = el('div', { class: 'nxp-toggle-info' });
        info.appendChild(el('div', { class: 'nxp-name' }, 'Put Nexus into maintenance'));
        info.appendChild(el('div', { class: 'nxp-meta' },
            'When ON, non-dev Nexus users see a fullscreen overlay.'));
        row.appendChild(info);

        var on = cfg.maintenance === true;
        row.appendChild(el('span', { class: 'nxp-tag ' + (on ? 'warn' : 'ok') },
            on ? 'ON' : 'OFF'));

        var sw = el('label', { class: 'nxp-switch' });
        var input = el('input', {
            type: 'checkbox',
            onchange: function(e) {
                var next = !!e.currentTarget.checked;
                call('adminConfig', [{ maintenance: next }]).then(function(raw) {
                    var res = norm(raw);
                    if (res.status === 200 && res.data && res.data.ok) {
                        S.config = Object.assign({}, S.config, { maintenance: next });
                        feedback(true, 'Maintenance ' + (next ? 'enabled.' : 'disabled.'));
                    } else {
                        feedback(false, (res.data && res.data.error) || 'Failed');
                        render();
                    }
                }).catch(function(err) {
                    feedback(false, err.message);
                    render();
                });
            }
        });
        input.checked = on;
        sw.appendChild(input);
        sw.appendChild(el('span', { class: 'nxp-slider' }));
        row.appendChild(sw);
        wrap.appendChild(row);

        wrap.appendChild(el('div', {
            class: 'nxp-section-title',
            style: 'margin-top:24px'
        }, 'All config keys'));

        var keys = Object.keys(cfg).sort();
        if (!keys.length) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'Config is empty.'));
            return wrap;
        }
        keys.forEach(function(k) {
            var r = el('div', { class: 'nxp-row' });
            var i = el('div', { class: 'nxp-user' });
            i.appendChild(el('div', { class: 'nxp-name' }, k));
            i.appendChild(el('div', { class: 'nxp-meta' }, JSON.stringify(cfg[k])));
            r.appendChild(i);
            wrap.appendChild(r);
        });
        return wrap;
    }

    function announceView() {
        var wrap = el('div', {});
        if (S.serverStateLoading) {
            return el('div', { class: 'nxp-empty' }, 'Loading current announcement\u2026');
        }

        var cur = S.serverState && S.serverState.announcement;

        var status = el('div', { class: 'nxp-status-box' });
        var line = el('div', { class: 'nxp-status-line' });

        if (cur && cur.text) {
            if (cur.test) line.appendChild(el('span', { class: 'nxp-tag warn' }, 'TEST'));
            else line.appendChild(el('span', { class: 'nxp-tag ok' }, 'LIVE'));
            line.appendChild(document.createTextNode(' ' + cur.text.slice(0, 80) +
                (cur.text.length > 80 ? '\u2026' : '')));
            status.appendChild(line);
            status.appendChild(el('div', { class: 'nxp-status-meta' },
                'Updated ' + ago(cur.updatedAt) + ' (' + time(cur.updatedAt) + ')' +
                (cur.test ? ' \u2022 visible only to you' : '')));
        } else {
            line.appendChild(el('span', { class: 'nxp-tag' }, 'NONE'));
            line.appendChild(document.createTextNode(' No announcement is currently live.'));
            status.appendChild(line);
        }
        wrap.appendChild(status);

        wrap.appendChild(el('div', { class: 'nxp-section-title' },
            cur && cur.text ? 'Replace announcement' : 'New announcement'));

        var counter = el('div', { class: 'nxp-announce-counter' });
        function update(v) {
            var n = (v || '').length;
            counter.textContent = n + ' / 500';
            counter.style.color = n > 450 ? '#e5484d' : '';
        }

        var ta = el('textarea', {
            class: 'nxp-textarea',
            placeholder: 'Announcement text\u2026',
            oninput: function(e) {
                S.announceDraft = e.currentTarget.value;
                update(S.announceDraft);
                var prev = document.querySelector('.nxp-announce-preview');
                if (prev) prev.textContent = (S.announceDraft || '').trim() || '(empty)';
            }
        });
        ta.value = S.announceDraft || '';
        wrap.appendChild(ta);
        wrap.appendChild(counter);
        update(S.announceDraft);

        wrap.appendChild(el('div', {
            class: 'nxp-field-label',
            style: 'margin-top:8px'
        }, 'Preview'));
        var preview = el('div', { class: 'nxp-preview nxp-announce-preview' });
        preview.textContent = (S.announceDraft || '').trim() || '(empty)';
        wrap.appendChild(preview);

        var actions = el('div', { class: 'nxp-btn-group', style: 'margin-top:12px' });

        actions.appendChild(el('button', {
            class: 'nxp-btn primary',
            onclick: function() {
                call('adminAnnounce', [S.announceDraft || '']).then(function(raw) {
                    var res = norm(raw);
                    if (res.status === 200 && res.data && res.data.ok) {
                        feedback(true, 'Announcement posted.');
                        S.announceDraft = '';
                        loadState();
                    } else {
                        feedback(false, (res.data && res.data.error) || 'Failed');
                    }
                }).catch(function(e) { feedback(false, e.message); });
            }
        }, 'Post announcement'));

        actions.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() {
                call('adminAnnounce', [S.announceDraft || '', true]).then(function(raw) {
                    var res = norm(raw);
                    if (res.status === 200 && res.data && res.data.ok) {
                        feedback(true, 'Test announcement posted. Only you will see it.');
                        S.announceDraft = '';
                        loadState();
                    } else {
                        feedback(false, (res.data && res.data.error) || 'Failed');
                    }
                }).catch(function(e) { feedback(false, e.message); });
            }
        }, 'Send test'));

        actions.appendChild(el('button', {
            class: 'nxp-btn',
            disabled: !(cur && cur.text),
            onclick: function() {
                S.announceDraft = '';
                call('adminAnnounce', ['']).then(function(raw) {
                    var res = norm(raw);
                    if (res.status === 200 && res.data && res.data.ok) {
                        feedback(true, 'Announcement cleared.');
                        loadState();
                    } else {
                        feedback(false, (res.data && res.data.error) || 'Failed');
                    }
                }).catch(function(e) { feedback(false, e.message); });
            }
        }, 'Clear'));

        actions.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() { loadState(); }
        }, 'Refresh'));
        wrap.appendChild(actions);
        return wrap;
    }

    function lookup(id) {
        if (!S.lookupCache) S.lookupCache = {};
        if (S.lookupCache[id]) {
            S.lookupResult = { id: id, loading: false, user: S.lookupCache[id] };
            paintLookup();
            return;
        }
        S.lookupResult = { id: id, loading: true };
        paintLookup();
        call('adminUsers').then(function(raw) {
            var res = norm(raw);
            if (res.status === 200) {
                var all = (res.data && res.data.users) || [];
                var u = all.filter(function(x) {
                    return String(x.aisakaId) === String(id);
                })[0] || null;
                S.lookupCache[id] = u;
                S.lookupResult = { id: id, loading: false, user: u };
            } else {
                S.lookupResult = { id: id, loading: false, error: 'Lookup failed' };
            }
            paintLookup();
        }).catch(function(e) {
            S.lookupResult = { id: id, loading: false, error: e.message || 'Lookup failed' };
            paintLookup();
        });
    }

    function paintLookup() {
        var line = document.querySelector('.nxp-lookup-live');
        if (!line) return;
        line.replaceChildren();
        var lr = S.lookupResult;
        if (!lr) return;
        if (lr.loading) line.textContent = 'Checking #' + lr.id + '\u2026';
        else if (lr.error) line.textContent = lr.error;
        else if (lr.user) {
            line.appendChild(document.createTextNode(
                'Already claimed: ' + (lr.user.username || 'Unknown') + ' \u2014 current role: '
            ));
            var t = roleTag(lr.user.role);
            if (t) line.appendChild(t);
            else line.appendChild(document.createTextNode(lr.user.role || 'user'));
            if (lr.user.banned) {
                line.appendChild(el('span', { class: 'nxp-tag banned' }, 'BANNED'));
            }
        } else {
            line.textContent = 'Not claimed yet \u2014 role will be stored as pending.';
        }
    }

    function adminsView() {
        var wrap = el('div', {});

        wrap.appendChild(el('div', { class: 'nxp-section-title' }, 'Assign role by Aisaka ID'));
        wrap.appendChild(el('div', {
            class: 'nxp-sub',
            style: 'margin-bottom:16px'
        }, 'Works for claimed and unclaimed users.'));

        var row = el('div', { class: 'nxp-role-row' });
        var idField = el('div', { class: 'nxp-field' });
        idField.appendChild(el('div', { class: 'nxp-field-label' }, 'Aisaka ID'));
        idField.appendChild(el('input', {
            class: 'nxp-input',
            type: 'text',
            placeholder: 'e.g. 12345',
            value: S.roleIdInput || '',
            oninput: function(e) {
                S.roleIdInput = e.currentTarget.value;
                if (S.lookupTimer) clearTimeout(S.lookupTimer);
                var v = parseInt(S.roleIdInput, 10);
                if (v) {
                    S.lookupTimer = setTimeout(function() { lookup(v); }, 400);
                } else {
                    S.lookupResult = null;
                    paintLookup();
                }
            }
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
                if (!id) { feedback(false, 'Enter a valid Aisaka ID.'); return; }
                S.roleSubmitting = true;
                render();
                call('adminRoleById', [id, S.roleSelectValue]).then(function(raw) {
                    S.roleSubmitting = false;
                    var res = norm(raw);
                    if (res.status === 200 && res.data && res.data.ok) {
                        S.roleLastResult = {
                            id: id,
                            role: res.data.role,
                            applied: !!res.data.applied
                        };
                        feedback(true, res.data.applied
                            ? 'Updated #' + id + ' \u2192 ' + res.data.role
                            : 'Pending: #' + id + ' \u2192 ' + res.data.role +
                                ' (applies on first claim)');
                        S.roleIdInput = '';
                        if (S.lookupCache) delete S.lookupCache[id];
                        loadUsers();
                    } else {
                        feedback(false, (res.data && res.data.error) || 'Failed');
                    }
                }).catch(function(err) {
                    S.roleSubmitting = false;
                    feedback(false, err.message);
                });
            }
        }, S.roleSubmitting ? 'Applying\u2026' : 'Apply'));
        row.appendChild(applyWrap);
        wrap.appendChild(row);

        var line = el('div', { class: 'nxp-lookup-result nxp-lookup-live' });
        wrap.appendChild(line);
        paintLookup();

        if (S.roleLastResult) {
            wrap.appendChild(el('div', {
                class: 'nxp-status-box',
                style: 'margin-top:16px'
            }, el('div', { class: 'nxp-status-line' },
                el('span', {
                    class: 'nxp-tag ' + (S.roleLastResult.applied ? 'ok' : 'warn')
                }, S.roleLastResult.applied ? 'APPLIED' : 'PENDING'),
                document.createTextNode(' #' + S.roleLastResult.id +
                    ' \u2192 ' + S.roleLastResult.role)
            )));
        }
        return wrap;
    }

    function tokensView() {
        var wrap = el('div', {});
        var bar = el('div', { class: 'nxp-btn-group', style: 'margin-bottom:16px' });
        bar.appendChild(el('button', {
            class: 'nxp-btn',
            onclick: function() { loadTokens(); }
        }, 'Refresh'));
        wrap.appendChild(bar);
        wrap.appendChild(el('div', {
            class: 'nxp-sub',
            style: 'margin-bottom:12px'
        }, 'Dev only. Every claimed Nexus token.'));

        if (S.tokensLoading) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'Loading tokens\u2026'));
            return wrap;
        }
        if (S.tokensError) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, S.tokensError));
            return wrap;
        }
        if (!S.tokens || !S.tokens.length) {
            wrap.appendChild(el('div', { class: 'nxp-empty' }, 'No tokens.'));
            return wrap;
        }

        S.tokens.forEach(function(t) {
            var row = el('div', { class: 'nxp-row' });
            var info = el('div', { class: 'nxp-user' });
            var name = el('div', { class: 'nxp-name' },
                (t.username || 'Unknown') + ' #' + t.aisakaId);
            var tag = roleTag(t.role);
            if (tag) name.appendChild(tag);
            info.appendChild(name);

            var tr = el('div', { class: 'nxp-detail-val' });
            tr.appendChild(document.createTextNode(t.token));
            var btn = el('button', { class: 'nxp-copy-btn' }, 'copy');
            btn.addEventListener('click', function() { copy(t.token, btn); });
            tr.appendChild(btn);
            info.appendChild(tr);
            row.appendChild(info);
            wrap.appendChild(row);
        });
        return wrap;
    }

    function loadUsers() {
        S.loading = true;
        S.error = null;
        render();
        call('adminUsers').then(function(raw) {
            var res = norm(raw);
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
        call('adminLogs').then(function(raw) {
            var res = norm(raw);
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
        call('config').then(function(raw) {
            var res = norm(raw);
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

    function loadState() {
        S.serverStateLoading = true;
        render();
        call('config').then(function(raw) {
            var res = norm(raw);
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
        call('adminTokens').then(function(raw) {
            var res = norm(raw);
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

            var id = (window.NX && typeof window.NX.getMeId === 'function')
                ? window.NX.getMeId()
                : parseInt(localStorage.getItem('nx_me_id') || '0', 10);
            var name = (window.NX && typeof window.NX.getMeName === 'function')
                ? window.NX.getMeName()
                : '';

            call('claim', [id, name]).then(function() {
                call('me').then(function(raw) {
                    var res = norm(raw);
                    if (res.status === 200 && res.data && res.data.user) {
                        S.role = res.data.user.role ||
                            (res.data.user.isAdmin ? 'admin' : 'user');
                        window.NX.role = S.role;
                    }
                    render();
                    loadLogs();
                    if (can('moderator')) loadUsers();
                    loadState();
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
