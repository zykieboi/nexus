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
