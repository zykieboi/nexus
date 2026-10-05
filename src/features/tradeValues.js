// src/features/tradeValues.js

(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var BLOCK_ID = 'nx-trade-values';
    var PROT_ID = 'nx-trade-protection';
    var INV_TTL = 300000;
    var RULE_W = 565;
    var UP = 'M9 4h6v8h4.84L12 19.84L4.16 12H9V4Z';
    var DOWN = 'M15 20H9v-8H4.16L12 4.16L19.84 12H15v8Z';

    var rootDoc = null;
    var rootWin = null;
    var myId = null;
    var invCache = new Map();
    var obs = null;
    var scheduled = false;
    var lastKey = null;

    function findDoc() {
        if (document.querySelector('.trade-list-detail-offer')) {
            return { doc: document, win: window };
        }
        var frames = document.querySelectorAll('iframe');
        for (var i = 0; i < frames.length; i++) {
            var d;
            try { d = frames[i].contentDocument; } catch (e) { continue; }
            if (d && d.querySelector('.trade-list-detail-offer')) {
                return { doc: d, win: frames[i].contentWindow };
            }
        }
        return null;
    }

    function fetchJson(url) {
        return fetch(url, { credentials: 'include' }).then(function (r) {
            return r.ok ? r.json() : null;
        }).catch(function () { return null; });
    }

    function getMyId() {
        if (myId) return Promise.resolve(myId);
        return fetchJson('/apisite/users/v1/users/authenticated').then(function (d) {
            if (d && d.id) myId = String(d.id);
            return myId;
        });
    }

    function getPartnerId() {
        var a = rootDoc.querySelector('.trade-row.selected a[href*="/users/"]');
        if (!a) return null;
        var m = a.getAttribute('href').match(/\/users\/(\d+)\//);
        return m ? m[1] : null;
    }

    function loadInventory(userId) {
        var hit = invCache.get(userId);
        if (hit && Date.now() - hit.at < INV_TTL) return Promise.resolve(hit.map);

        var map = new Map();
        function page(cursor) {
            var url = '/apisite/inventory/v1/users/' + userId + '/assets/collectibles'
                    + '?sortOrder=Desc&limit=100'
                    + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
            return fetchJson(url).then(function (d) {
                if (!d || !d.data) return;
                d.data.forEach(function (it) {
                    if (!it.assetId) return;
                    map.set(String(it.assetId), {
                        rap: Number(it.recentAveragePrice) || 0,
                        value: Number(it.originalPrice) || Number(it.recentAveragePrice) || 0
                    });
                });
                if (d.nextPageCursor) return page(d.nextPageCursor);
            });
        }
        return page('').then(function () {
            invCache.set(userId, { map: map, at: Date.now() });
            return map;
        });
    }

    function assetIdsIn(sideEl) {
        var out = [];
        var links = sideEl.querySelectorAll('.trade-item-card a[href*="/catalog/"]');
        for (var i = 0; i < links.length; i++) {
            var m = links[i].getAttribute('href').match(/\/catalog\/(\d+)/);
            if (m) out.push(m[1]);
        }
        return out;
    }

    function sumSide(sideEl, map) {
        var ids = assetIdsIn(sideEl);
        var rap = 0, value = 0;
        for (var i = 0; i < ids.length; i++) {
            var hit = map.get(ids[i]);
            if (!hit) continue;
            rap += hit.rap;
            value += hit.value;
        }
        return { rap: rap, value: value };
    }

    function readTrade() {
        var sides = rootDoc.querySelectorAll('.trade-list-detail-offer');
        if (sides.length < 2) return Promise.resolve(null);

        var partnerId = getPartnerId();
        if (!partnerId) return Promise.resolve(null);

        return getMyId().then(function (uid) {
            if (!uid) return null;
            return Promise.all([loadInventory(uid), loadInventory(partnerId)]);
        }).then(function (maps) {
            if (!maps) return null;
            var give = sumSide(sides[0], maps[0]);
            var receive = sumSide(sides[1], maps[1]);
            return {
                give: give,
                receive: receive,
                key: give.rap + '/' + receive.rap + '/' + give.value + '/' + receive.value
            };
        });
    }

    function theme() {
        var dark = false;
        try { dark = rootWin.localStorage.getItem('rbx_theme_v1') === 'dark'; } catch (e) {}
        if (dark) return { pillBg: 'rgb(45,47,48)', ink: '#ffffff', rule: 'rgba(255,255,255,0.15)' };
        return { pillBg: 'rgb(200,200,200)', ink: '#000000', rule: '#c7cbce' };
    }

    function arrow(path, color, side) {
        var m = side === 'left' ? 'margin-right:3px' : 'margin-left:3px';
        return '<svg xmlns="http://www.w3.org/2000/svg" style="transform:scale(1.3);' + m
            + ';color:' + color + ' !important;" width="24" height="24" viewBox="0 0 24 24">'
            + '<g transform="translate(0 24) scale(1 -1)"><path fill="currentColor" d="'
            + path + '"></path></g></svg>';
    }

    function pill(label, diff, base, th) {
        var gain = diff >= 0;
        var sign = gain ? '+' : '-';
        var color = gain ? 'rgb(43, 191, 90)' : 'rgb(215, 32, 32)';
        var path = gain ? UP : DOWN;
        var num = Math.abs(diff).toLocaleString();
        var pct = base > 0 ? Math.abs(diff) / base * 100 : 0;
        var pctTxt = sign + pct.toFixed(0) + '%';
        return '<div style="height:30px;background:' + th.pillBg + ';color:' + th.ink
            + ';display:flex;align-items:center;padding:5px 12px;font-size:20px;white-space:nowrap;">'
            + arrow(path, color, 'left')
            + '<span>' + sign + num + ' ' + label + ' (' + pctTxt + ')</span>'
            + arrow(path, color, 'right')
            + '</div>';
    }

    function buildBlock(tv) {
        var th = theme();
        var rapDiff = tv.receive.rap - tv.give.rap;
        var valDiff = tv.receive.value - tv.give.value;
        var wrap = document.createElement('div');
        wrap.id = BLOCK_ID;
        wrap.style.cssText = 'width:' + RULE_W + 'px;max-width:100%;margin:8px 0;';
        wrap.innerHTML =
            '<hr style="border:0;border-top:1px solid ' + th.rule + ';margin:0;width:100%;">' +
            '<div style="display:flex;gap:15px;justify-content:center;padding:8px 0;">' +
            pill('RAP', rapDiff, tv.give.rap, th) +
            pill('Value', valDiff, tv.give.value, th) +
            '</div>';
        return wrap;
    }

    function mountBlock(tv) {
        var first = rootDoc.querySelector('.trade-list-detail-offer');
        if (!first) return;
        var old = rootDoc.getElementById(BLOCK_ID);
        if (old && old.dataset.key === tv.key) return;
        var block = buildBlock(tv);
        block.dataset.key = tv.key;
        if (old) old.replaceWith(block);
        else first.insertAdjacentElement('afterend', block);
    }

    function mountProtection(tv) {
        var modal = rootDoc.getElementById('modal-confirmation')
            || rootDoc.querySelector('.ConfirmationModal[data-modal-handle="confirmation"]');
        if (!modal || rootWin.getComputedStyle(modal).display === 'none') {
            var gone = rootDoc.getElementById(PROT_ID);
            if (gone) gone.remove();
            return;
        }
        var msg = modal.querySelector('.modal-message, .Message');
        if (!msg) return;
        var th = theme();
        var rapDiff = tv.receive.rap - tv.give.rap;
        var valDiff = tv.receive.value - tv.give.value;
        var box = modal.querySelector('#' + PROT_ID);
        if (!box) {
            box = document.createElement('div');
            box.id = PROT_ID;
            box.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:10px;';
            msg.insertAdjacentElement('afterend', box);
        }
        box.innerHTML =
            pill('RAP', rapDiff, tv.give.rap, th) +
            pill('Value', valDiff, tv.give.value, th);
    }

    function flagSerials() {
        var els = rootDoc.querySelectorAll('.trade-item-card .limited-number');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            var hidden = el.classList.contains('ng-hide');
            var n = hidden ? NaN : parseInt(el.textContent.replace(/\D/g, ''), 10);
            var low = !hidden && Number.isFinite(n) && n > 0 && n <= 100;
            if (low && el.dataset.nxFlag !== '1') {
                el.style.color = 'rgb(43, 191, 90)';
                el.style.fontWeight = '600';
                el.title = 'Low serial (#' + n + ')';
                el.dataset.nxFlag = '1';
            } else if (!low && el.dataset.nxFlag === '1') {
                el.style.color = '';
                el.style.fontWeight = '';
                el.title = '';
                delete el.dataset.nxFlag;
            }
        }
    }

    function render() {
        scheduled = false;
        if (!rootDoc) return;
        readTrade().then(function (tv) {
            if (!tv) {
                lastKey = null;
                var old = rootDoc.getElementById(BLOCK_ID);
                if (old) old.remove();
                return;
            }
            if (tv.key === lastKey) {
                mountProtection(tv);
                return;
            }
            lastKey = tv.key;
            mountBlock(tv);
            mountProtection(tv);
            flagSerials();
        });
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        rootWin.requestAnimationFrame(render);
    }

    function attach() {
        obs = new rootWin.MutationObserver(schedule);
        var targets = rootDoc.querySelectorAll('.trades-list-detail, .trade-list-detail-offer');
        for (var i = 0; i < targets.length; i++) {
            obs.observe(targets[i], { childList: true, subtree: true });
        }
        rootDoc.addEventListener('click', schedule, true);
        rootWin.addEventListener('popstate', schedule);
        rootWin.addEventListener('storage', function (e) {
            if (e.key === 'rbx_theme_v1') { lastKey = null; schedule(); }
        });
    }

    window.NX.features.tradeValues = {
        apply: function () {
            if (rootDoc) return;
            var found = findDoc();
            if (!found) return false;
            rootDoc = found.doc;
            rootWin = found.win;

            var stop = Date.now() + 3000;
            (function wait() {
                if (rootDoc.querySelectorAll('.trade-list-detail-offer').length >= 2) {
                    render();
                    attach();
                    return;
                }
                if (Date.now() > stop) { attach(); return; }
                rootWin.requestAnimationFrame(wait);
            })();
            return true;
        },
        teardown: function () {
            if (obs) obs.disconnect();
            obs = null;
            if (rootDoc) {
                var a = rootDoc.getElementById(BLOCK_ID);
                if (a) a.remove();
                var b = rootDoc.getElementById(PROT_ID);
                if (b) b.remove();
                var flagged = rootDoc.querySelectorAll('[data-nx-flag]');
                for (var i = 0; i < flagged.length; i++) {
                    flagged[i].style.color = '';
                    flagged[i].style.fontWeight = '';
                    flagged[i].title = '';
                    delete flagged[i].dataset.nxFlag;
                }
            }
            rootDoc = null;
            rootWin = null;
            lastKey = null;
            invCache.clear();
        },
        refresh: schedule
    };
})();
