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
