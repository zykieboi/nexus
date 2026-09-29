(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var PANEL_ID = 'nx-bulk-panel';
    var STYLE_ID = 'nx-bulk-style';
    var CSRF_KEY = 'nx_csrf_bulk';

    function dark() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    function userFromUrl() {
        var m = location.pathname.match(/\/users\/(\d+)\//);
        if (m) return m[1];
        var p = new URLSearchParams(location.search);
        return p.get('userId') || p.get('viewerId');
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
        var d = dark();
        var bg = d ? '#232527' : '#ffffff';
        var border = d ? '#3a3d40' : '#c7cbce';
        var text = d ? '#e0e0e0' : '#232527';
        var muted = d ? '#7a7d80' : '#6a6d70';
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '#' + PANEL_ID + '{position:fixed;top:52px;right:14px;z-index:2147483640;',
            'width:320px;max-height:80vh;overflow:auto;background:' + bg + ';',
            'color:' + text + ';border:1px solid ' + border + ';border-radius:8px;',
            'padding:14px;font-family:inherit;font-size:13px;',
            'box-shadow:0 6px 24px rgba(0,0,0,0.25);}',
            '#' + PANEL_ID + ' h3{margin:0 0 10px;font-size:14px;font-weight:600;}',
            '#' + PANEL_ID + ' .nx-row{display:flex;align-items:center;gap:8px;',
            'padding:6px 0;border-bottom:1px solid ' + (d ? '#2a2c2e' : '#e1e4e8') + ';}',
            '#' + PANEL_ID + ' .nx-row:last-child{border-bottom:0;}',
            '#' + PANEL_ID + ' .nx-row img{width:32px;height:32px;border-radius:50%;',
            'background:' + border + ';}',
            '#' + PANEL_ID + ' .nx-row .name{flex:1;overflow:hidden;',
            'text-overflow:ellipsis;white-space:nowrap;}',
            '#' + PANEL_ID + ' .nx-toolbar{display:flex;gap:6px;margin:8px 0;flex-wrap:wrap;}',
            '#' + PANEL_ID + ' button{padding:5px 10px;font-size:12px;',
            'border-radius:5px;border:1px solid ' + border + ';background:transparent;',
            'color:' + text + ';cursor:pointer;font-family:inherit;}',
            '#' + PANEL_ID + ' button:hover{background:' + (d ? '#2a2c2e' : '#e8eef5') + ';}',
            '#' + PANEL_ID + ' button.danger{border-color:#e5484d;color:#e5484d;}',
            '#' + PANEL_ID + ' button.danger:hover{background:#e5484d;color:#fff;}',
            '#' + PANEL_ID + ' button:disabled{opacity:0.5;cursor:not-allowed;}',
            '#' + PANEL_ID + ' .count{color:' + muted + ';font-size:12px;}',
            '#' + PANEL_ID + ' .close{position:absolute;top:8px;right:10px;',
            'background:none;border:0;color:' + muted + ';font-size:18px;cursor:pointer;}',
            '#' + PANEL_ID + ' .close:hover{color:' + text + ';}'
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

        style();
        var panel = document.createElement('div');
        panel.id = PANEL_ID;

        var close = document.createElement('button');
        close.className = 'close';
        close.textContent = '\u00d7';
        close.addEventListener('click', function() {
            panel.remove();
            state.loaded = false;
        });
        panel.appendChild(close);

        var h = document.createElement('h3');
        h.textContent = 'Bulk Unfriend';
        panel.appendChild(h);

        var count = document.createElement('div');
        count.className = 'count';
        count.textContent = state.friends.length + ' friends \u2022 ' + selectedCount() + ' selected';
        panel.appendChild(count);

        var bar = document.createElement('div');
        bar.className = 'nx-toolbar';

        var selectAll = document.createElement('button');
        selectAll.textContent = 'Select All';
        selectAll.disabled = state.busy || !state.friends.length;
        selectAll.addEventListener('click', function() {
            state.friends.forEach(function(f) { state.selected[f.id] = true; });
            renderPanel();
        });
        bar.appendChild(selectAll);

        var deselectAll = document.createElement('button');
        deselectAll.textContent = 'Deselect All';
        deselectAll.disabled = state.busy || !state.friends.length;
        deselectAll.addEventListener('click', function() {
            state.selected = {};
            renderPanel();
        });
        bar.appendChild(deselectAll);

        var unfriend = document.createElement('button');
        unfriend.className = 'danger';
        unfriend.textContent = 'Unfriend Selected';
        unfriend.disabled = state.busy || selectedCount() === 0;
        unfriend.addEventListener('click', doUnfriend);
        bar.appendChild(unfriend);

        panel.appendChild(bar);

        if (!state.friends.length) {
            var empty = document.createElement('div');
            empty.className = 'count';
            empty.style.marginTop = '8px';
            empty.textContent = 'No friends to unfriend.';
            panel.appendChild(empty);
        } else {
            state.friends.forEach(function(f) {
                var row = document.createElement('label');
                row.className = 'nx-row';

                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = !!state.selected[f.id];
                cb.disabled = state.busy;
                cb.addEventListener('change', function() {
                    state.selected[f.id] = cb.checked;
                    renderPanel();
                });
                row.appendChild(cb);

                var img = document.createElement('img');
                img.src = 'https://tcdn.octane.wtf/' + f.id + '_headshot.png';
                img.onerror = function() { img.style.visibility = 'hidden'; };
                row.appendChild(img);

                var name = document.createElement('span');
                name.className = 'name';
                name.textContent = f.displayName || f.name || ('User ' + f.id);
                row.appendChild(name);

                panel.appendChild(row);
            });
        }

        if (state.status) {
            var st = document.createElement('div');
            st.className = 'count';
            st.style.marginTop = '8px';
            st.textContent = state.status;
            panel.appendChild(st);
        }

        document.body.appendChild(panel);
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

    function onFriendsPage() {
        return /\/users\/\d+\/friends/.test(location.pathname);
    }

    window.NX.features.bulkUnfriend = {
        apply: function() {
            if (!onFriendsPage()) {
                var old = document.getElementById(PANEL_ID);
                if (old) old.remove();
                state.loaded = false;
                return;
            }
            if (!state.loaded && !state.busy) {
                loadFriends();
            }
            if (!scanner) scanner = setInterval(function() {
                if (onFriendsPage()) {
                    if (!state.loaded && !state.busy) loadFriends();
                } else {
                    var old = document.getElementById(PANEL_ID);
                    if (old) old.remove();
                    state.loaded = false;
                }
            }, 800);
        },
        teardown: function() {
            if (scanner) { clearInterval(scanner); scanner = null; }
            var old = document.getElementById(PANEL_ID);
            if (old) old.remove();
            state.loaded = false;
        }
    };
})();
