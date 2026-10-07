(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-item-owners-style';
    var TAB_ID = 'nx-owners-tab';
    var PANEL_ID = 'nx-owners-panel';
    var PAGE_LIMIT = 25;
    var MAX_ROWS = 50;
    var COLLAPSED_ROWS = 25;
    var NX_FLAG = 'data-nx';

    var heads = {};
    var headsLoading = {};
    var limitedCache = {};
    var injectedPath = '';
    var interval = null;
    var watcher = null;
    var watchedStrip = null;
    var lastPath = location.pathname;

    function isOn() {
        return window.NX.settings && window.NX.settings.get('itemOwners');
    }

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var el = document.createElement('style');
        el.id = STYLE_ID;
        el.textContent = [
            'html body #horizontal-tabs{display:flex!important;justify-content:center}',
            'html body #horizontal-tabs>li.rbx-tab{flex:1 1 auto;text-align:center}',
            'html body #horizontal-tabs>li.rbx-tab>a.rbx-tab-heading{padding:12px 20px;display:block}',

            'html body .resellers-container.nx-hide,',
            'html body resellers-pane.nx-hide,',
            'html body #resellers.nx-hide{display:none!important}',

            '#' + PANEL_ID + '{padding:14px 0;font-family:inherit}',
            '#' + PANEL_ID + ' .nx-bar{display:flex;justify-content:flex-end;gap:8px;padding:0 0 12px}',

            '#' + PANEL_ID + ' .nx-loadbar{height:3px;background:transparent;overflow:hidden;',
            'border-radius:2px;margin:0 0 10px}',
            '#' + PANEL_ID + ' .nx-loadbar.on{background:#1a1c1e}',
            '#' + PANEL_ID + ' .nx-loadbar.on::after{content:"";display:block;',
            'height:100%;width:30%;background:#4aa8ff;border-radius:2px;',
            'animation:nx-slide 1.1s ease-in-out infinite}',
            '@keyframes nx-slide{0%{transform:translateX(-100%)}',
            '100%{transform:translateX(333%)}}',

            '#' + PANEL_ID + ' .nx-skel-row{display:flex;align-items:center;gap:14px;',
            'padding:12px 0;border-bottom:1px solid #e1e4e8}',
            '.dark-theme #' + PANEL_ID + ' .nx-skel-row{border-bottom-color:#3a3d40}',
            '#' + PANEL_ID + ' .nx-skel-avatar{flex:0 0 48px;width:48px;height:48px;',
            'background:#1c1e20;border-radius:0;animation:nx-pulse 1.2s ease-in-out infinite}',
            '#' + PANEL_ID + ' .nx-skel-lines{flex:1;display:flex;flex-direction:column;gap:8px}',
            '#' + PANEL_ID + ' .nx-skel-line{height:12px;background:#1c1e20;border-radius:4px;',
            'animation:nx-pulse 1.2s ease-in-out infinite}',
            '#' + PANEL_ID + ' .nx-skel-line.short{width:40%}',
            '#' + PANEL_ID + ' .nx-skel-line.tiny{width:25%;height:10px}',
            '@keyframes nx-pulse{0%,100%{opacity:.45}50%{opacity:.9}}',

            '#' + PANEL_ID + ' .nx-loading,',
            '#' + PANEL_ID + ' .nx-empty{padding:48px 0;text-align:center;color:#7a7d80;font-size:14px}',
            '#' + PANEL_ID + ' ul.nx-list{list-style:none;margin:0;padding:0}',
            '#' + PANEL_ID + ' li.nx-row{display:flex;align-items:center;gap:14px;padding:12px 0;',
            'border-bottom:1px solid #e1e4e8}',
            '.dark-theme #' + PANEL_ID + ' li.nx-row{border-bottom-color:#3a3d40}',
            '#' + PANEL_ID + ' li.nx-row:last-child{border-bottom:none}',

            '#' + PANEL_ID + ' .nx-avatar{position:relative}',
            '#' + PANEL_ID + ' .nx-avatar.nx-loading-img::before{content:"";',
            'position:absolute;top:50%;left:50%;width:18px;height:18px;margin:-9px 0 0 -9px;',
            'border:2px solid rgba(120,130,140,.35);border-top-color:#4aa8ff;',
            'border-radius:50%;animation:nx-spin .7s linear infinite;z-index:2}',
            '@keyframes nx-spin{to{transform:rotate(360deg)}}',

            '#' + PANEL_ID + ' .nx-info{flex:1;min-width:0}',
            '#' + PANEL_ID + ' .nx-name-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
            '#' + PANEL_ID + ' .nx-name{font-size:15px;font-weight:500;color:#232527;',
            'line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:inherit}',
            '.dark-theme #' + PANEL_ID + ' .nx-name{color:#fff}',
            '#' + PANEL_ID + ' .nx-name a{color:inherit;text-decoration:none}',
            '#' + PANEL_ID + ' .nx-name a:hover{text-decoration:underline}',
            '#' + PANEL_ID + ' .nx-uid{font-size:11px;font-weight:500;color:#7a7d80;',
            'line-height:1.5;font-variant-numeric:tabular-nums}',
            '#' + PANEL_ID + ' .nx-serial{display:inline-block;font-size:11px;font-weight:600;',
            'padding:2px 8px;border-radius:999px;background:#e8e8e8;color:#232527;line-height:1.5}',
            '.dark-theme #' + PANEL_ID + ' .nx-serial{background:#3a3d40;color:#fff}',
            '#' + PANEL_ID + ' .nx-meta{font-size:12px;color:#7a7d80;margin-top:3px}',

            '#' + PANEL_ID + ' .nx-btn{user-select:none;background:#fff;border:1px solid #b8b8b8;',
            'color:#191919;cursor:pointer;display:inline-block;font-weight:500;text-align:center;',
            'white-space:nowrap;vertical-align:middle;padding:7px;font-size:16px;line-height:100%;',
            'border-radius:3px;font-family:inherit}',
            '#' + PANEL_ID + ' .nx-btn:hover{background:#f2f4f5}',
            '#' + PANEL_ID + ' .nx-btn:disabled{opacity:.5;cursor:default}',
            '.dark-theme #' + PANEL_ID + ' .nx-btn{background:transparent;border-color:#bdbebe;',
            'color:hsla(0,0%,100%,.7);border-radius:8px}',
            '.dark-theme #' + PANEL_ID + ' .nx-btn:hover{background:rgba(255,255,255,.06)}',
            '#' + PANEL_ID + ' .nx-copy{padding:5px 14px;font-size:14px}',
            '#' + PANEL_ID + ' .nx-bottom{display:flex;flex-direction:column;gap:8px;margin-top:16px}',
            '#' + PANEL_ID + ' .nx-bottom .nx-btn{width:100%}',
            '#' + PANEL_ID + ' .nx-cap{text-align:center;color:#7a7d80;font-size:12px;padding:12px 0}'
        ].join('');
        document.head.appendChild(el);
    }

    function assetId() {
        var m = location.pathname.match(/\/(?:catalog|library)\/(\d+)/);
        return m ? m[1] : null;
    }

    function onItemPage() {
        return /^\/(?:theme2020\/)?(?:catalog|library)\/\d+/.test(location.pathname);
    }

    function limitedFor(id) {
        if (limitedCache[id]) return limitedCache[id];
        limitedCache[id] = fetch(
            'https://octane.wtf/apisite/economy/v2/assets/' + id + '/details',
            { credentials: 'include', headers: { accept: 'application/json' } }
        ).then(function (r) {
            return r.ok ? r.json() : null;
        }).then(function (d) {
            return !!(d && (d.IsLimited || d.IsLimitedUnique));
        }).catch(function () { return false; });
        return limitedCache[id];
    }

    function loadHeads(ids, done) {
        var queue = [];
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            if (heads[id] || headsLoading[id]) continue;
            queue.push(id);
        }
        if (!queue.length) { done(); return; }

        queue.forEach(function (id) { headsLoading[id] = 1; });

        fetch('https://octane.wtf/apisite/thumbnails/v1/users/avatar-headshot'
            + '?userIds=' + queue.join(',') + '&size=150x150&format=png',
            { credentials: 'include', headers: { accept: 'application/json' } }
        ).then(function (r) {
            return r.ok ? r.json() : null;
        }).then(function (d) {
            var list = (d && d.data) || [];
            list.forEach(function (u) {
                if (u.targetId != null && u.imageUrl) {
                    heads[String(u.targetId)] = u.imageUrl;
                }
            });
            queue.forEach(function (id) { delete headsLoading[id]; });
            done();
        }).catch(function () {
            queue.forEach(function (id) { delete headsLoading[id]; });
            done();
        });
    }

    function compare(a, b, limited) {
        if (limited) {
            var as = a.serialNumber == null ? Infinity : Number(a.serialNumber);
            var bs = b.serialNumber == null ? Infinity : Number(b.serialNumber);
            if (as !== bs) return as - bs;
        }
        var ak = a.owner && a.owner.id != null;
        var bk = b.owner && b.owner.id != null;
        var an = ak ? (a.owner.name || '').toLowerCase() : '\uffff';
        var bn = bk ? (b.owner.name || '').toLowerCase() : '\uffff';
        if (an !== bn) return an < bn ? -1 : 1;
        var ai = ak ? a.owner.id : Number.MAX_SAFE_INTEGER;
        var bi = bk ? b.owner.id : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return (a.id || 0) - (b.id || 0);
    }

    function shortDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleDateString('en-US',
                { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { return '—'; }
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            resolve();
        });
    }

    function copyLine(entry, id, limited) {
        var o = entry.owner;
        var known = !!(o && o.id != null);
        var out = [];
        if (known) {
            out.push('Owner: ' + (o.name || ('User ' + o.id)));
            out.push('UID #' + o.id);
        } else {
            out.push('Owner: Unknown owner');
        }
        if (limited) out.push('Serial: ' + (entry.serialNumber == null ? 'N/A' : entry.serialNumber));
        out.push('Acquired: ' + shortDate(entry.created));
        out.push('Asset ID: ' + id);
        return out.join('\n');
    }

    function avatar(uid, name) {
        var wrap = document.createElement('div');
        wrap.className = 'nx-avatar';
        if (!uid) wrap.classList.add('nx-empty');
        wrap.style.cssText = 'flex:0 0 48px !important;'
            + 'width:48px !important;height:48px !important;'
            + 'min-width:48px !important;max-width:48px !important;'
            + 'min-height:48px !important;max-height:48px !important;'
            + 'padding:0 !important;margin:0 !important;'
            + 'display:block !important;position:relative;overflow:hidden;'
            + 'border-radius:0 !important;box-sizing:border-box !important';

        var img = document.createElement('img');
        img.alt = name;
        img.loading = 'lazy';
        img.style.cssText = 'width:48px !important;height:48px !important;'
            + 'padding:0 !important;margin:0 !important;'
            + 'object-fit:cover;display:block;border-radius:0 !important;'
            + 'background:#2c2e30;box-sizing:border-box !important';

        if (uid && heads[uid]) {
            img.src = heads[uid];
        } else if (!uid) {
            img.src = 'https://octane.wtf/img/placeholder.png';
        } else {
            wrap.classList.add('nx-loading-img');
        }

        if (uid) {
            var link = document.createElement('a');
            link.href = '/users/' + uid + '/profile';
            link.target = '_blank';
            link.rel = 'noopener';
            link.style.cssText = 'display:block !important;'
                + 'width:48px !important;height:48px !important;'
                + 'padding:0 !important;margin:0 !important;'
                + 'overflow:hidden;border-radius:0 !important;box-sizing:border-box !important';
            link.appendChild(img);
            wrap.appendChild(link);
        } else {
            wrap.appendChild(img);
        }

        return wrap;
    }

    function row(entry, id, limited) {
        var o = entry.owner;
        var known = !!(o && o.id != null);
        var uid = known ? String(o.id) : null;
        var name = known ? (o.name || ('User ' + o.id)) : 'Unknown owner';

        var li = document.createElement('li');
        li.className = 'nx-row';
        if (uid) li.setAttribute('data-uid', uid);
        li.appendChild(avatar(uid, name));

        var info = document.createElement('div');
        info.className = 'nx-info';

        var line = document.createElement('div');
        line.className = 'nx-name-line';

        var nameEl = document.createElement('div');
        nameEl.className = 'nx-name';
        if (known) {
            var a = document.createElement('a');
            a.href = '/users/' + uid + '/profile';
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = name;
            nameEl.appendChild(a);
        } else {
            nameEl.textContent = name;
        }
        line.appendChild(nameEl);

        if (known) {
            var uidEl = document.createElement('span');
            uidEl.className = 'nx-uid';
            uidEl.textContent = 'UID #' + uid;
            line.appendChild(uidEl);
        }

        if (limited) {
            var s = document.createElement('span');
            s.className = 'nx-serial';
            s.textContent = entry.serialNumber == null ? 'Serial N/A' : '#' + entry.serialNumber;
            line.appendChild(s);
        }

        info.appendChild(line);

        var meta = document.createElement('div');
        meta.className = 'nx-meta';
        meta.textContent = 'Acquired ' + shortDate(entry.created);
        info.appendChild(meta);

        li.appendChild(info);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nx-btn nx-copy';
        btn.textContent = 'Copy';
        btn.addEventListener('click', function () {
            copyText(copyLine(entry, id, limited));
        });
        li.appendChild(btn);

        return li;
    }

    function fetchPage(id, cursor) {
        var url = 'https://inventory.octane.wtf/v2/assets/' + id + '/owners?limit=' + PAGE_LIMIT;
        if (cursor) url += '&cursor=' + encodeURIComponent(cursor);
        return fetch(url, { credentials: 'include', headers: { accept: 'application/json' } })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            });
    }

    function skeletonRow() {
        var li = document.createElement('li');
        li.className = 'nx-skel-row';
        var av = document.createElement('div');
        av.className = 'nx-skel-avatar';
        var lines = document.createElement('div');
        lines.className = 'nx-skel-lines';
        var l1 = document.createElement('div'); l1.className = 'nx-skel-line';
        var l2 = document.createElement('div'); l2.className = 'nx-skel-line short';
        var l3 = document.createElement('div'); l3.className = 'nx-skel-line tiny';
        lines.appendChild(l1); lines.appendChild(l2); lines.appendChild(l3);
        li.appendChild(av);
        li.appendChild(lines);
        return li;
    }

    function mount(host, id) {
        var viewLimit = COLLAPSED_ROWS;
        var limited = false;
        var entries = [];
        var nextCursor = null;
        var list = document.createElement('ul');
        list.className = 'nx-list';

        var bar = document.createElement('div');
        bar.className = 'nx-bar';

        var openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'nx-btn';
        openBtn.textContent = 'Open in new tab';
        openBtn.addEventListener('click', function () {
            window.open('https://inventory.octane.wtf/v2/assets/' + id
                + '/owners?limit=100', '_blank', 'noopener');
        });

        var copyAll = document.createElement('button');
        copyAll.type = 'button';
        copyAll.className = 'nx-btn';
        copyAll.textContent = 'Copy all';
        copyAll.addEventListener('click', function () {
            var rows = sorted().slice(0, viewLimit);
            if (!rows.length) return;
            copyText(rows.map(function (e) { return copyLine(e, id, limited); }).join('\n\n'));
        });

        bar.appendChild(openBtn);
        bar.appendChild(copyAll);

        var loadbar = document.createElement('div');
        loadbar.className = 'nx-loadbar';

        var bottom = null;
        var cap = null;

        function sorted() {
            return entries.slice().sort(function (a, b) { return compare(a, b, limited); });
        }

        function paintHeads() {
            Array.prototype.forEach.call(list.querySelectorAll('li[data-uid]'), function (r) {
                var uid = r.getAttribute('data-uid');
                if (!uid || !heads[uid]) return;
                var av = r.querySelector('.nx-avatar');
                var img = av && av.querySelector('img');
                if (!img) return;
                if (img.getAttribute('src') !== heads[uid]) img.src = heads[uid];
                if (av) av.classList.remove('nx-loading-img');
            });
        }

        function loadVisibleHeads() {
            var need = [];
            Array.prototype.forEach.call(list.querySelectorAll('li[data-uid]'), function (r) {
                var uid = r.getAttribute('data-uid');
                if (uid && !heads[uid]) need.push(uid);
            });
            if (!need.length) { paintHeads(); return; }
            loadHeads(need, function () {
                paintHeads();
                var still = need.some(function (uid) { return !heads[uid]; });
                if (still) setTimeout(function () { loadHeads(need, paintHeads); }, 800);
            });
        }

        function drawList() {
            list.innerHTML = '';
            var slice = sorted().slice(0, Math.min(viewLimit, MAX_ROWS));
            slice.forEach(function (entry) {
                list.appendChild(row(entry, id, limited));
            });
            loadVisibleHeads();
        }

        function drawBottom() {
            if (bottom) { bottom.remove(); bottom = null; }
            if (cap) { cap.remove(); cap = null; }

            var hasMore = viewLimit < MAX_ROWS && (entries.length > viewLimit || nextCursor);
            var canCollapse = viewLimit > COLLAPSED_ROWS;

            if (!hasMore && !canCollapse) {
                if (entries.length >= MAX_ROWS && nextCursor) {
                    cap = document.createElement('div');
                    cap.className = 'nx-cap';
                    cap.textContent = 'Showing first ' + MAX_ROWS + ' owners';
                    host.appendChild(cap);
                }
                return;
            }

            bottom = document.createElement('div');
            bottom.className = 'nx-bottom';

            if (hasMore) {
                var more = document.createElement('button');
                more.type = 'button';
                more.className = 'nx-btn';
                more.textContent = 'See More';
                more.addEventListener('click', function () {
                    var want = Math.min(viewLimit + PAGE_LIMIT, MAX_ROWS);
                    function apply() {
                        viewLimit = want;
                        drawList();
                        drawBottom();
                    }
                    if (entries.length >= want || !nextCursor) { apply(); return; }
                    more.textContent = 'Loading…';
                    more.disabled = true;
                    loadbar.classList.add('on');
                    fetchPage(id, nextCursor).then(function (page) {
                        pushPage(page, true);
                        loadbar.classList.remove('on');
                        apply();
                    }).catch(function () {
                        more.textContent = 'Failed';
                        more.disabled = false;
                        loadbar.classList.remove('on');
                    });
                });
                bottom.appendChild(more);
            }

            if (canCollapse) {
                var less = document.createElement('button');
                less.type = 'button';
                less.className = 'nx-btn';
                less.textContent = 'Show Less';
                less.addEventListener('click', function () {
                    viewLimit = COLLAPSED_ROWS;
                    drawList();
                    drawBottom();
                });
                bottom.appendChild(less);
            }

            host.appendChild(bottom);
        }

        function pushPage(page, skipBottom) {
            var items = page.data || [];
            if (!items.length && !entries.length) {
                host.innerHTML = '<div class="nx-empty">No owners for this item.</div>';
                return;
            }
            entries = entries.concat(items);
            nextCursor = page.nextPageCursor || null;
            drawList();
            if (!skipBottom) drawBottom();
        }

        host.innerHTML = '';
        host.appendChild(bar);
        host.appendChild(loadbar);
        loadbar.classList.add('on');
        var skel = document.createElement('ul');
        skel.className = 'nx-list';
        for (var i = 0; i < 6; i++) skel.appendChild(skeletonRow());
        host.appendChild(skel);

        Promise.all([limitedFor(id), fetchPage(id, null)]).then(function (res) {
            limited = res[0];
            loadbar.classList.remove('on');
            host.innerHTML = '';
            host.appendChild(bar);
            host.appendChild(loadbar);
            host.appendChild(list);
            pushPage(res[1]);
        }).catch(function () {
            loadbar.classList.remove('on');
            host.innerHTML = '<div class="nx-empty">Failed to load owners.</div>';
        });
    }

    function makeTab() {
        var li = document.createElement('li');
        li.id = TAB_ID;
        li.className = 'rbx-tab';
        li.setAttribute(NX_FLAG, '1');
        var a = document.createElement('a');
        a.className = 'rbx-tab-heading';
        a.href = '#';
        var s = document.createElement('span');
        s.className = 'text-lead';
        s.textContent = 'Owners';
        a.appendChild(s);
        li.appendChild(a);
        return li;
    }

    function makePanel() {
        var d = document.createElement('div');
        d.id = PANEL_ID;
        d.className = 'tab-pane';
        d.setAttribute(NX_FLAG, '1');
        d.style.display = 'none';
        return d;
    }

    function toggleResellers(show) {
        var nodes = document.querySelectorAll('.resellers-container, resellers-pane, #resellers');
        Array.prototype.forEach.call(nodes, function (n) {
            if (show) n.classList.remove('nx-hide');
            else n.classList.add('nx-hide');
        });
    }

    function pickPane(tabs, panes, tab) {
        var i = tabs.indexOf(tab);
        return panes[i] || null;
    }

    function showPane(tabs, panes, tab, pane) {
        tabs.forEach(function (li) { li.classList.toggle('active', li === tab); });
        panes.forEach(function (p) {
            if (p === pane) {
                p.style.display = '';
                p.classList.add('active');
            } else {
                p.style.display = 'none';
                p.classList.remove('active');
            }
        });
        var isResellers = (tab.textContent || '').trim().toLowerCase() === 'resellers';
        toggleResellers(isResellers);
    }

    function wireTabs(strip, content, id) {
        var tabs = Array.prototype.filter.call(strip.children, function (li) {
            return li.classList.contains('rbx-tab');
        });
        var panes = Array.prototype.filter.call(content.children, function (c) {
            return c.classList && c.classList.contains('tab-pane');
        });

        toggleResellers(false);

        tabs.forEach(function (tab) {
            if (tab.getAttribute(NX_FLAG) === '2') return;
            tab.setAttribute(NX_FLAG, '2');
            var pane = pickPane(tabs, panes, tab);

            tab.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                function apply() { showPane(tabs, panes, tab, pane); }
                apply();
                requestAnimationFrame(apply);
                setTimeout(apply, 50);
                if (tab.id === TAB_ID && pane) mount(pane, id);
            }, true);
        });
    }

    function inject() {
        if (!isOn()) return;
        if (!onItemPage()) return;
        if (injectedPath === location.pathname
            && document.getElementById(TAB_ID)) return;

        var strip = document.getElementById('horizontal-tabs');
        if (!strip || !strip.querySelector('li')) return;

        var content = strip.nextElementSibling;
        while (content && !(content.classList && content.classList.contains('tab-content'))) {
            content = content.nextElementSibling;
        }
        if (!content) return;

        var id = assetId();
        if (!id) return;

        if (!document.getElementById(TAB_ID)) {
            strip.appendChild(makeTab());
            content.appendChild(makePanel());
        }

        wireTabs(strip, content, id);
        injectedPath = location.pathname;
    }

    function purge() {
        injectedPath = '';
        var t = document.getElementById(TAB_ID);
        if (t) t.remove();
        var p = document.getElementById(PANEL_ID);
        if (p) p.remove();
        Array.prototype.forEach.call(
            document.querySelectorAll('.nx-hide'),
            function (n) { n.classList.remove('nx-hide'); }
        );
    }

    function watch() {
        var strip = document.getElementById('horizontal-tabs');
        if (!strip || (strip === watchedStrip && watcher)) return;
        if (watcher) watcher.disconnect();
        watchedStrip = strip;
        watcher = new MutationObserver(function () { inject(); });
        watcher.observe(strip, { childList: true });
    }

    function start() {
        if (interval) return;
        interval = setInterval(function () {
            if (!isOn()) {
                if (watchedStrip) { purge(); watchedStrip = null; }
                return;
            }
            if (!onItemPage()) {
                if (watchedStrip) { purge(); watchedStrip = null; }
                return;
            }
            watch();
            inject();
            if (location.pathname !== lastPath) {
                lastPath = location.pathname;
                purge();
                inject();
                watch();
            }
        }, 800);
    }

    function stop() {
        if (interval) { clearInterval(interval); interval = null; }
        if (watcher) { watcher.disconnect(); watcher = null; }
        watchedStrip = null;
        lastPath = location.pathname;
        purge();
    }

    window.NX.features.itemOwners = {
        apply: function () {
            style();
            start();
            inject();
        },
        teardown: function () {
            stop();
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
        }
    };
})();
