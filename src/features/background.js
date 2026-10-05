(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STORE_KEY = 'nx_bg_v1';
    var STYLE_ID  = 'nx-bg-style';
    var ROW_ID    = 'nx-bg-row';

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

    var applied  = null;
    var built    = false;
    var uid      = 0;
    var lastRow  = null;
    var lastCss  = '';
    var themeBound = false;

    function dark() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    function themeVars() {
        if (dark()) {
            return {
                chipBorder: 'rgba(255,255,255,.25)', chipHover: '#fff', chipInk: '#ddd',
                noneBg: '#2a2a2a', noneInk: '#bbb', customBg: '#222',
                inputBg: '#1a1a1a', inputBorder: '#333', inputInk: '#eee', inputFocus: '#666',
                btnBg: '#222', btnHover: '#2a2a2a', orInk: '#888'
            };
        }
        return {
            chipBorder: 'rgba(0,0,0,.25)', chipHover: '#000', chipInk: '#333',
            noneBg: '#e6e6e6', noneInk: '#555', customBg: '#e0e0e0',
            inputBg: '#ffffff', inputBorder: '#c7cbce', inputInk: '#232527', inputFocus: '#0a84ff',
            btnBg: '#f2f4f5', btnHover: '#e4e8ec', orInk: '#7a7d80'
        };
    }

    function cssText() {
        var t = themeVars();
        return [
            '#nx-bg-row{display:block;width:100%;margin:8px 0 0;clear:both;position:relative;z-index:1}',
            '#nx-bg-row .nx-label{display:block}',
            '#nx-bg-row .nx-edit{display:block;text-align:right}',
            '#nx-bg-row .nx-edit a{cursor:pointer}',
            '#nx-bg-row .nx-panel{display:none;margin-top:8px}',
            '#nx-bg-row .nx-panel.open{display:block}',
            '#nx-bg-row .nx-chips{display:flex;flex-wrap:wrap;gap:4px;align-items:center}',
            '#nx-bg-row .nx-chip{width:20px;height:20px;border-radius:4px;cursor:pointer;border:1px solid ' + t.chipBorder + ';box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:' + t.chipInk + '}',
            '#nx-bg-row .nx-chip:hover{border-color:' + t.chipHover + '}',
            '#nx-bg-row .nx-chip.active{outline:1px solid ' + t.chipHover + ';outline-offset:1px}',
            '#nx-bg-row .nx-chip.none{background:' + t.noneBg + ';color:' + t.noneInk + ';font-size:10px;line-height:20px;font-family:inherit}',
            '#nx-bg-row .nx-chip.picker{background:conic-gradient(from 90deg,#f66,#fc6,#6f6,#6ff,#66f,#f6f,#f66)}',
            '#nx-bg-row .nx-chip.custom{background:' + t.customBg + '}',
            '#nx-bg-row .nx-subpanel{display:none;gap:6px;margin-top:8px;align-items:center;flex-wrap:wrap}',
            '#nx-bg-row .nx-subpanel.open{display:flex}',
            '#nx-bg-row .nx-subpanel input[type=text]{flex:1;min-width:0;background:' + t.inputBg + ';border:1px solid ' + t.inputBorder + ';color:' + t.inputInk + ';padding:4px 6px;border-radius:4px;font:inherit;font-size:12px}',
            '#nx-bg-row .nx-subpanel input[type=text]:focus{outline:none;border-color:' + t.inputFocus + '}',
            '#nx-bg-row .nx-subpanel input[type=color]{width:36px;height:26px;padding:0;border:1px solid ' + t.inputBorder + ';background:' + t.inputBg + ';border-radius:4px;cursor:pointer}',
            '#nx-bg-row .nx-subpanel .nx-btn{cursor:pointer;background:' + t.btnBg + ';border:1px solid ' + t.inputBorder + ';color:' + t.inputInk + ';padding:4px 10px;border-radius:4px;font-size:12px;text-decoration:none;display:inline-flex;align-items:center;gap:4px}',
            '#nx-bg-row .nx-subpanel .nx-btn:hover{background:' + t.btnHover + '}',
            '#nx-bg-row .nx-subpanel .nx-or{color:' + t.orInk + ';font-size:11px;padding:0 4px}',
            '#nx-bg-row .nx-subpanel input[type=file]{display:none}'
        ].join('');
    }

    function style() {
        var text = cssText();
        if (text === lastCss) return;
        lastCss = text;
        var s = document.getElementById(STYLE_ID);
        if (s) { s.textContent = text; return; }
        s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = text;
        document.head.appendChild(s);
    }

    function store() {
        try {
            var raw = GM_getValue(STORE_KEY, '{}');
            return typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
        } catch (e) { return {}; }
    }
    function save(s) { GM_setValue(STORE_KEY, JSON.stringify(s)); }
    function get(u) {
        var s = store();
        return (s.byUser && s.byUser[String(u)]) || null;
    }
    function set(u, bg) {
        var s = store();
        if (!s.byUser) s.byUser = {};
        if (bg) s.byUser[String(u)] = bg;
        else delete s.byUser[String(u)];
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

    function applyBg(bg) {
        if (applied === bg) return;
        var t = document.querySelector('.avatar-back');
        if (!t) return;
        var clear = ['background', 'background-image', 'background-color',
                     'background-size', 'background-position', 'background-repeat'];
        for (var i = 0; i < clear.length; i++) t.style.removeProperty(clear[i]);
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
        for (var i = 0; i < state.chips.length; i++) {
            var k = state.chips[i].dataset.key;
            var on = false;
            if (k === '__none__') on = !cur;
            else if (PRESETS[k]) on = cur && PRESETS[k] === cur;
            state.chips[i].classList.toggle('active', !!on);
        }
        state.pickerChip.classList.toggle('active', isSolid(cur));
        state.customChip.classList.toggle('active', isCustom(cur));
    }

    function build() {
        if (built && lastRow && lastRow.isConnected) return;
        built = false;

        var redraw = document.querySelector('.redraw-avatar');
        if (!redraw) return;
        if (!uid) uid = readUid();
        if (!uid) return;

        var old = document.getElementById(ROW_ID);
        if (old) old.remove();

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
                applyBg(PRESETS[k]);
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
        none.textContent = '\u2715';
        none.addEventListener('click', function () {
            set(uid, null);
            applied = null;
            applyBg(null);
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
            applyBg(v);
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
            applyBg(bg);
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
                applyBg(bg);
                paint(state);
                imgBox.classList.remove('open');
                fileInput.value = '';
            };
            r.readAsDataURL(f);
        });
        urlSet.addEventListener('click', function (e) { e.preventDefault(); commitUrl(); });
        urlInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); commitUrl(); }
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
        lastRow = row;
        built = true;
        var state = { chips: chips, pickerChip: pickerChip, customChip: customChip };
        paint(state);
    }

    function tick() {
        if (!uid) uid = readUid();
        if (!uid) return;
        applyBg(get(uid));
        build();
    }

    function onThemeChange() {
        style();
        applied = null;
        tick();
    }
    function onStorage(e) { if (e.key === 'rbx_theme_v1') onThemeChange(); }

    function bindTheme() {
        if (themeBound) return;
        themeBound = true;
        window.addEventListener('storage', onStorage);
        window.addEventListener('octane-theme-change', onThemeChange);
    }
    function unbindTheme() {
        if (!themeBound) return;
        themeBound = false;
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('octane-theme-change', onThemeChange);
    }

    window.NX.features.background = {
        apply: function () {
            style();
            bindTheme();
            tick();
        },
        refresh: tick,
        teardown: function () {
            unbindTheme();
            var row = document.getElementById(ROW_ID);
            if (row) row.remove();
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
            lastCss = '';
            applied = null;
            built = false;
            lastRow = null;
        }
    };
})();
