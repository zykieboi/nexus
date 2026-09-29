(function() {
    'use strict';

    if (window.top !== window.self) return;

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var PANEL_ID = 'nx-bulk-panel';
    var STYLE_ID = 'nx-bulk-style';
    var CSRF_KEY = 'nx_csrf_bulk';

    function userFromUrl() {
        var m = location.pathname.match(/\/users\/(\d+)\//);
        if (m) return m[1];
        var p = new URLSearchParams(location.search);
        return p.get('userId') || p.get('viewerId');
    }

    function friendsIframe() {
        var main = document.querySelector('.main-0-2-8');
        if (!main) return null;
        return main.querySelector('iframe[src*="/theme2020/users/"]');
    }

    function onFriendsTab() {
        if (!/\/users\/\d+\/friends/.test(location.pathname)) return false;
        var f = friendsIframe();
        if (!f) return false;
        var href;
        try { href = f.contentWindow.location.href; } catch (e) { return true; }
        return /#!\/friends\b/.test(href) || href.indexOf('#!') === -1;
    }

    function getCsrf() {
        try { return GM_getValue(CSRF_KEY, ''); } catch (e) { return ''; }
    }
    function setCsrf(v) {
        try { GM_setValue(CSRF_KEY, v); } catch (e) {}
    }

    function request(url, opts) {
        opts = opts || {};
        opts.credentials = 'include';
        opts.headers = opts.headers || {};
        if (opts.body && !opts.headers['Content-Type']) {
            opts.headers['Content-Type'] = 'application/json';
        }
        var token = getCsrf();
        if (token) opts.headers['X-CSRF-Token'] = token;

        return fetch(url, opts).then(function(r) {
            if (r.status === 403) {
                var fresh = r.headers.get('x-csrf-token');
                if (fresh && fresh !== token) {
                    setCsrf(fresh);
                    opts.headers['X-CSRF-Token'] = fresh;
                    return fetch(url, opts);
                }
            }
            return r;
        });
    }

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '#' + PANEL_ID + '{position:absolute;',
            'display:inline-flex;align-items:center;gap:12px;padding:0;',
            'font-family:inherit;font-size:14px;z-index:5;box-sizing:border-box;',
            'pointer-events:none;}',
            '#' + PANEL_ID + ' > *{pointer-events:auto;}',
            '#' + PANEL_ID + ' .count{color:#6a6d70;font-size:13px;}',
            '#' + PANEL_ID + ' button{padding:6px 14px;font-size:13px;border-radius:4px;',
            'border:1px solid #c7cbce;background:#fff;color:#232527;cursor:pointer;',
            'font-family:inherit;}',
            '#' + PANEL_ID + ' button:hover{background:#e8eef5;}',
            '#' + PANEL_ID + ' button.danger{border-color:#d9534f;color:#d9534f;}',
            '#' + PANEL_ID + ' button.danger:hover{background:#d9534f;color:#fff;}',
            '#' + PANEL_ID + ' button:disabled{opacity:0.5;cursor:not-allowed;}',
            'html.octane-dark #' + PANEL_ID + ' .count{color:#7a7d80;}',
            'html.octane-dark #' + PANEL_ID + ' button{background:transparent;',
            'border-color:#3a3d40;color:#e0e0e0;}',
            'html.octane-dark #' + PANEL_ID + ' button:hover{background:#2a2c2e;}'
        ].join('');
        document.head.appendChild(s);
    }

    var state = {
        friends: [],
        selected: {},
        busy: false,
        status: '',
        loaded: false
    };

    function selectedCount() {
        return Object.keys(state.selected).filter(function(k) { return state.selected[k]; }).length;
    }

    function renderPanel() {
        var old = document.getElementById(PANEL_ID);
        if (old) old.remove();
        if (!state.loaded) return;

        var main = document.querySelector('.main-0-2-8');
        if (!main) return;
        var iframe = friendsIframe();
        if (!iframe) return;

        style();
        main.style.position = 'relative';

        var dpr = window.devicePixelRatio || 1;
        var leftPct = 18 + (1 - dpr) * 35;
        if (leftPct < 10) leftPct = 10;
        if (leftPct > 40) leftPct = 40;

        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.style.top = '190px';
        panel.style.left = leftPct + '%';
        panel.style.right = 'auto';
        panel.style.width = 'fit-content';

        var selectAll = document.createElement('button');
        selectAll.textContent = 'Select All';
        selectAll.disabled = state.busy || !state.friends.length;
        selectAll.addEventListener('click', function() {
            state.friends.forEach(function(f) { state.selected[f.id] = true; });
            renderPanel();
        });
        panel.appendChild(selectAll);

        var deselectAll = document.createElement('button');
        deselectAll.textContent = 'Deselect All';
        deselectAll.disabled = state.busy || !state.friends.length;
        deselectAll.addEventListener('click', function() {
            state.selected = {};
            renderPanel();
        });
        panel.appendChild(deselectAll);

        var count = document.createElement('span');
        count.className = 'count';
        count.textContent = state.friends.length + ' friends \u2022 ' + selectedCount() + ' selected';
        panel.appendChild(count);

        var unfriend = document.createElement('button');
        unfriend.className = 'danger';
        unfriend.textContent = 'Unfriend Selected';
        unfriend.disabled = state.busy || selectedCount() === 0;
        unfriend.addEventListener('click', doUnfriend);
        panel.appendChild(unfriend);

        if (state.status) {
            var st = document.createElement('span');
            st.className = 'count';
            st.textContent = state.status;
            panel.appendChild(st);
        }

        main.appendChild(panel);
    }

    function loadFriends() {
        var userId = userFromUrl();
        if (!userId) return;

        request('/apisite/friends/v1/users/' + userId + '/friends?limit=100')
            .then(function(r) { return r.json(); })
            .then(function(d) {
                state.friends = (d && d.data) || [];
                state.loaded = true;
                renderPanel();
            })
            .catch(function() {
                state.status = 'Failed to load friends';
                state.loaded = true;
                renderPanel();
            });
    }

    function doUnfriend() {
        var ids = Object.keys(state.selected).filter(function(k) { return state.selected[k]; });
        if (!ids.length) return;
        if (!confirm('Unfriend ' + ids.length + ' user(s)?')) return;

        state.busy = true;
        state.status = 'Working\u2026';
        renderPanel();

        var ok = 0, fail = 0;
        var i = 0;

        function next() {
            if (i >= ids.length) {
                state.busy = false;
                state.status = 'Done. Unfriended: ' + ok + ', failed: ' + fail;
                state.selected = {};
                loadFriends();
                return;
            }
            var id = ids[i++];
            request('/apisite/friends/v1/users/' + id + '/unfriend', {
                method: 'POST',
                body: JSON.stringify({ targetUserId: Number(id) })
            }).then(function(r) {
                if (r.ok) ok++; else fail++;
                state.status = 'Working\u2026 ' + i + '/' + ids.length;
                renderPanel();
                setTimeout(next, 1500);
            }).catch(function() {
                fail++;
                state.status = 'Working\u2026 ' + i + '/' + ids.length;
                renderPanel();
                setTimeout(next, 1500);
            });
        }

        next();
    }

    var scanner = null;
    var lastUserId = null;

    window.NX.features.bulkUnfriend = {
        apply: function() {
            if (!onFriendsTab()) {
                var old = document.getElementById(PANEL_ID);
                if (old) old.remove();
                return;
            }

            var userId = userFromUrl();
            if (userId && userId !== lastUserId) {
                lastUserId = userId;
                state.friends = [];
                state.selected = {};
                state.status = '';
                state.loaded = false;
                loadFriends();
            } else if (!document.getElementById(PANEL_ID)) {
                loadFriends();
            }

            if (!scanner) scanner = setInterval(function() {
                if (onFriendsTab()) {
                    if (!document.getElementById(PANEL_ID)) loadFriends();
                } else {
                    var old = document.getElementById(PANEL_ID);
                    if (old) old.remove();
                }
            }, 400);
        },
        teardown: function() {
            if (scanner) { clearInterval(scanner); scanner = null; }
            var old = document.getElementById(PANEL_ID);
            if (old) old.remove();
            state.loaded = false;
        }
    };
})();
