(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var LAYER_ID = 'nx-bg-layer';
    var PANEL_ID = 'nx-bg-panel';
    var PANEL_CSS_ID = 'nx-bg-panel-style';

    var KEY = {
        url: 'nx_bg_url',
        type: 'nx_bg_type',
        dim: 'nx_bg_dim',
        blur: 'nx_bg_blur',
        color: 'nx_bg_color',
        mode: 'nx_bg_mode',
        x: 'nx_bg_x',
        y: 'nx_bg_y',
        scale: 'nx_bg_scale',
        locked: 'nx_bg_locked',
        px: 'nx_bg_panel_x',
        py: 'nx_bg_panel_y',
        pmin: 'nx_bg_panel_min'
    };

    function isDarkTheme() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    function get(k, fallback) {
        var v = GM_getValue(k, fallback);
        return v === undefined || v === null ? fallback : v;
    }

    function set(k, v) { GM_setValue(k, v); }

    function num(k, fallback) {
        var v = parseFloat(get(k, fallback));
        return isNaN(v) ? fallback : v;
    }

    function getUrl() { return get(KEY.url, ''); }
    function getType() { return get(KEY.type, 'image'); }
    function getMode() { return get(KEY.mode, 'fit'); }
    function getDim() { return Math.max(0, Math.min(0.95, num(KEY.dim, 0.35))); }
    function getBlur() { return Math.max(0, Math.min(20, num(KEY.blur, 0))); }
    function getColor() { return get(KEY.color, '#000000'); }
    function getX() { return num(KEY.x, 0); }
    function getY() { return num(KEY.y, 0); }
    function getScale() { return Math.max(0.3, Math.min(3, num(KEY.scale, 1))); }
    function isLocked() { return get(KEY.locked, false) === true; }
    function isPanelMinimized() { return get(KEY.pmin, false) === true; }

    function getPanelX() {
        var v = get(KEY.px, null);
        if (v === null || v === '') return null;
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
    }

    function getPanelY() {
        var v = get(KEY.py, null);
        if (v === null || v === '') return null;
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
    }

    function detectType(url) {
        if (!url) return 'image';
        var clean = url.split('?')[0].toLowerCase();
        if (/\.(mp4|webm|ogg|mov|m4v)$/.test(clean)) return 'video';
        return 'image';
    }

    function getLayer() {
        return document.getElementById(LAYER_ID);
    }

    function applyLayerStyles(layer) {
        var scale = getScale();
        var blur = getBlur();
        var x = getX();
        var y = getY();
        layer.style.transform =
            'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
        layer.style.filter = blur > 0 ? ('blur(' + blur + 'px)') : 'none';
    }

    function buildLayer() {
        var existing = getLayer();
        if (existing) existing.remove();

        var url = getUrl();
        if (!url) return;

        var type = getType() === 'video' ? 'video' : 'image';
        if (type === 'image' && detectType(url) === 'video') type = 'video';

        var layer = document.createElement('div');
        layer.id = LAYER_ID;
        layer.style.cssText =
            'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
            'z-index:-2;pointer-events:none;overflow:hidden;' +
            'transition:transform 0.08s linear;' +
            'will-change:transform;';

        var media;
        if (type === 'video') {
            media = document.createElement('video');
            media.src = url;
            media.autoplay = true;
            media.loop = true;
            media.muted = true;
            media.playsInline = true;
            media.style.cssText =
                'position:absolute;top:50%;left:50%;' +
                'transform:translate(-50%,-50%);' +
                'min-width:100%;min-height:100%;' +
                'width:auto;height:auto;object-fit:cover;';
        } else {
            media = document.createElement('img');
            media.src = url;
            media.style.cssText =
                'position:absolute;top:50%;left:50%;' +
                'transform:translate(-50%,-50%);' +
                'min-width:100%;min-height:100%;' +
                'width:auto;height:auto;object-fit:cover;';
        }

        var mode = getMode();
        if (mode === 'fit') {
            media.style.objectFit = 'cover';
        } else if (mode === 'contain') {
            media.style.objectFit = 'contain';
            media.style.background = getColor();
        } else if (mode === 'tile') {
            media.style.display = 'none';
            layer.style.background = 'url("' + url + '")';
            layer.style.backgroundRepeat = 'repeat';
            layer.style.backgroundSize = 'auto';
        }

        if (media.style.display !== 'none') layer.appendChild(media);
        document.documentElement.appendChild(layer);

        applyLayerStyles(layer);

        var overlay = getOrCreateOverlay();
        updateOverlay(overlay);
    }

    function getOrCreateOverlay() {
        var el = document.getElementById('nx-bg-overlay');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'nx-bg-overlay';
        el.style.cssText =
            'position:fixed;inset:0;z-index:-1;pointer-events:none;';
        document.documentElement.appendChild(el);
        return el;
    }

    function updateOverlay(el) {
        if (!el) el = getOrCreateOverlay();
        var dim = getDim();
        var color = getColor();
        var rgb = hexToRgb(color);
        el.style.background = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + dim + ')';
    }

    function hexToRgb(hex) {
        var h = (hex || '#000000').replace('#', '');
        if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        var n = parseInt(h, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function ensurePageTransparent() {
        var s = document.getElementById('nx-bg-transparent');
        if (s) s.remove();
        s = document.createElement('style');
        s.id = 'nx-bg-transparent';
        s.textContent = [
            'html,body{background:transparent !important;}',
            '.main-0-2-45, [class*="main-0-2-"]{background:transparent !important;}',
            '[class*="card-0-2-"], [class*="card-d"], .card{background:' + (isDarkTheme() ? 'rgba(35,37,39,0.85)' : 'rgba(255,255,255,0.85)') + ' !important;backdrop-filter:blur(6px);}'
        ].join('');
        document.head.appendChild(s);
    }

    function removePageTransparent() {
        var s = document.getElementById('nx-bg-transparent');
        if (s) s.remove();
    }

    function ensurePanelStyle() {
        var old = document.getElementById(PANEL_CSS_ID);
        if (old) old.remove();
        var dark = isDarkTheme();
        var bg = dark ? 'rgba(35,37,39,0.95)' : 'rgba(255,255,255,0.96)';
        var border = dark ? '#3a3d40' : '#c7cbce';
        var text = dark ? '#e0e0e0' : '#232527';
        var muted = dark ? '#7a7d80' : '#6a6d70';
        var inputBg = dark ? '#1a1c1e' : '#ffffff';
        var s = document.createElement('style');
        s.id = PANEL_CSS_ID;
        s.textContent = [
            '#' + PANEL_ID + '{position:fixed;z-index:2147483646;background:' + bg + ';color:' + text + ';border:1px solid ' + border + ';border-radius:8px;padding:10px;width:280px;font-family:"Source Sans Pro","Segoe UI",sans-serif;font-size:12px;box-shadow:0 6px 24px rgba(0,0,0,0.35);backdrop-filter:blur(6px);user-select:none;}',
            '#' + PANEL_ID + ' .nxbg-head{display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:13px;margin-bottom:8px;cursor:grab;padding:2px 0;}',
            '#' + PANEL_ID + ' .nxbg-head:active{cursor:grabbing;}',
            '#' + PANEL_ID + ' .nxbg-min{background:none;border:0;color:' + muted + ';cursor:pointer;font-size:16px;line-height:1;padding:0 4px;}',
            '#' + PANEL_ID + ' .nxbg-min:hover{color:' + text + ';}',
            '#' + PANEL_ID + ' input[type=text]{width:100%;background:' + inputBg + ';color:' + text + ';border:1px solid ' + border + ';border-radius:4px;padding:6px 8px;font-family:inherit;font-size:12px;box-sizing:border-box;margin-bottom:8px;}',
            '#' + PANEL_ID + ' input[type=text]:focus{outline:none;border-color:#0a84ff;}',
            '#' + PANEL_ID + ' select{width:100%;background:' + inputBg + ';color:' + text + ';border:1px solid ' + border + ';border-radius:4px;padding:6px 8px;font-family:inherit;font-size:12px;margin-bottom:8px;box-sizing:border-box;}',
            '#' + PANEL_ID + ' label{display:block;color:' + muted + ';font-size:11px;margin:6px 0 2px;}',
            '#' + PANEL_ID + ' input[type=range]{width:100%;}',
            '#' + PANEL_ID + ' input[type=color]{width:100%;height:28px;border:1px solid ' + border + ';border-radius:4px;background:transparent;cursor:pointer;}',
            '#' + PANEL_ID + ' .nxbg-row{display:flex;gap:6px;align-items:center;}',
            '#' + PANEL_ID + ' .nxbg-row > *{flex:1;}',
            '#' + PANEL_ID + ' .nxbg-buttons{display:flex;gap:6px;margin-top:8px;}',
            '#' + PANEL_ID + ' button.nxbg-apply{flex:1;background:#0a84ff;color:#fff;border:0;border-radius:4px;padding:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;}',
            '#' + PANEL_ID + ' button.nxbg-apply:hover{background:#0a76e0;}',
            '#' + PANEL_ID + ' button.nxbg-clear{background:transparent;color:' + text + ';border:1px solid ' + border + ';border-radius:4px;padding:6px 10px;font-size:12px;cursor:pointer;font-family:inherit;}',
            '#' + PANEL_ID + ' button.nxbg-clear:hover{background:' + (dark ? '#2a2c2e' : '#e8eef5') + ';}',
            '#' + PANEL_ID + '.nxbg-collapsed{padding:6px 10px;}',
            '#' + PANEL_ID + '.nxbg-collapsed .nxbg-head{margin-bottom:0;}',
            '#' + PANEL_ID + '.nxbg-collapsed .nxbg-body{display:none;}',
            '#' + PANEL_ID + ' .nxbg-hint{color:' + muted + ';font-size:10px;margin-top:6px;line-height:1.4;}'
        ].join('');
        document.head.appendChild(s);
    }

    function clampPanelPosition(panel) {
        var rect = panel.getBoundingClientRect();
        var x = rect.left;
        var y = rect.top;
        var maxX = window.innerWidth - rect.width - 4;
        var maxY = window.innerHeight - rect.height - 4;
        var newX = Math.max(4, Math.min(maxX, x));
        var newY = Math.max(4, Math.min(maxY, y));
        panel.style.left = newX + 'px';
        panel.style.top = newY + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        return { x: newX, y: newY };
    }

    function savePanelPosition(panel) {
        var rect = panel.getBoundingClientRect();
        set(KEY.px, Math.round(rect.left));
        set(KEY.py, Math.round(rect.top));
    }

    function applyPanelPosition(panel) {
        var x = getPanelX();
        var y = getPanelY();
        if (x === null || y === null) {
            panel.style.right = '16px';
            panel.style.bottom = '16px';
            panel.style.left = 'auto';
            panel.style.top = 'auto';
            return;
        }
        panel.style.left = x + 'px';
        panel.style.top = y + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        requestAnimationFrame(function() {
            var clamped = clampPanelPosition(panel);
            if (clamped.x !== x || clamped.y !== y) {
                savePanelPosition(panel);
            }
        });
    }

    function attachPanelDrag(panel) {
        var head = panel.querySelector('.nxbg-head');
        if (!head) return;
        var dragging = false;
        var offsetX = 0;
        var offsetY = 0;

        head.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            if (e.target.closest('.nxbg-min')) return;
            dragging = true;
            var rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!dragging) return;
            var x = e.clientX - offsetX;
            var y = e.clientY - offsetY;
            panel.style.left = x + 'px';
            panel.style.top = y + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', function() {
            if (!dragging) return;
            dragging = false;
            clampPanelPosition(panel);
            savePanelPosition(panel);
        });
    }

    function buildPanel() {
        var old = document.getElementById(PANEL_ID);
        if (old) old.remove();
        ensurePanelStyle();

        var minimized = isPanelMinimized();

        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        if (minimized) panel.classList.add('nxbg-collapsed');

        var head = document.createElement('div');
        head.className = 'nxbg-head';

        var title = document.createElement('span');
        title.textContent = 'Custom Background';

        var min = document.createElement('button');
        min.className = 'nxbg-min';
        min.textContent = minimized ? '+' : '\u2013';
        min.title = minimized ? 'Expand' : 'Minimize';
        min.onclick = function(e) {
            e.stopPropagation();
            var nowMin = !panel.classList.contains('nxbg-collapsed');
            panel.classList.toggle('nxbg-collapsed');
            min.textContent = nowMin ? '+' : '\u2013';
            min.title = nowMin ? 'Expand' : 'Minimize';
            set(KEY.pmin, nowMin);
            requestAnimationFrame(function() {
                clampPanelPosition(panel);
                savePanelPosition(panel);
            });
        };

        head.appendChild(title);
        head.appendChild(min);
        panel.appendChild(head);

        var body = document.createElement('div');
        body.className = 'nxbg-body';

        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'URL of image, gif, or video';
        input.value = getUrl();
        body.appendChild(input);

        var typeRow = document.createElement('div');
        typeRow.className = 'nxbg-row';
        var typeSel = document.createElement('select');
        ['image', 'video'].forEach(function(t) {
            var o = document.createElement('option');
            o.value = t;
            o.textContent = t;
            if (getType() === t) o.selected = true;
            typeSel.appendChild(o);
        });
        typeRow.appendChild(typeSel);

        var modeSel = document.createElement('select');
        [['fit', 'Cover'], ['contain', 'Contain'], ['tile', 'Tile']].forEach(function(m) {
            var o = document.createElement('option');
            o.value = m[0];
            o.textContent = m[1];
            if (getMode() === m[0]) o.selected = true;
            modeSel.appendChild(o);
        });
        typeRow.appendChild(modeSel);
        body.appendChild(typeRow);

        var colorLabel = document.createElement('label');
        colorLabel.textContent = 'Overlay color';
        body.appendChild(colorLabel);

        var colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = getColor();
        colorInput.oninput = function() {
            set(KEY.color, this.value);
            updateOverlay();
        };
        body.appendChild(colorInput);

        var dimLabel = document.createElement('label');
        dimLabel.textContent = 'Dim: ' + Math.round(getDim() * 100) + '%';
        body.appendChild(dimLabel);

        var dimInput = document.createElement('input');
        dimInput.type = 'range';
        dimInput.min = '0';
        dimInput.max = '0.95';
        dimInput.step = '0.05';
        dimInput.value = String(getDim());
        dimInput.oninput = function() {
            dimLabel.textContent = 'Dim: ' + Math.round(this.value * 100) + '%';
        };
        dimInput.onchange = function() {
            set(KEY.dim, String(this.value));
            updateOverlay();
        };
        body.appendChild(dimInput);

        var blurLabel = document.createElement('label');
        blurLabel.textContent = 'Blur: ' + getBlur() + 'px';
        body.appendChild(blurLabel);

        var blurInput = document.createElement('input');
        blurInput.type = 'range';
        blurInput.min = '0';
        blurInput.max = '20';
        blurInput.step = '1';
        blurInput.value = String(getBlur());
        blurInput.oninput = function() {
            blurLabel.textContent = 'Blur: ' + this.value + 'px';
        };
        blurInput.onchange = function() {
            set(KEY.blur, String(this.value));
            var layer = getLayer();
            if (layer) applyLayerStyles(layer);
        };
        body.appendChild(blurInput);

        var scaleLabel = document.createElement('label');
        scaleLabel.textContent = 'Scale: ' + Math.round(getScale() * 100) + '%';
        body.appendChild(scaleLabel);

        var scaleInput = document.createElement('input');
        scaleInput.type = 'range';
        scaleInput.min = '0.3';
        scaleInput.max = '3';
        scaleInput.step = '0.05';
        scaleInput.value = String(getScale());
        scaleInput.oninput = function() {
            scaleLabel.textContent = 'Scale: ' + Math.round(this.value * 100) + '%';
        };
        scaleInput.onchange = function() {
            set(KEY.scale, String(this.value));
            var layer = getLayer();
            if (layer) applyLayerStyles(layer);
        };
        body.appendChild(scaleInput);

        var lockRow = document.createElement('div');
        lockRow.className = 'nxbg-row';
        var lockLabel = document.createElement('label');
        lockLabel.textContent = 'Lock background drag';
        lockLabel.style.margin = '6px 0 2px';
        var lockInput = document.createElement('input');
        lockInput.type = 'checkbox';
        lockInput.checked = isLocked();
        lockInput.onchange = function() {
            set(KEY.locked, this.checked);
        };
        lockRow.appendChild(lockLabel);
        lockRow.appendChild(lockInput);
        body.appendChild(lockRow);

        var resetRow = document.createElement('div');
        resetRow.className = 'nxbg-buttons';
        var resetBtn = document.createElement('button');
        resetBtn.className = 'nxbg-clear';
        resetBtn.textContent = 'Reset Position';
        resetBtn.onclick = function() {
            set(KEY.x, 0);
            set(KEY.y, 0);
            set(KEY.scale, '1');
            scaleInput.value = '1';
            scaleLabel.textContent = 'Scale: 100%';
            var layer = getLayer();
            if (layer) applyLayerStyles(layer);
        };
        resetRow.appendChild(resetBtn);
        body.appendChild(resetRow);

        var btns = document.createElement('div');
        btns.className = 'nxbg-buttons';

        var apply = document.createElement('button');
        apply.className = 'nxbg-apply';
        apply.textContent = 'Apply';
        apply.onclick = function() {
            var url = input.value.trim();
            if (url && !/^https?:\/\//i.test(url)) {
                alert('URL must start with http:// or https://');
                return;
            }
            set(KEY.url, url);
            set(KEY.type, typeSel.value);
            set(KEY.mode, modeSel.value);
            set(KEY.dim, dimInput.value);
            set(KEY.blur, blurInput.value);
            set(KEY.scale, scaleInput.value);
            set(KEY.color, colorInput.value);
            rebuild();
        };

        var clear = document.createElement('button');
        clear.className = 'nxbg-clear';
        clear.textContent = 'Clear';
        clear.onclick = function() {
            set(KEY.url, '');
            input.value = '';
            rebuild();
        };

        btns.appendChild(apply);
        btns.appendChild(clear);
        body.appendChild(btns);

        var hint = document.createElement('div');
        hint.className = 'nxbg-hint';
        hint.textContent = 'Drag this panel by its title bar. Position and size are saved.';
        body.appendChild(hint);

        panel.appendChild(body);
        document.body.appendChild(panel);

        applyPanelPosition(panel);
        attachPanelDrag(panel);

        window.addEventListener('resize', function() {
            if (!document.getElementById(PANEL_ID)) return;
            clampPanelPosition(panel);
            savePanelPosition(panel);
        });
    }

    function rebuild() {
        removePageTransparent();
        var layer = getLayer();
        if (layer) layer.remove();
        var overlay = document.getElementById('nx-bg-overlay');
        if (overlay) overlay.remove();
        var url = getUrl();
        if (!url) {
            buildPanel();
            return;
        }
        ensurePageTransparent();
        buildLayer();
        buildPanel();
    }

    function watchUrl() {
        var last = location.href;
        setInterval(function() {
            if (location.href !== last) {
                last = location.href;
                if (getUrl() && !getLayer()) {
                    ensurePageTransparent();
                    buildLayer();
                }
                if (!document.getElementById(PANEL_ID)) buildPanel();
            }
        }, 400);
    }

    window.NX.features.customBackground = {
        apply: function() {
            if (getUrl()) {
                ensurePageTransparent();
                buildLayer();
            }
            buildPanel();
            watchUrl();
        },
        teardown: function() {
            var layer = getLayer();
            if (layer) layer.remove();
            var overlay = document.getElementById('nx-bg-overlay');
            if (overlay) overlay.remove();
            var panel = document.getElementById(PANEL_ID);
            if (panel) panel.remove();
            var ps = document.getElementById(PANEL_CSS_ID);
            if (ps) ps.remove();
            removePageTransparent();
        }
    };

})();
