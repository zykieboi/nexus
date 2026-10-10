/* src/core/settings.js */
(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    window.NX.settings = {
        get: function(key) {
            var val = GM_getValue('nx_' + key);
            return val !== undefined ? val : false;
        },
        set: function(key, val) {
            GM_setValue('nx_' + key, val);
        }
    };
})();

/* src/core/csrf.js */
(function() {
    'use strict';

    window.NX_CSRF = window.NX_CSRF || GM_getValue('nx_csrf', '') || '';

    function save(value) {
        if (value && value !== window.NX_CSRF) {
            window.NX_CSRF = value;
            try { GM_setValue('nx_csrf', value); } catch (e) {}
        }
    }

    var origFetch = window.fetch;
    window.fetch = function() {
        var args = arguments;
        var p = origFetch.apply(this, args);
        p.then(function(res) {
            try {
                var t = res.headers.get('x-csrf-token');
                if (t) save(t);
            } catch (e) {}
        }).catch(function() {});
        return p;
    };

    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        var self = this;
        self.addEventListener('load', function() {
            try {
                var t = self.getResponseHeader('x-csrf-token');
                if (t) save(t);
            } catch (e) {}
        });
        return origOpen.apply(this, arguments);
    };
})();

/* src/features/remove-ads.js */
(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-remove-ads';

    var CSS = [
        '.abp,',
        '[class*="abp-"],',
        '[class*="leaderboard-abp"],',
        '[class*="right-abp"],',
        '[class*="skyscraper-abp"],',
        '.adWrapper-0-2-106,',
        '[class*="adWrapper-"],',
        '[class*="ad-"],',
        '[class*="Ad-"],',
        '[id*="ad-"],',
        '[id*="ad_"],',
        '[id$="-Abp"],',
        '[id^="Leaderboard-Abp"],',
        '[id^="Skyscraper-Abp"],',
        '[id^="Banner-Abp"],',
        'iframe[data-ad-slot],',
        'iframe[data-js-adtype="iframead"],',
        'iframe[src*="/user-sponsorship/"]',
        '{display:none !important;}'
    ].join('');

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }

    function killAds() {
        var frames = document.querySelectorAll('iframe');
        for (var i = 0; i < frames.length; i++) {
            var f = frames[i];
            var src = f.src || '';
            var slot = f.getAttribute('data-ad-slot') || '';
            var adtype = f.getAttribute('data-js-adtype') || '';
            if (src.indexOf('/user-sponsorship/') !== -1 || slot || adtype === 'iframead') {
                f.style.display = 'none';
                var parent = f.parentElement;
                if (parent) {
                    var pid = (parent.id || '').toLowerCase();
                    var pcls = (parent.className || '') + '';
                    if (pid.indexOf('abp') !== -1 || pcls.indexOf('abp') !== -1) {
                        parent.style.display = 'none';
                    }
                }
                try {
                    var inner = f.contentDocument;
                    if (inner && inner.body) {
                        inner.body.style.display = 'none';
                        var ads = inner.querySelectorAll('a.ad, .ad-annotations, .ad-identification');
                        for (var j = 0; j < ads.length; j++) ads[j].style.display = 'none';
                    }
                } catch (e) {}
            }
        }
    }

    var scanner = null;

    window.NX.features.removeAds = {
        apply: function() {
            style();
            killAds();
            if (!scanner) scanner = setInterval(killAds, 400);
        },
        teardown: function() {
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
            if (scanner) { clearInterval(scanner); scanner = null; }
        }
    };
})();

/* src/features/hide-alert.js */
(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-hide-alert';

    window.NX.features.hideAlert = {
        apply: function() {
            if (document.getElementById(STYLE_ID)) return;
            var s = document.createElement('style');
            s.id = STYLE_ID;
            s.textContent = [
                '.alertBg-0-2-1,',
                '[class*="alertBg-0-2-"]',
                '{visibility:hidden !important;}'
            ].join('');
            (document.head || document.documentElement).appendChild(s);
        },
        teardown: function() {
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
        }
    };
})();

/* src/features/rap.js */
(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var OVERLAY_ID = 'nx-rap-overlay';
    var MODAL_ID = 'nx-rap-modal';
    var MSG_OPEN = 'nx-rap-open-modal';
    var THUMB_BATCH = 'https://octane.wtf/apisite/thumbnails/v1/assets?assetIds=';
    var STYLE_ID = 'nx-rap-style';

    var isTop = window.top === window.self;

    var items = [];
    var thumbs = {};
    var sortBy = 'rap';
    var whoami = 'user';
    var rowScanner = null;

    var ASSET_TYPES = {
        1: 'Image', 2: 'T-Shirt', 3: 'Audio', 4: 'Mesh', 5: 'Lua',
        8: 'Hat', 9: 'Place', 10: 'Model', 11: 'Shirt', 12: 'Pants',
        13: 'Decal', 17: 'Head', 18: 'Face', 19: 'Gear', 21: 'Badge',
        24: 'Animation', 27: 'Torso', 28: 'Right Arm', 29: 'Left Arm',
        30: 'Right Leg', 31: 'Left Leg', 32: 'Package',
        37: 'Pose Animation', 38: 'Climb Animation', 40: 'Fall Animation',
        41: 'Idle Animation', 42: 'Run Animation', 43: 'Swim Animation',
        44: 'Walk Animation', 45: 'Emote Animation', 46: 'Mesh Part',
        47: 'Solid Model', 48: 'Shatterbox', 56: 'Emote Animation',
        61: 'Plugin', 62: 'Font Family'
    };

    function shortNum(n) {
        n = Number(n) || 0;
        if (n < 1000) return String(n);
        if (n < 1000000) {
            var k = n / 1000;
            return (k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')) + 'K';
        }
        var m = n / 1000000;
        return (m >= 100 ? Math.round(m) : m.toFixed(2).replace(/\.?0+$/, '')) + 'M';
    }

    function darkMode() {
        try {
            if (localStorage.getItem('rbx_theme_v1') === 'dark') return true;
        } catch (e) {}
        return document.documentElement.classList.contains('octane-dark');
    }

    function currentUserId() {
        var m = location.pathname.match(/\/users\/(\d+)\/profile/);
        if (m) return m[1];
        m = location.pathname.match(/\/theme2020\/users\/(\d+)\/profile/);
        if (m) return m[1];
        var q = new URLSearchParams(location.search);
        return q.get('userId') || q.get('viewerId');
    }

    function currentUsername() {
        var q = new URLSearchParams(location.search);
        return q.get('username') || q.get('viewerName') || '';
    }

    function loadLimiteds(userId) {
        return fetch('/apisite/inventory/v1/users/' + userId + '/assets/collectibles',
                     { credentials: 'include' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                var list = (d && d.data) ? d.data : [];
                var rap = 0;
                var value = 0;
                for (var i = 0; i < list.length; i++) {
                    var p = Number(list[i].recentAveragePrice) || 0;
                    rap += p;
                    value += Number(list[i].originalPrice) || p;
                }
                return { list: list, rap: rap, value: value };
            })
            .catch(function () { return { list: [], rap: 0, value: 0 }; });
    }

    function loadThumbs(ids) {
        if (!ids.length) return Promise.resolve({});
        var url = THUMB_BATCH + ids.join(',') + '&size=420x420&format=Png';
        return fetch(url, { credentials: 'include' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                var out = {};
                var list = (d && d.data) ? d.data : [];
                for (var i = 0; i < list.length; i++) {
                    var e = list[i];
                    var id = e.targetId || e.assetId || e.id;
                    var img = e.imageUrl || e.url || '';
                    if (id && img) out[String(id)] = img;
                }
                return out;
            })
            .catch(function () { return {}; });
    }

    function imageFor(item) {
        var id = String(item.assetId || item.id || '');
        if (thumbs[id]) return thumbs[id];
        if (item.thumbnail) {
            if (item.thumbnail.url) return item.thumbnail.url;
            if (item.thumbnail.imageUrl) return item.thumbnail.imageUrl;
        }
        return 'https://tcdn.octane.wtf/' + id + '.png';
    }

    function assetTypeName(item) {
        var v = item.assetTypeId || item.assetType;
        if (v == null) return '';
        if (typeof v === 'string' && !/^\d+$/.test(v)) return v;
        var id = parseInt(v, 10);
        return ASSET_TYPES[id] || ('Type ' + id);
    }

    function serialNum(item) {
        var v = item.serialNumber;
        if (typeof v === 'number' && v > 0) return v;
        if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10);
        return null;
    }

    function arrange() {
        var out = items.slice();
        if (sortBy === 'rap') {
            out.sort(function (a, b) {
                return (Number(b.recentAveragePrice) || 0) - (Number(a.recentAveragePrice) || 0);
            });
        } else if (sortBy === 'value') {
            out.sort(function (a, b) {
                var av = Number(a.originalPrice) || Number(a.recentAveragePrice) || 0;
                var bv = Number(b.originalPrice) || Number(b.recentAveragePrice) || 0;
                return bv - av;
            });
        } else if (sortBy === 'name') {
            out.sort(function (a, b) {
                return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
            });
        } else if (sortBy === 'serial') {
            out = out.filter(function (it) { return serialNum(it) !== null; });
            out.sort(function (a, b) { return serialNum(a) - serialNum(b); });
        }
        return out;
    }

    function asRow(item) {
        var id = item.assetId || item.id || '';
        var slug = (item.name || '').trim().replace(/\s+/g, '-');
        var sn = serialNum(item);
        var rap = Number(item.recentAveragePrice) || 0;
        var value = Number(item.originalPrice) || rap;
        return {
            name: item.name || '',
            assetId: id,
            assetType: assetTypeName(item),
            serial: sn,
            serialText: sn === null ? 'N/A' : '#' + sn,
            rap: rap,
            value: value,
            link: 'https://octane.wtf/catalog/' + id + (slug ? '/' + slug : '')
        };
    }

    function csvSafe(v) {
        v = String(v == null ? '' : v);
        if (v.indexOf(',') !== -1 || v.indexOf('"') !== -1 || v.indexOf('\n') !== -1) {
            return '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
    }

    function saveFile(name, content, mime) {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function saveCsv() {
        if (!items.length) return;
        var rows = [['Name', 'Asset ID', 'Type', 'Serial', 'RAP', 'Value', 'Link']];
        arrange().forEach(function (item) {
            var r = asRow(item);
            rows.push([r.name, r.assetId, r.assetType, r.serialText, r.rap, r.value, r.link]);
        });
        var text = rows.map(function (row) {
            return row.map(csvSafe).join(',');
        }).join('\r\n');
        saveFile(whoami + '-limiteds.csv', text, 'text/csv;charset=utf-8;');
    }

    function saveJson() {
        if (!items.length) return;
        var list = arrange().map(asRow);
        var payload = {
            username: whoami,
            exportedAt: new Date().toISOString(),
            totalItems: list.length,
            totalRap: list.reduce(function (s, r) { return s + r.rap; }, 0),
            totalValue: list.reduce(function (s, r) { return s + r.value; }, 0),
            items: list
        };
        saveFile(whoami + '-limiteds.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8;');
    }

    function saveTxt() {
        if (!items.length) return;
        var list = arrange();
        var totalRap = list.reduce(function (s, i) { return s + (Number(i.recentAveragePrice) || 0); }, 0);
        var totalValue = list.reduce(function (s, i) {
            return s + (Number(i.originalPrice) || Number(i.recentAveragePrice) || 0);
        }, 0);

        var lines = [];
        lines.push(whoami + "'s Limiteds");
        lines.push('Exported: ' + new Date().toLocaleString());
        lines.push('Items: ' + list.length);
        lines.push('Total RAP: ' + totalRap);
        lines.push('Total Value: ' + totalValue);
        lines.push('');
        lines.push('----------------------------------------');

        list.forEach(function (item) {
            var r = asRow(item);
            lines.push(r.name);
            lines.push('  Type: ' + r.assetType +
                       '  |  Serial: ' + r.serialText +
                       '  |  RAP: ' + r.rap +
                       '  |  Value: ' + r.value);
            lines.push('  ' + r.link);
            lines.push('');
        });

        saveFile(whoami + '-limiteds.txt', lines.join('\n'), 'text/plain;charset=utf-8;');
    }

    function applyStyle() {
        var old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        var dark = darkMode();

        var panelBg = dark
            ? 'linear-gradient(180deg, rgba(38,40,43,0.98) 0%, rgba(35,37,39,0.98) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)';
        var panelText = dark ? '#bdbebe' : '#343434';
        var heading = dark ? '#ffffff' : '#343434';
        var panelEdge = dark ? 'rgba(101,102,104,0.6)' : 'rgba(199,203,206,0.7)';
        var headEdge = dark ? 'rgba(57,59,61,0.9)' : 'rgba(224,227,229,0.9)';
        var faded = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
        var thumbBg = dark ? 'rgba(57,59,61,0.6)' : 'rgba(242,244,245,0.8)';
        var thumbHover = dark ? 'rgba(74,77,80,0.85)' : 'rgba(228,231,233,0.95)';
        var selectBg = dark ? 'rgba(57,59,61,0.8)' : 'rgba(255,255,255,0.9)';
        var selectEdge = dark ? 'rgba(101,102,104,0.6)' : 'rgba(199,203,206,0.7)';
        var skeleton1 = dark ? 'rgba(44,46,48,0.6)' : 'rgba(232,234,236,0.6)';
        var skeleton2 = dark ? 'rgba(58,61,64,0.85)' : 'rgba(244,246,248,0.9)';
        var pillBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        var pillText = dark ? '#bdbebe' : '#606162';
        var serialBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        var serialText = dark ? '#bdbebe' : '#606162';
        var btnBg = dark ? 'rgba(57,59,61,0.8)' : 'rgba(255,255,255,0.9)';
        var btnEdge = dark ? 'rgba(101,102,104,0.6)' : 'rgba(199,203,206,0.7)';
        var btnText = dark ? '#bdbebe' : '#343434';
        var btnHover = dark ? 'rgba(74,77,80,0.9)' : 'rgba(228,231,233,0.95)';
        var menuBg = dark ? 'rgba(45,47,50,0.98)' : 'rgba(255,255,255,0.98)';
        var menuEdge = dark ? 'rgba(101,102,104,0.7)' : 'rgba(199,203,206,0.8)';
        var menuHover = dark ? 'rgba(74,77,80,0.9)' : 'rgba(228,231,233,0.95)';

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '#' + OVERLAY_ID + '{',
            'position:fixed;inset:0;z-index:2147483645;',
            'background:rgba(0,0,0,0);',
            'display:flex;align-items:center;justify-content:center;',
            'opacity:0;transition:opacity 0.15s ease;pointer-events:none;',
            '}',
            '#' + OVERLAY_ID + '.nx-open{opacity:1;pointer-events:auto;background:rgba(0,0,0,0.4);}',

            '#' + MODAL_ID + '{',
            'background:' + panelBg + ';color:' + panelText + ';',
            'border:1px solid ' + panelEdge + ';border-radius:10px;',
            'width:min(92vw,1000px);height:min(85vh,720px);',
            'display:flex;flex-direction:column;overflow:hidden;',
            'box-shadow:0 12px 40px rgba(0,0,0,0.45);',
            'font-family:"HCo Gotham SSm","Helvetica Neue",Helvetica,Arial,sans-serif;',
            'transform:scale(0.98);transition:transform 0.15s ease;',
            '}',
            '#' + OVERLAY_ID + '.nx-open #' + MODAL_ID + '{transform:scale(1);}',

            '#' + MODAL_ID + ' .nx-rap-head{',
            'display:flex;align-items:center;justify-content:space-between;',
            'padding:14px 18px;border-bottom:1px solid ' + headEdge + ';',
            'font-weight:700;font-size:15px;flex:none;color:' + heading + ';',
            'gap:10px;background:rgba(0,0,0,0.02);',
            '}',

            '#' + MODAL_ID + ' .nx-rap-title{',
            'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-sort{',
            'background:' + selectBg + ';color:' + panelText + ';',
            'border:1px solid ' + selectEdge + ';border-radius:6px;',
            'padding:5px 8px;font-size:12px;font-weight:500;',
            'font-family:inherit;cursor:pointer;outline:none;',
            'transition:background 0.12s ease;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-sort:hover{background:' + btnHover + ';}',
            '#' + MODAL_ID + ' .nx-rap-sort:focus{border-color:#0a84ff;}',

            '#' + MODAL_ID + ' .nx-rap-export{position:relative;}',

            '#' + MODAL_ID + ' .nx-rap-export-btn{',
            'background:' + btnBg + ';color:' + btnText + ';',
            'border:1px solid ' + btnEdge + ';border-radius:6px;',
            'padding:5px 10px;font-size:12px;font-weight:500;',
            'font-family:inherit;cursor:pointer;outline:none;',
            'transition:background 0.12s ease;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-export-btn:hover{background:' + btnHover + ';}',

            '#' + MODAL_ID + ' .nx-rap-export-menu{',
            'position:absolute;top:calc(100% + 4px);right:0;',
            'min-width:120px;background:' + menuBg + ';',
            'border:1px solid ' + menuEdge + ';border-radius:6px;',
            'box-shadow:0 8px 24px rgba(0,0,0,0.35);',
            'padding:4px;display:none;z-index:10;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-export-menu.open{display:block;}',

            '#' + MODAL_ID + ' .nx-rap-export-item{',
            'display:block;width:100%;text-align:left;',
            'background:none;border:0;color:' + panelText + ';',
            'padding:7px 10px;font-size:12px;font-weight:500;',
            'font-family:inherit;cursor:pointer;border-radius:4px;',
            'transition:background 0.12s ease;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-export-item:hover{background:' + menuHover + ';}',

            '#' + MODAL_ID + ' .nx-rap-close{',
            'background:none;border:0;color:' + faded + ';',
            'cursor:pointer;font-size:22px;line-height:1;padding:0 6px;',
            'font-weight:400;transition:color 0.12s ease;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-close:hover{color:#e5484d;}',

            '#' + MODAL_ID + ' .nx-rap-body{',
            'padding:16px 18px 20px;overflow-y:auto;flex:1;',
            '}',

            '#' + MODAL_ID + ' ul.hlist.item-cards{',
            'display:grid;grid-template-columns:repeat(auto-fill,minmax(115px,1fr));',
            'gap:8px;padding:0;margin:0;list-style:none;',
            '}',

            '#' + MODAL_ID + ' li.list-item.item-card{list-style:none;margin:0;padding:0;}',

            '#' + MODAL_ID + ' .item-card-container{',
            'background:transparent;border-radius:6px;padding:6px;',
            'text-align:center;transition:background 0.15s;',
            '}',

            '#' + MODAL_ID + ' .item-card-link{color:inherit;text-decoration:none;display:block;}',
            '#' + MODAL_ID + ' .item-card-link:hover{text-decoration:none;color:inherit;}',

            '#' + MODAL_ID + ' .item-card-thumb-container{',
            'display:flex;width:100%;aspect-ratio:1/1;',
            'background:' + thumbBg + ';border-radius:6px;',
            'overflow:hidden;margin-bottom:8px;',
            'align-items:center;justify-content:center;',
            'transition:background 0.15s;position:relative;',
            '}',
            '#' + MODAL_ID + ' .item-card-link:hover .item-card-thumb-container{',
            'background:' + thumbHover + ';',
            '}',

            '#' + MODAL_ID + ' .item-card-thumb-container img{',
            'width:100%;height:100%;object-fit:contain;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-serial{',
            'position:absolute;top:5px;left:5px;',
            'font-size:10px;font-weight:700;line-height:1;',
            'padding:3px 7px;border-radius:10px;',
            'background:' + serialBg + ';color:' + serialText + ';',
            '}',

            '#' + MODAL_ID + ' .item-card-name{',
            'font-size:12px;font-weight:500;line-height:1.3;',
            'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
            'color:' + (dark ? '#bdbebe' : '#343434') + ';',
            'text-align:center;margin-bottom:4px;padding:0 2px;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-type{',
            'display:inline-block;background:' + pillBg + ';color:' + pillText + ';',
            'font-size:10px;font-weight:600;line-height:1;',
            'padding:2px 6px;border-radius:8px;margin-bottom:5px;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-card-stats{',
            'display:flex;align-items:center;justify-content:center;',
            'gap:5px;font-size:11px;font-weight:700;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-card-stats .nx-rap-green{color:#00b06f;}',
            '#' + MODAL_ID + ' .nx-rap-card-stats .nx-rap-blue{color:#0a84ff;}',
            '#' + MODAL_ID + ' .nx-rap-card-stats .nx-rap-dot{',
            'color:' + faded + ';font-weight:400;',
            '}',

            '#' + MODAL_ID + ' .nx-rap-empty{',
            'padding:40px 0;text-align:center;color:' + faded + ';font-size:14px;',
            '}',

            '@keyframes nx-rap-shimmer{',
            '0%{background-position:-200% 0;}',
            '100%{background-position:200% 0;}',
            '}',

            '#' + MODAL_ID + ' .nx-rap-skel-card{',
            'border-radius:6px;padding:6px;text-align:center;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-skel-thumb{',
            'width:100%;aspect-ratio:1/1;border-radius:6px;',
            'background:linear-gradient(90deg,',
            skeleton1 + ' 0%,',
            skeleton2 + ' 50%,',
            skeleton1 + ' 100%);',
            'background-size:200% 100%;',
            'animation:nx-rap-shimmer 1.4s infinite;',
            'margin-bottom:8px;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-skel-line{',
            'height:11px;border-radius:5px;margin:0 auto 5px;',
            'background:linear-gradient(90deg,',
            skeleton1 + ' 0%,',
            skeleton2 + ' 50%,',
            skeleton1 + ' 100%);',
            'background-size:200% 100%;',
            'animation:nx-rap-shimmer 1.4s infinite;',
            '}',
            '#' + MODAL_ID + ' .nx-rap-skel-line.l1{width:80%;}',
            '#' + MODAL_ID + ' .nx-rap-skel-line.l2{width:55%;}'
        ].join('');
        document.head.appendChild(style);
    }

    function shutExportMenu() {
        var menu = document.querySelector('#' + MODAL_ID + ' .nx-rap-export-menu');
        if (menu) menu.classList.remove('open');
    }

    function buildModal() {
        var existing = document.getElementById(OVERLAY_ID);
        if (existing) return existing;
        applyStyle();

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        var modal = document.createElement('div');
        modal.id = MODAL_ID;

        var head = document.createElement('div');
        head.className = 'nx-rap-head';

        var title = document.createElement('span');
        title.className = 'nx-rap-title';
        title.textContent = 'Limiteds';

        var sort = document.createElement('select');
        sort.className = 'nx-rap-sort';
        [
            ['rap', 'Sort: RAP \u2193'],
            ['value', 'Sort: Value \u2193'],
            ['name', 'Sort: Name A\u2192Z'],
            ['serial', 'Sort: Serial \u2191']
        ].forEach(function (opt) {
            var o = document.createElement('option');
            o.value = opt[0];
            o.textContent = opt[1];
            sort.appendChild(o);
        });
        sort.value = sortBy;
        sort.onchange = function () {
            sortBy = this.value;
            paintGrid();
        };

        var exportWrap = document.createElement('div');
        exportWrap.className = 'nx-rap-export';

        var exportBtn = document.createElement('button');
        exportBtn.className = 'nx-rap-export-btn';
        exportBtn.textContent = 'Export \u25be';

        var exportMenu = document.createElement('div');
        exportMenu.className = 'nx-rap-export-menu';

        [
            ['CSV', saveCsv],
            ['JSON', saveJson],
            ['TXT', saveTxt]
        ].forEach(function (opt) {
            var item = document.createElement('button');
            item.className = 'nx-rap-export-item';
            item.textContent = opt[0];
            item.onclick = function (e) {
                e.stopPropagation();
                shutExportMenu();
                opt[1]();
            };
            exportMenu.appendChild(item);
        });

        exportBtn.onclick = function (e) {
            e.stopPropagation();
            exportMenu.classList.toggle('open');
        };

        exportWrap.appendChild(exportBtn);
        exportWrap.appendChild(exportMenu);

        var close = document.createElement('button');
        close.className = 'nx-rap-close';
        close.textContent = '\u00d7';
        close.onclick = closeModal;

        head.appendChild(title);
        head.appendChild(sort);
        head.appendChild(exportWrap);
        head.appendChild(close);

        var body = document.createElement('div');
        body.className = 'nx-rap-body';

        modal.appendChild(head);
        modal.appendChild(body);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        document.addEventListener('click', shutExportMenu);

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' || !overlay.classList.contains('nx-open')) return;
            if (document.querySelector('#' + MODAL_ID + ' .nx-rap-export-menu.open')) {
                shutExportMenu();
            } else {
                closeModal();
            }
        });

        return overlay;
    }

    function paintSkeleton(n) {
        var overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;
        var body = overlay.querySelector('.nx-rap-body');

        var ul = document.createElement('ul');
        ul.className = 'hlist item-cards';

        for (var i = 0; i < n; i++) {
            var li = document.createElement('li');
            li.className = 'list-item item-card';

            var card = document.createElement('div');
            card.className = 'nx-rap-skel-card';

            var thumb = document.createElement('div');
            thumb.className = 'nx-rap-skel-thumb';

            var line1 = document.createElement('div');
            line1.className = 'nx-rap-skel-line l1';

            var line2 = document.createElement('div');
            line2.className = 'nx-rap-skel-line l2';

            card.appendChild(thumb);
            card.appendChild(line1);
            card.appendChild(line2);
            li.appendChild(card);
            ul.appendChild(li);
        }

        body.innerHTML = '';
        body.appendChild(ul);
    }

    function makeCard(item) {
        var li = document.createElement('li');
        li.className = 'list-item item-card';

        var box = document.createElement('div');
        box.className = 'item-card-container';

        var id = item.assetId || item.id || '';
        var slug = (item.name || '').trim().replace(/\s+/g, '-');
        var href = '/catalog/' + id + (slug ? '/' + slug : '');

        var link = document.createElement('a');
        link.className = 'item-card-link';
        link.href = href;
        link.addEventListener('click', function (e) {
            e.preventDefault();
            closeModal();
            location.href = href;
        });

        var thumb = document.createElement('span');
        thumb.className = 'item-card-thumb-container';

        var sn = serialNum(item);
        var serialEl = document.createElement('span');
        serialEl.className = 'nx-rap-serial';
        serialEl.textContent = sn === null ? 'N/A' : '#' + sn;
        serialEl.title = 'Serial Number';
        thumb.appendChild(serialEl);

        var img = document.createElement('img');
        img.src = imageFor(item);
        img.alt = item.name || '';
        img.loading = 'lazy';
        img.onerror = function () { this.src = '/img/pending.png'; };
        thumb.appendChild(img);

        var name = document.createElement('div');
        name.className = 'item-card-name';
        name.title = item.name || '';
        name.textContent = item.name || '(unnamed)';

        link.appendChild(thumb);
        link.appendChild(name);
        box.appendChild(link);

        var type = assetTypeName(item);
        if (type) {
            var typeEl = document.createElement('div');
            typeEl.className = 'nx-rap-type';
            typeEl.textContent = type;
            box.appendChild(typeEl);
        }

        var rap = Number(item.recentAveragePrice) || 0;
        var value = Number(item.originalPrice) || rap;

        var stats = document.createElement('div');
        stats.className = 'nx-rap-card-stats';

        var rapEl = document.createElement('span');
        rapEl.className = 'nx-rap-green';
        rapEl.textContent = shortNum(rap) + ' RAP';

        var dot = document.createElement('span');
        dot.className = 'nx-rap-dot';
        dot.textContent = '\u2022';

        var valEl = document.createElement('span');
        valEl.className = 'nx-rap-blue';
        valEl.textContent = shortNum(value) + ' Value';

        stats.appendChild(rapEl);
        stats.appendChild(dot);
        stats.appendChild(valEl);
        box.appendChild(stats);

        li.appendChild(box);
        return li;
    }

    function paintGrid() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;
        var body = overlay.querySelector('.nx-rap-body');

        if (!items.length) {
            body.innerHTML = '<div class="nx-rap-empty">No limiteds found.</div>';
            return;
        }

        var list = arrange();

        body.innerHTML = '';

        if (!list.length) {
            body.innerHTML = '<div class="nx-rap-empty">No serialized items to show.</div>';
            return;
        }

        var ul = document.createElement('ul');
        ul.className = 'hlist item-cards';
        list.forEach(function (item) {
            ul.appendChild(makeCard(item));
        });
        body.appendChild(ul);
    }

    function openModal(userId, username) {
        var overlay = buildModal();
        var title = overlay.querySelector('.nx-rap-title');

        applyStyle();

        whoami = username || 'user';
        title.textContent = whoami + "'s Limiteds";
        overlay.classList.add('nx-open');

        items = [];
        thumbs = {};

        paintSkeleton(12);

        loadLimiteds(userId).then(function (data) {
            items = data.list;

            if (!data.list.length) {
                title.textContent = whoami + "'s Limiteds (0)";
                overlay.querySelector('.nx-rap-body').innerHTML =
                    '<div class="nx-rap-empty">No limiteds found.</div>';
                return;
            }

            title.textContent = whoami + "'s Limiteds (" + data.list.length + ')';

            var ids = data.list.map(function (it) {
                return it.assetId || it.id;
            }).filter(Boolean);

            loadThumbs(ids).then(function (map) {
                thumbs = map;
                paintGrid();
            });
        });
    }

    function closeModal() {
        shutExportMenu();
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay) overlay.classList.remove('nx-open');
    }

    function injectRow() {
        var userId = currentUserId();
        if (!userId) return true;

        var list = document.querySelector('.details-info');
        if (!list) return false;
        if (list.querySelector('.nx-rap-row')) return true;

        var rows = list.querySelectorAll('li');
        var anchor = null;
        for (var i = 0; i < rows.length; i++) {
            var lbl = rows[i].querySelector('.text-label');
            if (lbl && (lbl.textContent || '').trim() === 'Following') {
                anchor = rows[i];
                break;
            }
        }
        if (!anchor) return false;

        var li = anchor.cloneNode(true);
        li.classList.add('nx-rap-row');

        var label = li.querySelector('.text-label');
        if (label) {
            label.textContent = 'RAP';
            label.removeAttribute('ng-bind');
            label.removeAttribute('data-ng-bind');
            label.classList.remove('ng-binding');
        }

        var name = currentUsername() || 'user';
        var tip = 'Click to view ' + name + "'s limiteds";

        var span = li.querySelector('.font-header-2');
        if (span) {
            span.textContent = '\u2026';
            span.removeAttribute('ng-bind');
            span.removeAttribute('data-ng-bind');
            span.classList.remove('ng-binding');

            span.style.cursor = 'pointer';
            span.title = tip;
            span.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.top.postMessage({ type: MSG_OPEN, userId: userId, username: name }, '*');
            });
        }

        var link = li.querySelector('a.text-name');
        if (link) {
            link.removeAttribute('href');
            link.removeAttribute('ng-href');
            link.style.cursor = 'pointer';
            link.title = tip;
            link.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.top.postMessage({ type: MSG_OPEN, userId: userId, username: name }, '*');
            });
        }

        list.appendChild(li);

        loadLimiteds(userId).then(function (data) {
            if (!span) return;
            span.textContent = shortNum(data.rap);
            span.setAttribute('title', tip);
        });

        return true;
    }

    function startRowScanner() {
        stopRowScanner();
        var tries = 0;
        rowScanner = setInterval(function () {
            if (injectRow() || ++tries > 120) stopRowScanner();
        }, 250);
        injectRow();
    }

    function stopRowScanner() {
        if (rowScanner) {
            clearInterval(rowScanner);
            rowScanner = null;
        }
    }

    function onMessage(e) {
        if (!e.data || e.data.type !== MSG_OPEN) return;
        if (!e.data.userId) return;
        openModal(e.data.userId, e.data.username);
    }

    function onThemeChange() {
        applyStyle();
    }

    function onStorage(e) {
        if (e.key === 'rbx_theme_v1') applyStyle();
    }

    var styleWatchBound = false;

    window.NX.features.rap = {
        apply: function () {
            if (isTop) {
                window.addEventListener('message', onMessage);

                if (!styleWatchBound) {
                    styleWatchBound = true;
                    window.addEventListener('octane-theme-change', onThemeChange);
                    window.addEventListener('storage', onStorage);
                }
            } else {
                startRowScanner();
            }
        },
        teardown: function () {
            stopRowScanner();

            if (isTop) {
                window.removeEventListener('message', onMessage);
                if (styleWatchBound) {
                    window.removeEventListener('octane-theme-change', onThemeChange);
                    window.removeEventListener('storage', onStorage);
                    styleWatchBound = false;
                }
                closeModal();
                var overlay = document.getElementById(OVERLAY_ID);
                if (overlay) overlay.remove();
                var style = document.getElementById(STYLE_ID);
                if (style) style.remove();
            } else {
                var row = document.querySelector('.nx-rap-row');
                if (row) row.remove();
            }
        }
    };
})();

// boom

/* src/features/inventory-search.js */
(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var WRAP_ID = 'nx-inv-search-wrap';
    var STYLE_ID = 'nx-inv-search-style';
    var TRY_LIMIT = 40;

    function isAllowedPage() {
        var path = location.pathname;
        if (/^\/users\/\d+\/inventory(\/|$)/.test(path)) return true;
        if (/^\/my\/avatar(\/|$)/.test(path)) return true;
        if (/^\/theme2020\/users\/\d+\/inventory(\/|$)/.test(path)) return true;
        if (/^\/theme2020\/avatar(\/|$)/.test(path)) return true;
        if (/^\/theme2020\/inventory(\/|$)/.test(path)) return true;
        return false;
    }

    function removeExisting() {
        var existing = document.getElementById(WRAP_ID);
        if (existing) existing.remove();
        var style = document.getElementById(STYLE_ID);
        if (style) style.remove();
    }

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '#' + WRAP_ID + '{padding:10px 0;width:100%;}',
            '#' + WRAP_ID + ' input{',
            'padding:8px 14px;',
            'border:1px solid #c7cbce;',
            'border-radius:6px;',
            'font-size:14px;',
            'width:100%;max-width:400px;',
            'background:#ffffff;color:#232527;',
            'outline:none;box-sizing:border-box;font-family:inherit;',
            '}',
            '#' + WRAP_ID + ' input:focus{border-color:#0a84ff;}',
            'html.octane-dark #' + WRAP_ID + ' input{',
            'background:#2a2c2e;color:#e0e0e0;border-color:#3a3c3e;',
            '}',
            'html.octane-dark #' + WRAP_ID + ' input:focus{border-color:#0a84ff;}'
        ].join('');
        (document.head || document.documentElement).appendChild(s);
    }

    function findContainer() {
        var cards = document.querySelectorAll('.item-card');
        if (!cards.length) return null;

        var parent = cards[0].parentElement;
        var depth = 0;
        while (parent && depth < 6) {
            var cls = parent.className || '';
            if (
                cls.indexOf('item-cards') !== -1 ||
                cls.indexOf('hlist') !== -1 ||
                cls.indexOf('grid') !== -1 ||
                cls.indexOf('items-') !== -1
            ) {
                return parent;
            }
            parent = parent.parentElement;
            depth++;
        }
        return cards[0].parentElement;
    }

    function filter(query) {
        var q = (query || '').toLowerCase().trim();
        var cards = document.querySelectorAll('.item-card');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var nameEl = card.querySelector('.item-card-name');
            if (!nameEl) continue;
            var name = (nameEl.textContent || '').toLowerCase();
            card.style.display = (!q || name.indexOf(q) !== -1) ? '' : 'none';
        }
    }

    function build() {
        if (document.getElementById(WRAP_ID)) return true;
        if (!isAllowedPage()) return false;

        var container = findContainer();
        if (!container) return false;

        var wrap = document.createElement('div');
        wrap.id = WRAP_ID;

        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Search inventory\u2026';
        input.addEventListener('input', function() {
            filter(input.value);
        });

        wrap.appendChild(input);
        container.parentNode.insertBefore(wrap, container);
        return true;
    }

    var scanner = null;

    function stopScanner() {
        if (scanner) {
            clearInterval(scanner);
            scanner = null;
        }
    }

    function scheduleRetry() {
        stopScanner();
        if (!isAllowedPage()) return;
        var tries = 0;
        scanner = setInterval(function() {
            tries++;
            if (build() || tries >= TRY_LIMIT) stopScanner();
        }, 500);
    }

    function watchNavigation() {
        var last = location.href;
        setInterval(function() {
            if (location.href === last) return;
            last = location.href;

            removeExisting();

            if (!isAllowedPage()) return;
            scheduleRetry();
        }, 800);
    }

    window.NX.features.inventorySearch = {
        apply: function() {
            if (!isAllowedPage()) {
                removeExisting();
                return;
            }
            if (document.getElementById(WRAP_ID)) return;
            style();
            if (build()) return;
            scheduleRetry();
        },
        teardown: function() {
            stopScanner();
            removeExisting();
            var cards = document.querySelectorAll('.item-card');
            for (var i = 0; i < cards.length; i++) cards[i].style.display = '';
        }
    };

    if (!window.nxInvSearchNavBound) {
        window.nxInvSearchNavBound = true;
        watchNavigation();
    }
})();

/* src/features/bulk-unfriend.js */
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

/* src/features/custom-logo.js */
(function() {
    'use strict';

    if (window.top !== window.self) return;

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STORAGE_LOGO_URL = 'nx_logo_url';
    var STORAGE_LOGO_HEIGHT = 'nx_logo_height';
    var STORAGE_PANEL_X = 'nx_logo_panel_x';
    var STORAGE_PANEL_Y = 'nx_logo_panel_y';
    var STORAGE_PANEL_MINIMIZED = 'nx_logo_panel_min';

    var PANEL_ID = 'nx-logo-panel';
    var PANEL_STYLE_ID = 'nx-logo-panel-style';

    var imageSizeCache = {};
    var panelHidden = false;
    var timers = [];

    function isDarkTheme() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    function getLogoUrl() {
        return GM_getValue(STORAGE_LOGO_URL, '');
    }

    function getLogoHeight() {
        var stored = parseInt(GM_getValue(STORAGE_LOGO_HEIGHT, '30'), 10);
        if (isNaN(stored)) return 30;
        return Math.max(12, Math.min(60, stored));
    }

    function getPanelX() {
        var stored = GM_getValue(STORAGE_PANEL_X, null);
        if (stored === null || stored === '') return null;
        var n = parseFloat(stored);
        return isNaN(n) ? null : n;
    }

    function getPanelY() {
        var stored = GM_getValue(STORAGE_PANEL_Y, null);
        if (stored === null || stored === '') return null;
        var n = parseFloat(stored);
        return isNaN(n) ? null : n;
    }

    function isPanelMinimized() {
        return GM_getValue(STORAGE_PANEL_MINIMIZED, false) === true;
    }

    // Finds every element that renders the site logo.
    // Current Octane markup: <span class="octane-logo"></span> inside
    // <a class="navbar-brand">. It's styled via CSS background-image.
    // Some builds may instead put the image on .navbar-brand directly, or
    // drop an <img> tag inside. We handle all three cases.
    function findLogoElements() {
        var found = [];
        var alreadyAdded = [];

        function add(element, kind) {
            if (alreadyAdded.indexOf(element) !== -1) return;
            alreadyAdded.push(element);
            found.push({ element: element, kind: kind });
        }

        document.querySelectorAll('.octane-logo').forEach(function(span) {
            add(span, 'span');
        });

        document.querySelectorAll('.navbar-brand').forEach(function(brand) {
            var styles = getComputedStyle(brand);
            if (styles.backgroundImage && styles.backgroundImage !== 'none') {
                add(brand, 'span');
            }
            brand.querySelectorAll('img').forEach(function(image) {
                add(image, 'image');
            });
        });

        return found;
    }

    function removeExistingPanels() {
        document.querySelectorAll('#' + PANEL_ID).forEach(function(panel) {
            panel.remove();
        });
    }

    // Loads an image to find its real width/height so we can size the logo
    // without distorting it. Falls back to a rough guess if the image fails.
    function loadImageSize(url, onReady) {
        if (imageSizeCache[url]) {
            onReady(imageSizeCache[url]);
            return;
        }
        var probe = new Image();
        probe.onload = function() {
            imageSizeCache[url] = { width: probe.naturalWidth, height: probe.naturalHeight };
            onReady(imageSizeCache[url]);
        };
        probe.onerror = function() {
            onReady({ width: 118, height: 30 });
        };
        probe.src = url;
    }

    function restoreLogo(entry) {
        var element = entry.element;

        if (entry.kind === 'image') {
            if (element.dataset.nxOriginalSource) {
                element.src = element.dataset.nxOriginalSource;
            }
            element.style.removeProperty('width');
            element.style.removeProperty('height');
            element.style.removeProperty('min-width');
            element.style.removeProperty('object-fit');
        } else {
            element.style.removeProperty('background-image');
            element.style.removeProperty('background-size');
            element.style.removeProperty('background-repeat');
            element.style.removeProperty('background-position');
            element.style.removeProperty('width');
            element.style.removeProperty('height');
            element.style.removeProperty('min-width');
            element.style.removeProperty('display');
        }

        delete element.dataset.nxCustomLogo;
        delete element.dataset.nxLogoUrl;
    }

    function paintLogo(entry, url, size) {
        var element = entry.element;
        var height = getLogoHeight();
        var aspect = (size.width && size.height)
            ? size.width / size.height
            : (118 / 30);
        var width = Math.round(height * aspect);

        if (entry.kind === 'image') {
            if (!element.dataset.nxOriginalSource) {
                element.dataset.nxOriginalSource = element.getAttribute('src') || '';
            }
            element.src = url;
            element.style.setProperty('width', width + 'px', 'important');
            element.style.setProperty('height', height + 'px', 'important');
            element.style.setProperty('min-width', width + 'px', 'important');
            element.style.setProperty('object-fit', 'contain', 'important');
        } else {
            element.style.setProperty('background-image', 'url("' + url + '")', 'important');
            element.style.setProperty('background-size', 'contain', 'important');
            element.style.setProperty('background-repeat', 'no-repeat', 'important');
            element.style.setProperty('background-position', 'center', 'important');
            element.style.setProperty('height', height + 'px', 'important');
            element.style.setProperty('width', width + 'px', 'important');
            element.style.setProperty('min-width', width + 'px', 'important');
        }

        element.dataset.nxCustomLogo = '1';
        element.dataset.nxLogoUrl = url;
    }

    // The public entry point that actually swaps the logo.
    // Always repaints when a URL is set — no clever skipping, because the
    // dataset markers don't survive every navigation and skipping caused
    // the logo to silently fail to update.
    function paintLogos() {
        var url = getLogoUrl();
        var elements = findLogoElements();

        if (!elements.length) return false;

        elements.forEach(function(entry) {
            if (!url) {
                if (entry.element.dataset.nxCustomLogo === '1') {
                    restoreLogo(entry);
                }
                return;
            }
            loadImageSize(url, function(size) {
                paintLogo(entry, url, size);
            });
        });

        return true;
    }

    function injectPanelStyles() {
        var existing = document.getElementById(PANEL_STYLE_ID);
        if (existing) existing.remove();

        var dark = isDarkTheme();
        var panelBackground = dark ? 'rgba(35,37,39,0.95)' : 'rgba(255,255,255,0.96)';
        var borderColor = dark ? '#3a3d40' : '#c7cbce';
        var textColor = dark ? '#e0e0e0' : '#232527';
        var mutedColor = dark ? '#7a7d80' : '#6a6d70';
        var inputBackground = dark ? '#1a1c1e' : '#ffffff';
        var hoverBackground = dark ? '#2a2c2e' : '#e8eef5';

        var style = document.createElement('style');
        style.id = PANEL_STYLE_ID;
        style.textContent = [
            '#' + PANEL_ID + '{position:fixed;z-index:2147483646;background:' + panelBackground + ';',
            'color:' + textColor + ';border:1px solid ' + borderColor + ';border-radius:8px;',
            'padding:10px;width:260px;font-family:inherit;font-size:12px;',
            'box-shadow:0 6px 24px rgba(0,0,0,0.35);backdrop-filter:blur(6px);user-select:none;}',
            '#' + PANEL_ID + ' .nxlogo-head{display:flex;align-items:center;',
            'justify-content:space-between;font-weight:600;font-size:13px;',
            'margin-bottom:8px;cursor:grab;padding:2px 0;}',
            '#' + PANEL_ID + ' .nxlogo-head:active{cursor:grabbing;}',
            '#' + PANEL_ID + ' .nxlogo-head-title{flex:1;}',
            '#' + PANEL_ID + ' .nxlogo-head-actions{display:flex;gap:2px;}',
            '#' + PANEL_ID + ' .nxlogo-min,#' + PANEL_ID + ' .nxlogo-close{',
            'background:none;border:0;color:' + mutedColor + ';cursor:pointer;font-size:16px;',
            'line-height:1;padding:0 4px;}',
            '#' + PANEL_ID + ' .nxlogo-min:hover{color:' + textColor + ';}',
            '#' + PANEL_ID + ' .nxlogo-close:hover{color:#e5484d;}',
            '#' + PANEL_ID + ' input[type=text]{width:100%;background:' + inputBackground + ';',
            'color:' + textColor + ';border:1px solid ' + borderColor + ';border-radius:4px;',
            'padding:6px 8px;font-family:inherit;font-size:12px;box-sizing:border-box;',
            'margin-bottom:8px;}',
            '#' + PANEL_ID + ' input[type=text]:focus{outline:none;border-color:#0a84ff;}',
            '#' + PANEL_ID + ' label{display:block;color:' + mutedColor + ';font-size:11px;margin:6px 0 2px;}',
            '#' + PANEL_ID + ' input[type=range]{width:100%;}',
            '#' + PANEL_ID + ' .nxlogo-buttons{display:flex;gap:6px;margin-top:8px;}',
            '#' + PANEL_ID + ' button.nxlogo-apply{flex:1;background:#0a84ff;color:#fff;',
            'border:0;border-radius:4px;padding:6px;font-size:12px;font-weight:600;',
            'cursor:pointer;font-family:inherit;}',
            '#' + PANEL_ID + ' button.nxlogo-apply:hover{background:#0a76e0;}',
            '#' + PANEL_ID + ' button.nxlogo-clear{background:transparent;color:' + textColor + ';',
            'border:1px solid ' + borderColor + ';border-radius:4px;padding:6px 10px;',
            'font-size:12px;cursor:pointer;font-family:inherit;}',
            '#' + PANEL_ID + ' button.nxlogo-clear:hover{background:' + hoverBackground + ';}',
            '#' + PANEL_ID + '.nxlogo-collapsed{padding:6px 10px;}',
            '#' + PANEL_ID + '.nxlogo-collapsed .nxlogo-head{margin-bottom:0;}',
            '#' + PANEL_ID + '.nxlogo-collapsed .nxlogo-body{display:none;}',
            '#' + PANEL_ID + ' .nxlogo-hint{color:' + mutedColor + ';font-size:10px;',
            'margin-top:6px;line-height:1.4;}'
        ].join('');
        document.head.appendChild(style);
    }

    function clampPanelToViewport(panel) {
        var rect = panel.getBoundingClientRect();
        var newX = Math.max(4, Math.min(window.innerWidth - rect.width - 4, rect.left));
        var newY = Math.max(4, Math.min(window.innerHeight - rect.height - 4, rect.top));
        panel.style.left = newX + 'px';
        panel.style.top = newY + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        return { x: newX, y: newY };
    }

    function savePanelPosition(panel) {
        var rect = panel.getBoundingClientRect();
        GM_setValue(STORAGE_PANEL_X, Math.round(rect.left));
        GM_setValue(STORAGE_PANEL_Y, Math.round(rect.top));
    }

    function placePanel(panel) {
        var savedX = getPanelX();
        var savedY = getPanelY();

        if (savedX === null || savedY === null) {
            panel.style.right = '16px';
            panel.style.bottom = '16px';
            panel.style.left = 'auto';
            panel.style.top = 'auto';
            return;
        }

        panel.style.left = savedX + 'px';
        panel.style.top = savedY + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        requestAnimationFrame(function() {
            var clamped = clampPanelToViewport(panel);
            if (clamped.x !== savedX || clamped.y !== savedY) {
                savePanelPosition(panel);
            }
        });
    }

    function enablePanelDragging(panel) {
        var handle = panel.querySelector('.nxlogo-head');
        if (!handle) return;

        var dragging = false;
        var offsetX = 0;
        var offsetY = 0;

        handle.addEventListener('mousedown', function(event) {
            if (event.button !== 0) return;
            if (event.target.closest('.nxlogo-min')) return;
            if (event.target.closest('.nxlogo-close')) return;

            dragging = true;
            var rect = panel.getBoundingClientRect();
            offsetX = event.clientX - rect.left;
            offsetY = event.clientY - rect.top;
            event.preventDefault();
        });

        document.addEventListener('mousemove', function(event) {
            if (!dragging) return;
            panel.style.left = (event.clientX - offsetX) + 'px';
            panel.style.top = (event.clientY - offsetY) + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', function() {
            if (!dragging) return;
            dragging = false;
            clampPanelToViewport(panel);
            savePanelPosition(panel);
        });
    }

    function buildPanel() {
        if (panelHidden) return;

        removeExistingPanels();
        injectPanelStyles();

        var minimized = isPanelMinimized();

        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        if (minimized) panel.classList.add('nxlogo-collapsed');

        var header = document.createElement('div');
        header.className = 'nxlogo-head';

        var title = document.createElement('span');
        title.className = 'nxlogo-head-title';
        title.textContent = 'Custom Logo';

        var actions = document.createElement('div');
        actions.className = 'nxlogo-head-actions';

        var minimizeButton = document.createElement('button');
        minimizeButton.className = 'nxlogo-min';
        minimizeButton.textContent = minimized ? '+' : '\u2013';
        minimizeButton.title = minimized ? 'Expand' : 'Minimize';
        minimizeButton.onclick = function(event) {
            event.stopPropagation();
            var nowMinimized = !panel.classList.contains('nxlogo-collapsed');
            panel.classList.toggle('nxlogo-collapsed');
            minimizeButton.textContent = nowMinimized ? '+' : '\u2013';
            minimizeButton.title = nowMinimized ? 'Expand' : 'Minimize';
            GM_setValue(STORAGE_PANEL_MINIMIZED, nowMinimized);
            requestAnimationFrame(function() {
                clampPanelToViewport(panel);
                savePanelPosition(panel);
            });
        };

        var closeButton = document.createElement('button');
        closeButton.className = 'nxlogo-close';
        closeButton.textContent = '\u00d7';
        closeButton.title = 'Hide panel';
        closeButton.onclick = function(event) {
            event.stopPropagation();
            panelHidden = true;
            removeExistingPanels();
        };

        actions.appendChild(minimizeButton);
        actions.appendChild(closeButton);
        header.appendChild(title);
        header.appendChild(actions);
        panel.appendChild(header);

        var body = document.createElement('div');
        body.className = 'nxlogo-body';

        var urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.placeholder = 'Logo image URL';
        urlInput.value = getLogoUrl();
        body.appendChild(urlInput);

        var heightLabel = document.createElement('label');
        heightLabel.textContent = 'Height: ' + getLogoHeight() + 'px';
        body.appendChild(heightLabel);

        var heightInput = document.createElement('input');
        heightInput.type = 'range';
        heightInput.min = '12';
        heightInput.max = '60';
        heightInput.step = '1';
        heightInput.value = String(getLogoHeight());
        heightInput.oninput = function() {
            heightLabel.textContent = 'Height: ' + this.value + 'px';
        };
        heightInput.onchange = function() {
            GM_setValue(STORAGE_LOGO_HEIGHT, this.value);
            // Clear our markers so paintLogos actually repaints at the new size
            findLogoElements().forEach(function(entry) {
                delete entry.element.dataset.nxCustomLogo;
                delete entry.element.dataset.nxLogoUrl;
            });
            paintLogos();
        };
        body.appendChild(heightInput);

        var buttonRow = document.createElement('div');
        buttonRow.className = 'nxlogo-buttons';

        var applyButton = document.createElement('button');
        applyButton.className = 'nxlogo-apply';
        applyButton.textContent = 'Apply';
        applyButton.onclick = function() {
            var enteredUrl = urlInput.value.trim();
            if (enteredUrl && !/^https?:\/\//i.test(enteredUrl)) {
                alert('URL must start with http:// or https://');
                return;
            }
            GM_setValue(STORAGE_LOGO_URL, enteredUrl);
            findLogoElements().forEach(function(entry) {
                delete entry.element.dataset.nxCustomLogo;
                delete entry.element.dataset.nxLogoUrl;
            });
            paintLogos();
        };

        var clearButton = document.createElement('button');
        clearButton.className = 'nxlogo-clear';
        clearButton.textContent = 'Clear';
        clearButton.onclick = function() {
            GM_setValue(STORAGE_LOGO_URL, '');
            urlInput.value = '';
            findLogoElements().forEach(function(entry) {
                restoreLogo(entry);
            });
        };

        buttonRow.appendChild(applyButton);
        buttonRow.appendChild(clearButton);
        body.appendChild(buttonRow);

        var hint = document.createElement('div');
        hint.className = 'nxlogo-hint';
        hint.textContent = 'Drag this panel by its title bar.';
        body.appendChild(hint);

        panel.appendChild(body);
        document.body.appendChild(panel);

        placePanel(panel);
        enablePanelDragging(panel);

        window.addEventListener('resize', function() {
            if (!document.getElementById(PANEL_ID)) return;
            clampPanelToViewport(panel);
            savePanelPosition(panel);
        });
    }

    function stopTimers() {
        timers.forEach(function(timer) { clearInterval(timer); });
        timers = [];
    }

    function startTimers() {
        if (!getLogoUrl()) return;

        var attempts = 0;
        var retryTimer = setInterval(function() {
            attempts++;
            if (paintLogos() || attempts > 20) clearInterval(retryTimer);
        }, 500);
        timers.push(retryTimer);

        var lastUrl = location.href;
        var watchTimer = setInterval(function() {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                paintLogos();
            } else if (getLogoUrl()) {
                paintLogos();
            }
            if (!document.getElementById(PANEL_ID) && !panelHidden) buildPanel();
        }, 800);
        timers.push(watchTimer);
    }

    window.NX.features.customLogo = {
        apply: function() {
            stopTimers();
            panelHidden = false;
            paintLogos();
            if (!document.getElementById(PANEL_ID)) buildPanel();
            startTimers();
        },
        teardown: function() {
            stopTimers();
            findLogoElements().forEach(function(entry) { restoreLogo(entry); });
            removeExistingPanels();
            var style = document.getElementById(PANEL_STYLE_ID);
            if (style) style.remove();
        }
    };
})();

/* src/features/oldroblox.js */
(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var FAVICON = 'https://images.rbxcdn.com/23421382939a9f4ae8bbe60dbe2a3e7e.ico.gzip';
    var NAV_LOGO = 'https://files.catbox.moe/2sx3l1.png';
    var NAV_ICON = 'https://images.rbxcdn.com/23421382939a9f4ae8bbe60dbe2a3e7e.ico.gzip';

    var CSS_ID = 'nx-rblx-theme';
    var CSS = [
        '.left-col-logo a,',
        '.navbar-brand,',
        'a.navbar-brand,',
        '.rbx-header .logo{',
        'visibility:hidden !important;',
        'position:relative !important;',
        'display:inline-block !important;',
        'width:140px !important;',
        'height:40px !important}',
        '.left-col-logo a::before,',
        '.navbar-brand::before,',
        'a.navbar-brand::before,',
        '.rbx-header .logo::before{',
        'content:"" !important;',
        'visibility:visible !important;',
        'position:absolute !important;',
        'left:0 !important;top:0 !important;',
        'width:100% !important;height:100% !important;',
        'background-image:url("' + NAV_LOGO + '") !important;',
        'background-size:contain !important;',
        'background-repeat:no-repeat !important;',
        'background-position:left center !important}',
        '@media (max-width:991px){',
        '#navigation-container .navbar-brand,',
        '#navigation-container a.navbar-brand,',
        '#navigation-container .rbx-header .logo,',
        '#navigation-container .left-col-logo a{',
        'width:38px !important;height:32px !important}',
        '#navigation-container .navbar-brand::before,',
        '#navigation-container a.navbar-brand::before,',
        '#navigation-container .rbx-header .logo::before,',
        '#navigation-container .left-col-logo a::before{',
        'background-image:url("' + NAV_ICON + '") !important;',
        'background-size:contain !important;',
        'background-position:center !important}}',
        '.icon-nav-tix{',
        'background-image:url("https://images.rbxcdn.com/53374db5b6c1b349a20d0471ea032868-navigation_dark.svg") !important;',
        'background-position:0 -56px !important}',
        '#nav-tix-icon .icon-nav-tix:hover{background-position:-28px -56px !important}',
        '#notifications-bell-badge.bell-red-badge{background-color:#fff;border-color:#fff}',
        '.dark-theme #notifications-bell-badge.bell-red-badge{color:#141313}',
        '#nav-robux-icon .notification-red.robux-badge{background-color:#fff;border-color:#fff}',
        '.rbx-header .rbx-navbar-icon-group .buy-robux-link-container .new-item-pill.small{background-color:#f90707;color:#fff}'
    ].join('');

    var originalFaviconHref = null;
    var originalFaviconType = null;
    var createdFaviconLink = false;

    var titleDesc = null;
    var titlePatched = false;
    try {
        titleDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'title')
            || Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'title');
    } catch (e) {}

    var titleObserver = null;
    var bodyObserver = null;
    var headObserver = null;
    var globalObserver = null;
    var historyWrapped = false;

    function injectCSS() {
        if (document.getElementById(CSS_ID)) return;
        var s = document.createElement('style');
        s.id = CSS_ID;
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }

    function removeCSS() {
        var s = document.getElementById(CSS_ID);
        if (s) s.remove();
    }

    function setFavicon() {
        var link = document.querySelector('link[rel="icon"]');
        if (link) {
            if (originalFaviconHref === null) {
                originalFaviconHref = link.getAttribute('href');
                originalFaviconType = link.getAttribute('type');
            }
            if (link.getAttribute('href') !== FAVICON) {
                link.setAttribute('href', FAVICON);
                link.setAttribute('type', 'image/png');
            }
            return;
        }
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.href = FAVICON;
        (document.head || document.documentElement).appendChild(link);
        createdFaviconLink = true;
    }

    function restoreFavicon() {
        var link = document.querySelector('link[rel="icon"]');
        if (!link) return;
        if (createdFaviconLink) {
            link.remove();
            return;
        }
        if (originalFaviconHref !== null) link.setAttribute('href', originalFaviconHref);
        if (originalFaviconType !== null) link.setAttribute('type', originalFaviconType);
        else link.removeAttribute('type');
    }

    function swapText(t) {
        return t ? t.replace(/Octane/g, 'ROBLOX') : t;
    }

    function unswapText(t) {
        return t ? t.replace(/ROBLOX/g, 'Octane') : t;
    }

    function patchTitle() {
        if (titlePatched || !titleDesc || !titleDesc.set) return;
        try {
            Object.defineProperty(document, 'title', {
                configurable: true,
                get: function () { return titleDesc.get.call(document); },
                set: function (v) { titleDesc.set.call(document, swapText(v)); }
            });
            titlePatched = true;
        } catch (e) {}
    }

    function unpatchTitle() {
        if (!titlePatched || !titleDesc) return;
        try { Object.defineProperty(document, 'title', titleDesc); } catch (e) {}
        titlePatched = false;
    }

    function fixTitleEl(el) {
        if (!el) return;
        var t = el.textContent;
        if (!t || t.indexOf('Octane') === -1) return;
        el.textContent = swapText(t);
    }

    function unfixTitleEl(el) {
        if (!el) return;
        var t = el.textContent;
        if (!t || t.indexOf('ROBLOX') === -1) return;
        el.textContent = unswapText(t);
    }

    function watchTitle() {
        var head = document.head;
        if (!head || titleObserver) return;
        titleObserver = new MutationObserver(function () {
            var titles = head.getElementsByTagName('title');
            for (var i = 0; i < titles.length; i++) fixTitleEl(titles[i]);
        });
        titleObserver.observe(head, { childList: true, subtree: true, characterData: true });
    }

    function unwatchTitle() {
        if (titleObserver) { titleObserver.disconnect(); titleObserver = null; }
    }

    function fixTextNode(node) {
        var v = node.nodeValue;
        if (!v || v.indexOf('Octane') === -1) return;
        node.nodeValue = v.replace(/Octane/g, 'ROBLOX');
    }

    function walk(node) {
        if (node.nodeType === 3) { fixTextNode(node); return; }
        if (node.nodeType !== 1) return;
        var tag = node.tagName;
        if (tag === 'IFRAME' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TITLE') return;
        var kids = node.childNodes;
        for (var i = 0, l = kids.length; i < l; i++) walk(kids[i]);
    }

    function unwalk(node) {
        if (node.nodeType === 3) {
            var v = node.nodeValue;
            if (v && v.indexOf('ROBLOX') !== -1) node.nodeValue = unswapText(v);
            return;
        }
        if (node.nodeType !== 1) return;
        var tag = node.tagName;
        if (tag === 'IFRAME' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TITLE') return;
        var kids = node.childNodes;
        for (var i = 0, l = kids.length; i < l; i++) unwalk(kids[i]);
    }

    function startBodyObserver() {
        if (!document.body || bodyObserver) return;
        bodyObserver = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'characterData') {
                    fixTextNode(m.target);
                    continue;
                }
                var added = m.addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (n.nodeType === 3) fixTextNode(n);
                    else if (n.nodeType === 1) walk(n);
                }
            }
        });
        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        walk(document.body);
    }

    function stopBodyObserver() {
        if (bodyObserver) { bodyObserver.disconnect(); bodyObserver = null; }
    }

    function watchHead() {
        var head = document.head;
        if (!head || headObserver) return;
        headObserver = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var removed = mutations[i].removedNodes;
                for (var j = 0; j < removed.length; j++) {
                    var n = removed[j];
                    if (n.nodeType === 1 && n.id === CSS_ID) {
                        injectCSS();
                        return;
                    }
                }
            }
        });
        headObserver.observe(head, { childList: true });
    }

    function watchGlobal() {
        if (globalObserver) return;
        globalObserver = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'characterData') {
                    fixTextNode(m.target);
                    continue;
                }
                var added = m.addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (n.nodeType === 3) fixTextNode(n);
                    else if (n.nodeType === 1 && n.tagName !== 'IFRAME' && n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE') walk(n);
                }
            }
            if (!document.getElementById(CSS_ID)) injectCSS();
        });
        globalObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    function navPatch() {
        injectCSS();
        setFavicon();
        watchTitle();
        watchHead();
        var titles = document.getElementsByTagName('title');
        for (var i = 0; i < titles.length; i++) fixTitleEl(titles[i]);
        if (document.body) walk(document.body);
    }

    function wrapHistory() {
        if (historyWrapped) return;
        historyWrapped = true;
        ['pushState', 'replaceState'].forEach(function (name) {
            var orig = history[name];
            history[name] = function () {
                navPatch();
                var r = orig.apply(this, arguments);
                navPatch();
                setTimeout(navPatch, 0);
                return r;
            };
        });
        window.addEventListener('popstate', function () { navPatch(); });
    }

    var loadHooked = false;
    function hookLoad() {
        if (loadHooked) return;
        loadHooked = true;
        window.addEventListener('load', navPatch, { once: true });
    }

    function apply() {
        injectCSS();
        setFavicon();
        patchTitle();
        watchTitle();
        watchHead();
        watchGlobal();
        wrapHistory();
        hookLoad();
        var titles = document.getElementsByTagName('title');
        for (var i = 0; i < titles.length; i++) fixTitleEl(titles[i]);
        if (document.body) startBodyObserver();
        else document.addEventListener('DOMContentLoaded', startBodyObserver, { once: true });
    }

    function teardown() {
        removeCSS();
        restoreFavicon();
        unwatchTitle();
        stopBodyObserver();
        if (headObserver) { headObserver.disconnect(); headObserver = null; }
        if (globalObserver) { globalObserver.disconnect(); globalObserver = null; }
        unpatchTitle();
        var titles = document.getElementsByTagName('title');
        for (var i = 0; i < titles.length; i++) unfixTitleEl(titles[i]);
        if (document.body) unwalk(document.body);
    }

    window.NX.features.roblox2019 = {
        apply: apply,
        teardown: teardown
    };
})();

/* src/features/hide-chat.js */
(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-hide-chat';
    var CSS =
        '#chat-container,' +
        '.chat-container,' +
        '.chat,' +
        '.chat-main,' +
        '.chat-windows-header,' +
        '.chat-body,' +
        '#dialogs,' +
        '.dialogs,' +
        '#dialogs-minimize,' +
        '.chat-placeholder,' +
        'iframe[src*="/theme2020/chat"],' +
        'iframe[title="Chat"]{' +
        'display:none !important;' +
        'visibility:hidden !important;' +
        'pointer-events:none !important;' +
        'width:0 !important;' +
        'height:0 !important;' +
        '}';

    var observer = null;

    function inject() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }

    function removeCSS(doc) {
        if (!doc) return;
        var s = doc.getElementById(STYLE_ID);
        if (s) s.remove();
    }

    function sweepDoc(doc) {
        if (!doc) return;
        var chat = doc.querySelector('#chat-container, .chat-container');
        if (chat) {
            chat.style.setProperty('display', 'none', 'important');
            chat.style.setProperty('visibility', 'hidden', 'important');
            chat.style.setProperty('pointer-events', 'none', 'important');
        }
        var frames = doc.querySelectorAll('iframe[src*="/theme2020/chat"], iframe[title="Chat"]');
        for (var i = 0; i < frames.length; i++) {
            frames[i].style.setProperty('display', 'none', 'important');
            frames[i].style.setProperty('visibility', 'hidden', 'important');
            frames[i].style.setProperty('width', '0', 'important');
            frames[i].style.setProperty('height', '0', 'important');
            frames[i].style.setProperty('pointer-events', 'none', 'important');
        }
    }

    function injectInto(doc) {
        if (!doc || !doc.head) return;
        if (doc.getElementById(STYLE_ID)) return;
        var s = doc.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        doc.head.appendChild(s);
    }

    function sweepAll() {
        inject();
        sweepDoc(document);
        var frames = document.getElementsByTagName('iframe');
        for (var i = 0; i < frames.length; i++) {
            var d;
            try { d = frames[i].contentDocument; } catch (e) { continue; }
            if (d) {
                try { injectInto(d); } catch (e) {}
                try { sweepDoc(d); } catch (e) {}
            }
        }
    }

    function startObserver() {
        if (observer || !document.body) return;
        observer = new MutationObserver(sweepAll);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function stopObserver() {
        if (observer) { observer.disconnect(); observer = null; }
    }

    function apply() {
        inject();
        sweepAll();
        if (document.body) startObserver();
        else document.addEventListener('DOMContentLoaded', function () {
            sweepAll();
            startObserver();
        }, { once: true });
    }

    function teardown() {
        removeCSS(document);
        var frames = document.getElementsByTagName('iframe');
        for (var i = 0; i < frames.length; i++) {
            var d;
            try { d = frames[i].contentDocument; } catch (e) { continue; }
            if (d) removeCSS(d);
        }
        stopObserver();
    }

    window.NX.features.hideChat = {
        apply: apply,
        teardown: teardown
    };
})();

/* src/features/custom-font.js */
(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-custom-font';
    var STORAGE_KEY = 'nx_custom_font';

    var FONTS = [
        { id: 'default',    label: 'Default',          stack: '' },
        { id: 'roboto',     label: 'Roboto',           stack: '"Roboto", sans-serif' },
        { id: 'opensans',   label: 'Open Sans',        stack: '"Open Sans", sans-serif' },
        { id: 'lato',       label: 'Lato',             stack: '"Lato", sans-serif' },
        { id: 'montserrat', label: 'Montserrat',       stack: '"Montserrat", sans-serif' },
        { id: 'inter',      label: 'Inter',            stack: '"Inter", sans-serif' },
        { id: 'poppins',    label: 'Poppins',          stack: '"Poppins", sans-serif' },
        { id: 'nunito',     label: 'Nunito',           stack: '"Nunito", sans-serif' },
        { id: 'jetbrains',  label: 'JetBrains Mono',   stack: '"JetBrains Mono", monospace' },
        { id: 'comic',      label: 'Comic Sans',       stack: '"Comic Sans MS", cursive' }
    ];

    var GOOGLE_FONTS = [
        'Roboto', 'Open Sans', 'Lato', 'Montserrat',
        'Inter', 'Poppins', 'Nunito', 'JetBrains Mono'
    ];

    function getFontId() {
        try { return localStorage.getItem(STORAGE_KEY) || 'default'; }
        catch (e) { return 'default'; }
    }

    function setFontId(id) {
        try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}
        inject();
    }

    function fontById(id) {
        for (var i = 0; i < FONTS.length; i++) {
            if (FONTS[i].id === id) return FONTS[i];
        }
        return FONTS[0];
    }

    var linksInjected = false;
    function injectGoogleFonts() {
        if (linksInjected) return;
        linksInjected = true;
        var families = GOOGLE_FONTS.map(function (f) {
            return 'family=' + f.replace(/ /g, '+') + ':wght@400;500;600;700';
        }).join('&');
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?' + families + '&display=swap';
        (document.head || document.documentElement).appendChild(l);
    }

    function inject() {
        var old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        var cfg = fontById(getFontId());
        if (!cfg.stack) return;

        injectGoogleFonts();

        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent =
            'html, body, #__next, .gotham-font, .gotham-font * {' +
            'font-family: ' + cfg.stack + ' !important;' +
            '}';
        (document.head || document.documentElement).appendChild(s);
    }

    function apply() {
        inject();
        new MutationObserver(function () {
            if (!document.getElementById(STYLE_ID) && getFontId() !== 'default') inject();
        }).observe(document.head || document.documentElement, { childList: true });
    }

    function teardown() {
        var s = document.getElementById(STYLE_ID);
        if (s) s.remove();
    }

    window.NX.features.customFont = {
        apply: apply,
        teardown: teardown,
        FONTS: FONTS,
        getFontId: getFontId,
        setFontId: function (id) { setFontId(id); },
        fontById: fontById
    };
})();

/* src/features/background.js */
(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STORE_KEY = 'nx_bg_v1';
    var STYLE_ID = 'nx-bg-style';
    var ROW_ID = 'nx-bg-row';

    var PRESETS = {
        void:     'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        ember:    'radial-gradient(circle at 30% 30%, #e94560, #1a1a2e 70%)',
        aurora:   'linear-gradient(120deg, #00c9ff, #92fe9d)',
        cotton:   'linear-gradient(135deg, #ff9a9e, #fad0c4)',
        prism:    'conic-gradient(from 180deg, #ff6b6b, #feca57, #48dbfb, #ff6b6b)',
        liminal:  'linear-gradient(180deg, #2c3e50, #4ca1af)',
        stardust: 'radial-gradient(ellipse at top, #ffffff22 0%, transparent 60%), linear-gradient(180deg, #0b0b1a, #1a1a3e)',
        sunset:   'linear-gradient(180deg, #ff7e5f, #feb47b)'
    };

    var FOLDER_ICON =
        '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">' +
        '<path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/>' +
        '</svg>';

    var CSS = [
        '#nx-bg-row{display:block;width:100%;margin:8px 0 0;clear:both;position:relative;z-index:1}',
        '#nx-bg-row .nx-label{display:block}',
        '#nx-bg-row .nx-edit{display:block;text-align:right}',
        '#nx-bg-row .nx-edit a{cursor:pointer}',
        '#nx-bg-row .nx-panel{display:none;margin-top:8px}',
        '#nx-bg-row .nx-panel.open{display:block}',
        '#nx-bg-row .nx-chips{display:flex;flex-wrap:wrap;gap:4px;align-items:center}',
        '#nx-bg-row .nx-chip{width:20px;height:20px;border-radius:4px;cursor:pointer;border:1px solid rgba(255,255,255,.25);box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#ddd}',
        '#nx-bg-row .nx-chip:hover{border-color:#fff}',
        '#nx-bg-row .nx-chip.active{outline:1px solid #fff;outline-offset:1px}',
        '#nx-bg-row .nx-chip.none{background:#2a2a2a;color:#bbb;font-size:10px;line-height:20px;font-family:inherit}',
        '#nx-bg-row .nx-chip.picker{background:conic-gradient(from 90deg,#f66,#fc6,#6f6,#6ff,#66f,#f6f,#f66)}',
        '#nx-bg-row .nx-chip.custom{background:#222}',
        '#nx-bg-row .nx-subpanel{display:none;gap:6px;margin-top:8px;align-items:center;flex-wrap:wrap}',
        '#nx-bg-row .nx-subpanel.open{display:flex}',
        '#nx-bg-row .nx-subpanel input[type=text]{flex:1;min-width:0;background:#1a1a1a;border:1px solid #333;color:#eee;padding:4px 6px;border-radius:4px;font:inherit;font-size:12px}',
        '#nx-bg-row .nx-subpanel input[type=text]:focus{outline:none;border-color:#666}',
        '#nx-bg-row .nx-subpanel input[type=color]{width:36px;height:26px;padding:0;border:1px solid #333;background:#1a1a1a;border-radius:4px;cursor:pointer}',
        '#nx-bg-row .nx-subpanel .nx-btn{cursor:pointer;background:#222;border:1px solid #333;color:#eee;padding:4px 10px;border-radius:4px;font-size:12px;text-decoration:none;display:inline-flex;align-items:center;gap:4px}',
        '#nx-bg-row .nx-subpanel .nx-btn:hover{background:#2a2a2a}',
        '#nx-bg-row .nx-subpanel .nx-or{color:#888;font-size:11px;padding:0 4px}',
        '#nx-bg-row .nx-subpanel input[type=file]{display:none}'
    ].join('');

    var bootTimer = null;
    var watchTimer = null;
    var observer = null;
    var applied = null;
    var built = false;
    var uid = 0;

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function store() {
        try {
            var raw = GM_getValue(STORE_KEY, '{}');
            return typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
        } catch (e) { return {}; }
    }

    function save(s) {
        GM_setValue(STORE_KEY, JSON.stringify(s));
    }

    function get(userId) {
        var s = store();
        return (s.byUser && s.byUser[String(userId)]) || null;
    }

    function set(userId, bg) {
        var s = store();
        if (!s.byUser) s.byUser = {};
        if (bg) s.byUser[String(userId)] = bg;
        else delete s.byUser[String(userId)];
        save(s);
    }

    function isCustom(bg) { return !!bg && bg.indexOf('url(') === 0; }

    function isSolid(bg) {
        if (!bg || bg.indexOf('url(') === 0 || bg.indexOf('gradient(') !== -1) return false;
        return bg.charAt(0) === '#' || bg.indexOf('rgb') === 0 || bg.indexOf('hsl') === 0;
    }

    function readUid() {
        var p = new URLSearchParams(location.search);
        return parseInt(p.get('userId'), 10) || 0;
    }

    function apply(bg) {
        if (applied === bg) return;
        var t = document.querySelector('.avatar-back');
        if (!t) return;

        var clear = ['background', 'background-image', 'background-color',
                     'background-size', 'background-position', 'background-repeat'];
        for (var i = 0; i < clear.length; i++) {
            t.style.removeProperty(clear[i]);
        }

        if (bg) {
            if (isSolid(bg)) {
                t.style.setProperty('background-color', bg, 'important');
                t.style.setProperty('background-image', 'none', 'important');
            } else {
                t.style.setProperty('background-image', bg, 'important');
                t.style.setProperty('background-color', 'transparent', 'important');
                t.style.setProperty('background-size', 'cover', 'important');
                t.style.setProperty('background-position', 'center', 'important');
                t.style.setProperty('background-repeat', 'no-repeat', 'important');
            }
        }
        applied = bg;
    }

    function paint(state) {
        var cur = get(uid);
        var chips = state.chips;
        for (var i = 0; i < chips.length; i++) {
            var k = chips[i].dataset.key;
            var on = false;
            if (k === '__none__') on = !cur;
            else if (PRESETS[k]) on = cur && PRESETS[k] === cur;
            chips[i].classList.toggle('active', !!on);
        }
        state.pickerChip.classList.toggle('active', isSolid(cur));
        state.customChip.classList.toggle('active', isCustom(cur));
    }

    function build() {
        if (built) return;
        var redraw = document.querySelector('.redraw-avatar');
        if (!redraw) return;
        if (!uid) uid = readUid();
        if (!uid) return;

        var cs = getComputedStyle(redraw);

        var row = document.createElement('div');
        row.id = ROW_ID;
        row.style.color      = cs.color;
        row.style.fontSize   = cs.fontSize;
        row.style.fontWeight = cs.fontWeight;
        row.style.fontFamily = cs.fontFamily;
        row.style.lineHeight = cs.lineHeight;

        var label = document.createElement('div');
        label.className = 'nx-label';
        label.textContent = 'Want a custom background?';
        row.appendChild(label);

        var edit = document.createElement('div');
        edit.className = 'nx-edit';
        edit.innerHTML = '<a class="text-link">Edit</a>';
        row.appendChild(edit);

        var editLink = edit.querySelector('a');

        var panel = document.createElement('div');
        panel.className = 'nx-panel';

        var chipRow = document.createElement('div');
        chipRow.className = 'nx-chips';
        var chips = [];

        var pickerChip = document.createElement('div');
        pickerChip.className = 'nx-chip picker';
        pickerChip.title = 'Solid color';
        chipRow.appendChild(pickerChip);

        Object.keys(PRESETS).forEach(function (k) {
            var c = document.createElement('div');
            c.className = 'nx-chip';
            c.dataset.key = k;
            c.title = k;
            c.style.background = PRESETS[k];
            c.addEventListener('click', function () {
                set(uid, PRESETS[k]);
                applied = null;
                apply(PRESETS[k]);
                paint(state);
                closeSubpanels();
            });
            chipRow.appendChild(c);
            chips.push(c);
        });

        var customChip = document.createElement('div');
        customChip.className = 'nx-chip custom';
        customChip.title = 'Custom image';
        customChip.innerHTML = FOLDER_ICON;
        chipRow.appendChild(customChip);

        var none = document.createElement('div');
        none.className = 'nx-chip none';
        none.dataset.key = '__none__';
        none.title = 'None';
        none.textContent = '✕';
        none.addEventListener('click', function () {
            set(uid, null);
            applied = null;
            apply(null);
            paint(state);
            closeSubpanels();
        });
        chipRow.appendChild(none);
        chips.push(none);

        panel.appendChild(chipRow);

        var colorBox = document.createElement('div');
        colorBox.className = 'nx-subpanel';

        var colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = '#1a1a2e';

        var colorSet = document.createElement('button');
        colorSet.type = 'button';
        colorSet.className = 'nx-btn';
        colorSet.textContent = 'Set';

        colorBox.appendChild(colorInput);
        colorBox.appendChild(colorSet);
        panel.appendChild(colorBox);

        colorSet.addEventListener('click', function (e) {
            e.preventDefault();
            var v = colorInput.value;
            set(uid, v);
            applied = null;
            apply(v);
            paint(state);
            colorBox.classList.remove('open');
        });

        var imgBox = document.createElement('div');
        imgBox.className = 'nx-subpanel';

        var uploadBtn = document.createElement('label');
        uploadBtn.className = 'nx-btn';
        uploadBtn.innerHTML = FOLDER_ICON + '<span>Upload</span>';
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        uploadBtn.appendChild(fileInput);

        var orSep = document.createElement('span');
        orSep.className = 'nx-or';
        orSep.textContent = 'OR';

        var urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.placeholder = 'Paste IMG URL';

        var urlSet = document.createElement('button');
        urlSet.type = 'button';
        urlSet.className = 'nx-btn';
        urlSet.textContent = 'Set';

        imgBox.appendChild(uploadBtn);
        imgBox.appendChild(orSep);
        imgBox.appendChild(urlInput);
        imgBox.appendChild(urlSet);
        panel.appendChild(imgBox);

        function commitUrl() {
            var v = urlInput.value.trim();
            if (!v) return;
            var bg = 'url("' + v + '")';
            set(uid, bg);
            applied = null;
            apply(bg);
            paint(state);
            urlInput.value = '';
            imgBox.classList.remove('open');
        }

        fileInput.addEventListener('change', function () {
            var f = fileInput.files && fileInput.files[0];
            if (!f) return;
            var r = new FileReader();
            r.onload = function () {
                var bg = 'url("' + r.result + '")';
                set(uid, bg);
                applied = null;
                apply(bg);
                paint(state);
                imgBox.classList.remove('open');
                fileInput.value = '';
            };
            r.readAsDataURL(f);
        });

        urlSet.addEventListener('click', function (e) {
            e.preventDefault();
            commitUrl();
        });

        urlInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                commitUrl();
            }
        });

        function closeSubpanels() {
            colorBox.classList.remove('open');
            imgBox.classList.remove('open');
        }

        pickerChip.addEventListener('click', function () {
            var open = colorBox.classList.toggle('open');
            if (open) { imgBox.classList.remove('open'); colorInput.focus(); }
        });

        customChip.addEventListener('click', function () {
            var open = imgBox.classList.toggle('open');
            if (open) { colorBox.classList.remove('open'); urlInput.focus(); }
        });

        row.appendChild(panel);

        editLink.addEventListener('click', function (e) {
            e.preventDefault();
            var open = panel.classList.toggle('open');
            editLink.textContent = open ? 'Close' : 'Edit';
            if (!open) closeSubpanels();
        });

        redraw.parentNode.insertBefore(row, redraw.nextSibling);
        built = true;

        var state = { chips: chips, pickerChip: pickerChip, customChip: customChip };
        paint(state);
    }

    function tick() {
        if (!uid) uid = readUid();
        if (!uid) return;
        apply(get(uid));
        build();
    }

    window.NX.features.background = {
        apply: function () {
            style();
            tick();

            var n = 0;
            bootTimer = setInterval(function () {
                tick();
                if (built || ++n > 30) {
                    clearInterval(bootTimer);
                    bootTimer = null;
                }
            }, 100);

            observer = new MutationObserver(function () {
                if (!built) tick();
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });

            watchTimer = setInterval(tick, 1500);
        },
        teardown: function () {
            if (bootTimer) { clearInterval(bootTimer); bootTimer = null; }
            if (watchTimer) { clearInterval(watchTimer); watchTimer = null; }
            if (observer) { observer.disconnect(); observer = null; }

            var row = document.getElementById(ROW_ID);
            if (row) row.remove();

            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();

            applied = null;
            built = false;
        }
    };
})();

/* src/features/UserBadge.js */
// src/features/UserBadge.js

(function () {
    'use strict';

    var STYLE_ID = 'nx-ub-style';

    var BADGES = {
        '1043': {
            label: 'Nexus Contributor',
            icon: 'https://github.com/zykieboi/nexus/blob/main/img/opsec.png?raw=true'
        }
    };

    var CSS =
        '.nx-ub{flex:0 0 auto;float:none;display:inline-block;' +
        'background-repeat:no-repeat;background-size:contain;' +
        'background-position:center center;vertical-align:middle;' +
        'margin-left:-4px;margin-right:0}';

    function addStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function profileId() {
        var q = new URLSearchParams(location.search).get('userId');
        if (q) return q;
        var m = location.pathname.match(/\/theme2020\/users\/(\d+)/);
        return m ? m[1] : null;
    }

    function makeBadge(info, size) {
        var el = document.createElement('span');
        el.className = 'nx-ub';
        el.title = info.label;
        el.style.backgroundImage = 'url("' + info.icon + '")';
        el.style.width = size;
        el.style.height = size;
        return el;
    }

    function place(header) {
        var id = profileId();
        var info = BADGES[id];
        var existing = header.querySelector('.nx-ub');

        if (!info) {
            if (existing) existing.remove();
            return;
        }

        var h2 = header.querySelector('h2.profile-name');
        if (!h2) return;

        var size = Math.round(parseFloat(getComputedStyle(h2).fontSize) || 26) + 'px';

        if (existing) {
            existing.style.width = size;
            existing.style.height = size;
            return;
        }

        var badge = makeBadge(info, size);
        var h3 = header.querySelector('h3.profile-name');

        if (h3) h3.parentNode.insertBefore(badge, h3);
        else h2.parentNode.insertBefore(badge, h2.nextSibling);
    }

    function scan() {
        var headers = document.querySelectorAll('.header-title');
        for (var i = 0; i < headers.length; i++) place(headers[i]);
    }

    function apply() {
        addStyle();
        scan();

        if (!window.__nxUbObs) {
            window.__nxUbObs = new MutationObserver(scan);
            window.__nxUbObs.observe(document.documentElement, { childList: true, subtree: true });
        }
        if (!window.__nxUbInt) {
            window.__nxUbInt = setInterval(scan, 1500);
        }
    }

    apply();
})();

/* src/features/tradeValues.js */
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

/* src/features/itemOwners.js */
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

/* src/features/quickSearch.js */
(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-quick-search-style';
    var MARKER = 'nx-qs-item';
    var DEBOUNCE_MS = 200;
    var WAIT_TIMEOUT = 2000;
    var REINJECT_MS = 300;
    var THUMB_SIZE = 30;
    var GAME_ICON = '/img/placeholder/icon_one.png';
    var MAX_GAMES = 1;

    var currentRequest = 0;
    var debounceTimer = null;
    var interval = null;
    var avatarCache = {};
    var gameIconCache = {};
    var gameDetailCache = {};
    var lastQuery = '';
    var lastInjected = [];
    var lastPath = location.pathname;

    var PLAY_SVG = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path fill="#fff" d="M8 5v14l11-7z"/></svg>';

    function isOn() {
        return window.NX.settings && window.NX.settings.get('quickSearch');
    }

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + '{',
            '  width:100%;padding:0 6px;margin:0;white-space:normal;list-style:none;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' > a.new-navbar-search-anchor{',
            '  display:flex !important;align-items:center !important;',
            '  height:56px;padding:12px;box-sizing:border-box;text-decoration:none !important;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .navbar-list-option-icon.nx-qs-thumb{',
            '  flex:0 0 ' + THUMB_SIZE + 'px !important;',
            '  width:' + THUMB_SIZE + 'px !important;height:' + THUMB_SIZE + 'px !important;',
            '  min-width:' + THUMB_SIZE + 'px !important;max-width:' + THUMB_SIZE + 'px !important;',
            '  min-height:' + THUMB_SIZE + 'px !important;max-height:' + THUMB_SIZE + 'px !important;',
            '  border-radius:0 !important;background-color:#2c2e30 !important;',
            '  background-size:cover !important;background-position:center !important;',
            '  background-repeat:no-repeat !important;display:inline-block !important;',
            '  box-sizing:border-box !important;margin:0 12px 0 0 !important;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .navbar-list-option-text{',
            '  display:flex;flex-direction:column;justify-content:center;',
            '  flex:1 1 auto;min-width:0;overflow:hidden;line-height:1.2;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-name{',
            '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-username{',
            '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
            '  font-size:.8em;color:#8a8d90 !important;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-play{',
            '  flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;',
            '  width:48px;height:36px;margin-left:auto !important;margin-right:0;',
            '  border-radius:8px;background-color:#00b06f;border:1px solid #00b06f;',
            '  color:#fff;cursor:pointer;user-select:none;padding:0;',
            '  text-decoration:none !important;box-sizing:border-box;',
            '  transition:background-color .15s ease,border-color .15s ease;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-play:hover{',
            '  background-color:#00c47d;border-color:#00c47d;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-play:active{',
            '  background-color:#00a066;border-color:#00a066;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-play svg{',
            '  display:block;pointer-events:none;',
            '}'
        ].join('');
        document.head.appendChild(s);
    }

    function findSearchInput() {
        return document.getElementById('navbar-search-input');
    }

    function findNativeDropdown() {
        var lists = document.querySelectorAll('ul.dropdown-menu.new-dropdown-menu');
        for (var i = 0; i < lists.length; i++) {
            if (lists[i].querySelector('a.new-navbar-search-anchor')) return lists[i];
        }
        return null;
    }

    function waitForNativeDropdown() {
        return new Promise(function (resolve) {
            var start = Date.now();
            var check = function () {
                var d = findNativeDropdown();
                if (d) return resolve(d);
                if (Date.now() - start > WAIT_TIMEOUT) return resolve(null);
                setTimeout(check, 50);
            };
            check();
        });
    }

    function clearInjected() {
        document.querySelectorAll('li.' + MARKER).forEach(function (el) { el.remove(); });
    }

    function fetchJson(url) {
        return fetch(url, {
            credentials: 'include',
            headers: { accept: 'application/json' }
        }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    function fetchUserAvatar(userId) {
        var key = 'u' + userId;
        if (avatarCache[key]) return Promise.resolve(avatarCache[key]);
        return fetchJson('/apisite/thumbnails/v1/users/avatar-headshot?userIds=' + userId + '&size=150x150&format=png')
            .then(function (d) {
                var url = d && d.data && d.data[0] && d.data[0].imageUrl;
                if (url) avatarCache[key] = url;
                return url || null;
            })
            .catch(function () { return null; });
    }

    function fetchGameIcon(universeId) {
        var key = 'g' + universeId;
        if (gameIconCache[key]) return Promise.resolve(gameIconCache[key]);
        return fetchJson('/apisite/thumbnails/v1/games/icons?universeIds=' + universeId + '&size=150x150&format=Png')
            .then(function (d) {
                var url = d && d.data && d.data[0] && d.data[0].imageUrl;
                if (url) gameIconCache[key] = url;
                return url || null;
            })
            .catch(function () { return null; });
    }

    function fetchGameDetails(universeIds) {
        if (!universeIds.length) return Promise.resolve({});
        var key = universeIds.slice().sort().join(',');
        if (gameDetailCache[key]) return Promise.resolve(gameDetailCache[key]);

        return fetchJson('/apisite/games/v1/games?universeIds=' + universeIds.join(','))
            .then(function (d) {
                var arr = (d && d.data) || [];
                var map = {};
                arr.forEach(function (g) {
                    if (g && g.id != null) map[g.id] = g;
                });
                gameDetailCache[key] = map;
                return map;
            })
            .catch(function () { return {}; });
    }

    function exactMatch(name, query) {
        if (!name) return false;
        return name.toLowerCase().trim() === query.toLowerCase().trim();
    }

    function gamePopularity(game) {
        return (game.playing || 0) * 1000000 + (game.favoritedCount || 0) * 1000 + (game.visits || 0);
    }

    function prefixKey(name) {
        var n = (name || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '');
        return n.slice(0, 12);
    }

    function compareGames(a, b) {
        var pa = gamePopularity(a);
        var pb = gamePopularity(b);
        if (pa !== pb) return pb - pa;
        if (a.exactHit !== b.exactHit) return a.exactHit ? -1 : 1;
        var la = (a.name || '').length;
        var lb = (b.name || '').length;
        if (la !== lb) return la - lb;
        return (a.universeId || 0) - (b.universeId || 0);
    }

    function dedupeGames(games) {
        var best = {};
        games.forEach(function (g) {
            var key = prefixKey(g.name);
            if (!key) return;
            var existing = best[key];
            if (!existing || compareGames(g, existing) < 0) {
                best[key] = g;
            }
        });
        return Object.keys(best).map(function (k) { return best[k]; });
    }

    function launchGame(placeId) {
        var headers = { accept: 'application/json' };
        if (window.NX_CSRF) headers['x-csrf-token'] = window.NX_CSRF;

        return fetch('/game/get-join-script?placeId=' + placeId, {
            credentials: 'include',
            headers: headers
        }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function (data) {
            if (data && data.joinScriptUrl) {
                var a = document.createElement('a');
                a.href = 'octane-player' + data.joinScriptUrl;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(function () { a.remove(); }, 100);
            }
        }).catch(function () {});
    }

    function buildItem(entry) {
        var nativeLi = document.querySelector('ul.dropdown-menu.new-dropdown-menu li.navbar-search-option:not(.' + MARKER + ')');
        var nativeA = nativeLi ? nativeLi.querySelector('a.new-navbar-search-anchor') : null;

        var li = document.createElement('li');
        li.className = 'navbar-search-option rbx-clickable-li ' + MARKER;
        if (nativeLi) {
            nativeLi.classList.forEach(function (c) {
                if (c === 'new-selected' || c === MARKER) return;
                if (li.classList.contains(c)) return;
                li.classList.add(c);
            });
        }

        var a = document.createElement('a');
        a.className = nativeA ? nativeA.className : 'new-navbar-search-anchor';
        a.href = entry.href;

        var icon = document.createElement('span');
        icon.className = 'navbar-list-option-icon nx-qs-thumb';
        if (entry.iconUrl) icon.style.backgroundImage = 'url("' + entry.iconUrl + '")';
        a.appendChild(icon);

        var text = document.createElement('span');
        text.className = 'navbar-list-option-text';

        if (entry.secondary) {
            var name = document.createElement('span');
            name.className = 'nx-qs-name';
            name.textContent = entry.text;
            text.appendChild(name);

            var user = document.createElement('span');
            user.className = 'nx-qs-username';
            user.textContent = entry.secondary;
            text.appendChild(user);
        } else {
            var single = document.createElement('span');
            single.className = 'nx-qs-name';
            single.textContent = entry.text;
            text.appendChild(single);
        }
        a.appendChild(text);

        if (entry.playPlaceId) {
            var playBtn = document.createElement('button');
            playBtn.type = 'button';
            playBtn.className = 'nx-qs-play';
            playBtn.title = 'Play';
            playBtn.innerHTML = PLAY_SVG;

            playBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                launchGame(entry.playPlaceId);
            });
            a.appendChild(playBtn);
        }

        li.appendChild(a);
        return li;
    }

    function paintInjected() {
        var dropdown = findNativeDropdown();
        if (!dropdown) return false;
        if (!lastInjected.length) return false;
        if (dropdown.querySelector('li.' + MARKER)) return true;

        for (var i = lastInjected.length - 1; i >= 0; i--) {
            dropdown.insertBefore(buildItem(lastInjected[i]), dropdown.firstChild);
        }
        return true;
    }

    function doSearch(query) {
        var reqId = ++currentRequest;
        var q = query.trim();

        lastQuery = q;
        clearInjected();
        lastInjected = [];

        if (!q) return;

        Promise.all([
            fetchJson('/search/users/results?keyword=' + encodeURIComponent(q) + '&maxRows=10&startIndex=0')
                .then(function (d) { return d.UserSearchResults || []; })
                .catch(function () { return []; }),
            fetchJson('/apisite/games/v1/games/list?keyword=' + encodeURIComponent(q) + '&maxRows=25')
                .then(function (d) { return d.games || d.data || []; })
                .catch(function () { return []; })
        ]).then(function (results) {
            if (reqId !== currentRequest) return;

            var users = results[0].filter(function (u) {
                return exactMatch(u.Name, q) || exactMatch(u.DisplayName, q);
            }).slice(0, 1);

            var rawGames = results[1] || [];

            var universeIds = [];
            rawGames.forEach(function (g) {
                var uid = g.universeId || g.UniverseId || g.universe_id;
                if (uid && universeIds.indexOf(uid) === -1) universeIds.push(uid);
            });

            var playabilityPromise = universeIds.length
                ? fetchJson('/apisite/games/v1/games/multiget-playability-status?universeIds=' + universeIds.join(','))
                    .then(function (d) {
                        var arr = Array.isArray(d) ? d : (d && d.data) || [];
                        var map = {};
                        arr.forEach(function (item) {
                            if (item && item.universeId != null) map[item.universeId] = !!item.isPlayable;
                        });
                        return map;
                    })
                    .catch(function () { return {}; })
                : Promise.resolve({});

            return Promise.all([users, rawGames, playabilityPromise, fetchGameDetails(universeIds), q]);
        }).then(function (parts) {
            if (!parts) return;
            if (reqId !== currentRequest) return;

            var users = parts[0];
            var rawGames = parts[1];
            var playability = parts[2] || {};
            var details = parts[3] || {};
            var q = parts[4];

            var merged = [];
            rawGames.forEach(function (g) {
                var uid = g.universeId || g.UniverseId || g.universe_id;
                if (!uid) return;
                if (playability[uid] !== true) return;

                var d = details[uid] || {};
                var name = d.name || g.name || g.Name || 'Untitled';
                merged.push({
                    universeId: uid,
                    rootPlaceId: d.rootPlaceId || g.rootPlaceId || g.placeId || g.id,
                    name: name,
                    playing: d.playing || 0,
                    visits: d.visits || 0,
                    favoritedCount: d.favoritedCount || 0,
                    exactHit: exactMatch(name, q)
                });
            });

            var games = dedupeGames(merged).sort(compareGames).slice(0, MAX_GAMES);

            if (!users.length && !games.length) return;

            var tasks = [];

            if (users.length) {
                var u = users[0];
                var display = u.DisplayName || u.Name;
                var username = u.Name && u.DisplayName && u.Name !== u.DisplayName ? '@' + u.Name : '';
                tasks.push(fetchUserAvatar(u.UserId).then(function (thumb) {
                    return {
                        href: '/search/users?keyword=' + encodeURIComponent(u.Name || u.DisplayName),
                        text: display,
                        secondary: username,
                        iconUrl: thumb
                    };
                }));
            }

            games.forEach(function (g) {
                tasks.push(fetchGameIcon(g.universeId).then(function (icon) {
                    return {
                        href: '/games/' + g.rootPlaceId + '/--',
                        text: g.name,
                        secondary: '',
                        iconUrl: icon || GAME_ICON,
                        playPlaceId: g.rootPlaceId
                    };
                }));
            });

            Promise.all(tasks).then(function (entries) {
                if (reqId !== currentRequest) return;
                lastInjected = entries.filter(Boolean);
                waitForNativeDropdown().then(paintInjected);
            });
        });
    }

    function attachToInput(input) {
        if (input.dataset.nxQsAttached) return;
        input.dataset.nxQsAttached = '1';

        input.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () { doSearch(input.value); }, DEBOUNCE_MS);
        });

        input.addEventListener('focus', function () {
            if (input.value.trim() && !lastInjected.length) doSearch(input.value);
            else paintInjected();
        });
    }

    function tick() {
        var input = findSearchInput();
        if (input) attachToInput(input);

        if (lastInjected.length && lastQuery) {
            var i2 = findSearchInput();
            if (i2 && i2.value.trim() === lastQuery) paintInjected();
        }
    }

    function purge() {
        clearInjected();
        var input = findSearchInput();
        if (input) delete input.dataset.nxQsAttached;
        lastInjected = [];
        lastQuery = '';
    }

    function start() {
        if (interval) return;
        tick();
        interval = setInterval(function () {
            if (location.pathname !== lastPath) {
                lastPath = location.pathname;
                purge();
            }
            tick();
        }, REINJECT_MS);
    }

    function stop() {
        if (interval) { clearInterval(interval); interval = null; }
        clearTimeout(debounceTimer);
        debounceTimer = null;
        purge();
    }

    window.NX.features.quickSearch = {
        apply: function () {
            style();
            start();
        },
        teardown: function () {
            stop();
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
        }
    };
})();

/* src/features/rbxlImport.js */
// src/features/rbxlImport.js

(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var BUTTON_CLASS = 'nx-rblx-btn';
    var PANEL_CLASS = 'nx-rblx-panel';
    var PANEL_ID = 'nx-rblx-panel';
    var STYLE_ID = 'nx-rblx-style';
    var TOAST_ID = 'nx-rblx-toast';
    var HASH = 'rblx';
    var RATE_KEY = 'nx_rblx_last_upload';
    var THEME_KEY = 'rbx_theme_v1';
    var RATE_LIMIT_MS = 15000;
    var MAX_NAME_LEN = 50;
    var LOG = '[RBLX Import]';

    var state = {
        blobUrl: null,
        open: false,
        rateTimer: null,
        busy: false,
        contentEl: null,
        observer: null,
        topListener: null,
        selfListener: null,
        groupId: null,
        initialized: false,
        lastPath: null
    };

    var CLASS_TO_TYPE_ID = {
        'Shirt': 11,
        'Pants': 12,
        'TShirt': 2,
        'ShirtGraphic': 2
    };

    var OK_CLASSES = {
        'Shirt': 1,
        'Pants': 1,
        'TShirt': 1,
        'ShirtGraphic': 1
    };

    function log() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(LOG);
        console.log.apply(console, args);
    }

    function isTopWindow() {
        try { return window.top === window.self; } catch (e) { return true; }
    }

    function isOn() {
        return !window.NX.settings || window.NX.settings.get('rbxlImport');
    }

    function isDark() {
        var theme = '';
        try { theme = localStorage.getItem(THEME_KEY) || ''; } catch (e) {}
        if (theme === 'dark') return true;
        if (theme === 'white' || theme === 'light') return false;
        return document.documentElement.classList.contains('octane-dark') ||
               document.documentElement.classList.contains('dark-theme');
    }

    function readCsrf() {
        if (window.NX_CSRF) return window.NX_CSRF;
        try {
            if (window.top && window.top.NX_CSRF) return window.top.NX_CSRF;
        } catch (e) {}
        var meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) {
            var token = meta.getAttribute('data-token');
            if (token) return token;
        }
        return '';
    }

    function waitForCsrf(timeout) {
        if (readCsrf()) return Promise.resolve(readCsrf());
        return new Promise(function (resolve) {
            var start = Date.now();
            var check = function () {
                var token = readCsrf();
                if (token) return resolve(token);
                if (Date.now() - start > (timeout || 3000)) return resolve('');
                setTimeout(check, 100);
            };
            check();
        });
    }

    function saveCsrf(token) {
        if (!token) return;
        window.NX_CSRF = token;
        try { GM_setValue('nx_csrf', token); } catch (e) {}
    }

    function getRateLimitRemaining() {
        try {
            var last = parseInt(localStorage.getItem(RATE_KEY) || '0', 10);
            if (!last) return 0;
            var elapsed = Date.now() - last;
            if (elapsed >= RATE_LIMIT_MS) return 0;
            return RATE_LIMIT_MS - elapsed;
        } catch (e) { return 0; }
    }

    function setRateLimitNow() {
        try { localStorage.setItem(RATE_KEY, String(Date.now())); } catch (e) {}
    }

    function formatSeconds(ms) {
        return Math.ceil(ms / 1000) + 's';
    }

    function showToast(message, kind) {
        var existing = document.getElementById(TOAST_ID);
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.id = TOAST_ID;
        toast.className = 'nx-rblx-toast ' + (kind || 'ok');
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(function () { toast.classList.add('show'); });
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 250);
        }, 4500);
    }

    function decodeHtml(text) {
        if (!text) return '';
        text = text.replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&#0*39;/g, "'")
                   .replace(/&apos;/g, "'")
                   .replace(/&nbsp;/g, ' ')
                   .replace(/&mdash;/g, '\u2014')
                   .replace(/&ndash;/g, '\u2013')
                   .replace(/&hellip;/g, '\u2026');
        text = text.replace(/&#x([0-9a-fA-F]+);/g, function (_, hex) {
            try { return String.fromCodePoint(parseInt(hex, 16)); }
            catch (e) { return ''; }
        });
        text = text.replace(/&#(\d+);/g, function (_, dec) {
            try { return String.fromCodePoint(parseInt(dec, 10)); }
            catch (e) { return ''; }
        });
        return text;
    }

    function cleanName(name) {
        if (!name) return '';
        var text = String(name);
        text = decodeHtml(text);
        text = text.replace(/<[^>]*>/g, ' ');
        text = text.replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');
        text = text.replace(/\s*[\-\u2013\u2014\|]\s*Roblox(\s+Corporation)?\s*$/i, '');
        text = text.replace(/\s*[\-\u2013\u2014\|]\s*Free\s+Roblox.*$/i, '');
        text = text.replace(/\s*[\-\u2013\u2014\|]\s*\d{6,}\s*$/, '');
        text = text.replace(/\s*[\-\u2013\u2014\|]\s*$/g, '');
        text = text.replace(/^[\-\u2013\u2014\|]\s*/, '');
        text = text.replace(/\s+/g, ' ').trim();
        var chars = Array.from(text);
        if (chars.length > MAX_NAME_LEN) text = chars.slice(0, MAX_NAME_LEN).join('').trim();
        return text;
    }

    function darkColors() {
        return [
            '#' + PANEL_ID + '{color:#bdbebe}',
            '#' + PANEL_ID + ' .nx-title{color:#fff}',
            '#' + PANEL_ID + ' .nx-hint{color:#8a8d90}',
            '#' + PANEL_ID + ' .nx-hint a{color:#00b06f}',
            '#' + PANEL_ID + ' .nx-hint a:hover{color:#00c47d}',
            '#' + PANEL_ID + ' .nx-line{color:#8a8d90}',
            '#' + PANEL_ID + ' .nx-row-desc{color:#8a8d90}',
            '#' + PANEL_ID + ' .nx-field input[type=text]{background:#16181a;border-color:#2b2d2f;color:#e8e8e8}',
            '#' + PANEL_ID + ' .nx-field input[type=text]:hover{border-color:#3d3f41}',
            '#' + PANEL_ID + ' .nx-field input[type=text]:focus{border-color:#00b06f;box-shadow:0 0 0 3px rgba(0,176,111,0.15)}',
            '#' + PANEL_ID + ' .nx-field input[type=text]::placeholder{color:#5c5f62}',
            '#' + PANEL_ID + ' .nx-types label{background:#16181a;border-color:#2b2d2f;color:#bdbebe}',
            '#' + PANEL_ID + ' .nx-types label:hover{border-color:#3d3f41;color:#fff}',
            '#' + PANEL_ID + ' .nx-progress .nx-bar{background:#16181a}',
            '#' + PANEL_ID + ' .nx-progress .nx-fill{background:#00b06f}',
            '#' + PANEL_ID + ' .nx-progress .nx-pct{color:#00b06f}',
            '#' + PANEL_ID + ' .nx-progress .nx-ptext{color:#8a8d90}',
            '#' + PANEL_ID + ' .nx-preview img{border-color:#2b2d2f;background:#16181a}',
            '#' + PANEL_ID + ' .nx-status.ok{background:#0d2e1d;color:#8fd9b3;border-left-color:#00b06f}',
            '#' + PANEL_ID + ' .nx-status.err{background:#2e1414;color:#e0a0a0;border-left-color:#c4494a}',
            '#' + PANEL_ID + ' .nx-status.info{background:#132a3d;color:#8fbce0;border-left-color:#4a90c4}',
            '#' + PANEL_ID + ' .nx-row-item{border-bottom-color:#2c2e30}',
            '#' + PANEL_ID + ' .nx-context{background:#16181a;border-color:#2b2d2f;color:#bdbebe}',
            '#' + PANEL_ID + ' .nx-context strong{color:#fff}'
        ].join('');
    }

    function lightColors() {
        return [
            '#' + PANEL_ID + '{color:#333}',
            '#' + PANEL_ID + ' .nx-title{color:#232527}',
            '#' + PANEL_ID + ' .nx-hint{color:#7a7d80}',
            '#' + PANEL_ID + ' .nx-hint a{color:#00a04e}',
            '#' + PANEL_ID + ' .nx-hint a:hover{color:#008a42}',
            '#' + PANEL_ID + ' .nx-line{color:#7a7d80}',
            '#' + PANEL_ID + ' .nx-row-desc{color:#7a7d80}',
            '#' + PANEL_ID + ' .nx-field input[type=text]{background:#fff;border-color:#c7cbce;color:#232527}',
            '#' + PANEL_ID + ' .nx-field input[type=text]:hover{border-color:#b0b4b8}',
            '#' + PANEL_ID + ' .nx-field input[type=text]:focus{border-color:#00a04e;box-shadow:0 0 0 3px rgba(0,160,78,0.15)}',
            '#' + PANEL_ID + ' .nx-field input[type=text]::placeholder{color:#9a9da0}',
            '#' + PANEL_ID + ' .nx-types label{background:#fff;border-color:#c7cbce;color:#333}',
            '#' + PANEL_ID + ' .nx-types label:hover{border-color:#b0b4b8;color:#232527}',
            '#' + PANEL_ID + ' .nx-progress .nx-bar{background:#e8eaec}',
            '#' + PANEL_ID + ' .nx-progress .nx-fill{background:#00a04e}',
            '#' + PANEL_ID + ' .nx-progress .nx-pct{color:#008a42}',
            '#' + PANEL_ID + ' .nx-progress .nx-ptext{color:#7a7d80}',
            '#' + PANEL_ID + ' .nx-preview img{border-color:#c7cbce;background:#fff}',
            '#' + PANEL_ID + ' .nx-status.ok{background:#e3f7eb;color:#0d7a3f;border-left-color:#00a04e}',
            '#' + PANEL_ID + ' .nx-status.err{background:#fbe8e8;color:#a13a3a;border-left-color:#d05656}',
            '#' + PANEL_ID + ' .nx-status.info{background:#e6f0f9;color:#2e5f8a;border-left-color:#4a90c4}',
            '#' + PANEL_ID + ' .nx-row-item{border-bottom-color:#eef0f2}',
            '#' + PANEL_ID + ' .nx-context{background:#f2f4f5;border-color:#c7cbce;color:#333}',
            '#' + PANEL_ID + ' .nx-context strong{color:#232527}'
        ].join('');
    }

    function style() {
        var existing = document.getElementById(STYLE_ID);
        if (existing) existing.remove();

        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            'a.' + BUTTON_CLASS + '{cursor:pointer}',

            '#' + TOAST_ID + '{',
            '  position:fixed;top:24px;right:24px;z-index:999999;',
            '  padding:14px 18px;border-radius:8px;',
            '  font:500 14px/1.4 "Source Sans Pro",Arial,Helvetica,sans-serif;',
            '  box-shadow:0 6px 20px rgba(0,0,0,0.35);',
            '  opacity:0;transform:translateX(24px);',
            '  transition:opacity .18s ease,transform .18s ease;',
            '  pointer-events:none;max-width:360px;word-break:break-word;',
            '  border-left:4px solid #888;',
            '}',
            '#' + TOAST_ID + '.show{opacity:1;transform:translateX(0)}',
            '#' + TOAST_ID + '.ok{background:#0d2e1d;color:#c8efd8;border-left-color:#00b06f}',
            '#' + TOAST_ID + '.err{background:#2e1414;color:#f0c8c8;border-left-color:#c4494a}',

            '#' + PANEL_ID + '{',
            '  display:block !important;',
            '  position:relative !important;',
            '  visibility:visible !important;',
            '  opacity:1 !important;',
            '  font-family:"Source Sans Pro",Arial,Helvetica,sans-serif;',
            '  font-size:14px;line-height:20px;',
            '  padding:0 0 24px;',
            '  max-width:640px;',
            '}',

            '#' + PANEL_ID + ' .nx-title{',
            '  display:inline-block;margin:0;',
            '  font-size:28px;font-weight:400;line-height:38px;vertical-align:middle;',
            '  letter-spacing:-0.01em;',
            '}',

            '#' + PANEL_ID + ' .nx-hint{',
            '  display:inline-block;margin:0 0 0 10px;font-size:14px;vertical-align:middle;',
            '}',
            '#' + PANEL_ID + ' .nx-hint a{text-decoration:none}',
            '#' + PANEL_ID + ' .nx-hint a:hover{text-decoration:underline}',

            '#' + PANEL_ID + ' .nx-line{margin:10px 0 22px;font-size:14px;line-height:20px}',

            '#' + PANEL_ID + ' .nx-context{',
            '  margin:0 0 18px;padding:10px 14px;border:1px solid;border-radius:6px;',
            '  font-size:13px;line-height:18px;',
            '}',
            '#' + PANEL_ID + ' .nx-context strong{font-weight:600}',

            '#' + PANEL_ID + ' .nx-row-item{',
            '  display:flex;align-items:flex-start;justify-content:space-between;',
            '  padding:16px 0;gap:24px;border-bottom:1px solid;',
            '}',
            '#' + PANEL_ID + ' .nx-row-item:last-child{border-bottom:none}',

            '#' + PANEL_ID + ' .nx-row-text{flex:1;min-width:0}',

            '#' + PANEL_ID + ' .nx-row-label{',
            '  display:block;font-size:15px;font-weight:500;margin-bottom:3px;',
            '}',
            '#' + PANEL_ID + ' .nx-row-desc{',
            '  display:block;font-size:13px;line-height:1.5;',
            '}',

            '#' + PANEL_ID + ' .nx-field{flex-shrink:0;width:280px}',

            '#' + PANEL_ID + ' .nx-field input[type=text]{',
            '  width:100%;box-sizing:border-box;',
            '  padding:8px 12px;height:36px;',
            '  border:1px solid;border-radius:6px;',
            '  font-family:"Source Sans Pro",Arial,Helvetica,sans-serif;',
            '  font-size:14px;line-height:20px;outline:none;',
            '  transition:border-color .15s ease,box-shadow .15s ease,background .15s ease;',
            '}',

            '#' + PANEL_ID + ' .nx-types{display:flex;gap:6px}',
            '#' + PANEL_ID + ' .nx-types label{',
            '  flex:1;display:inline-flex;align-items:center;justify-content:center;',
            '  padding:8px 10px;border:1px solid;border-radius:6px;cursor:pointer;',
            '  font-family:"Source Sans Pro",Arial,Helvetica,sans-serif;',
            '  font-size:13px;line-height:18px;font-weight:500;',
            '  transition:border-color .15s ease,background .15s ease,color .15s ease;',
            '  user-select:none;',
            '}',
            '#' + PANEL_ID + ' .nx-types input[type=radio]{display:none}',
            '#' + PANEL_ID + ' .nx-types label.sel{background:#00b06f;border-color:#00b06f;color:#fff}',
            '#' + PANEL_ID + ' .nx-types label.sel:hover{background:#00c47d;border-color:#00c47d}',

            '#' + PANEL_ID + ' .nx-go{',
            '  display:block;width:100%;margin-top:20px;padding:11px 24px;',
            '  background:#00b06f;color:#fff;',
            '  border:1px solid #00b06f;border-radius:6px;',
            '  font-family:"Source Sans Pro",Arial,Helvetica,sans-serif;',
            '  font-size:15px;font-weight:600;line-height:22px;',
            '  cursor:pointer;letter-spacing:0.01em;',
            '  transition:background .15s ease,border-color .15s ease,transform .08s ease;',
            '}',
            '#' + PANEL_ID + ' .nx-go:hover{background:#00c47d;border-color:#00c47d}',
            '#' + PANEL_ID + ' .nx-go:active{transform:translateY(1px)}',
            '#' + PANEL_ID + ' .nx-go:disabled{opacity:.45;cursor:not-allowed}',

            '#' + PANEL_ID + ' .nx-progress{margin-top:20px;display:none}',
            '#' + PANEL_ID + ' .nx-progress.on{display:block}',
            '#' + PANEL_ID + ' .nx-progress .nx-bar{',
            '  position:relative;height:6px;border-radius:3px;overflow:hidden;',
            '}',
            '#' + PANEL_ID + ' .nx-progress .nx-fill{',
            '  position:relative;height:100%;width:0%;border-radius:3px;',
            '  transition:width .3s ease;',
            '}',
            '#' + PANEL_ID + ' .nx-progress .nx-ptext{',
            '  margin-top:8px;font-size:12px;',
            '  display:flex;justify-content:space-between;align-items:center;',
            '  letter-spacing:0.02em;',
            '}',
            '#' + PANEL_ID + ' .nx-progress .nx-pct{',
            '  font-weight:700;font-variant-numeric:tabular-nums;',
            '}',

            '#' + PANEL_ID + ' .nx-status{',
            '  margin-top:18px;padding:12px 16px;border-radius:6px;',
            '  font-size:13px;line-height:19px;display:none;',
            '  white-space:pre-wrap;word-break:break-word;',
            '  border-left:4px solid transparent;',
            '}',
            '#' + PANEL_ID + ' .nx-status.on{display:block}',

            '#' + PANEL_ID + ' .nx-preview{margin-top:18px;display:none}',
            '#' + PANEL_ID + ' .nx-preview.on{display:block}',
            '#' + PANEL_ID + ' .nx-preview img{',
            '  max-width:240px;max-height:240px;',
            '  border:1px solid;border-radius:6px;',
            '  image-rendering:pixelated;display:block;',
            '}',
            '#' + PANEL_ID + ' .nx-preview .nx-cap{margin-top:6px;font-size:12px;color:#8a8d90}',

            darkColors()
        ].join('');
        document.head.appendChild(s);
        syncTheme();
    }

    function syncTheme() {
        var s = document.getElementById(STYLE_ID);
        if (!s) return;
        var rules = isDark() ? darkColors() : lightColors();
        var marker = '/* nx-theme */';
        var text = s.textContent;
        var idx = text.indexOf(marker);
        if (idx === -1) s.textContent = text + '\n' + marker + rules;
        else s.textContent = text.slice(0, idx) + marker + rules;
    }

    function httpGet(url, opts) {
        opts = opts || {};
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: opts.headers || {},
                responseType: opts.blob ? 'blob' : 'text',
                timeout: opts.timeout || 60000,
                onload: resolve,
                onerror: function () { reject(new Error('network error')); },
                ontimeout: function () { reject(new Error('timeout')); }
            });
        });
    }

    function fetchItemTitle(assetId) {
        var url = 'https://www.roblox.com/catalog/' + assetId + '/x';
        return httpGet(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; googlebot/2.1; +http://www.google.com/bot.html)' },
            timeout: 15000
        }).then(function (res) {
            if (res.status !== 200) return null;
            var html = res.responseText || '';
            var title = (html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i) || [])[1] || '';
            return { title: title ? cleanName(title) : '' };
        }).catch(function () { return null; });
    }

    function readItemXml(xml) {
        var doc = new DOMParser().parseFromString(xml, 'text/xml');
        var item = doc.querySelector('Item');
        if (!item) return null;
        var cls = item.getAttribute('class');
        var tpl = item.querySelector(
            'Content[name="ShirtTemplate"] url, ' +
            'Content[name="PantsTemplate"] url, ' +
            'Content[name="Graphic"] url'
        );
        var templateId = null;
        if (tpl) {
            var m = tpl.textContent.match(/id=(\d+)/);
            if (m) templateId = m[1];
        }
        return {
            class: cls,
            typeId: CLASS_TO_TYPE_ID[cls] || null,
            templateId: templateId
        };
    }

    function assetIdFromUrl(url) {
        var m = url.match(/assetdelivery\/(\d+)/) || url.match(/catalog\/(\d+)/) || url.match(/library\/(\d+)/);
        return m ? m[1] : null;
    }

    function nameFromUrl(url) {
        var m = url.match(/catalog\/\d+\/([^/?#]+)/);
        if (!m) return '';
        var raw;
        try { raw = decodeURIComponent(m[1]); } catch (e) { raw = m[1]; }
        var slug = raw.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
        return cleanName(slug);
    }

    function detectGroupContext() {
        var pathGroup = location.pathname.match(/\/develop\/groups\/(\d+)/);
        if (pathGroup) return pathGroup[1];

        var queryGroup = location.search.match(/[?&]groupId=(\d+)/);
        if (queryGroup) return queryGroup[1];

        var groupTab = document.getElementById('GroupCreationsTabLink');
        var isGroupActive = groupTab && groupTab.classList.contains('tab-active');
        if (!isGroupActive) {
            var groupContent = document.getElementById('GroupCreationsTab');
            if (!groupContent || !groupContent.classList.contains('tab-active')) return null;
        }

        var select = document.querySelector('#SelectedGroupId');
        if (select && select.value && /^\d+$/.test(select.value)) return select.value;

        var hidden = document.querySelector('#groupId');
        if (hidden && hidden.value && /^\d+$/.test(hidden.value)) return hidden.value;

        var content = document.querySelector('.BuildPageContent[data-groupid]');
        if (content) {
            var gid = content.getAttribute('data-groupid');
            if (gid && /^\d+$/.test(gid)) return gid;
        }

        return null;
    }

    function groupNameFor(groupId) {
        if (!groupId) return 'Personal';
        var select = document.querySelector('#SelectedGroupId');
        if (select && select.value === String(groupId)) {
            var opt = select.options[select.selectedIndex];
            if (opt && opt.textContent) return opt.textContent.trim();
        }
        return 'Group ' + groupId;
    }

    function sendUpload(file, filename, typeId, token, groupId, assetName) {
        var form = new FormData();
        form.append('name', String(assetName || 'clothing'));
        form.append('assetType', String(typeId));
        form.append('file', file, filename);
        if (groupId && /^\d+$/.test(groupId)) {
            form.append('groupId', String(groupId));
        }

        var headers = {};
        if (token) headers['x-csrf-token'] = token;

        return fetch('https://octane.wtf/develop/upload', {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: form
        }).then(function (r) {
            return r.text().then(function (text) {
                var fresh = r.headers.get('x-csrf-token') || '';
                var data;
                try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }
                return { status: r.status, data: data, raw: text, fresh: fresh, groupId: groupId };
            });
        });
    }

    function uploadAsset(file, typeId, name, groupId) {
        var safeName = (name || 'clothing').replace(/[\\/:*?"<>|]/g, '').trim() || 'clothing';
        var filename = safeName + '.png';

        return waitForCsrf(3000).then(function (token) {
            return sendUpload(file, filename, typeId, token, groupId, safeName);
        }).then(function (result) {
            if (result.status === 403 && result.fresh) {
                saveCsrf(result.fresh);
                return sendUpload(file, filename, typeId, result.fresh, groupId, safeName);
            }
            if (result.status === 403) {
                var cached = readCsrf();
                if (cached) return sendUpload(file, filename, typeId, cached, groupId, safeName);
            }
            return result;
        });
    }

    function renameAsset(assetId, name, typeId, groupId) {
        var url = 'https://octane.wtf/apisite/develop/v1/assets/' + assetId + (groupId ? '?groupId=' + encodeURIComponent(groupId) : '');
        var body = JSON.stringify({
            name: name,
            description: '',
            genres: ['All'],
            assetType: Number(typeId)
        });

        var headers = {
            'accept': 'application/json, text/plain, */*',
            'content-type': 'application/json'
        };
        var token = readCsrf();
        if (token) headers['x-csrf-token'] = token;

        return fetch(url, {
            method: 'PATCH',
            credentials: 'include',
            headers: headers,
            body: body
        }).then(function (r) {
            return r.text().then(function (text) {
                var fresh = r.headers.get('x-csrf-token') || '';
                if (r.status === 403 && fresh) {
                    saveCsrf(fresh);
                    return fetch(url, {
                        method: 'PATCH',
                        credentials: 'include',
                        headers: {
                            'accept': 'application/json, text/plain, */*',
                            'content-type': 'application/json',
                            'x-csrf-token': fresh
                        },
                        body: body
                    }).then(function (r2) {
                        return r2.text().then(function (text2) {
                            return { status: r2.status, text: text2 };
                        });
                    });
                }
                return { status: r.status, text: text };
            });
        });
    }

    function contextHtml(groupId) {
        var name = groupNameFor(groupId);
        if (groupId) {
            return '<div class="nx-context">Uploading as <strong>' + name + '</strong> (group ' + groupId + ')</div>';
        }
        return '<div class="nx-context">Uploading as <strong>Personal</strong></div>';
    }

    function panelHtml(groupId) {
        return [
            '<h2 class="nx-title">Import from RBLX</h2>',
            '<span class="nx-hint">Don\'t know how? <a href="https://developer.roblox.com/articles/How-to-Make-Shirts-and-Pants-for-Roblox-Characters" target="_blank">Click here</a></span>',
            '<p class="nx-line">Paste a Roblox clothing link and we\'ll import it.</p>',

            contextHtml(groupId),

            '<div class="nx-row-item">',
            '  <div class="nx-row-text">',
            '    <span class="nx-row-label">Roblox URL</span>',
            '    <span class="nx-row-desc">The link to the clothing item you want to import.</span>',
            '  </div>',
            '  <div class="nx-field">',
            '    <input type="text" id="nx-rblx-url" placeholder="https://www.roblox.com/catalog/{id}/--">',
            '  </div>',
            '</div>',

            '<div class="nx-row-item">',
            '  <div class="nx-row-text">',
            '    <span class="nx-row-label">Type</span>',
            '    <span class="nx-row-desc">Auto-detected from the URL, or pick manually.</span>',
            '  </div>',
            '  <div class="nx-field">',
            '    <div class="nx-types" id="nx-rblx-types">',
            '      <label data-val="11"><input type="radio" name="nx-rblx-type" value="11">Shirt</label>',
            '      <label data-val="12"><input type="radio" name="nx-rblx-type" value="12">Pants</label>',
            '      <label data-val="2"><input type="radio" name="nx-rblx-type" value="2">T-Shirt</label>',
            '    </div>',
            '  </div>',
            '</div>',

            '<div class="nx-row-item">',
            '  <div class="nx-row-text">',
            '    <span class="nx-row-label">Name</span>',
            '    <span class="nx-row-desc">Shown on the item page. Filled automatically if empty.</span>',
            '  </div>',
            '  <div class="nx-field">',
            '    <input type="text" id="nx-rblx-name" placeholder="My Shirt">',
            '  </div>',
            '</div>',

            '<button class="nx-go" id="nx-rblx-go" type="button">Upload</button>',

            '<div class="nx-progress" id="nx-rblx-progress">',
            '  <div class="nx-bar"><div class="nx-fill" id="nx-rblx-fill"></div></div>',
            '  <div class="nx-ptext"><span id="nx-rblx-ptext">Preparing…</span><span class="nx-pct" id="nx-rblx-pct">0%</span></div>',
            '</div>',

            '<div class="nx-status" id="nx-rblx-status"></div>',
            '<div class="nx-preview" id="nx-rblx-preview"><img alt="preview"><div class="nx-cap"></div></div>'
        ].join('');
    }

    function setProgress(panel, pct, stage) {
        var wrap = panel.querySelector('#nx-rblx-progress');
        var fill = panel.querySelector('#nx-rblx-fill');
        var ptext = panel.querySelector('#nx-rblx-ptext');
        var ppct = panel.querySelector('#nx-rblx-pct');
        wrap.classList.add('on');
        var clamped = Math.max(0, Math.min(100, pct));
        fill.style.width = clamped + '%';
        if (ppct) ppct.textContent = Math.round(clamped) + '%';
        if (stage) ptext.textContent = stage;
    }

    function hideProgress(panel) {
        panel.querySelector('#nx-rblx-progress').classList.remove('on');
        panel.querySelector('#nx-rblx-fill').style.width = '0%';
        panel.querySelector('#nx-rblx-ptext').textContent = 'Preparing…';
        panel.querySelector('#nx-rblx-pct').textContent = '0%';
    }

    function selectType(panel, typeId) {
        Array.prototype.forEach.call(panel.querySelectorAll('#nx-rblx-types label'), function (l) {
            var v = l.getAttribute('data-val');
            var match = v === String(typeId);
            l.classList.toggle('sel', match);
            var input = l.querySelector('input');
            if (input) input.checked = match;
        });
    }

    function getSelectedType(panel) {
        var input = panel.querySelector('#nx-rblx-types input:checked');
        return input ? input.value : '';
    }

    function setField(panel, selector, value, overwrite) {
        var node = panel.querySelector(selector);
        if (!node) return;
        var cur = (node.value || '').trim();
        if (cur && !overwrite) return;
        node.value = value || '';
    }

    function updateRateLimit(panel) {
        var goBtn = panel.querySelector('#nx-rblx-go');
        var status = panel.querySelector('#nx-rblx-status');
        var remaining = getRateLimitRemaining();

        if (state.rateTimer) { clearInterval(state.rateTimer); state.rateTimer = null; }

        if (remaining <= 0) {
            if (!state.busy) goBtn.disabled = false;
            return;
        }

        goBtn.disabled = true;
        var tick = function () {
            var rem = getRateLimitRemaining();
            if (rem <= 0) {
                clearInterval(state.rateTimer);
                state.rateTimer = null;
                if (!state.busy) goBtn.disabled = false;
                if (status.classList.contains('info') && /Rate limit/i.test(status.textContent || '')) {
                    status.className = 'nx-status';
                    status.textContent = '';
                }
                return;
            }
            setStatus(status, 'Rate limit — wait ' + formatSeconds(rem) + ' before uploading again.', 'info');
        };
        tick();
        state.rateTimer = setInterval(tick, 500);
    }

    function buildPanel(groupId) {
        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.className = PANEL_CLASS;
        panel.innerHTML = panelHtml(groupId);

        Array.prototype.forEach.call(panel.querySelectorAll('#nx-rblx-types label'), function (l) {
            l.addEventListener('click', function () {
                Array.prototype.forEach.call(panel.querySelectorAll('#nx-rblx-types label'), function (x) {
                    x.classList.remove('sel');
                });
                l.classList.add('sel');
                l.querySelector('input').checked = true;
            });
        });

        panel.querySelector('#nx-rblx-go').addEventListener('click', function () {
            startUpload(panel);
        });

        return panel;
    }

    function setStatus(node, text, kind) {
        node.className = 'nx-status on ' + (kind || 'info');
        node.textContent = text;
    }

    function startUpload(panel) {
        if (state.busy) return;

        var urlInput = panel.querySelector('#nx-rblx-url');
        var nameInput = panel.querySelector('#nx-rblx-name');
        var status = panel.querySelector('#nx-rblx-status');
        var preview = panel.querySelector('#nx-rblx-preview');
        var goBtn = panel.querySelector('#nx-rblx-go');

        var remaining = getRateLimitRemaining();
        if (remaining > 0) {
            setStatus(status, 'Rate limit — wait ' + formatSeconds(remaining) + '.', 'err');
            updateRateLimit(panel);
            return;
        }

        preview.classList.remove('on');
        hideProgress(panel);
        if (state.blobUrl) { URL.revokeObjectURL(state.blobUrl); state.blobUrl = null; }

        var url = urlInput.value.trim();
        if (!url) return setStatus(status, 'Paste a URL first.', 'err');

        var assetId = assetIdFromUrl(url);
        if (!assetId) return setStatus(status, 'Could not find an asset ID in that URL.', 'err');

        var groupId = detectGroupContext();

        state.busy = true;
        setRateLimitNow();
        goBtn.disabled = true;

        setStatus(status, 'Reading asset…', 'info');
        setProgress(panel, 5, 'Reading asset…');

        var typeId = getSelectedType(panel);

        httpGet('https://api.coolpixels.net/roblox/assetdelivery/' + assetId + '/info')
            .then(function (infoRes) {
                if (infoRes.status !== 200) throw new Error('info returned HTTP ' + infoRes.status);
                var info;
                try { info = JSON.parse(infoRes.responseText); }
                catch (e) { throw new Error('info response was not JSON'); }
                if (!info.success || !info.content) throw new Error('asset info did not include content');
                var parsed = readItemXml(info.content);
                if (!parsed) throw new Error('asset XML was not recognized');
                return parsed;
            })
            .then(function (parsed) {
                if (!OK_CLASSES[parsed.class]) {
                    throw new Error('This asset is a ' + (parsed.class || 'unknown') + '. Only Shirts, Pants and T-Shirts can be imported.');
                }
                if (!parsed.templateId) throw new Error('asset XML did not contain a template ID');

                if (!typeId) {
                    typeId = String(parsed.typeId);
                    selectType(panel, typeId);
                }

                setProgress(panel, 25, 'Loading details…');

                if (!(nameInput.value || '').trim()) {
                    var urlName = nameFromUrl(url);
                    if (urlName) setField(panel, '#nx-rblx-name', urlName, false);
                    return fetchItemTitle(assetId).then(function (meta) {
                        if (meta && meta.title) setField(panel, '#nx-rblx-name', meta.title, true);
                        return parsed;
                    });
                }
                return parsed;
            })
            .then(function (parsed) {
                setProgress(panel, 45, 'Downloading texture…');
                return httpGet('https://api.coolpixels.net/roblox/assetdelivery/' + parsed.templateId, { blob: true })
                    .then(function (imgRes) {
                        if (imgRes.status !== 200) throw new Error('image download returned HTTP ' + imgRes.status);
                        var blob = imgRes.response;
                        if (!blob || !blob.size) throw new Error('image download was empty');

                        state.blobUrl = URL.createObjectURL(blob);
                        preview.querySelector('img').src = state.blobUrl;
                        preview.querySelector('.nx-cap').textContent =
                            parsed.class + ' · template ' + parsed.templateId + ' · ' + Math.round(blob.size / 1024) + ' KB';
                        preview.classList.add('on');

                        return { blob: blob, parsed: parsed };
                    });
            })
            .then(function (ctx) {
                setProgress(panel, 65, 'Uploading to Octane…');

                var rawName = (nameInput.value || '').trim();
                var finalName = cleanName(rawName) || 'Clothing';
                if (finalName !== rawName) nameInput.value = finalName;

                var file = new File([ctx.blob], finalName + '.png', { type: ctx.blob.type || 'image/png' });
                return uploadAsset(file, typeId, finalName, groupId).then(function (upRes) {
                    return { up: upRes, parsed: ctx.parsed, finalName: finalName, groupId: groupId };
                });
            })
            .then(function (ctx) {
                if (ctx.up.status !== 200) {
                    throw new Error('upload returned HTTP ' + ctx.up.status + '\n' + (ctx.up.raw || ''));
                }

                var out = ctx.up.data || {};
                var newId = out.assetId || out.AssetId || out.id;
                var serverName = out.name || out.Name || '';

                if (newId && ctx.finalName && (!serverName || serverName !== ctx.finalName)) {
                    setProgress(panel, 88, 'Saving name…');
                    return renameAsset(newId, ctx.finalName, typeId, ctx.groupId).then(function () {
                        return { out: out, newId: newId, finalName: ctx.finalName, groupId: ctx.groupId };
                    });
                }
                return { out: out, newId: newId, finalName: ctx.finalName, groupId: ctx.groupId };
            })
            .then(function (done) {
                setProgress(panel, 100, 'Done');

                var lines = ['Imported successfully'];
                if (done.groupId) lines.push('Group: ' + groupNameFor(done.groupId) + ' (' + done.groupId + ')');
                else lines.push('Uploaded to: Personal');
                lines.push('Name: ' + done.finalName);
                lines.push('Asset ID: ' + (done.newId || '?'));
                if (done.out.moderationStatus) lines.push('Status: ' + done.out.moderationStatus);
                setStatus(status, lines.join('\n'), 'ok');

                showToast('Imported "' + done.finalName + '"', 'ok');
                updateRateLimit(panel);
            })
            .catch(function (e) {
                setStatus(status, 'Failed: ' + e.message, 'err');
                showToast('Import failed: ' + e.message.split('\n')[0], 'err');
                hideProgress(panel);
            })
            .then(function () {
                state.busy = false;
                updateRateLimit(panel);
                if (getRateLimitRemaining() <= 0) goBtn.disabled = false;
            });
    }

    function isVisible(el) {
        if (!el || !el.ownerDocument) return false;
        var node = el;
        while (node && node.nodeType === 1) {
            var cs = node.ownerDocument.defaultView.getComputedStyle(node);
            if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
            node = node.parentElement;
        }
        return true;
    }

    function findContentArea(menuEl) {
        var td = menuEl;
        while (td && td.tagName !== 'TD' && td.tagName !== 'BODY') {
            td = td.parentNode;
        }
        if (!td || td.tagName !== 'TD') return null;

        var row = td.parentNode;
        var cells = row ? row.children : [];
        for (var i = 0; i < cells.length; i++) {
            if (cells[i] !== td && cells[i].classList && cells[i].classList.contains('content-area')) {
                return cells[i];
            }
        }
        return null;
    }

    function pickVisibleMenu() {
        var anchors = document.querySelectorAll('a.tab-item');
        for (var i = 0; i < anchors.length; i++) {
            var a = anchors[i];
            var href = a.getAttribute('href') || '';
            if (!/View=11\b/.test(href)) continue;
            if (!isVisible(a)) continue;
            return a;
        }
        return null;
    }

    function removeAllPanels() {
        var panels = document.querySelectorAll('#' + PANEL_ID + ', .' + PANEL_CLASS);
        Array.prototype.forEach.call(panels, function (p) {
            var parent = p.parentNode;
            if (parent) {
                Array.prototype.forEach.call(parent.children, function (c) {
                    if (c.classList && c.classList.contains(PANEL_CLASS)) return;
                    var prev = c.getAttribute('data-nx-prev-display');
                    if (prev === null) return;
                    c.style.display = prev;
                    c.removeAttribute('data-nx-prev-display');
                });
            }
            p.remove();
        });
    }

    function removeAllButtons() {
        var buttons = document.querySelectorAll('a.' + BUTTON_CLASS);
        Array.prototype.forEach.call(buttons, function (b) { b.remove(); });
    }

    function showPanel(menuEl) {
        removeAllPanels();

        menuEl = menuEl || pickVisibleMenu();
        if (!menuEl) return false;

        var content = findContentArea(menuEl);
        if (!content) return false;

        state.open = true;
        state.contentEl = content;

        var groupId = detectGroupContext();
        state.groupId = groupId;

        Array.prototype.forEach.call(document.querySelectorAll('a.tab-item'), function (a) {
            a.classList.toggle('tab-item-selected', a === menuEl);
        });

        Array.prototype.forEach.call(content.children, function (c) {
            if (c.classList && c.classList.contains(PANEL_CLASS)) return;
            if (c.getAttribute('data-nx-prev-display') !== null) return;
            c.setAttribute('data-nx-prev-display', c.style.display || '');
            c.style.display = 'none';
        });

        var panel = buildPanel(groupId);
        content.appendChild(panel);
        updateRateLimit(panel);
        return true;
    }

    function hidePanel() {
        state.open = false;
        if (state.rateTimer) { clearInterval(state.rateTimer); state.rateTimer = null; }
        removeAllPanels();
        state.contentEl = null;
    }

    function currentHash() {
        try {
            if (window.top && window.top !== window && window.top.location) {
                return (window.top.location.hash || '').replace(/^#/, '');
            }
        } catch (e) {}
        return (location.hash || '').replace(/^#/, '');
    }

    function setHash(value) {
        try {
            if (window.top && window.top !== window && window.top.location) {
                if (value) window.top.location.hash = value;
                else if (window.top.location.hash) window.top.location.hash = '';
                return;
            }
        } catch (e) {}
        if (value) location.hash = value;
        else if (location.hash) location.hash = '';
    }

    function handleHash() {
        var hash = currentHash();
        if (hash !== HASH) {
            if (state.open) hidePanel();
            return;
        }
        if (state.open) return;

        var btn = document.querySelector('a.' + BUTTON_CLASS);
        if (!btn) return;
        if (showPanel(btn)) log('panel opened');
    }

    function addButton() {
        var anchors = document.querySelectorAll('a.tab-item');
        for (var i = 0; i < anchors.length; i++) {
            var a = anchors[i];
            var href = a.getAttribute('href') || '';
            if (!/View=11\b/.test(href)) continue;
            if (!isVisible(a)) continue;
            var menu = a.parentNode;
            if (!menu) continue;
            if (menu.querySelector('a.' + BUTTON_CLASS)) continue;

            var btn = document.createElement('a');
            btn.className = 'tab-item ' + BUTTON_CLASS;
            btn.href = '#' + HASH;
            btn.textContent = 'Import from RBLX';
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                setHash(HASH);
                handleHash();
            }, true);
            menu.insertBefore(btn, a);
        }
    }

    function syncForPath() {
        var path = location.pathname + location.search;
        if (state.lastPath === path) return;
        state.lastPath = path;

        removeAllPanels();
        removeAllButtons();
        state.open = false;
        state.contentEl = null;
        state.groupId = null;

        addButton();
    }

    function apply() {
        if (state.initialized) return;
        if (!isOn()) return;

        if (isTopWindow()) {
            log('top window — delegating to iframe');
            return;
        }

        var path = location.pathname;
        if (!/\/develop(\/|$)/.test(path) && !/\/develop\/groups(\/|$)/.test(path)) {
            log('not a develop iframe, skipping');
            return;
        }

        state.initialized = true;
        log('applying in iframe at', path);

        style();
        syncForPath();
        handleHash();

        state.topListener = function () { setTimeout(handleHash, 0); };
        try {
            window.top.addEventListener('hashchange', state.topListener);
        } catch (e) {
            state.selfListener = handleHash;
            window.addEventListener('hashchange', state.selfListener);
        }

        state.observer = new MutationObserver(function () {
            if (!state.initialized) return;
            syncForPath();
            addButton();
            if (currentHash() === HASH && !state.open) handleHash();
            else if (currentHash() !== HASH && state.open) hidePanel();
        });
        state.observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    function teardown() {
        if (state.rateTimer) { clearInterval(state.rateTimer); state.rateTimer = null; }
        if (state.observer) { state.observer.disconnect(); state.observer = null; }

        try {
            if (state.topListener && window.top) window.top.removeEventListener('hashchange', state.topListener);
        } catch (e) {}
        if (state.selfListener) window.removeEventListener('hashchange', state.selfListener);

        removeAllPanels();
        removeAllButtons();

        var s = document.getElementById(STYLE_ID);
        if (s) s.remove();

        var t = document.getElementById(TOAST_ID);
        if (t) t.remove();

        if (state.blobUrl) { URL.revokeObjectURL(state.blobUrl); state.blobUrl = null; }

        state.initialized = false;
        state.lastPath = null;
        state.open = false;
        state.groupId = null;
    }

    window.NX.features.rbxlImport = {
        apply: apply,
        teardown: teardown
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }
})();

/* src/ui/modal.js */
(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.ui = window.NX.ui || {};

    var VERSION = (function () {
        try {
            if (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) {
                return 'v' + GM_info.script.version;
            }
        } catch (e) {}
        return 'v1.0';
    })();

    var PANEL_ID = 'nx-panel';
    var STYLE_ID = 'nx-panel-style';

    var CATS = [
        { id: 'visual',   label: 'Visual' },
        { id: 'features', label: 'Features' }
    ];

    var OPTS = {
        roblox2019:      { cat: 'visual',   label: 'Roblox 2019L Theme',       desc: 'Makes Octane look like Roblox back in 2019.' },
        background:      { cat: 'visual',   label: 'Custom Avatar Background', desc: 'Set custom backgrounds behind your avatar.' },
        hideAlert:       { cat: 'visual',   label: 'Hide Alert',               desc: 'Hides the alert banner under the navigation bar.' },
        hideChat:        { cat: 'visual',   label: 'Hide Chat',                desc: 'Hides chat across the site.' },
        customLogo:      { cat: 'visual',   label: 'Custom Logo',              desc: 'Replace the navbar logo with your own image.' },
        customFont:      { cat: 'visual',   label: 'Custom Font',              desc: 'Apply a custom font to the whole site.', type: 'select' },
        tradeValues:     { cat: 'features', label: 'Trade Compare',            desc: 'Compare your trade with RAP, value and percentage.' },
        itemOwners:      { cat: 'features', label: 'Item Owners',              desc: 'Adds an Owners tab to item pages showing every owner, serial, and acquire date.' },
        rbxlImport:      { cat: 'features', label: 'Import from ROBLOX',       desc: 'Import your ROBLOX classic clothing to Octane.' },
        inventorySearch: { cat: 'features', label: 'Inventory Search',         desc: 'Adds a search bar to your inventory.' },
        quickSearch:     { cat: 'features', label: 'Quick Search',             desc: 'Search users and game results into the search bar at the same time.' },
        bulkUnfriend:    { cat: 'features', label: 'Bulk Unfriend',            desc: 'Select multiple friends and remove them at once.' },
        rap:             { cat: 'features', label: 'RAP on Profile',           desc: 'Shows total RAP next to profile stats.' },
        removeAds:       { cat: 'features', label: 'Remove Ads',               desc: 'Hides all advertisement banners across the site.' }
    };

    var DEFAULT_FONTS = [
        { id: 'default', label: 'Default' },
        { id: 'inter', label: 'Inter' },
        { id: 'roboto', label: 'Roboto' },
        { id: 'opensans', label: 'Open Sans' },
        { id: 'lato', label: 'Lato' },
        { id: 'montserrat', label: 'Montserrat' },
        { id: 'poppins', label: 'Poppins' },
        { id: 'source-sans', label: 'Source Sans Pro' },
        { id: 'nunito', label: 'Nunito' },
        { id: 'ubuntu', label: 'Ubuntu' },
        { id: 'comic-neue', label: 'Comic Neue' },
        { id: 'jetbrains-mono', label: 'JetBrains Mono' },
        { id: 'fira-code', label: 'Fira Code' },
        { id: 'courier-prime', label: 'Courier Prime' },
        { id: 'gotham', label: 'Gotham' }
    ];

    function readLS(k) { try { return localStorage.getItem('nx_' + k); } catch (e) { return null; } }
    function writeLS(k, v) { try { localStorage.setItem('nx_' + k, v); } catch (e) {} }

    function panelSettings() {
        var fallback = {
            get: function (k) { return readLS(k) === '1'; },
            set: function (k, v) { writeLS(k, v ? '1' : '0'); },
            getString: function (k, d) { var v = readLS(k); return v == null ? d : v; },
            setString: function (k, v) { writeLS(k, v); }
        };
        var s = window.NX.settings;
        if (!s) return fallback;
        return {
            get: function (k) {
                var v = s.get(k);
                if (v === undefined || v === null) v = fallback.get(k);
                return v;
            },
            set: function (k, v) {
                if (typeof s.set === 'function') s.set(k, v);
                fallback.set(k, v);
            },
            getString: function (k, d) {
                if (typeof s.getString === 'function') return s.getString(k, d);
                return fallback.getString(k, d);
            },
            setString: function (k, v) {
                if (typeof s.setString === 'function') s.setString(k, v);
                fallback.setString(k, v);
            }
        };
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '#' + PANEL_ID + '{display:none;overflow:visible}',
            '#' + PANEL_ID + '.nx-active{display:block}',
            '#' + PANEL_ID + ' .nx-section{margin-bottom:28px}',
            '#' + PANEL_ID + ' .nx-section-header{border-bottom:1px solid #e1e4e8;padding-bottom:8px;margin-bottom:4px}',
            '#' + PANEL_ID + ' .nx-section-header h3{margin:0;font-size:20px;font-weight:600;color:#232527}',
            'html.octane-dark #' + PANEL_ID + ' .nx-section-header{border-bottom-color:#3a3d40}',
            'html.octane-dark #' + PANEL_ID + ' .nx-section-header h3{color:#fff}',
            '#' + PANEL_ID + ' .nx-row{display:flex;align-items:flex-start;justify-content:space-between;',
            'padding:14px 0;gap:24px;border-bottom:1px solid #eef0f2}',
            'html.octane-dark #' + PANEL_ID + ' .nx-row{border-bottom-color:#2c2e30}',
            '#' + PANEL_ID + ' .nx-row:last-child{border-bottom:none}',
            '#' + PANEL_ID + ' .nx-row-text{flex:1;min-width:0}',
            '#' + PANEL_ID + ' .nx-label{display:block;font-size:15px;font-weight:500;color:#232527;margin-bottom:3px}',
            'html.octane-dark #' + PANEL_ID + ' .nx-label{color:#e8e8e8}',
            '#' + PANEL_ID + ' .nx-desc{display:block;font-size:13px;color:#7a7d80;line-height:1.5}',
            'html.octane-dark #' + PANEL_ID + ' .nx-desc{color:#9a9da0}',
            '#' + PANEL_ID + ' .nx-toggle{position:relative;width:44px;height:24px;flex-shrink:0;cursor:pointer;margin-top:2px}',
            '#' + PANEL_ID + ' .nx-toggle input{opacity:0;width:0;height:0;position:absolute}',
            '#' + PANEL_ID + ' .nx-toggle .slider{position:absolute;inset:0;background:#c7cbce;border-radius:24px;transition:background .2s}',
            'html.octane-dark #' + PANEL_ID + ' .nx-toggle .slider{background:#3d4043}',
            '#' + PANEL_ID + ' .nx-toggle .slider::before{content:"";position:absolute;height:18px;width:18px;left:3px;top:3px;',
            'background:#fff;border-radius:50%;transition:transform .2s}',
            '#' + PANEL_ID + ' .nx-toggle input:checked + .slider{background:#22a24a}',
            '#' + PANEL_ID + ' .nx-toggle input:checked + .slider::before{transform:translateX(20px)}',

            '#' + PANEL_ID + ' .nx-dropdown{position:relative;flex-shrink:0}',
            '#' + PANEL_ID + ' .nx-dropdown-btn{display:inline-flex;align-items:center;gap:8px;',
            'padding:7px 12px;background:#fff;color:#232527;border:1px solid #c7cbce;border-radius:6px;',
            'font-family:inherit;font-size:14px;cursor:pointer;outline:none;min-width:160px;justify-content:space-between}',
            'html.octane-dark #' + PANEL_ID + ' .nx-dropdown-btn{background:#2a2c2e;color:#e8e8e8;border-color:#3a3d40}',
            '#' + PANEL_ID + ' .nx-dropdown-btn:hover{filter:brightness(1.03)}',
            '#' + PANEL_ID + ' .nx-dropdown-arrow{flex:none;width:10px;height:10px;',
            'display:inline-block;transition:transform .15s ease}',
            '#' + PANEL_ID + ' .nx-dropdown.open .nx-dropdown-arrow{transform:rotate(180deg)}',
            '#' + PANEL_ID + ' .nx-dropdown-arrow::before{content:"";display:block;width:0;height:0;',
            'border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid currentColor}',
            '#' + PANEL_ID + ' .nx-dropdown-menu{position:absolute;top:calc(100% + 4px);right:0;min-width:100%;',
            'max-height:260px;overflow-y:auto;background:#fff;border:1px solid #c7cbce;border-radius:6px;',
            'box-shadow:0 6px 18px rgba(0,0,0,.12);z-index:50;padding:4px;display:none;',
            'font-family:inherit;font-size:14px;',
            'scrollbar-width:thin;scrollbar-color:#c7cbce transparent}',
            'html.octane-dark #' + PANEL_ID + ' .nx-dropdown-menu{background:#2a2c2e;border-color:#3a3d40;',
            'box-shadow:0 6px 18px rgba(0,0,0,.5);scrollbar-color:#3a3d40 transparent}',
            '#' + PANEL_ID + ' .nx-dropdown-menu::-webkit-scrollbar{width:6px;height:0}',
            '#' + PANEL_ID + ' .nx-dropdown-menu::-webkit-scrollbar-track{background:transparent}',
            '#' + PANEL_ID + ' .nx-dropdown-menu::-webkit-scrollbar-thumb{background:#c7cbce;border-radius:3px}',
            '#' + PANEL_ID + ' .nx-dropdown-menu::-webkit-scrollbar-thumb:hover{background:#b0b5ba}',
            'html.octane-dark #' + PANEL_ID + ' .nx-dropdown-menu::-webkit-scrollbar-thumb{background:#3a3d40}',
            'html.octane-dark #' + PANEL_ID + ' .nx-dropdown-menu::-webkit-scrollbar-thumb:hover{background:#4a4d50}',
            '#' + PANEL_ID + ' .nx-dropdown.open .nx-dropdown-menu{display:block}',
            '#' + PANEL_ID + ' .nx-dropdown-item{padding:7px 10px;border-radius:4px;cursor:pointer;',
            'color:#232527;white-space:nowrap}',
            'html.octane-dark #' + PANEL_ID + ' .nx-dropdown-item{color:#e8e8e8}',
            '#' + PANEL_ID + ' .nx-dropdown-item:hover{background:#f2f4f5}',
            'html.octane-dark #' + PANEL_ID + ' .nx-dropdown-item:hover{background:#3a3d40}',
            '#' + PANEL_ID + ' .nx-dropdown-item.selected{background:#e8f0fe;color:#0a84ff}',
            'html.octane-dark #' + PANEL_ID + ' .nx-dropdown-item.selected{background:#1f3a5f;color:#6cb2ff}',

            '#' + PANEL_ID + ' .nx-footer{margin-top:32px;padding-top:20px;border-top:1px solid #e1e4e8;',
            'display:flex;align-items:center}',
            'html.octane-dark #' + PANEL_ID + ' .nx-footer{border-top-color:#3a3d40}',
            '#' + PANEL_ID + ' .nx-version{margin-left:auto;font-size:12px;color:#7a7d80}'
        ].join('');
        (document.head || document.documentElement).appendChild(s);
    }

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    function buildToggle(key, cfg) {
        var row = el('div', 'nx-row');
        var text = el('div', 'nx-row-text');
        text.appendChild(el('span', 'nx-label', cfg.label));
        text.appendChild(el('span', 'nx-desc', cfg.desc));
        row.appendChild(text);

        var toggle = el('label', 'nx-toggle');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = panelSettings().get(key);

        input.addEventListener('change', function () {
            panelSettings().set(key, input.checked);
            var f = window.NX.features[key];
            if (!f) return;
            if (input.checked && typeof f.apply === 'function') f.apply();
            else if (!input.checked && typeof f.teardown === 'function') f.teardown();
        });

        toggle.appendChild(input);
        toggle.appendChild(el('span', 'slider'));
        row.appendChild(toggle);
        return row;
    }

    function buildDropdown(key, cfg) {
        var row = el('div', 'nx-row');
        var text = el('div', 'nx-row-text');
        text.appendChild(el('span', 'nx-label', cfg.label));
        text.appendChild(el('span', 'nx-desc', cfg.desc));
        row.appendChild(text);

        var f = window.NX.features[key];
        var list = (f && f.FONTS && f.FONTS.length) ? f.FONTS : DEFAULT_FONTS;
        var currentId = (f && typeof f.getFontId === 'function')
            ? f.getFontId()
            : panelSettings().getString(key + 'Id', 'default');
        var current = list.filter(function (o) { return o.id === currentId; })[0] || list[0];

        var wrap = el('div', 'nx-dropdown');

        var btn = el('button', 'nx-dropdown-btn');
        btn.type = 'button';
        var labelSpan = el('span', 'nx-dropdown-label', current.label);
        var arrow = el('span', 'nx-dropdown-arrow');
        btn.appendChild(labelSpan);
        btn.appendChild(arrow);
        wrap.appendChild(btn);

        var menu = el('div', 'nx-dropdown-menu');
        list.forEach(function (opt) {
            var item = el('div', 'nx-dropdown-item' + (opt.id === current.id ? ' selected' : ''), opt.label);
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                panelSettings().setString(key + 'Id', opt.id);
                var feat = window.NX.features[key];
                if (feat) {
                    if (typeof feat.setFontId === 'function') feat.setFontId(opt.id);
                    if (opt.id !== 'default' && typeof feat.apply === 'function') feat.apply();
                    if (opt.id === 'default' && typeof feat.teardown === 'function') feat.teardown();
                }
                labelSpan.textContent = opt.label;
                Array.prototype.forEach.call(menu.children, function (c) { c.classList.remove('selected'); });
                item.classList.add('selected');
                wrap.classList.remove('open');
            });
            menu.appendChild(item);
        });
        wrap.appendChild(menu);

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            wrap.classList.toggle('open');
        });

        document.addEventListener('click', function (ev) {
            if (wrap.contains(ev.target)) return;
            wrap.classList.remove('open');
        });

        row.appendChild(wrap);
        return row;
    }

    function build() {
        injectStyle();

        var existing = document.getElementById(PANEL_ID);
        if (existing) existing.remove();

        var page = el('div');
        page.id = PANEL_ID;

        CATS.forEach(function (cat) {
            var keys = Object.keys(OPTS).filter(function (k) { return OPTS[k].cat === cat.id; });
            if (!keys.length) return;

            var section = el('div', 'nx-section');
            var header = el('div', 'nx-section-header');
            header.appendChild(el('h3', '', cat.label));
            section.appendChild(header);

            keys.forEach(function (key) {
                var cfg = OPTS[key];
                section.appendChild(cfg.type === 'select' ? buildDropdown(key, cfg) : buildToggle(key, cfg));
            });

            page.appendChild(section);
        });

        var footer = el('div', 'nx-footer');
        footer.appendChild(el('span', 'nx-version', 'Nexus ' + VERSION));
        page.appendChild(footer);

        return page;
    }

    window.NX.ui.settingsPage = {
        build: build,
        version: VERSION
    };
})();
