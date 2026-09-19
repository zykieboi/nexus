(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var URL_KEY = 'nx_logo_url';
    var HEIGHT_KEY = 'nx_logo_height';
    var PX_KEY = 'nx_logo_panel_x';
    var PY_KEY = 'nx_logo_panel_y';
    var PMIN_KEY = 'nx_logo_panel_min';

    var PANEL_ID = 'nx-logo-panel';
    var PANEL_CSS_ID = 'nx-logo-panel-style';

    var dimCache = {};
    var panelHidden = false;
    var intervals = [];

    function isDarkTheme() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    function getUrl() {
        return GM_getValue(URL_KEY, '');
    }

    function getHeight() {
        var v = parseInt(GM_getValue(HEIGHT_KEY, '30'), 10);
        return isNaN(v) ? 30 : Math.max(12, Math.min(60, v));
    }

    function getPanelX() {
        var v = GM_getValue(PX_KEY, null);
        if (v === null || v === '') return null;
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
    }

    function getPanelY() {
        var v = GM_getValue(PY_KEY, null);
        if (v === null || v === '') return null;
        var n = parseFloat(v);
        return isNaN(n) ? null : n;
    }

    function isPanelMinimized() {
        return GM_getValue(PMIN_KEY, false) === true;
    }

    function getLogoEls() {
        var els = [];
        var d = document.querySelector('.imgDesktop-0-2-12, [class*="imgDesktop-0-2-"]');
        if (d) els.push({ el: d, kind: 'desktop' });
        var m = document.querySelector('.imgMobile-0-2-13, [class*="imgMobile-0-2-"]');
        if (m) els.push({ el: m, kind: 'mobile' });
        return els;
    }

    function loadDim(url, cb) {
        if (dimCache[url]) { cb(dimCache[url]); return; }
        var img = new Image();
        img.onload = function() {
            dimCache[url] = { w: img.naturalWidth, h: img.naturalHeight };
            cb(dimCache[url]);
        };
        img.onerror = function() {
            cb({ w: 118, h: 30 });
        };
        img.src = url;
    }

    function restoreOne(el) {
        el.style.backgroundImage = '';
        el.style.backgroundSize = '';
        el.style.backgroundRepeat = '';
        el.style.backgroundPosition = '';
        el.style.width = '';
        el.style.height = '';
        el.style.minWidth = '';
        el.style.display = '';
        el.dataset.nxCustomLogo = '';
        el.dataset.nxLogoUrl = '';
    }

    function applyToEl(entry, url, dims) {
        var el = entry.el;
        var h = getHeight();
        var aspect = dims.w && dims.h ? (dims.w / dims.h) : (entry.kind === 'desktop' ? 118 / 30 : 1);
        var w = Math.round(h * aspect);

        el.style.backgroundImage = 'url("' + url + '")';
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';
        el.style.backgroundPosition = 'center';
        el.style.height = h + 'px';
        el.style.width = w + 'px';
        el.style.minWidth = w + 'px';

        el.dataset.nxCustomLogo = '1';
        el.dataset.nxLogoUrl = url;
    }

    function apply() {
        var url = getUrl();
        var els = getLogoEls();
        if (!els.length) return false;

        els.forEach(function(entry) {
            var el = entry.el;

            if (!url) {
                if (el.dataset.nxCustomLogo === '1') restoreOne(el);
                return;
            }

            if (el.dataset.nxCustomLogo === '1' && el.dataset.nxLogoUrl === url) {
                return;
            }

            loadDim(url, function(dims) {
                applyToEl(entry, url, dims);
            });
        });
        return true;
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
        var hoverBg = dark ? '#2a2c2e' : '#e8eef5';

        var s = document.createElement('style');
        s.id = PANEL_CSS_ID;
        s.textContent = [
            '#' + PANEL_ID + '{position:fixed;z-index:2147483646;background:' + bg + ';color:' + text + ';border:1px solid ' + border + ';border-radius:8px;padding:10px;width:260px;font-family:"Source Sans Pro","Segoe UI",sans-serif;font-size:12px;box-shadow:0 6px 24px rgba(0,0,0,0.35);backdrop-filter:blur(6px);user-select:none;}',
            '#' + PANEL_ID + ' .nxlogo-head{display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:13px;margin-bottom:8px;cursor:grab;padding:2px 0;}',
            '#' + PANEL_ID + ' .nxlogo-head:active{cursor:grabbing;}',
            '#' + PANEL_ID + ' .nxlogo-head-title{flex:1;}',
            '#' + PANEL_ID + ' .nxlogo-head-actions{display:flex;gap:2px;align-items:center;}',
            '#' + PANEL_ID + ' .nxlogo-min{background:none;border:0;color:' + muted + ';cursor:pointer;font-size:16px;line-height:1;padding:0 4px;}',
            '#' + PANEL_ID + ' .nxlogo-min:hover{color:' + text + ';}',
            '#' + PANEL_ID + ' .nxlogo-close{background:none;border:0;color:' + muted + ';cursor:pointer;font-size:16px;line-height:1;padding:0 4px;}',
            '#' + PANEL_ID + ' .nxlogo-close:hover{color:#e5484d;}',
            '#' + PANEL_ID + ' input[type=text]{width:100%;background:' + inputBg + ';color:' + text + ';border:1px solid ' + border + ';border-radius:4px;padding:6px 8px;font-family:inherit;font-size:12px;box-sizing:border-box;margin-bottom:8px;}',
            '#' + PANEL_ID + ' input[type=text]:focus{outline:none;border-color:#0a84ff;}',
            '#' + PANEL_ID + ' label{display:block;color:' + muted + ';font-size:11px;margin:6px 0 2px;}',
            '#' + PANEL_ID + ' input[type=range]{width:100%;}',
            '#' + PANEL_ID + ' .nxlogo-buttons{display:flex;gap:6px;margin-top:8px;}',
            '#' + PANEL_ID + ' button.nxlogo-apply{flex:1;background:#0a84ff;color:#fff;border:0;border-radius:4px;padding:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;}',
            '#' + PANEL_ID + ' button.nxlogo-apply:hover{background:#0a76e0;}',
            '#' + PANEL_ID + ' button.nxlogo-clear{background:transparent;color:' + text + ';border:1px solid ' + border + ';border-radius:4px;padding:6px 10px;font-size:12px;cursor:pointer;font-family:inherit;}',
            '#' + PANEL_ID + ' button.nxlogo-clear:hover{background:' + hoverBg + ';}',
            '#' + PANEL_ID + '.nxlogo-collapsed{padding:6px 10px;}',
            '#' + PANEL_ID + '.nxlogo-collapsed .nxlogo-head{margin-bottom:0;}',
            '#' + PANEL_ID + '.nxlogo-collapsed .nxlogo-body{display:none;}',
            '#' + PANEL_ID + ' .nxlogo-hint{color:' + muted + ';font-size:10px;margin-top:6px;line-height:1.4;}'
        ].join('');
        document.head.appendChild(s);
    }

    function clampPanelPosition(panel) {
        var rect = panel.getBoundingClientRect();
        var maxX = window.innerWidth - rect.width - 4;
        var maxY = window.innerHeight - rect.height - 4;
        var newX = Math.max(4, Math.min(maxX, rect.left));
        var newY = Math.max(4, Math.min(maxY, rect.top));
        panel.style.left = newX + 'px';
        panel.style.top = newY + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        return { x: newX, y: newY };
    }

    function savePanelPosition(panel) {
        var rect = panel.getBoundingClientRect();
        GM_setValue(PX_KEY, Math.round(rect.left));
        GM_setValue(PY_KEY, Math.round(rect.top));
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
            if (clamped.x !== x || clamped.y !== y) savePanelPosition(panel);
        });
    }

    function attachPanelDrag(panel) {
        var head = panel.querySelector('.nxlogo-head');
        if (!head) return;
        var dragging = false, offsetX = 0, offsetY = 0;

        head.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            if (e.target.closest('.nxlogo-min')) return;
            if (e.target.closest('.nxlogo-close')) return;
            dragging = true;
            var rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!dragging) return;
            panel.style.left = (e.clientX - offsetX) + 'px';
            panel.style.top = (e.clientY - offsetY) + 'px';
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
        if (panelHidden) return;
        var old = document.getElementById(PANEL_ID);
        if (old) old.remove();
        ensurePanelStyle();

        var minimized = isPanelMinimized();

        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        if (minimized) panel.classList.add('nxlogo-collapsed');

        var head = document.createElement('div');
        head.className = 'nxlogo-head';

        var title = document.createElement('span');
        title.className = 'nxlogo-head-title';
        title.textContent = 'Custom Logo';

        var actions = document.createElement('div');
        actions.className = 'nxlogo-head-actions';

        var min = document.createElement('button');
        min.className = 'nxlogo-min';
        min.textContent = minimized ? '+' : '\u2013';
        min.title = minimized ? 'Expand' : 'Minimize';
        min.onclick = function(e) {
            e.stopPropagation();
            var nowMin = !panel.classList.contains('nxlogo-collapsed');
            panel.classList.toggle('nxlogo-collapsed');
            min.textContent = nowMin ? '+' : '\u2013';
            min.title = nowMin ? 'Expand' : 'Minimize';
            GM_setValue(PMIN_KEY, nowMin);
            requestAnimationFrame(function() {
                clampPanelPosition(panel);
                savePanelPosition(panel);
            });
        };

        var close = document.createElement('button');
        close.className = 'nxlogo-close';
        close.textContent = '\u00d7';
        close.title = 'Hide panel (toggle the feature off and on to bring it back)';
        close.onclick = function(e) {
            e.stopPropagation();
            panelHidden = true;
            var p = document.getElementById(PANEL_ID);
            if (p) p.remove();
        };

        actions.appendChild(min);
        actions.appendChild(close);

        head.appendChild(title);
        head.appendChild(actions);
        panel.appendChild(head);

        var body = document.createElement('div');
        body.className = 'nxlogo-body';

        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Logo image URL';
        input.value = getUrl();
        body.appendChild(input);

        var heightLabel = document.createElement('label');
        heightLabel.textContent = 'Height: ' + getHeight() + 'px';
        body.appendChild(heightLabel);

        var heightInput = document.createElement('input');
        heightInput.type = 'range';
        heightInput.min = '12';
        heightInput.max = '60';
        heightInput.step = '1';
        heightInput.value = String(getHeight());
        heightInput.oninput = function() {
            heightLabel.textContent = 'Height: ' + this.value + 'px';
        };
        heightInput.onchange = function() {
            GM_setValue(HEIGHT_KEY, this.value);
            getLogoEls().forEach(function(entry) {
                entry.el.dataset.nxCustomLogo = '';
                entry.el.dataset.nxLogoUrl = '';
            });
            apply();
        };
        body.appendChild(heightInput);

        var btns = document.createElement('div');
        btns.className = 'nxlogo-buttons';

        var applyBtn = document.createElement('button');
        applyBtn.className = 'nxlogo-apply';
        applyBtn.textContent = 'Apply';
        applyBtn.onclick = function() {
            var url = input.value.trim();
            if (url && !/^https?:\/\//i.test(url)) {
                alert('URL must start with http:// or https://');
                return;
            }
            GM_setValue(URL_KEY, url);
            getLogoEls().forEach(function(entry) {
                entry.el.dataset.nxCustomLogo = '';
                entry.el.dataset.nxLogoUrl = '';
            });
            apply();
        };

        var clearBtn = document.createElement('button');
        clearBtn.className = 'nxlogo-clear';
        clearBtn.textContent = 'Clear';
        clearBtn.onclick = function() {
            GM_setValue(URL_KEY, '');
            input.value = '';
            getLogoEls().forEach(function(entry) {
                restoreOne(entry.el);
            });
        };

        btns.appendChild(applyBtn);
        btns.appendChild(clearBtn);
        body.appendChild(btns);

        var hint = document.createElement('div');
        hint.className = 'nxlogo-hint';
        hint.textContent = 'Drag this panel by its title bar. × hides the panel until you toggle the feature off and on.';
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

    function stopWatching() {
        intervals.forEach(function(iv) { clearInterval(iv); });
        intervals = [];
    }

    function startWatching() {
        if (getUrl()) {
            var tries = 0;
            var iv = setInterval(function() {
                tries++;
                if (getUrl() && apply()) clearInterval(iv);
                if (tries > 20) clearInterval(iv);
            }, 500);
            intervals.push(iv);

            var lastHref = location.href;
            var iv2 = setInterval(function() {
                if (location.href !== lastHref) {
                    lastHref = location.href;
                    apply();
                } else if (getUrl()) {
                    apply();
                }
                if (!document.getElementById(PANEL_ID) && !panelHidden) buildPanel();
            }, 800);
            intervals.push(iv2);
        }
    }

    window.NX.features.customLogo = {
        apply: function() {
            stopWatching();
            panelHidden = false;
            apply();
            buildPanel();
            startWatching();
        },
        teardown: function() {
            stopWatching();
            getLogoEls().forEach(function(entry) {
                restoreOne(entry.el);
            });
            var p = document.getElementById(PANEL_ID);
            if (p) p.remove();
            var s = document.getElementById(PANEL_CSS_ID);
            if (s) s.remove();
        }
    };

})();
