// src/features/rbxlImport.js

(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var BUTTON_CLASS = 'nx-rblx-btn';
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
        panelEl: null,
        observer: null,
        topListener: null,
        selfListener: null,
        initialized: false,
        retryTimer: null
    };

    var CLASS_TO_TYPE_ID = { Shirt: 11, Pants: 12, TShirt: 2, ShirtGraphic: 2 };
    var OK_CLASSES = { Shirt: 1, Pants: 1, TShirt: 1, ShirtGraphic: 1 };

    function log() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(LOG);
        console.log.apply(console, args);
    }

    function isTop() {
        try { return window.top === window.self; } catch (e) { return true; }
    }

    function isDark() {
        var t = '';
        try { t = localStorage.getItem(THEME_KEY) || ''; } catch (e) {}
        if (t === 'dark') return true;
        if (t === 'white' || t === 'light') return false;
        return document.documentElement.classList.contains('octane-dark') ||
               document.documentElement.classList.contains('dark-theme');
    }

    function readCsrf() {
        if (window.NX_CSRF) return window.NX_CSRF;
        try { if (window.top && window.top.NX_CSRF) return window.top.NX_CSRF; } catch (e) {}
        var meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? (meta.getAttribute('data-token') || '') : '';
    }

    function waitForCsrf(timeout) {
        if (readCsrf()) return Promise.resolve(readCsrf());
        return new Promise(function (resolve) {
            var start = Date.now();
            (function check() {
                var t = readCsrf();
                if (t) return resolve(t);
                if (Date.now() - start > (timeout || 3000)) return resolve('');
                setTimeout(check, 100);
            })();
        });
    }

    function saveCsrf(t) {
        if (!t) return;
        window.NX_CSRF = t;
        try { GM_setValue('nx_csrf', t); } catch (e) {}
    }

    function getRateLimitRemaining() {
        try {
            var last = parseInt(localStorage.getItem(RATE_KEY) || '0', 10);
            if (!last) return 0;
            var elapsed = Date.now() - last;
            return elapsed >= RATE_LIMIT_MS ? 0 : RATE_LIMIT_MS - elapsed;
        } catch (e) { return 0; }
    }

    function setRateLimitNow() {
        try { localStorage.setItem(RATE_KEY, String(Date.now())); } catch (e) {}
    }

    function formatSeconds(ms) { return Math.ceil(ms / 1000) + 's'; }

    function showToast(msg, kind) {
        var ex = document.getElementById(TOAST_ID);
        if (ex) ex.remove();
        var t = document.createElement('div');
        t.id = TOAST_ID;
        t.className = 'nx-rblx-toast ' + (kind || 'ok');
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(function () { t.classList.add('show'); });
        setTimeout(function () {
            t.classList.remove('show');
            setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 250);
        }, 4500);
    }

    function decodeHtml(s) {
        if (!s) return '';
        s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&apos;/g, "'")
             .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
             .replace(/&hellip;/g, '\u2026');
        s = s.replace(/&#x([0-9a-fA-F]+);/g, function (_, h) {
            try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return ''; }
        });
        s = s.replace(/&#(\d+);/g, function (_, d) {
            try { return String.fromCodePoint(parseInt(d, 10)); } catch (e) { return ''; }
        });
        return s;
    }

    function cleanName(name) {
        if (!name) return '';
        var t = String(name);
        t = decodeHtml(t);
        t = t.replace(/<[^>]*>/g, ' ');
        t = t.replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');
        t = t.replace(/\s*[\-\u2013\u2014\|]\s*Roblox(\s+Corporation)?\s*$/i, '');
        t = t.replace(/\s*[\-\u2013\u2014\|]\s*Free\s+Roblox.*$/i, '');
        t = t.replace(/\s*[\-\u2013\u2014\|]\s*\d{6,}\s*$/, '');
        t = t.replace(/\s*[\-\u2013\u2014\|]\s*$/g, '');
        t = t.replace(/^[\-\u2013\u2014\|]\s*/, '');
        t = t.replace(/\s+/g, ' ').trim();
        var chars = Array.from(t);
        if (chars.length > MAX_NAME_LEN) t = chars.slice(0, MAX_NAME_LEN).join('').trim();
        return t;
    }

    function style() {
        var ex = document.getElementById(STYLE_ID);
        if (ex) ex.remove();
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
            '  visibility:visible !important;',
            '  opacity:1 !important;',
            '  position:relative !important;',
            '  z-index:20 !important;',
            '  width:auto !important;',
            '  box-sizing:border-box !important;',
            '  font-family:"Source Sans Pro",Arial,Helvetica,sans-serif;',
            '  font-size:14px;line-height:20px;',
            '  padding:20px !important;',
            '  margin:0 !important;',
            '}',

            '#' + PANEL_ID + ' .nx-title{',
            '  display:inline-block;margin:0;',
            '  font-size:28px;font-weight:400;line-height:38px;vertical-align:middle;',
            '  letter-spacing:-0.01em;',
            '}',
            '#' + PANEL_ID + ' .nx-hint{display:inline-block;margin:0 0 0 10px;font-size:14px;vertical-align:middle}',
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
            '#' + PANEL_ID + ' .nx-row-label{display:block;font-size:15px;font-weight:500;margin-bottom:3px}',
            '#' + PANEL_ID + ' .nx-row-desc{display:block;font-size:13px;line-height:1.5}',
            '#' + PANEL_ID + ' .nx-field{flex-shrink:0;width:280px}',
            '#' + PANEL_ID + ' .nx-field input[type=text]{',
            '  width:100%;box-sizing:border-box;padding:8px 12px;height:36px;',
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
            '  background:#00b06f;color:#fff;border:1px solid #00b06f;border-radius:6px;',
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
            '#' + PANEL_ID + ' .nx-progress .nx-bar{position:relative;height:6px;border-radius:3px;overflow:hidden}',
            '#' + PANEL_ID + ' .nx-progress .nx-fill{position:relative;height:100%;width:0%;border-radius:3px;transition:width .3s ease}',
            '#' + PANEL_ID + ' .nx-progress .nx-ptext{margin-top:8px;font-size:12px;display:flex;justify-content:space-between;align-items:center;letter-spacing:0.02em}',
            '#' + PANEL_ID + ' .nx-progress .nx-pct{font-weight:700;font-variant-numeric:tabular-nums}',

            '#' + PANEL_ID + ' .nx-status{',
            '  margin-top:18px;padding:12px 16px;border-radius:6px;',
            '  font-size:13px;line-height:19px;display:none;',
            '  white-space:pre-wrap;word-break:break-word;',
            '  border-left:4px solid transparent;',
            '}',
            '#' + PANEL_ID + ' .nx-status.on{display:block}',

            '#' + PANEL_ID + ' .nx-preview{margin-top:18px;display:none}',
            '#' + PANEL_ID + ' .nx-preview.on{display:block}',
            '#' + PANEL_ID + ' .nx-preview img{max-width:240px;max-height:240px;border:1px solid;border-radius:6px;image-rendering:pixelated;display:block}',
            '#' + PANEL_ID + ' .nx-preview .nx-cap{margin-top:6px;font-size:12px}',

            'html:not(.octane-dark) #' + PANEL_ID + '{color:#232527}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-title{color:#232527}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-hint{color:#7a7d80}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-hint a{color:#00a04e}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-line{color:#7a7d80}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-row-desc{color:#7a7d80}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-field input[type=text]{background:#fff;border-color:#c7cbce;color:#232527}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-field input[type=text]:focus{border-color:#00a04e;box-shadow:0 0 0 3px rgba(0,160,78,0.15)}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-field input[type=text]::placeholder{color:#9a9da0}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-types label{background:#fff;border-color:#c7cbce;color:#333}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-progress .nx-bar{background:#e8eaec}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-progress .nx-fill{background:#00a04e}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-progress .nx-pct{color:#008a42}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-progress .nx-ptext{color:#7a7d80}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-preview img{border-color:#c7cbce;background:#fff}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-status.ok{background:#e3f7eb;color:#0d7a3f;border-left-color:#00a04e}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-status.err{background:#fbe8e8;color:#a13a3a;border-left-color:#d05656}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-status.info{background:#e6f0f9;color:#2e5f8a;border-left-color:#4a90c4}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-row-item{border-bottom-color:#eef0f2}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-context{background:#f2f4f5;border-color:#c7cbce;color:#333}',
            'html:not(.octane-dark) #' + PANEL_ID + ' .nx-context strong{color:#232527}',

            'html.octane-dark #' + PANEL_ID + '{color:#bdbebe}',
            'html.octane-dark #' + PANEL_ID + ' .nx-title{color:#fff}',
            'html.octane-dark #' + PANEL_ID + ' .nx-hint{color:#8a8d90}',
            'html.octane-dark #' + PANEL_ID + ' .nx-hint a{color:#00b06f}',
            'html.octane-dark #' + PANEL_ID + ' .nx-line{color:#8a8d90}',
            'html.octane-dark #' + PANEL_ID + ' .nx-row-desc{color:#8a8d90}',
            'html.octane-dark #' + PANEL_ID + ' .nx-field input[type=text]{background:#16181a;border-color:#2b2d2f;color:#e8e8e8}',
            'html.octane-dark #' + PANEL_ID + ' .nx-field input[type=text]:focus{border-color:#00b06f;box-shadow:0 0 0 3px rgba(0,176,111,0.15)}',
            'html.octane-dark #' + PANEL_ID + ' .nx-field input[type=text]::placeholder{color:#5c5f62}',
            'html.octane-dark #' + PANEL_ID + ' .nx-types label{background:#16181a;border-color:#2b2d2f;color:#bdbebe}',
            'html.octane-dark #' + PANEL_ID + ' .nx-progress .nx-bar{background:#16181a}',
            'html.octane-dark #' + PANEL_ID + ' .nx-progress .nx-fill{background:#00b06f}',
            'html.octane-dark #' + PANEL_ID + ' .nx-progress .nx-pct{color:#00b06f}',
            'html.octane-dark #' + PANEL_ID + ' .nx-progress .nx-ptext{color:#8a8d90}',
            'html.octane-dark #' + PANEL_ID + ' .nx-preview img{border-color:#2b2d2f;background:#16181a}',
            'html.octane-dark #' + PANEL_ID + ' .nx-status.ok{background:#0d2e1d;color:#8fd9b3;border-left-color:#00b06f}',
            'html.octane-dark #' + PANEL_ID + ' .nx-status.err{background:#2e1414;color:#e0a0a0;border-left-color:#c4494a}',
            'html.octane-dark #' + PANEL_ID + ' .nx-status.info{background:#132a3d;color:#8fbce0;border-left-color:#4a90c4}',
            'html.octane-dark #' + PANEL_ID + ' .nx-row-item{border-bottom-color:#2c2e30}',
            'html.octane-dark #' + PANEL_ID + ' .nx-context{background:#16181a;border-color:#2b2d2f;color:#bdbebe}',
            'html.octane-dark #' + PANEL_ID + ' .nx-context strong{color:#fff}'
        ].join('');
        document.head.appendChild(s);
    }

    function httpGet(url, opts) {
        opts = opts || {};
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: 'GET', url: url,
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
        return httpGet('https://www.roblox.com/catalog/' + assetId + '/x', {
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
        var tpl = item.querySelector('Content[name="ShirtTemplate"] url, Content[name="PantsTemplate"] url, Content[name="Graphic"] url');
        var tid = null;
        if (tpl) {
            var m = tpl.textContent.match(/id=(\d+)/);
            if (m) tid = m[1];
        }
        return { class: cls, typeId: CLASS_TO_TYPE_ID[cls] || null, templateId: tid };
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
        return cleanName(raw.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim());
    }

    function detectGroupContext() {
        var pg = location.pathname.match(/\/develop\/groups\/(\d+)/);
        if (pg) return pg[1];
        var qg = location.search.match(/[?&]groupId=(\d+)/);
        if (qg) return qg[1];

        var gt = document.getElementById('GroupCreationsTabLink');
        if (gt && gt.classList.contains('tab-active')) {
            var sel = document.querySelector('#SelectedGroupId');
            if (sel && sel.value && /^\d+$/.test(sel.value)) return sel.value;
            var hid = document.querySelector('#groupId');
            if (hid && hid.value && /^\d+$/.test(hid.value)) return hid.value;
            var ct = document.querySelector('.BuildPageContent[data-groupid]');
            if (ct) {
                var g = ct.getAttribute('data-groupid');
                if (g && /^\d+$/.test(g)) return g;
            }
        }
        return null;
    }

    function groupNameFor(gid) {
        if (!gid) return 'Personal';
        var sel = document.querySelector('#SelectedGroupId');
        if (sel && sel.value === String(gid)) {
            var o = sel.options[sel.selectedIndex];
            if (o && o.textContent) return o.textContent.trim();
        }
        return 'Group ' + gid;
    }

    function sendUpload(file, filename, typeId, token, groupId, assetName) {
        var form = new FormData();
        form.append('name', String(assetName || 'clothing'));
        form.append('assetType', String(typeId));
        form.append('file', file, filename);
        if (groupId && /^\d+$/.test(groupId)) form.append('groupId', String(groupId));

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
        var safe = (name || 'clothing').replace(/[\\/:*?"<>|]/g, '').trim() || 'clothing';
        var filename = safe + '.png';
        return waitForCsrf(3000).then(function (token) {
            return sendUpload(file, filename, typeId, token, groupId, safe);
        }).then(function (r) {
            if (r.status === 403 && r.fresh) {
                saveCsrf(r.fresh);
                return sendUpload(file, filename, typeId, r.fresh, groupId, safe);
            }
            if (r.status === 403) {
                var c = readCsrf();
                if (c) return sendUpload(file, filename, typeId, c, groupId, safe);
            }
            return r;
        });
    }

    function renameAsset(id, name, typeId, groupId) {
        var url = 'https://octane.wtf/apisite/develop/v1/assets/' + id + (groupId ? '?groupId=' + encodeURIComponent(groupId) : '');
        var body = JSON.stringify({ name: name, description: '', genres: ['All'], assetType: Number(typeId) });
        var headers = { 'accept': 'application/json, text/plain, */*', 'content-type': 'application/json' };
        var tok = readCsrf();
        if (tok) headers['x-csrf-token'] = tok;

        return fetch(url, { method: 'PATCH', credentials: 'include', headers: headers, body: body })
            .then(function (r) {
                return r.text().then(function (text) {
                    var fresh = r.headers.get('x-csrf-token') || '';
                    if (r.status === 403 && fresh) {
                        saveCsrf(fresh);
                        return fetch(url, {
                            method: 'PATCH', credentials: 'include', body: body,
                            headers: { 'accept': 'application/json, text/plain, */*', 'content-type': 'application/json', 'x-csrf-token': fresh }
                        }).then(function (r2) { return r2.text().then(function (t2) { return { status: r2.status, text: t2 }; }); });
                    }
                    return { status: r.status, text: text };
                });
            });
    }

    function contextHtml(gid) {
        var n = groupNameFor(gid);
        return gid
            ? '<div class="nx-context">Uploading as <strong>' + n + '</strong> (group ' + gid + ')</div>'
            : '<div class="nx-context">Uploading as <strong>Personal</strong></div>';
    }

    function panelHtml(gid) {
        return [
            '<h2 class="nx-title">Import from RBLX</h2>',
            '<span class="nx-hint">Don\'t know how? <a href="https://developer.roblox.com/articles/How-to-Make-Shirts-and-Pants-for-Roblox-Characters" target="_blank">Click here</a></span>',
            '<p class="nx-line">Paste a Roblox clothing link and we\'ll import it.</p>',
            contextHtml(gid),
            '<div class="nx-row-item"><div class="nx-row-text"><span class="nx-row-label">Roblox URL</span><span class="nx-row-desc">The link to the clothing item you want to import.</span></div><div class="nx-field"><input type="text" id="nx-rblx-url" placeholder="https://www.roblox.com/catalog/{id}/--"></div></div>',
            '<div class="nx-row-item"><div class="nx-row-text"><span class="nx-row-label">Type</span><span class="nx-row-desc">Auto-detected from the URL, or pick manually.</span></div><div class="nx-field"><div class="nx-types" id="nx-rblx-types"><label data-val="11"><input type="radio" name="nx-rblx-type" value="11">Shirt</label><label data-val="12"><input type="radio" name="nx-rblx-type" value="12">Pants</label><label data-val="2"><input type="radio" name="nx-rblx-type" value="2">T-Shirt</label></div></div></div>',
            '<div class="nx-row-item"><div class="nx-row-text"><span class="nx-row-label">Name</span><span class="nx-row-desc">Shown on the item page. Filled automatically if empty.</span></div><div class="nx-field"><input type="text" id="nx-rblx-name" placeholder="My Shirt"></div></div>',
            '<button class="nx-go" id="nx-rblx-go" type="button">Upload</button>',
            '<div class="nx-progress" id="nx-rblx-progress"><div class="nx-bar"><div class="nx-fill" id="nx-rblx-fill"></div></div><div class="nx-ptext"><span id="nx-rblx-ptext">Preparing…</span><span class="nx-pct" id="nx-rblx-pct">0%</span></div></div>',
            '<div class="nx-status" id="nx-rblx-status"></div>',
            '<div class="nx-preview" id="nx-rblx-preview"><img alt="preview"><div class="nx-cap"></div></div>'
        ].join('');
    }

    function setProgress(panel, pct, stage) {
        panel.querySelector('#nx-rblx-progress').classList.add('on');
        var cl = Math.max(0, Math.min(100, pct));
        panel.querySelector('#nx-rblx-fill').style.width = cl + '%';
        panel.querySelector('#nx-rblx-pct').textContent = Math.round(cl) + '%';
        if (stage) panel.querySelector('#nx-rblx-ptext').textContent = stage;
    }

    function hideProgress(panel) {
        panel.querySelector('#nx-rblx-progress').classList.remove('on');
        panel.querySelector('#nx-rblx-fill').style.width = '0%';
        panel.querySelector('#nx-rblx-ptext').textContent = 'Preparing…';
        panel.querySelector('#nx-rblx-pct').textContent = '0%';
    }

    function selectType(panel, typeId) {
        Array.prototype.forEach.call(panel.querySelectorAll('#nx-rblx-types label'), function (l) {
            var m = l.getAttribute('data-val') === String(typeId);
            l.classList.toggle('sel', m);
            var i = l.querySelector('input');
            if (i) i.checked = m;
        });
    }

    function getSelectedType(panel) {
        var i = panel.querySelector('#nx-rblx-types input:checked');
        return i ? i.value : '';
    }

    function setField(panel, sel, val, overwrite) {
        var n = panel.querySelector(sel);
        if (!n) return;
        var cur = (n.value || '').trim();
        if (cur && !overwrite) return;
        n.value = val || '';
    }

    function setStatus(node, text, kind) {
        node.className = 'nx-status on ' + (kind || 'info');
        node.textContent = text;
    }

    function updateRateLimit(panel) {
        var go = panel.querySelector('#nx-rblx-go');
        var st = panel.querySelector('#nx-rblx-status');
        var rem = getRateLimitRemaining();
        if (state.rateTimer) { clearInterval(state.rateTimer); state.rateTimer = null; }
        if (rem <= 0) { if (!state.busy) go.disabled = false; return; }
        go.disabled = true;
        (function tick() {
            var r = getRateLimitRemaining();
            if (r <= 0) {
                if (!state.busy) go.disabled = false;
                if (st.classList.contains('info') && /Rate limit/i.test(st.textContent || '')) {
                    st.className = 'nx-status'; st.textContent = '';
                }
                return;
            }
            setStatus(st, 'Rate limit — wait ' + formatSeconds(r) + ' before uploading again.', 'info');
            state.rateTimer = setTimeout(tick, 500);
        })();
    }

    function buildPanel(gid) {
        var p = document.createElement('div');
        p.id = PANEL_ID;
        p.innerHTML = panelHtml(gid);

        Array.prototype.forEach.call(p.querySelectorAll('#nx-rblx-types label'), function (l) {
            l.addEventListener('click', function () {
                Array.prototype.forEach.call(p.querySelectorAll('#nx-rblx-types label'), function (x) { x.classList.remove('sel'); });
                l.classList.add('sel');
                l.querySelector('input').checked = true;
            });
        });
        p.querySelector('#nx-rblx-go').addEventListener('click', function () { startUpload(p); });
        return p;
    }

    function startUpload(panel) {
        if (state.busy) return;
        var urlInput = panel.querySelector('#nx-rblx-url');
        var nameInput = panel.querySelector('#nx-rblx-name');
        var status = panel.querySelector('#nx-rblx-status');
        var preview = panel.querySelector('#nx-rblx-preview');
        var go = panel.querySelector('#nx-rblx-go');

        var rem = getRateLimitRemaining();
        if (rem > 0) { setStatus(status, 'Rate limit — wait ' + formatSeconds(rem) + '.', 'err'); updateRateLimit(panel); return; }

        preview.classList.remove('on');
        hideProgress(panel);
        if (state.blobUrl) { URL.revokeObjectURL(state.blobUrl); state.blobUrl = null; }

        var url = urlInput.value.trim();
        if (!url) return setStatus(status, 'Paste a URL first.', 'err');
        var aid = assetIdFromUrl(url);
        if (!aid) return setStatus(status, 'Could not find an asset ID in that URL.', 'err');

        var gid = detectGroupContext();
        state.busy = true;
        setRateLimitNow();
        go.disabled = true;
        setStatus(status, 'Reading asset…', 'info');
        setProgress(panel, 5, 'Reading asset…');

        var typeId = getSelectedType(panel);

        httpGet('https://api.coolpixels.net/roblox/assetdelivery/' + aid + '/info')
            .then(function (res) {
                if (res.status !== 200) throw new Error('info HTTP ' + res.status);
                var info;
                try { info = JSON.parse(res.responseText); } catch (e) { throw new Error('info not JSON'); }
                if (!info.success || !info.content) throw new Error('asset info missing content');
                var parsed = readItemXml(info.content);
                if (!parsed) throw new Error('asset XML unrecognized');
                return parsed;
            })
            .then(function (parsed) {
                if (!OK_CLASSES[parsed.class]) throw new Error('Only Shirts, Pants and T-Shirts can be imported (got ' + (parsed.class || '?') + ').');
                if (!parsed.templateId) throw new Error('no template ID in XML');
                if (!typeId) { typeId = String(parsed.typeId); selectType(panel, typeId); }
                setProgress(panel, 25, 'Loading details…');
                if (!(nameInput.value || '').trim()) {
                    var un = nameFromUrl(url);
                    if (un) setField(panel, '#nx-rblx-name', un, false);
                    return fetchItemTitle(aid).then(function (meta) {
                        if (meta && meta.title) setField(panel, '#nx-rblx-name', meta.title, true);
                        return parsed;
                    });
                }
                return parsed;
            })
            .then(function (parsed) {
                setProgress(panel, 45, 'Downloading texture…');
                return httpGet('https://api.coolpixels.net/roblox/assetdelivery/' + parsed.templateId, { blob: true })
                    .then(function (r) {
                        if (r.status !== 200) throw new Error('image HTTP ' + r.status);
                        var blob = r.response;
                        if (!blob || !blob.size) throw new Error('image empty');
                        state.blobUrl = URL.createObjectURL(blob);
                        preview.querySelector('img').src = state.blobUrl;
                        preview.querySelector('.nx-cap').textContent = parsed.class + ' · template ' + parsed.templateId + ' · ' + Math.round(blob.size / 1024) + ' KB';
                        preview.classList.add('on');
                        return { blob: blob, parsed: parsed };
                    });
            })
            .then(function (ctx) {
                setProgress(panel, 65, 'Uploading to Octane…');
                var raw = (nameInput.value || '').trim();
                var final = cleanName(raw) || 'Clothing';
                if (final !== raw) nameInput.value = final;
                var file = new File([ctx.blob], final + '.png', { type: ctx.blob.type || 'image/png' });
                return uploadAsset(file, typeId, final, gid).then(function (up) {
                    return { up: up, parsed: ctx.parsed, finalName: final, gid: gid };
                });
            })
            .then(function (ctx) {
                if (ctx.up.status !== 200) throw new Error('upload HTTP ' + ctx.up.status + '\n' + (ctx.up.raw || ''));
                var out = ctx.up.data || {};
                var nid = out.assetId || out.AssetId || out.id;
                var sname = out.name || out.Name || '';
                if (nid && ctx.finalName && (!sname || sname !== ctx.finalName)) {
                    setProgress(panel, 88, 'Saving name…');
                    return renameAsset(nid, ctx.finalName, typeId, ctx.gid).then(function () {
                        return { out: out, nid: nid, finalName: ctx.finalName, gid: ctx.gid };
                    });
                }
                return { out: out, nid: nid, finalName: ctx.finalName, gid: ctx.gid };
            })
            .then(function (d) {
                setProgress(panel, 100, 'Done');
                var lines = ['Imported successfully'];
                if (d.gid) lines.push('Group: ' + groupNameFor(d.gid) + ' (' + d.gid + ')');
                else lines.push('Uploaded to: Personal');
                lines.push('Name: ' + d.finalName);
                lines.push('Asset ID: ' + (d.nid || '?'));
                if (d.out.moderationStatus) lines.push('Status: ' + d.out.moderationStatus);
                setStatus(status, lines.join('\n'), 'ok');
                showToast('Imported "' + d.finalName + '"', 'ok');
                updateRateLimit(panel);
            })
            .catch(function (e) {
                log('error', e);
                setStatus(status, 'Failed: ' + e.message, 'err');
                showToast('Import failed: ' + e.message.split('\n')[0], 'err');
                hideProgress(panel);
            })
            .then(function () {
                state.busy = false;
                updateRateLimit(panel);
                if (getRateLimitRemaining() <= 0) go.disabled = false;
            });
    }

    function isVisible(el) {
        if (!el || !el.ownerDocument) return false;
        var n = el;
        while (n && n.nodeType === 1) {
            var cs = n.ownerDocument.defaultView.getComputedStyle(n);
            if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
            n = n.parentElement;
        }
        return true;
    }

    function pickActiveMenu() {
        var anchors = document.querySelectorAll('a.tab-item');
        for (var i = 0; i < anchors.length; i++) {
            var a = anchors[i];
            if (!/View=11\b/.test(a.getAttribute('href') || '')) continue;
            if (!isVisible(a)) continue;
            return a;
        }
        return null;
    }

    function findActiveWrap() {
        var tabs = document.querySelectorAll('#MyCreationsTab.tab-active, #GroupCreationsTab.tab-active');
        for (var i = 0; i < tabs.length; i++) {
            var t = tabs[i];
            if (isVisible(t)) return t;
        }
        return null;
    }

    function removeAllPanels() {
        var ps = document.querySelectorAll('#' + PANEL_ID);
        Array.prototype.forEach.call(ps, function (p) {
            var par = p.parentNode;
            if (par) {
                Array.prototype.forEach.call(par.children, function (c) {
                    if (c === p) return;
                    var prev = c.getAttribute('data-nx-prev-display');
                    if (prev !== null) {
                        c.style.display = prev;
                        c.removeAttribute('data-nx-prev-display');
                    }
                });
            }
            p.remove();
        });
    }

    function removeAllButtons() {
        Array.prototype.forEach.call(document.querySelectorAll('a.' + BUTTON_CLASS), function (b) { b.remove(); });
    }

    function showPanel() {
        removeAllPanels();

        var menu = pickActiveMenu();
        if (!menu) { log('no active View=11 menu'); return false; }

        var wrap = menu.closest ? menu.closest('.BuildPageContent') : null;
        if (!wrap) wrap = findActiveWrap();
        if (!wrap) { log('no active wrap'); return false; }

        var content = wrap.querySelector('td.content-area');
        if (!content) { log('no content-area in wrap'); return false; }

        // Hide existing content-area children
        Array.prototype.forEach.call(content.children, function (c) {
            if (c.classList && c.classList.contains('nx-rblx-panel')) return;
            if (c.getAttribute('data-nx-prev-display') !== null) return;
            c.setAttribute('data-nx-prev-display', c.style.display || '');
            c.style.display = 'none';
        });

        // Force-show the whole chain
        wrap.style.setProperty('display', 'block', 'important');
        content.style.setProperty('display', 'table-cell', 'important');
        content.style.setProperty('visibility', 'visible', 'important');
        content.style.setProperty('opacity', '1', 'important');
        content.style.setProperty('vertical-align', 'top', 'important');

        var gid = detectGroupContext();
        var panel = buildPanel(gid);
        content.appendChild(panel);

        state.open = true;
        state.panelEl = panel;

        Array.prototype.forEach.call(wrap.querySelectorAll('a.tab-item'), function (a) {
            a.classList.toggle('tab-item-selected', a === menu);
        });

        updateRateLimit(panel);
        log('panel opened, gid=' + (gid || 'personal'));
        return true;
    }

    function hidePanel() {
        state.open = false;
        state.panelEl = null;
        if (state.rateTimer) { clearTimeout(state.rateTimer); state.rateTimer = null; }
        removeAllPanels();
    }

    function currentHash() {
        try {
            if (window.top && window.top !== window && window.top.location) {
                return (window.top.location.hash || '').replace(/^#/, '');
            }
        } catch (e) {}
        return (location.hash || '').replace(/^#/, '');
    }

    function setHash(v) {
        try {
            if (window.top && window.top !== window && window.top.location) {
                if (v) window.top.location.hash = v;
                else if (window.top.location.hash) window.top.location.hash = '';
                return;
            }
        } catch (e) {}
        if (v) location.hash = v;
        else if (location.hash) location.hash = '';
    }

    function retryOpen() {
        if (state.retryTimer) return;
        var tries = 0;
        state.retryTimer = setInterval(function () {
            tries++;
            if (currentHash() !== HASH) { clearInterval(state.retryTimer); state.retryTimer = null; return; }
            if (state.open && state.panelEl && document.body.contains(state.panelEl)) {
                clearInterval(state.retryTimer); state.retryTimer = null; return;
            }
            if (showPanel()) {
                clearInterval(state.retryTimer); state.retryTimer = null; return;
            }
            if (tries > 60) { clearInterval(state.retryTimer); state.retryTimer = null; }
        }, 50);
    }

    function handleHash() {
        var h = currentHash();
        if (h !== HASH) { if (state.open) hidePanel(); return; }
        if (state.open && state.panelEl && document.body.contains(state.panelEl)) return;
        if (!showPanel()) retryOpen();
    }

    function addButton() {
        var anchors = document.querySelectorAll('a.tab-item');
        for (var i = 0; i < anchors.length; i++) {
            var a = anchors[i];
            if (!/View=11\b/.test(a.getAttribute('href') || '')) continue;
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
                if (!state.open) retryOpen();
            }, true);
            menu.insertBefore(btn, a);
        }
    }

    function apply() {
        if (state.initialized) return;
        if (isTop()) { log('top window — skipping'); return; }
        var path = location.pathname;
        if (!/\/develop(\/|$)/.test(path) && !/\/develop\/groups(\/|$)/.test(path)) return;

        state.initialized = true;
        log('applying in', path);
        style();
        addButton();
        handleHash();
        retryOpen();

        state.topListener = function () { setTimeout(function () { handleHash(); if (!state.open && currentHash() === HASH) retryOpen(); }, 0); };
        try { window.top.addEventListener('hashchange', state.topListener); }
        catch (e) { state.selfListener = state.topListener; window.addEventListener('hashchange', state.selfListener); }

        state.observer = new MutationObserver(function () {
            if (!state.initialized) return;
            addButton();
            if (currentHash() === HASH) {
                if (!state.open || !state.panelEl || !document.body.contains(state.panelEl)) {
                    handleHash();
                    if (!state.open) retryOpen();
                }
            } else if (state.open) hidePanel();
        });
        state.observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    function teardown() {
        if (state.rateTimer) { clearTimeout(state.rateTimer); state.rateTimer = null; }
        if (state.retryTimer) { clearInterval(state.retryTimer); state.retryTimer = null; }
        if (state.observer) { state.observer.disconnect(); state.observer = null; }
        try { if (state.topListener && window.top) window.top.removeEventListener('hashchange', state.topListener); } catch (e) {}
        if (state.selfListener) window.removeEventListener('hashchange', state.selfListener);
        removeAllPanels();
        removeAllButtons();
        var s = document.getElementById(STYLE_ID); if (s) s.remove();
        var t = document.getElementById(TOAST_ID); if (t) t.remove();
        if (state.blobUrl) { URL.revokeObjectURL(state.blobUrl); state.blobUrl = null; }
        state.initialized = false;
        state.open = false;
    }

    window.NX.features.rbxlImport = { apply: apply, teardown: teardown };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
    else apply();
})();
