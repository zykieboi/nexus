(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.ui = window.NX.ui || {};

    var STYLE_ID = 'nx-modal-theme-style';
    var WORKER = 'https://nexus-admin.masonreed-exe.workers.dev';

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
                '.nx-select{padding:6px 10px;background:#2a2c2e;color:#e8e8e8;',
                'border:1px solid #3a3d40;border-radius:6px;font-family:inherit;',
                'font-size:13px;cursor:pointer;outline:none;min-width:140px;flex-shrink:0}',
                '.nx-select:hover{background:#2f3234}',
                '#nx-modal .nx-footer{padding:14px 26px 20px;border-top:1px solid #343638;flex-shrink:0}',
                '#nx-modal .nx-footer .nx-users{font-size:12px;color:#7a7d80;text-align:center;margin-bottom:8px}',
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
                '.nx-select{padding:6px 10px;background:#fff;color:#232527;',
                'border:1px solid #c7cbce;border-radius:6px;font-family:inherit;',
                'font-size:13px;cursor:pointer;outline:none;min-width:140px;flex-shrink:0}',
                '.nx-select:hover{background:#f2f4f5}',
                '#nx-modal .nx-footer{padding:14px 26px 20px;border-top:1px solid #e1e4e8;flex-shrink:0}',
                '#nx-modal .nx-footer .nx-users{font-size:12px;color:#7a7d80;text-align:center;margin-bottom:8px}',
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
            background: {
                cat: 'visual', label: 'Custom Background',
                desc: 'Lets you set a custom image, color, or preset behind your avatar.'
            },
            hideAlert: {
                cat: 'visual', label: 'Hide Alert',
                desc: 'Hides the alert banner under the navigation bar.'
            },
            hideChat: {
                cat: 'visual', label: 'Hide Chat',
                desc: 'Hides the chat across the site.'
            },
            customLogo: {
                cat: 'visual', label: 'Custom Logo',
                desc: 'Replace the navbar logo with your own image.'
            },
            customFont: {
                cat: 'visual', label: 'Custom Font',
                desc: 'Apply a custom font to the whole site.',
                type: 'select'
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
                row.appendChild(text);

                if (cfg.type === 'select') {
                    var feat = window.NX.features[key];
                    var currentId = feat && typeof feat.getFontId === 'function'
                        ? feat.getFontId()
                        : 'default';

                    var select = document.createElement('select');
                    select.className = 'nx-select';

                    var fontList = feat && feat.FONTS ? feat.FONTS : [{ id: 'default', label: 'Default' }];
                    fontList.forEach(function (f) {
                        var o = document.createElement('option');
                        o.value = f.id;
                        o.textContent = f.label;
                        select.appendChild(o);
                    });

                    select.value = currentId;

                    select.addEventListener('change', (function (k) {
                        return function () {
                            var f = window.NX.features[k];
                            if (!f) return;
                            if (typeof f.setFontId === 'function') {
                                f.setFontId(this.value);
                            }
                            if (this.value !== 'default' && typeof f.apply === 'function') {
                                f.apply();
                            }
                            if (this.value === 'default' && typeof f.teardown === 'function') {
                                f.teardown();
                            }
                        };
                    })(key));

                    row.appendChild(select);
                } else {
                    var on = window.NX.settings.get(key);

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
                    row.appendChild(toggle);
                }

                content.appendChild(row);
            });
        });

        var footer = document.createElement('div');
        footer.className = 'nx-footer';

        var status = document.createElement('div');
        status.className = 'nx-users';
        status.textContent = 'Users: …';
        footer.appendChild(status);

        GM_xmlhttpRequest({
            method: 'GET',
            url: WORKER + '/api/nexus/count',
            timeout: 5000,
            onload: function (res) {
                try {
                    status.textContent = 'Users: ' + JSON.parse(res.responseText).count;
                } catch (e) {
                    status.textContent = 'Users: —';
                }
            },
            onerror: function () { status.textContent = 'Users: —'; },
            ontimeout: function () { status.textContent = 'Users: —'; }
        });

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
