(function () {
    'use strict';

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

    function onFriendsPage() {
        return /\/users\/\d+\/friends/.test(location.pathname)
            && !!document.querySelector('.friends-content .container-header');
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

        return fetch(url, opts).then(function (r) {
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
            '#' + PANEL_ID + '{display:flex;align-items:center;gap:10px;',
            'margin:8px 0 12px;font-family:inherit;font-size:14px;box-sizing:border-box;flex-wrap:wrap;}',
            '#' + PANEL_ID + ' button{padding:5px 12px;font-size:13px;border-radius:4px;',
            'border:1px solid #c7cbce;background:#fff;color:#232527;cursor:pointer;',
            'font-family:inherit;line-height:1.2;}',
            '#' + PANEL_ID + ' button:hover{background:#e8eef5;}',
            '#' + PANEL_ID + ' button.danger{border-color:#d9534f;color:#d9534f;}',
            '#' + PANEL_ID + ' button.danger:hover{background:#d9534f;color:#fff;}',
            '#' + PANEL_ID + ' button:disabled{opacity:0.5;cursor:not-allowed;}',
            '#' + PANEL_ID + ' .count{color:#6a6d70;font-size:13px;white-space:nowrap;}',
            'html.octane-dark #' + PANEL_ID + ' .count{color:#7a7d80;}',
            'html.octane-dark #' + PANEL_ID + ' button{background:transparent;',
            'border-color:#3a3d40;color:#e0e0e0;}',
            'html.octane-dark #' + PANEL_ID + ' button:hover{background:#2a2c2e;}',
            '.avatar-card .nx-bulk-check{position:absolute;top:6px;left:6px;z-index:3;',
            'width:20px;height:20px;cursor:pointer;margin:0;}',
            '.avatar-card.nx-bulk-selected{outline:2px solid #0d6efd;outline-offset:-2px;}'
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
        return Object.keys(state.selected).filter(function (k) { return state.selected[k]; }).length;
    }

    function containerHeader() {
        return document.querySelector('.friends-content .container-header');
    }

    function renderPanel() {
        var header = containerHeader();
        if (!header) return;

        var old = document.getElementById(PANEL_ID);
        if (old) old.remove();

        if (!state.loaded) return;

        style();

        var panel = document.createElement('div');
        panel.id = PANEL_ID;

        var count = document.createElement('span');
        count.className = 'count';
        count.textContent = state.friends.length + ' friends \u2022 ' + selectedCount() + ' selected';
        panel.appendChild(count);

        var selectAll = document.createElement('button');
        selectAll.textContent = 'Select All';
        selectAll.disabled = state.busy || !state.friends.length;
        selectAll.addEventListener('click', function () {
            state.friends.forEach(function (f) { state.selected[f.id] = true; });
            syncChecks();
            renderPanel();
        });
        panel.appendChild(selectAll);

        var deselectAll = document.createElement('button');
        deselectAll.textContent = 'Deselect All';
        deselectAll.disabled = state.busy || !state.friends.length;
        deselectAll.addEventListener('click', function () {
            state.selected = {};
            syncChecks();
            renderPanel();
        });
        panel.appendChild(deselectAll);

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

        header.parentNode.insertBefore(panel, header.nextSibling);
    }

    function cards() {
        return document.querySelectorAll('.friends-content .tab-pane.active ul.avatar-cards li.avatar-card,'
            + ' .friends-content ul.avatar-cards li.avatar-card');
    }

    function cardId(card) {
        if (card.id && /^\d+$/.test(card.id)) return card.id;
        var link = card.querySelector('a[href*="/users/"]');
        if (link) {
            var m = (link.getAttribute('href') || '').match(/\/users\/(\d+)/);
            if (m) return m[1];
        }
        return null;
    }

    function paintCards() {
        Array.prototype.forEach.call(cards(), function (card) {
            var uid = cardId(card);
            if (!uid) return;
            card.setAttribute('data-nx-uid', uid);

            var existing = card.querySelector('.nx-bulk-check');
            if (existing) {
                existing.checked = !!state.selected[uid];
                card.classList.toggle('nx-bulk-selected', !!state.selected[uid]);
                return;
            }

            if (getComputedStyle(card).position === 'static') {
                card.style.position = 'relative';
            }

            var box = document.createElement('input');
            box.type = 'checkbox';
            box.className = 'nx-bulk-check';
            box.checked = !!state.selected[uid];
            box.addEventListener('change', function (e) {
                e.stopPropagation();
                state.selected[uid] = box.checked;
                card.classList.toggle('nx-bulk-selected', box.checked);
                renderPanel();
            });
            box.addEventListener('click', function (e) { e.stopPropagation(); });

            card.appendChild(box);
            if (state.selected[uid]) card.classList.add('nx-bulk-selected');
        });
    }

    function syncChecks() {
        Array.prototype.forEach.call(cards(), function (card) {
            var uid = card.getAttribute('data-nx-uid') || cardId(card);
            if (!uid) return;
            var box = card.querySelector('.nx-bulk-check');
            if (box) box.checked = !!state.selected[uid];
            card.classList.toggle('nx-bulk-selected', !!state.selected[uid]);
        });
    }

    function loadFriends() {
        var userId = userFromUrl();
        if (!userId) return;

        request('/apisite/friends/v1/users/' + userId + '/friends?limit=100')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                state.friends = (d && d.data) || [];
                state.loaded = true;
                renderPanel();
                paintCards();
            })
            .catch(function () {
                state.status = 'Failed to load friends';
                state.loaded = true;
                renderPanel();
            });
    }

    function doUnfriend() {
        var ids = Object.keys(state.selected).filter(function (k) { return state.selected[k]; });
        if (!ids.length) return;
        if (!confirm('Unfriend ' + ids.length + ' user(s)?')) return;

        state.busy = true;
        state.status = 'Working\u2026';
        renderPanel();

        var ok = 0, fail = 0, i = 0;

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
            }).then(function (r) {
                if (r.ok) ok++; else fail++;
                state.status = 'Working\u2026 ' + i + '/' + ids.length;
                renderPanel();
                setTimeout(next, 1500);
            }).catch(function () {
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
        apply: function () {
            if (!onFriendsPage()) {
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
            } else if (!state.loaded) {
                loadFriends();
            } else if (!document.getElementById(PANEL_ID)) {
                renderPanel();
                paintCards();
            }

            if (!scanner) {
                scanner = setInterval(function () {
                    if (!onFriendsPage()) {
                        var old = document.getElementById(PANEL_ID);
                        if (old) old.remove();
                        return;
                    }
                    paintCards();
                    if (!document.getElementById(PANEL_ID) && state.loaded) renderPanel();
                }, 500);
            }
        },
        teardown: function () {
            if (scanner) { clearInterval(scanner); scanner = null; }
            var old = document.getElementById(PANEL_ID);
            if (old) old.remove();
            Array.prototype.forEach.call(document.querySelectorAll('.nx-bulk-check'), function (n) {
                n.remove();
            });
            Array.prototype.forEach.call(document.querySelectorAll('.nx-bulk-selected'), function (n) {
                n.classList.remove('nx-bulk-selected');
            });
            state.loaded = false;
        }
    };
})();
