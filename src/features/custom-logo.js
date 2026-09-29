(function() {
    'use strict';

    if (window.top !== window.self) return;

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var URL_KEY = 'nx_logo_url';
    var H_KEY = 'nx_logo_height';
    var PX_KEY = 'nx_logo_panel_x';
    var PY_KEY = 'nx_logo_panel_y';
    var PMIN_KEY = 'nx_logo_panel_min';

    var PANEL_ID = 'nx-logo-panel';
    var CSS_ID = 'nx-logo-panel-style';

    var dimCache = {};
    var hidden = false;
    var timers = [];

    function dark() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    function getUrl() { return GM_getValue(URL_KEY, ''); }
    function getHeight() {
        var v = parseInt(GM_getValue(H_KEY, '30'), 10);
        return isNaN(v) ? 30 : Math.max(12, Math.min(60, v));
    }
    function panelX() {
        var v = GM_getValue(PX_KEY, null);
        if (v === null || v === '') return null;
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
    }
    function panelY() {
        var v = GM_getValue(PY_KEY, null);
        if (v === null || v === '') return null;
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
    }
    function minimized() { return GM_getValue(PMIN_KEY, false) === true; }

    // --- FIXED: target the real Octane logo markup ---
    function logoEls() {
        var list = [];
        var seen = [];

        // <span class="octane-logo"></span> inside <a class="navbar-brand">
        // There may be multiple .navbar-header instances (sticky + static).
        var spans = document.querySelectorAll('.octane-logo');
        spans.forEach(function (el) {
            if (seen.indexOf(el) === -1) {
                seen.push(el);
                list.push({ el: el, kind: 'span' });
            }
        });

        var brands = document.querySelectorAll('.navbar-brand');
        brands.forEach(function (brand) {
            var cs = getComputedStyle(brand);
            if (cs.backgroundImage && cs.backgroundImage !== 'none') {
                if (seen.indexOf(brand) === -1) {
                    seen.push(brand);
                    list.push({ el: brand, kind: 'brand' });
                }
            }
            brand.querySelectorAll('img').forEach(function (img) {
                if (seen.indexOf(img) === -1) {
                    seen.push(img);
                    list.push({ el: img, kind: 'img' });
                }
            });
        });

        return list;
    }

    function removeAllPanels() {
        document.querySelectorAll('#' + PANEL_ID).forEach(function (el) { el.remove(); });
    }

    function loadDims(u, cb) {
        if (dimCache[u]) { cb(dimCache[u]); return; }
        var img = new Image();
        img.onload = function() {
            dimCache[u] = { w: img.naturalWidth, h: img.naturalHeight };
            cb(dimCache[u]);
        };
        img.onerror = function() { cb({ w: 118, h: 30 }); };
        img.src = u;
    }

    // --- FIXED: handle span/brand (bg-image) and img (src) ---
    function restore(entry) {
        var el = entry.el;
        if (entry.kind === 'img') {
            if (el.dataset.nxOrigSrc) {
                el.src = el.dataset.nxOrigSrc;
            }
            el.style.removeProperty('width');
            el.style.removeProperty('height');
            el.style.removeProperty('min-width');
            el.style.removeProperty('object-fit');
            el.dataset.nxCustomLogo = '';
            el.dataset.nxLogoUrl = '';
            return;
        }
        el.style.removeProperty('background-image');
        el.style.removeProperty('background-size');
        el.style.removeProperty('background-repeat');
        el.style.removeProperty('background-position');
        el.style.removeProperty('width');
        el.style.removeProperty('height');
        el.style.removeProperty('min-width');
        el.style.removeProperty('display');
        el.dataset.nxCustomLogo = '';
        el.dataset.nxLogoUrl = '';
    }

    function paint(entry, u, dims) {
        var el = entry.el;
        var h = getHeight();
        var aspect = dims.w && dims.h ? dims.w / dims.h : (118 / 30);
        var w = Math.round(h * aspect);

        if (entry.kind === 'img') {
            if (!el.dataset.nxOrigSrc) {
                el.dataset.nxOrigSrc = el.getAttribute('src') || '';
            }
            el.src = u;
            el.style.setProperty('width', w + 'px', 'important');
            el.style.setProperty('height', h + 'px', 'important');
            el.style.setProperty('min-width', w + 'px', 'important');
            el.style.setProperty('object-fit', 'contain', 'important');
            el.dataset.nxCustomLogo = '1';
            el.dataset.nxLogoUrl = u;
            return;
        }

        el.style.setProperty('background-image', 'url("' + u + '")', 'important');
        el.style.setProperty('background-size', 'contain', 'important');
        el.style.setProperty('background-repeat', 'no-repeat', 'important');
        el.style.setProperty('background-position', 'center', 'important');
        el.style.setProperty('height', h + 'px', 'important');
        el.style.setProperty('width', w + 'px', 'important');
        el.style.setProperty('min-width', w + 'px', 'important');

        el.dataset.nxCustomLogo = '1';
        el.dataset.nxLogoUrl = u;
    }

    function paintLogos() {
        var u = getUrl();
        var els = logoEls();
        if (!els.length) return false;

        els.forEach(function(entry) {
            var el = entry.el;
            if (!u) {
                if (el.dataset.nxCustomLogo === '1') restore(entry);
                return;
            }
            if (el.dataset.nxCustomLogo === '1' && el.dataset.nxLogoUrl === u) return;
            loadDims(u, function(dims) { paint(entry, u, dims); });
        });
        return true;
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
        var hoverBg = d ? '#2a2c2e' : '#e8eef5';
        var s = document.createElement('style');
        s.id = CSS_ID;
        s.textContent = [
            '#' + PANEL_ID + '{position:fixed;z-index:2147483646;background:' + bg + ';',
            'color:' + text + ';border:1px solid ' + border + ';border-radius:8px;',
            'padding:10px;width:260px;font-family:inherit;font-size:12px;',
            'box-shadow:0 6px 24px rgba(0,0,0,0.35);backdrop-filter:blur(6px);user-select:none;}',
            '#' + PANEL_ID + ' .nxlogo-head{display:flex;align-items:center;',
            'justify-content:space-between;font-weight:600;font-size:13px;',
            'margin-bottom:8px;cursor:grab;padding:2px 0;}',
            '#' + PANEL_ID + ' .nxlogo-head:active{cursor:grabbing;}',
            '#' + PANEL_ID + ' .nxlogo-head-title{flex:1;}',
            '#' + PANEL_ID + ' .nxlogo-head-actions{display:flex;gap:2px;}',
            '#' + PANEL_ID + ' .nxlogo-min,#' + PANEL_ID + ' .nxlogo-close{',
            'background:none;border:0;color:' + muted + ';cursor:pointer;font-size:16px;',
            'line-height:1;padding:0 4px;}',
            '#' + PANEL_ID + ' .nxlogo-min:hover{color:' + text + ';}',
            '#' + PANEL_ID + ' .nxlogo-close:hover{color:#e5484d;}',
            '#' + PANEL_ID + ' input[type=text]{width:100%;background:' + inputBg + ';',
            'color:' + text + ';border:1px solid ' + border + ';border-radius:4px;',
            'padding:6px 8px;font-family:inherit;font-size:12px;box-sizing:border-box;',
            'margin-bottom:8px;}',
            '#' + PANEL_ID + ' input[type=text]:focus{outline:none;border-color:#0a84ff;}',
            '#' + PANEL_ID + ' label{display:block;color:' + muted + ';font-size:11px;margin:6px 0 2px;}',
            '#' + PANEL_ID + ' input[type=range]{width:100%;}',
            '#' + PANEL_ID + ' .nxlogo-buttons{display:flex;gap:6px;margin-top:8px;}',
            '#' + PANEL_ID + ' button.nxlogo-apply{flex:1;background:#0a84ff;color:#fff;',
            'border:0;border-radius:4px;padding:6px;font-size:12px;font-weight:600;',
            'cursor:pointer;font-family:inherit;}',
            '#' + PANEL_ID + ' button.nxlogo-apply:hover{background:#0a76e0;}',
            '#' + PANEL_ID + ' button.nxlogo-clear{background:transparent;color:' + text + ';',
            'border:1px solid ' + border + ';border-radius:4px;padding:6px 10px;',
            'font-size:12px;cursor:pointer;font-family:inherit;}',
            '#' + PANEL_ID + ' button.nxlogo-clear:hover{background:' + hoverBg + ';}',
            '#' + PANEL_ID + '.nxlogo-collapsed{padding:6px 10px;}',
            '#' + PANEL_ID + '.nxlogo-collapsed .nxlogo-head{margin-bottom:0;}',
            '#' + PANEL_ID + '.nxlogo-collapsed .nxlogo-body{display:none;}',
            '#' + PANEL_ID + ' .nxlogo-hint{color:' + muted + ';font-size:10px;',
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
        GM_setValue(PX_KEY, Math.round(r.left));
        GM_setValue(PY_KEY, Math.round(r.top));
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
        var head = p.querySelector('.nxlogo-head');
        if (!head) return;
        var active = false, ox = 0, oy = 0;

        head.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            if (e.target.closest('.nxlogo-min')) return;
            if (e.target.closest('.nxlogo-close')) return;
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
        if (mini) p.classList.add('nxlogo-collapsed');

        var head = document.createElement('div');
        head.className = 'nxlogo-head';

        var title = document.createElement('span');
        title.className = 'nxlogo-head-title';
        title.textContent = 'Custom Logo';

        var actions = document.createElement('div');
        actions.className = 'nxlogo-head-actions';

        var min = document.createElement('button');
        min.className = 'nxlogo-min';
        min.textContent = mini ? '+' : '\u2013';
        min.title = mini ? 'Expand' : 'Minimize';
        min.onclick = function(e) {
            e.stopPropagation();
            var nowMin = !p.classList.contains('nxlogo-collapsed');
            p.classList.toggle('nxlogo-collapsed');
            min.textContent = nowMin ? '+' : '\u2013';
            min.title = nowMin ? 'Expand' : 'Minimize';
            GM_setValue(PMIN_KEY, nowMin);
            requestAnimationFrame(function() { clampPanel(p); savePanel(p); });
        };

        var close = document.createElement('button');
        close.className = 'nxlogo-close';
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
        body.className = 'nxlogo-body';

        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Logo image URL';
        input.value = getUrl();
        body.appendChild(input);

        var hLabel = document.createElement('label');
        hLabel.textContent = 'Height: ' + getHeight() + 'px';
        body.appendChild(hLabel);

        var hInput = document.createElement('input');
        hInput.type = 'range';
        hInput.min = '12';
        hInput.max = '60';
        hInput.step = '1';
        hInput.value = String(getHeight());
        hInput.oninput = function() {
            hLabel.textContent = 'Height: ' + this.value + 'px';
        };
        hInput.onchange = function() {
            GM_setValue(H_KEY, this.value);
            logoEls().forEach(function(entry) {
                entry.el.dataset.nxCustomLogo = '';
                entry.el.dataset.nxLogoUrl = '';
            });
            paintLogos();
        };
        body.appendChild(hInput);

        var btns = document.createElement('div');
        btns.className = 'nxlogo-buttons';

        var applyBtn = document.createElement('button');
        applyBtn.className = 'nxlogo-apply';
        applyBtn.textContent = 'Apply';
        applyBtn.onclick = function() {
            var u = input.value.trim();
            if (u && !/^https?:\/\//i.test(u)) {
                alert('URL must start with http:// or https://');
                return;
            }
            GM_setValue(URL_KEY, u);
            logoEls().forEach(function(entry) {
                entry.el.dataset.nxCustomLogo = '';
                entry.el.dataset.nxLogoUrl = '';
            });
            paintLogos();
        };

        var clearBtn = document.createElement('button');
        clearBtn.className = 'nxlogo-clear';
        clearBtn.textContent = 'Clear';
        clearBtn.onclick = function() {
            GM_setValue(URL_KEY, '');
            input.value = '';
            logoEls().forEach(function(entry) { restore(entry); });
        };

        btns.appendChild(applyBtn);
        btns.appendChild(clearBtn);
        body.appendChild(btns);

        var hint = document.createElement('div');
        hint.className = 'nxlogo-hint';
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

    function stopTimers() {
        timers.forEach(function(t) { clearInterval(t); });
        timers = [];
    }

    function startTimers() {
        if (!getUrl()) return;

        var tries = 0;
        var iv = setInterval(function() {
            tries++;
            if (paintLogos() || tries > 20) clearInterval(iv);
        }, 500);
        timers.push(iv);

        var last = location.href;
        var iv2 = setInterval(function() {
            if (location.href !== last) {
                last = location.href;
                paintLogos();
            } else if (getUrl()) {
                paintLogos();
            }
            if (!document.getElementById(PANEL_ID) && !hidden) buildPanel();
        }, 800);
        timers.push(iv2);
    }

    window.NX.features.customLogo = {
        apply: function() {
            stopTimers();
            hidden = false;
            paintLogos();
            if (!document.getElementById(PANEL_ID)) buildPanel();
            startTimers();
        },
        teardown: function() {
            stopTimers();
            logoEls().forEach(function(entry) { restore(entry); });
            removeAllPanels();
            var s = document.getElementById(CSS_ID);
            if (s) s.remove();
        }
    };
})();
