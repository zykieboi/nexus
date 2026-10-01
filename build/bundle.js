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

/* src/core/server.js */
(function() {
    'use strict';

    window.NX = window.NX || {};

    var API = 'https://nexus-admin.masonreed-exe.workers.dev';

    function getToken() {
        var t = GM_getValue('nx_token', '');
        if (t && t.length >= 32) return t;
        var arr = new Uint8Array(32);
        (window.crypto || window.msCrypto).getRandomValues(arr);
        t = Array.from(arr).map(function(b) {
            return ('0' + b.toString(16)).slice(-2);
        }).join('');
        GM_setValue('nx_token', t);
        return t;
    }

    function getDevSecret() {
        return GM_getValue('nx_dev_secret', '');
    }

    function request(method, path, body) {
        return new Promise(function(resolve, reject) {
            var headers = {
                'Content-Type': 'application/json',
                'X-Nexus-Token': getToken()
            };
            var secret = getDevSecret();
            if (secret) headers['X-Nexus-Dev-Secret'] = secret;
            GM_xmlhttpRequest({
                method: method,
                url: API + path,
                headers: headers,
                data: body ? JSON.stringify(body) : undefined,
                onload: function(res) {
                    var data;
                    try { data = JSON.parse(res.responseText); }
                    catch (e) { data = { raw: res.responseText }; }
                    resolve({ status: res.status, data: data });
                },
                onerror: function() {
                    reject(new Error('network error'));
                }
            });
        });
    }

    window.NX.server = {
        api: API,
        getToken: getToken,
        getDevSecret: getDevSecret,
        claim: function(aisakaId, username) {
            return request('POST', '/claim', { aisakaId: aisakaId, username: username });
        },
        me: function() {
            return request('GET', '/me');
        },
        config: function() {
            return request('GET', '/config');
        },
        adminUsers: function() {
            return request('GET', '/admin/users');
        },
        adminTokens: function() {
            return request('GET', '/admin/tokens');
        },
        adminRole: function(tokenPreview, role) {
            return request('POST', '/admin/role', { tokenPreview: tokenPreview, role: role });
        },
        adminRoleById: function(aisakaId, role) {
            return request('POST', '/admin/role-by-id', { aisakaId: aisakaId, role: role });
        },
        adminAnnounce: function(text, isTest) {
            return request('POST', '/admin/announce', { text: text, test: !!isTest });
        },
        adminBan: function(tokenPreview, opts) {
            return request('POST', '/admin/ban',
                Object.assign({ tokenPreview: tokenPreview }, opts || {}));
        },
        adminUnban: function(tokenPreview) {
            return request('POST', '/admin/unban', { tokenPreview: tokenPreview });
        },
        adminLogs: function() {
            return request('GET', '/admin/logs');
        },
        adminConfig: function(patch) {
            return request('POST', '/admin/config', patch || {});
        }
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

/* src/features/announcement.js */
(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var POLL_MS = 60000;
    var STYLE_ID = 'nx-announce-style';
    var BANNER_ID = 'nx-announce-banner';
    var MAINT_ID = 'nx-maintenance-overlay';

    var FEATURE_KEYS = [
        'removeAds',
        'hideAlert',
        'rap',
        'inventorySearch',
        'bulkUnfriend',
        'trade2020'
    ];

    var CSS = [
        '#nx-announce-banner{background:#393b3d;color:#fff;padding:12px 16px;',
        'font-size:15px;line-height:1.4;position:relative;text-align:center;',
        'font-family:inherit}',
        '#nx-maintenance-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);',
        'z-index:999997;display:flex;align-items:center;justify-content:center;',
        'font-family:inherit}',
        '#nx-maintenance-overlay .nx-maint-box{background:#232527;border:1px solid #343638;',
        'border-radius:12px;padding:32px 40px;max-width:480px;text-align:center;color:#e0e0e0}',
        '#nx-maintenance-overlay h2{margin:0 0 10px;font-size:22px;font-weight:600;color:#fff}',
        '#nx-maintenance-overlay p{margin:0;font-size:14px;line-height:1.55;color:#9a9da0}'
    ].join('');

    var timer = null;
    var lastShown = null;

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function meId() {
        if (window.NX && typeof window.NX.getMeId === 'function') {
            return window.NX.getMeId();
        }
        return parseInt(localStorage.getItem('nx_me_id') || '0', 10);
    }

    function slot() {
        return document.querySelector('.fakeAlert-0-2-4')
            || document.querySelector('[class*="fakeAlert-"]');
    }

    function clearBanner() {
        var b = document.getElementById(BANNER_ID);
        if (b) b.remove();
        var s = slot();
        if (s) s.style.height = '';
    }

    function showBanner(ann) {
        if (!ann || !ann.text) {
            clearBanner();
            lastShown = null;
            return;
        }
        if (lastShown === ann.updatedAt) return;

        var s = slot();
        if (!s) return;

        clearBanner();

        var b = document.createElement('div');
        b.id = BANNER_ID;
        b.textContent = ann.text;

        s.style.height = 'auto';
        s.appendChild(b);
        lastShown = ann.updatedAt;
    }

    function showMaintenance(config) {
        var existing = document.getElementById(MAINT_ID);
        var on = !!(config && config.maintenance);

        if (!on || meId() === 1043) {
            if (existing) existing.remove();
            return;
        }
        if (existing) return;

        var overlay = document.createElement('div');
        overlay.id = MAINT_ID;

        var box = document.createElement('div');
        box.className = 'nx-maint-box';

        var h = document.createElement('h2');
        h.textContent = 'Under maintenance';

        var p = document.createElement('p');
        p.textContent = 'Nexus is currently under maintenance. Please check back shortly.';

        box.appendChild(h);
        box.appendChild(p);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    function applyOverrides(config) {
        if (!config || typeof config !== 'object') return;
        if (!window.NX.settings) return;

        FEATURE_KEYS.forEach(function(key) {
            if (config[key] === false) {
                if (window.NX.settings.get(key)) {
                    window.NX.settings.set(key, false);
                    var f = window.NX.features[key];
                    if (f && typeof f.teardown === 'function') {
                        try { f.teardown(); } catch (e) {}
                    }
                }
            }
        });
    }

    function pull() {
        if (!window.NX.server || typeof window.NX.server.config !== 'function') return;
        window.NX.server.config().then(function(res) {
            if (!res || res.status !== 200 || !res.data) return;
            applyOverrides(res.data.config);
            showBanner(res.data.announcement);
            showMaintenance(res.data.config);
        }).catch(function() {});
    }

    window.NX.features.announcement = {
        apply: function() {
            style();
            pull();
            if (timer) clearInterval(timer);
            timer = setInterval(pull, POLL_MS);
        },
        teardown: function() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            clearBanner();
            lastShown = null;
            var m = document.getElementById(MAINT_ID);
            if (m) m.remove();
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

/* src/ui/modal.js */
(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.ui = window.NX.ui || {};

    var STYLE_ID = 'nx-modal-theme-style';

    function dark() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    function style() {
        var old = document.getElementById(STYLE_ID);
        if (old) old.remove();
        var d = dark();
        var s = document.createElement('style');
        s.id = STYLE_ID;
        if (d) {
            s.textContent = [
                '#nx-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);',
                'z-index:999999;display:flex;align-items:center;justify-content:center}',
                '#nx-modal{background:#232527;color:#e0e0e0;border:1px solid #343638;',
                'border-radius:12px;width:90%;max-width:520px;max-height:78vh;',
                'font-family:inherit;box-shadow:0 20px 60px rgba(0,0,0,0.5);',
                'display:flex;flex-direction:column;overflow:hidden}',
                '#nx-modal .nx-header{display:flex;align-items:flex-start;',
                'justify-content:space-between;padding:22px 26px 14px;',
                'border-bottom:1px solid #343638;flex-shrink:0}',
                '#nx-modal .title-block{display:flex;flex-direction:column}',
                '#nx-modal h2{margin:0;font-size:22px;font-weight:600;color:#fff}',
                '#nx-modal .sub{color:#7a7d80;font-size:13px;margin-top:3px}',
                '#nx-modal .close{font-size:24px;line-height:1;cursor:pointer;',
                'color:#6a6d70;background:none;border:none;padding:0 4px;margin-top:-2px}',
                '#nx-modal .close:hover{color:#fff}',
                '#nx-modal .nx-content{padding:8px 26px 4px;overflow-y:auto;flex:1}',
                '#nx-modal .nx-content::-webkit-scrollbar{width:8px}',
                '#nx-modal .nx-content::-webkit-scrollbar-track{background:transparent}',
                '#nx-modal .nx-content::-webkit-scrollbar-thumb{background:#3a3d40;border-radius:4px}',
                '#nx-modal .nx-content::-webkit-scrollbar-thumb:hover{background:#4a4d50}',
                '.nx-cat{font-size:12px;font-weight:600;text-transform:uppercase;',
                'letter-spacing:0.7px;color:#7a7d80;margin:20px 0 6px;padding-bottom:6px;',
                'border-bottom:1px solid #2f3133}',
                '.nx-cat.first{margin-top:12px}',
                '.nx-row{display:flex;align-items:flex-start;justify-content:space-between;',
                'padding:11px 10px;gap:16px;border-radius:6px}',
                '.nx-row:hover{background:#2a2c2e}',
                '.nx-row-text{flex:1;min-width:0}',
                '.nx-row-text .nx-label{font-size:14px;font-weight:500;color:#e8e8e8;display:block}',
                '.nx-row-text .nx-desc{font-size:12px;color:#85888b;display:block;',
                'margin-top:3px;line-height:1.45}',
                '.nx-toggle{position:relative;width:40px;height:22px;flex-shrink:0;',
                'cursor:pointer;margin-top:1px}',
                '.nx-toggle input{opacity:0;width:0;height:0}',
                '.nx-toggle .slider{position:absolute;inset:0;background:#3d4043;',
                'border-radius:22px;transition:background 0.2s}',
                '.nx-toggle .slider::before{content:"";position:absolute;height:16px;',
                'width:16px;left:3px;top:3px;background:#c8cacc;border-radius:50%;',
                'transition:transform 0.2s, background 0.2s}',
                '.nx-toggle input:checked + .slider{background:#22a24a}',
                '.nx-toggle input:checked + .slider::before{transform:translateX(18px);background:#fff}',
                '#nx-modal .nx-footer{padding:14px 26px 20px;border-top:1px solid #343638;flex-shrink:0}',
                '#nx-modal .save-btn{padding:10px 24px;background:#0a84ff;color:#fff;',
                'border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;',
                'width:100%;font-family:inherit}',
                '#nx-modal .save-btn:hover{background:#0a76e0}'
            ].join('');
        } else {
            s.textContent = [
                '#nx-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);',
                'z-index:999999;display:flex;align-items:center;justify-content:center}',
                '#nx-modal{background:#ffffff;color:#232527;border:1px solid #c7cbce;',
                'border-radius:12px;width:90%;max-width:520px;max-height:78vh;',
                'font-family:inherit;box-shadow:0 20px 60px rgba(0,0,0,0.25);',
                'display:flex;flex-direction:column;overflow:hidden}',
                '#nx-modal .nx-header{display:flex;align-items:flex-start;',
                'justify-content:space-between;padding:22px 26px 14px;',
                'border-bottom:1px solid #e1e4e8;flex-shrink:0}',
                '#nx-modal .title-block{display:flex;flex-direction:column}',
                '#nx-modal h2{margin:0;font-size:22px;font-weight:600;color:#232527}',
                '#nx-modal .sub{color:#7a7d80;font-size:13px;margin-top:3px}',
                '#nx-modal .close{font-size:24px;line-height:1;cursor:pointer;',
                'color:#6a6d70;background:none;border:none;padding:0 4px;margin-top:-2px}',
                '#nx-modal .close:hover{color:#000}',
                '#nx-modal .nx-content{padding:8px 26px 4px;overflow-y:auto;flex:1}',
                '#nx-modal .nx-content::-webkit-scrollbar{width:8px}',
                '#nx-modal .nx-content::-webkit-scrollbar-track{background:transparent}',
                '#nx-modal .nx-content::-webkit-scrollbar-thumb{background:#c7cbce;border-radius:4px}',
                '#nx-modal .nx-content::-webkit-scrollbar-thumb:hover{background:#b0b5ba}',
                '.nx-cat{font-size:12px;font-weight:600;text-transform:uppercase;',
                'letter-spacing:0.7px;color:#7a7d80;margin:20px 0 6px;padding-bottom:6px;',
                'border-bottom:1px solid #e1e4e8}',
                '.nx-cat.first{margin-top:12px}',
                '.nx-row{display:flex;align-items:flex-start;justify-content:space-between;',
                'padding:11px 10px;gap:16px;border-radius:6px}',
                '.nx-row:hover{background:#f2f4f5}',
                '.nx-row-text{flex:1;min-width:0}',
                '.nx-row-text .nx-label{font-size:14px;font-weight:500;color:#232527;display:block}',
                '.nx-row-text .nx-desc{font-size:12px;color:#7a7d80;display:block;',
                'margin-top:3px;line-height:1.45}',
                '.nx-toggle{position:relative;width:40px;height:22px;flex-shrink:0;',
                'cursor:pointer;margin-top:1px}',
                '.nx-toggle input{opacity:0;width:0;height:0}',
                '.nx-toggle .slider{position:absolute;inset:0;background:#c7cbce;',
                'border-radius:22px;transition:background 0.2s}',
                '.nx-toggle .slider::before{content:"";position:absolute;height:16px;',
                'width:16px;left:3px;top:3px;background:#ffffff;border-radius:50%;',
                'transition:transform 0.2s, background 0.2s}',
                '.nx-toggle input:checked + .slider{background:#22a24a}',
                '.nx-toggle input:checked + .slider::before{transform:translateX(18px);background:#fff}',
                '#nx-modal .nx-footer{padding:14px 26px 20px;border-top:1px solid #e1e4e8;flex-shrink:0}',
                '#nx-modal .save-btn{padding:10px 24px;background:#0a84ff;color:#fff;',
                'border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;',
                'width:100%;font-family:inherit}',
                '#nx-modal .save-btn:hover{background:#0a76e0}'
            ].join('');
        }
        (document.head || document.documentElement).appendChild(s);
    }

    function build() {
        var existing = document.getElementById('nx-overlay');
        if (existing) existing.remove();

        style();

        var isDev = window.NX.role === 'dev';

        var overlay = document.createElement('div');
        overlay.id = 'nx-overlay';

        var modal = document.createElement('div');
        modal.id = 'nx-modal';

        var header = document.createElement('div');
        header.className = 'nx-header';

        var titleBlock = document.createElement('div');
        titleBlock.className = 'title-block';

        var title = document.createElement('h2');
        title.textContent = 'Nexus Settings';

        var sub = document.createElement('div');
        sub.className = 'sub';
        sub.textContent = 'Settings are saved automatically';

        titleBlock.appendChild(title);
        titleBlock.appendChild(sub);

        var close = document.createElement('button');
        close.className = 'close';
        close.textContent = '\u00d7';
        close.onclick = function() { overlay.remove(); };

        header.appendChild(titleBlock);
        header.appendChild(close);

        var content = document.createElement('div');
        content.className = 'nx-content';

        var cats = [
            { id: 'visual', label: 'Visual' },
            { id: 'features', label: 'Features' },
            { id: 'optimize', label: 'Optimize' }
        ];

        var opts = {
            roblox2019: {
                cat: 'visual', label: 'Roblox 2019L Theme',
                desc: 'Makes Octane to look like Roblox back in 2019.'
            },
            hideAlert: {
                cat: 'visual', label: 'Hide Alert',
                desc: 'Hides the alert banner under the navigation bar.'
            },
            customLogo: {
                cat: 'visual', label: 'Custom Logo',
                desc: 'Replace the navbar logo with your own image.'
            },
            inventorySearch: {
                cat: 'features', label: 'Inventory Search',
                desc: 'Adds a search bar to your inventory.'
            },
            bulkUnfriend: {
                cat: 'features', label: 'Bulk Unfriend',
                desc: 'Select multiple friends and remove them all at once.'
            },
            rap: {
                cat: 'features', label: 'RAP on Profile',
                desc: 'Shows total RAP next to profile stats.'
            },
            removeAds: {
                cat: 'optimize', label: 'Remove Ads',
                desc: 'Hides all advertisement banners across the site.'
            }
        };

        cats.forEach(function(cat, ci) {
            var keys = Object.keys(opts).filter(function(k) {
                if (opts[k].cat !== cat.id) return false;
                if (opts[k].devOnly && !isDev) return false;
                return true;
            });
            if (!keys.length) return;

            var catEl = document.createElement('div');
            catEl.className = 'nx-cat';
            if (ci === 0) catEl.classList.add('first');
            catEl.textContent = cat.label;
            content.appendChild(catEl);

            keys.forEach(function(key) {
                var cfg = opts[key];
                var on = window.NX.settings.get(key);

                var row = document.createElement('div');
                row.className = 'nx-row';

                var text = document.createElement('div');
                text.className = 'nx-row-text';

                var label = document.createElement('span');
                label.className = 'nx-label';
                label.textContent = cfg.label;

                var desc = document.createElement('span');
                desc.className = 'nx-desc';
                desc.textContent = cfg.desc;

                text.appendChild(label);
                text.appendChild(desc);

                var toggle = document.createElement('label');
                toggle.className = 'nx-toggle';

                var input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = on;

                input.addEventListener('change', (function(k) {
                    return function() {
                        window.NX.settings.set(k, this.checked);
                        var f = window.NX.features[k];
                        if (!f) return;
                        if (this.checked) {
                            if (typeof f.apply === 'function') f.apply();
                        } else {
                            if (typeof f.teardown === 'function') f.teardown();
                        }
                    };
                })(key));

                var slider = document.createElement('span');
                slider.className = 'slider';

                toggle.appendChild(input);
                toggle.appendChild(slider);
                row.appendChild(text);
                row.appendChild(toggle);
                content.appendChild(row);
            });
        });

        var footer = document.createElement('div');
        footer.className = 'nx-footer';

        var save = document.createElement('button');
        save.className = 'save-btn';
        save.textContent = 'Save & Reload';
        save.onclick = function() { location.reload(); };

        footer.appendChild(save);

        modal.appendChild(header);
        modal.appendChild(content);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) overlay.remove();
        });

        (document.body || document.documentElement).appendChild(overlay);
    }

    window.NX.ui.modal = { build: build };
})();
