(function() {
    'use strict';

    if (window.top !== window.self) return;

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var LAYER_ID = 'nx-bg-layer';
    var PANEL_ID = 'nx-bg-panel';
    var CSS_ID = 'nx-bg-panel-style';
    var TRANS_ID = 'nx-bg-transparent';

    var K = {
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

    var hidden = false;
    var watch = null;

    function dark() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    function get(k, d) {
        var v = GM_getValue(k, d);
        return v === undefined || v === null ? d : v;
    }
    function set(k, v) { GM_setValue(k, v); }
    function num(k, d) {
        var v = parseFloat(get(k, d));
        return isNaN(v) ? d : v;
    }

    function url() { return get(K.url, ''); }
    function type() { return get(K.type, 'image'); }
    function mode() { return get(K.mode, 'fit'); }
    function dim() { return Math.max(0, Math.min(0.95, num(K.dim, 0.35))); }
    function blur() { return Math.max(0, Math.min(20, num(K.blur, 0))); }
    function color() { return get(K.color, '#000000'); }
    function x() { return num(K.x, 0); }
    function y() { return num(K.y, 0); }
    function scale() { return Math.max(0.3, Math.min(3, num(K.scale, 1))); }
    function locked() { return get(K.locked, false) === true; }
    function minimized() { return get(K.pmin, false) === true; }

    function panelX() {
        var v = get(K.px, null);
        if (v === null || v === '') return null;
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
    }
    function panelY() {
        var v = get(K.py, null);
        if (v === null || v === '') return null;
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
    }

    function detectType(u) {
        if (!u) return 'image';
        var c = u.split('?')[0].toLowerCase();
        return /\.(mp4|webm|ogg|mov|m4v)$/.test(c) ? 'video' : 'image';
    }

    function layer() { return document.getElementById(LAYER_ID); }
    function overlay() {
        var el = document.getElementById('nx-bg-overlay');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'nx-bg-overlay';
        el.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;';
        document.documentElement.appendChild(el);
        return el;
    }

    function removeAllPanels() {
        document.querySelectorAll('#' + PANEL_ID).forEach(function (el) { el.remove(); });
    }

    function hexRgb(hex) {
        var h = (hex || '#000000').replace('#', '');
        if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        var n = parseInt(h, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function paintLayer(el) {
        el.style.transform = 'translate(' + x() + 'px,' + y() + 'px) scale(' + scale() + ')';
        el.style.filter = blur() > 0 ? 'blur(' + blur() + 'px)' : 'none';
    }

    function paintOverlay() {
        var el = overlay();
        var rgb = hexRgb(color());
        el.style.background = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + dim() + ')';
    }

    function buildLayer() {
        var old = layer();
        if (old) old.remove();

        var u = url();
        if (!u) return;

        var t = type() === 'video' ? 'video' : 'image';
        if (t === 'image' && detectType(u) === 'video') t = 'video';

        var el = document.createElement('div');
        el.id = LAYER_ID;
        el.style.cssText =
            'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
            'z-index:-2;pointer-events:none;overflow:hidden;' +
            'transition:transform 0.08s linear;will-change:transform;';

        var media;
        if (t === 'video') {
            media = document.createElement('video');
            media.src = u;
            media.autoplay = true;
            media.loop = true;
            media.muted = true;
            media.playsInline = true;
        } else {
            media = document.createElement('img');
            media.src = u;
        }
        media.style.cssText =
            'position:absolute;top:50%;left:50%;' +
            'transform:translate(-50%,-50%);' +
            'min-width:100%;min-height:100%;' +
            'width:auto;height:auto;object-fit:cover;';

        var m = mode();
        if (m === 'fit') {
            media.style.objectFit = 'cover';
        } else if (m === 'contain') {
            media.style.objectFit = 'contain';
            media.style.background = color();
        } else if (m === 'tile') {
            media.style.display = 'none';
            el.style.background = 'url("' + u + '")';
            el.style.backgroundRepeat = 'repeat';
            el.style.backgroundSize = 'auto';
        }

        if (media.style.display !== 'none') el.appendChild(media);
        document.documentElement.appendChild(el);

        paintLayer(el);
        paintOverlay();
    }

    // --- NEW: reach into same-origin iframes (theme2020/home, theme2020/chat)
    //     and strip their own backgrounds too. Without this, those iframes
    //     paint solid rectangles over the top of our background layer.
    function makeIframesTransparent() {
        var iframes = document.querySelectorAll('iframe');
        iframes.forEach(function(frame) {
            try {
                var doc = frame.contentDocument;
                if (!doc || !doc.head) return;

                var styleId = 'nx-bg-transparent-iframe';
                var existing = doc.getElementById(styleId);
                if (existing) existing.remove();

                var style = doc.createElement('style');
                style.id = styleId;
                style.textContent = [
                    'html,body{background:transparent !important;}',
                    'body{color-scheme:dark;}',
                    '.container-main,.content,.section-content,.main-content{background:transparent !important;}',
                    '[class*="card-0-2-"]{background:rgba(35,37,39,0.85) !important;backdrop-filter:blur(6px);}',
                    'html.octane-dark body{background:transparent !important;}'
                ].join('');
                doc.head.appendChild(style);
            } catch (e) {
                // Cross-origin iframe — nothing we can do here, skip it.
            }
        });
    }

    function pageTransparent() {
        var existing = document.getElementById(TRANS_ID);
        if (existing) existing.remove();

        var isDark = dark();
        var cardBackground = isDark
            ? 'rgba(35,37,39,0.85)'
            : 'rgba(255,255,255,0.85)';

        var style = document.createElement('style');
        style.id = TRANS_ID;
        style.textContent = [
            // Base page
            'html,body{background:transparent !important;}',

            // Main content wrapper around the iframe / cards
            '.main-0-2-8,.main-0-2-45,[class*="main-0-2-"]{background:transparent !important;}',

            // The dark-mode overlay Octane slaps over content
            '.octane-nav-offset{background:transparent !important;}',
            'html.octane-dark .octane-nav-offset{background:transparent !important;}',
            'html.octane-dark .octane-nav-offset .bg-white{background:transparent !important;}',

            // Top announcement / alert bar
            '.alertBg-0-2-1,.alertBg-d0-0-2-5,[class*="alertBg-"]{background:transparent !important;}',
            '.fakeAlert-0-2-4{background:transparent !important;}',

            // Iframe elements themselves — the document inside gets its own
            // style injected by makeIframesTransparent().
            '.main-0-2-8 iframe,.octane-nav-offset iframe{background:transparent !important;}',

            // Cards keep a soft backdrop so text stays readable
            '[class*="card-0-2-"]{background:' + cardBackground + ' !important;backdrop-filter:blur(6px);}'
        ].join('');

        document.head.appendChild(style);

        // Now reach into the iframes.
        makeIframesTransparent();

        // If they load lazily, try again after the fact.
        document.querySelectorAll('iframe').forEach(function(frame) {
            if (!frame.dataset.nxBgBound) {
                frame.dataset.nxBgBound = '1';
                frame.addEventListener('load', function() {
                    if (url()) makeIframesTransparent();
                });
            }
        });

        // Rebuild stylesheet when the theme flips, so card colors update.
        if (!document.body.dataset.nxBgThemeWatch) {
            document.body.dataset.nxBgThemeWatch = '1';
            window.addEventListener('octane-theme-change', function() {
                if (url()) pageTransparent();
            });
            window.addEventListener('storage', function(event) {
                if (event.key === 'rbx_theme_v1' && url()) pageTransparent();
            });
        }
    }

    function removeTransparent() {
        var s = document.getElementById(TRANS_ID);
        if (s) s.remove();

        // Also clean up the iframe-side styles we injected.
        document.querySelectorAll('iframe').forEach(function(frame) {
            try {
                var doc = frame.contentDocument;
                if (!doc) return;
                var style = doc.getElementById('nx-bg-transparent-iframe');
                if (style) style.remove();
            } catch (e) { /* cross-origin, skip */ }
        });
    }

    function panelStyle() {
        var old = document.getElementById(CSS_ID);
        if (old) old.remove();
        var d = dark();
        var bg = d ? 'rgba(35,37,39,0.95)' : 'rgba(255,255,255,0.96)';
        var border = d ? '#3a3d40' : '#c7cbce';
        var text = d ? '#e0e0e0' : '#232527';
        var muted = d ? '#7a7d80' : '#6a6d70';
        var inputBg = d ? '#1a1c1e' : '#ffffff';
        var s = document.createElement('style');
        s.id = CSS_ID;
        s.textContent = [
            '#' + PANEL_ID + '{position:fixed;z-index:2147483646;background:' + bg + ';',
            'color:' + text + ';border:1px solid ' + border + ';border-radius:8px;',
            'padding:10px;width:280px;font-family:inherit;font-size:12px;',
            'box-shadow:0 6px 24px rgba(0,0,0,0.35);backdrop-filter:blur(6px);',
            'user-select:none;}',
            '#' + PANEL_ID + ' .nxbg-head{display:flex;align-items:center;',
            'justify-content:space-between;font-weight:600;font-size:13px;',
            'margin-bottom:8px;cursor:grab;padding:2px 0;}',
            '#' + PANEL_ID + ' .nxbg-head:active{cursor:grabbing;}',
            '#' + PANEL_ID + ' .nxbg-head-title{flex:1;}',
            '#' + PANEL_ID + ' .nxbg-head-actions{display:flex;gap:2px;}',
            '#' + PANEL_ID + ' .nxbg-min,#' + PANEL_ID + ' .nxbg-close{',
            'background:none;border:0;color:' + muted + ';cursor:pointer;',
            'font-size:16px;line-height:1;padding:0 4px;}',
            '#' + PANEL_ID + ' .nxbg-min:hover{color:' + text + ';}',
            '#' + PANEL_ID + ' .nxbg-close:hover{color:#e5484d;}',
            '#' + PANEL_ID + ' input[type=text],#' + PANEL_ID + ' select{',
            'width:100%;background:' + inputBg + ';color:' + text + ';',
            'border:1px solid ' + border + ';border-radius:4px;padding:6px 8px;',
            'font-family:inherit;font-size:12px;margin-bottom:8px;box-sizing:border-box;}',
            '#' + PANEL_ID + ' input[type=text]:focus{outline:none;border-color:#0a84ff;}',
            '#' + PANEL_ID + ' label{display:block;color:' + muted + ';font-size:11px;margin:6px 0 2px;}',
            '#' + PANEL_ID + ' input[type=range]{width:100%;}',
            '#' + PANEL_ID + ' input[type=color]{width:100%;height:28px;',
            'border:1px solid ' + border + ';border-radius:4px;background:transparent;cursor:pointer;}',
            '#' + PANEL_ID + ' .nxbg-row{display:flex;gap:6px;align-items:center;}',
            '#' + PANEL_ID + ' .nxbg-row > *{flex:1;}',
            '#' + PANEL_ID + ' .nxbg-buttons{display:flex;gap:6px;margin-top:8px;}',
            '#' + PANEL_ID + ' button.nxbg-apply{flex:1;background:#0a84ff;color:#fff;',
            'border:0;border-radius:4px;padding:6px;font-size:12px;font-weight:600;',
            'cursor:pointer;font-family:inherit;}',
            '#' + PANEL_ID + ' button.nxbg-apply:hover{background:#0a76e0;}',
            '#' + PANEL_ID + ' button.nxbg-clear{background:transparent;color:' + text + ';',
            'border:1px solid ' + border + ';border-radius:4px;padding:6px 10px;',
            'font-size:12px;cursor:pointer;font-family:inherit;}',
            '#' + PANEL_ID + '.nxbg-collapsed{padding:6px 10px;}',
            '#' + PANEL_ID + '.nxbg-collapsed .nxbg-head{margin-bottom:0;}',
            '#' + PANEL_ID + '.nxbg-collapsed .nxbg-body{display:none;}',
            '#' + PANEL_ID + ' .nxbg-hint{color:' + muted + ';font-size:10px;',
            'margin-top:6px;line-height:1.4;}'
        ].join('');
        document.head.appendChild(s);
    }

    function clampPanel(p) {
        var r = p.getBoundingClientRect();
        var nx = Math.max(4, Math.min(window.innerWidth - r.width - 4, r.left));
        var ny = Math.max(4, Math.min(window.innerHeight - r.height - 4, r.top));
        p.style.left = nx + 'px';
        p.style.top = ny + 'px';
        p.style.right = 'auto';
        p.style.bottom = 'auto';
        return { x: nx, y: ny };
    }

    function savePanel(p) {
        var r = p.getBoundingClientRect();
        set(K.px, Math.round(r.left));
        set(K.py, Math.round(r.top));
    }

    function placePanel(p) {
        var x0 = panelX();
        var y0 = panelY();
        if (x0 === null || y0 === null) {
            p.style.right = '16px';
            p.style.bottom = '16px';
            p.style.left = 'auto';
            p.style.top = 'auto';
            return;
        }
        p.style.left = x0 + 'px';
        p.style.top = y0 + 'px';
        p.style.right = 'auto';
        p.style.bottom = 'auto';
        requestAnimationFrame(function() {
            var c = clampPanel(p);
            if (c.x !== x0 || c.y !== y0) savePanel(p);
        });
    }

    function dragPanel(p) {
        var head = p.querySelector('.nxbg-head');
        if (!head) return;
        var active = false, ox = 0, oy = 0;

        head.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            if (e.target.closest('.nxbg-min')) return;
            if (e.target.closest('.nxbg-close')) return;
            active = true;
            var r = p.getBoundingClientRect();
            ox = e.clientX - r.left;
            oy = e.clientY - r.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!active) return;
            p.style.left = (e.clientX - ox) + 'px';
            p.style.top = (e.clientY - oy) + 'px';
            p.style.right = 'auto';
            p.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', function() {
            if (!active) return;
            active = false;
            clampPanel(p);
            savePanel(p);
        });
    }

    function buildPanel() {
        if (hidden) return;
        removeAllPanels();
        panelStyle();

        var mini = minimized();

        var p = document.createElement('div');
        p.id = PANEL_ID;
        if (mini) p.classList.add('nxbg-collapsed');

        var head = document.createElement('div');
        head.className = 'nxbg-head';

        var title = document.createElement('span');
        title.className = 'nxbg-head-title';
        title.textContent = 'Custom Background';

        var actions = document.createElement('div');
        actions.className = 'nxbg-head-actions';

        var min = document.createElement('button');
        min.className = 'nxbg-min';
        min.textContent = mini ? '+' : '\u2013';
        min.title = mini ? 'Expand' : 'Minimize';
        min.onclick = function(e) {
            e.stopPropagation();
            var nowMin = !p.classList.contains('nxbg-collapsed');
            p.classList.toggle('nxbg-collapsed');
            min.textContent = nowMin ? '+' : '\u2013';
            min.title = nowMin ? 'Expand' : 'Minimize';
            set(K.pmin, nowMin);
            requestAnimationFrame(function() { clampPanel(p); savePanel(p); });
        };

        var close = document.createElement('button');
        close.className = 'nxbg-close';
        close.textContent = '\u00d7';
        close.title = 'Hide panel';
        close.onclick = function(e) {
            e.stopPropagation();
            hidden = true;
            removeAllPanels();
        };

        actions.appendChild(min);
        actions.appendChild(close);
        head.appendChild(title);
        head.appendChild(actions);
        p.appendChild(head);

        var body = document.createElement('div');
        body.className = 'nxbg-body';

        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'URL of image, gif, or video';
        input.value = url();
        body.appendChild(input);

        var row = document.createElement('div');
        row.className = 'nxbg-row';

        var typeSel = document.createElement('select');
        ['image', 'video'].forEach(function(t) {
            var o = document.createElement('option');
            o.value = t;
            o.textContent = t;
            if (type() === t) o.selected = true;
            typeSel.appendChild(o);
        });
        row.appendChild(typeSel);

        var modeSel = document.createElement('select');
        [['fit', 'Cover'], ['contain', 'Contain'], ['tile', 'Tile']].forEach(function(m) {
            var o = document.createElement('option');
            o.value = m[0];
            o.textContent = m[1];
            if (mode() === m[0]) o.selected = true;
            modeSel.appendChild(o);
        });
        row.appendChild(modeSel);
        body.appendChild(row);

        var cLabel = document.createElement('label');
        cLabel.textContent = 'Overlay color';
        body.appendChild(cLabel);

        var cInput = document.createElement('input');
        cInput.type = 'color';
        cInput.value = color();
        cInput.oninput = function() {
            set(K.color, this.value);
            paintOverlay();
        };
        body.appendChild(cInput);

        var dLabel = document.createElement('label');
        dLabel.textContent = 'Dim: ' + Math.round(dim() * 100) + '%';
        body.appendChild(dLabel);

        var dInput = document.createElement('input');
        dInput.type = 'range';
        dInput.min = '0';
        dInput.max = '0.95';
        dInput.step = '0.05';
        dInput.value = String(dim());
        dInput.oninput = function() {
            dLabel.textContent = 'Dim: ' + Math.round(this.value * 100) + '%';
        };
        dInput.onchange = function() {
            set(K.dim, String(this.value));
            paintOverlay();
        };
        body.appendChild(dInput);

        var bLabel = document.createElement('label');
        bLabel.textContent = 'Blur: ' + blur() + 'px';
        body.appendChild(bLabel);

        var bInput = document.createElement('input');
        bInput.type = 'range';
        bInput.min = '0';
        bInput.max = '20';
        bInput.step = '1';
        bInput.value = String(blur());
        bInput.oninput = function() {
            bLabel.textContent = 'Blur: ' + this.value + 'px';
        };
        bInput.onchange = function() {
            set(K.blur, String(this.value));
            var l = layer();
            if (l) paintLayer(l);
        };
        body.appendChild(bInput);

        var sLabel = document.createElement('label');
        sLabel.textContent = 'Scale: ' + Math.round(scale() * 100) + '%';
        body.appendChild(sLabel);

        var sInput = document.createElement('input');
        sInput.type = 'range';
        sInput.min = '0.3';
        sInput.max = '3';
        sInput.step = '0.05';
        sInput.value = String(scale());
        sInput.oninput = function() {
            sLabel.textContent = 'Scale: ' + Math.round(this.value * 100) + '%';
        };
        sInput.onchange = function() {
            set(K.scale, String(this.value));
            var l = layer();
            if (l) paintLayer(l);
        };
        body.appendChild(sInput);

        var lockRow = document.createElement('div');
        lockRow.className = 'nxbg-row';
        var lockLabel = document.createElement('label');
        lockLabel.textContent = 'Lock background drag';
        lockLabel.style.margin = '6px 0 2px';
        var lockInput = document.createElement('input');
        lockInput.type = 'checkbox';
        lockInput.checked = locked();
        lockInput.onchange = function() {
            set(K.locked, this.checked);
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
            set(K.x, 0);
            set(K.y, 0);
            set(K.scale, '1');
            sInput.value = '1';
            sLabel.textContent = 'Scale: 100%';
            var l = layer();
            if (l) paintLayer(l);
        };
        resetRow.appendChild(resetBtn);
        body.appendChild(resetRow);

        var btns = document.createElement('div');
        btns.className = 'nxbg-buttons';

        var applyBtn = document.createElement('button');
        applyBtn.className = 'nxbg-apply';
        applyBtn.textContent = 'Apply';
        applyBtn.onclick = function() {
            var u = input.value.trim();
            if (u && !/^https?:\/\//i.test(u)) {
                alert('URL must start with http:// or https://');
                return;
            }
            set(K.url, u);
            set(K.type, typeSel.value);
            set(K.mode, modeSel.value);
            set(K.dim, dInput.value);
            set(K.blur, bInput.value);
            set(K.scale, sInput.value);
            set(K.color, cInput.value);
            rebuild();
        };

        var clearBtn = document.createElement('button');
        clearBtn.className = 'nxbg-clear';
        clearBtn.textContent = 'Clear';
        clearBtn.onclick = function() {
            set(K.url, '');
            input.value = '';
            rebuild();
        };

        btns.appendChild(applyBtn);
        btns.appendChild(clearBtn);
        body.appendChild(btns);

        var hint = document.createElement('div');
        hint.className = 'nxbg-hint';
        hint.textContent = 'Drag this panel by its title bar.';
        body.appendChild(hint);

        p.appendChild(body);
        document.body.appendChild(p);

        placePanel(p);
        dragPanel(p);

        window.addEventListener('resize', function() {
            if (!document.getElementById(PANEL_ID)) return;
            clampPanel(p);
            savePanel(p);
        });
    }

    function rebuild() {
        removeTransparent();
        var l = layer();
        if (l) l.remove();
        var o = document.getElementById('nx-bg-overlay');
        if (o) o.remove();
        removeAllPanels();

        if (!url()) {
            buildPanel();
            return;
        }
        pageTransparent();
        buildLayer();
        buildPanel();
    }

    function startWatch() {
        if (watch) clearInterval(watch);
        var last = location.href;
        watch = setInterval(function() {
            if (location.href !== last) {
                last = location.href;
                if (url() && !layer()) {
                    pageTransparent();
                    buildLayer();
                }
                // New page => new iframes => re-strip their backgrounds.
                if (url()) makeIframesTransparent();
                if (!document.getElementById(PANEL_ID) && !hidden) buildPanel();
            }
        }, 400);
    }

    function stopWatch() {
        if (watch) {
            clearInterval(watch);
            watch = null;
        }
    }

    window.NX.features.customBackground = {
        apply: function() {
            hidden = false;
            if (url()) {
                pageTransparent();
                if (!layer()) buildLayer();
            }
            if (!document.getElementById(PANEL_ID)) buildPanel();
            startWatch();
        },
        teardown: function() {
            stopWatch();
            var l = layer();
            if (l) l.remove();
            var o = document.getElementById('nx-bg-overlay');
            if (o) o.remove();
            removeAllPanels();
            var s = document.getElementById(CSS_ID);
            if (s) s.remove();
            removeTransparent();
        }
    };
})();
