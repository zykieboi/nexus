(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.ui = window.NX.ui || {};

    var VERSION = 'v1.0';
    var STYLE_ID = 'nx-modal-style';
    var OVERLAY_ID = 'nx-modal-overlay';

    var CATS = [
        { id: 'visual',   label: 'Visual' },
        { id: 'features', label: 'Features' }
    ];

    var OPTS = {
        roblox2019:      { cat: 'visual',   label: 'Roblox 2019L Theme',       desc: 'Makes Octane look like Roblox back in 2019.' },
        background:      { cat: 'visual',   label: 'Custom Avatar Background', desc: 'Set custom backgrounds behind your avatar.' },
        hideAlert:       { cat: 'visual',   label: 'Hide Alert',               desc: 'Hides the alert banner under the navigation bar.' },
        hideChat:        { cat: 'visual',   label: 'Hide Chat',                desc: 'Hides chat across the site.' },
        customLogo:      { cat: 'visual',   label: 'Custom Logo',              desc: 'Replace the navbar logo with your own image.' },
        customFont:      { cat: 'visual',   label: 'Custom Font',              desc: 'Apply a custom font to the whole site.', type: 'select' },
        tradeValues:     { cat: 'features', label: 'Trade Compare',            desc: 'Compare your trade with RAP, value and percentage.' },
        inventorySearch: { cat: 'features', label: 'Inventory Search',         desc: 'Adds a search bar to your inventory.' },
        bulkUnfriend:    { cat: 'features', label: 'Bulk Unfriend',            desc: 'Select multiple friends and remove them at once.' },
        rap:             { cat: 'features', label: 'RAP on Profile',           desc: 'Shows total RAP next to profile stats.' },
        removeAds:       { cat: 'features', label: 'Remove Ads',               desc: 'Hides all advertisement banners across the site.' }
    };

    var DEFAULT_FONTS = [
        { id: 'default', label: 'Default' },
        { id: 'inter', label: 'Inter' },
        { id: 'roboto', label: 'Roboto' },
        { id: 'opensans', label: 'Open Sans' },
        { id: 'lato', label: 'Lato' },
        { id: 'montserrat', label: 'Montserrat' },
        { id: 'poppins', label: 'Poppins' },
        { id: 'source-sans', label: 'Source Sans Pro' },
        { id: 'nunito', label: 'Nunito' },
        { id: 'ubuntu', label: 'Ubuntu' },
        { id: 'comic-neue', label: 'Comic Neue' },
        { id: 'jetbrains-mono', label: 'JetBrains Mono' },
        { id: 'fira-code', label: 'Fira Code' },
        { id: 'courier-prime', label: 'Courier Prime' },
        { id: 'gotham', label: 'Gotham' }
    ];

    function readLS(k) { try { return localStorage.getItem('nx_' + k); } catch (e) { return null; } }
    function writeLS(k, v) { try { localStorage.setItem('nx_' + k, v); } catch (e) {} }

    function settings() {
        var fallback = {
            get: function (k) { return readLS(k) === '1'; },
            set: function (k, v) { writeLS(k, v ? '1' : '0'); },
            getString: function (k, d) { var v = readLS(k); return v == null ? d : v; },
            setString: function (k, v) { writeLS(k, v); }
        };
        var s = window.NX && window.NX.settings;
        if (!s) return fallback;
        return {
            get: function (k) {
                var v = s.get(k);
                if (v === undefined || v === null) v = fallback.get(k);
                return v;
            },
            set: function (k, v) {
                if (typeof s.set === 'function') s.set(k, v);
                fallback.set(k, v);
            },
            getString: function (k, d) {
                if (typeof s.getString === 'function') return s.getString(k, d);
                return fallback.getString(k, d);
            },
            setString: function (k, v) {
                if (typeof s.setString === 'function') s.setString(k, v);
                fallback.setString(k, v);
            }
        };
    }

    function features() {
        return (window.NX && window.NX.features) || {};
    }

    function dark() {
        try {
            if (localStorage.getItem('rbx_theme_v1') === 'dark') return true;
        } catch (e) {}
        return document.documentElement.classList.contains('octane-dark');
    }

    function injectStyle() {
        var old = document.getElementById(STYLE_ID);
        if (old) old.remove();
        var s = document.createElement('style');
        s.id = STYLE_ID;

        var base = [
            '#' + OVERLAY_ID + '{position:fixed;inset:0;background:rgba(0,0,0,.55);',
            'z-index:2147483600;display:flex;align-items:center;justify-content:center;',
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}',

            '#' + OVERLAY_ID + ' .nx-modal{width:92%;max-width:720px;max-height:82vh;',
            'display:flex;flex-direction:column;border-radius:12px;overflow:hidden;',
            'box-shadow:0 20px 60px rgba(0,0,0,.5)}',

            '#' + OVERLAY_ID + ' .nx-header{display:flex;align-items:center;justify-content:space-between;',
            'padding:18px 24px 14px;flex-shrink:0}',
            '#' + OVERLAY_ID + ' .nx-header h2{margin:0;font-size:22px;font-weight:600}',
            '#' + OVERLAY_ID + ' .nx-close{background:none;border:none;cursor:pointer;font-size:22px;',
            'padding:2px 8px;border-radius:6px;line-height:1}',
            '#' + OVERLAY_ID + ' .nx-body{padding:0 24px 8px;overflow-y:auto;flex:1}',
            '#' + OVERLAY_ID + ' .nx-body::-webkit-scrollbar{width:8px;height:0}',
            '#' + OVERLAY_ID + ' .nx-body::-webkit-scrollbar-track{background:transparent}',
            '#' + OVERLAY_ID + ' .nx-body::-webkit-scrollbar-thumb{border-radius:4px}',

            '#' + OVERLAY_ID + ' .nx-section{margin-bottom:22px}',
            '#' + OVERLAY_ID + ' .nx-section-header{padding-bottom:8px;margin-bottom:4px;border-bottom-width:1px;border-bottom-style:solid}',
            '#' + OVERLAY_ID + ' .nx-section-header h3{margin:0;font-size:16px;font-weight:600}',

            '#' + OVERLAY_ID + ' .nx-row{display:flex;align-items:flex-start;justify-content:space-between;',
            'padding:12px 0;gap:20px;border-bottom-width:1px;border-bottom-style:solid}',
            '#' + OVERLAY_ID + ' .nx-row:last-child{border-bottom:none}',
            '#' + OVERLAY_ID + ' .nx-row-text{flex:1;min-width:0}',
            '#' + OVERLAY_ID + ' .nx-label{display:block;font-size:14px;font-weight:500;margin-bottom:3px}',
            '#' + OVERLAY_ID + ' .nx-desc{display:block;font-size:12px;line-height:1.5}',

            '#' + OVERLAY_ID + ' .nx-toggle{position:relative;width:42px;height:22px;flex-shrink:0;cursor:pointer;margin-top:2px}',
            '#' + OVERLAY_ID + ' .nx-toggle input{opacity:0;width:0;height:0;position:absolute}',
            '#' + OVERLAY_ID + ' .nx-toggle .slider{position:absolute;inset:0;border-radius:22px;transition:background .2s}',
            '#' + OVERLAY_ID + ' .nx-toggle .slider::before{content:"";position:absolute;height:16px;width:16px;left:3px;top:3px;',
            'border-radius:50%;transition:transform .2s}',
            '#' + OVERLAY_ID + ' .nx-toggle input:checked + .slider{background:#22a24a}',
            '#' + OVERLAY_ID + ' .nx-toggle input:checked + .slider::before{transform:translateX(20px)}',

            '#' + OVERLAY_ID + ' .nx-dropdown{position:relative;flex-shrink:0}',
            '#' + OVERLAY_ID + ' .nx-dropdown-btn{display:inline-flex;align-items:center;gap:8px;',
            'padding:7px 12px;border-radius:6px;border-width:1px;border-style:solid;',
            'font-family:inherit;font-size:13px;cursor:pointer;outline:none;min-width:150px;justify-content:space-between}',
            '#' + OVERLAY_ID + ' .nx-dropdown-arrow{flex:none;width:10px;height:10px;',
            'display:inline-block;transition:transform .15s ease}',
            '#' + OVERLAY_ID + ' .nx-dropdown.open .nx-dropdown-arrow{transform:rotate(180deg)}',
            '#' + OVERLAY_ID + ' .nx-dropdown-arrow::before{content:"";display:block;width:0;height:0;',
            'border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid currentColor}',
            '#' + OVERLAY_ID + ' .nx-dropdown-menu{position:absolute;top:calc(100% + 4px);right:0;min-width:100%;',
            'max-height:220px;overflow-y:auto;border-radius:6px;border-width:1px;border-style:solid;',
            'z-index:60;padding:4px;display:none;font-family:inherit;font-size:13px;',
            'scrollbar-width:thin}',
            '#' + OVERLAY_ID + ' .nx-dropdown-menu::-webkit-scrollbar{width:6px;height:0}',
            '#' + OVERLAY_ID + ' .nx-dropdown-menu::-webkit-scrollbar-track{background:transparent}',
            '#' + OVERLAY_ID + ' .nx-dropdown-menu::-webkit-scrollbar-thumb{border-radius:3px}',
            '#' + OVERLAY_ID + ' .nx-dropdown.open .nx-dropdown-menu{display:block}',
            '#' + OVERLAY_ID + ' .nx-dropdown-item{padding:7px 10px;border-radius:4px;cursor:pointer;white-space:nowrap}',

            '#' + OVERLAY_ID + ' .nx-footer{padding:14px 24px 18px;flex-shrink:0;',
            'display:flex;align-items:center;border-top-width:1px;border-top-style:solid}',
            '#' + OVERLAY_ID + ' .nx-version{margin-left:auto;font-size:12px}'
        ];

        var light = [
            '#' + OVERLAY_ID + ' .nx-modal{background:#fff;color:#232527}',
            '#' + OVERLAY_ID + ' .nx-header{border-bottom:1px solid #e1e4e8}',
            '#' + OVERLAY_ID + ' .nx-close{color:#7a7d80}',
            '#' + OVERLAY_ID + ' .nx-close:hover{background:#f2f4f5;color:#232527}',
            '#' + OVERLAY_ID + ' .nx-body::-webkit-scrollbar-thumb{background:#c7cbce}',
            '#' + OVERLAY_ID + ' .nx-body::-webkit-scrollbar-thumb:hover{background:#b0b5ba}',
            '#' + OVERLAY_ID + ' .nx-section-header{border-bottom-color:#e1e4e8}',
            '#' + OVERLAY_ID + ' .nx-section-header h3{color:#232527}',
            '#' + OVERLAY_ID + ' .nx-row{border-bottom-color:#eef0f2}',
            '#' + OVERLAY_ID + ' .nx-label{color:#232527}',
            '#' + OVERLAY_ID + ' .nx-desc{color:#7a7d80}',
            '#' + OVERLAY_ID + ' .nx-toggle .slider{background:#c7cbce}',
            '#' + OVERLAY_ID + ' .nx-toggle .slider::before{background:#fff}',
            '#' + OVERLAY_ID + ' .nx-dropdown-btn{background:#fff;color:#232527;border-color:#c7cbce}',
            '#' + OVERLAY_ID + ' .nx-dropdown-menu{background:#fff;border-color:#c7cbce;box-shadow:0 6px 18px rgba(0,0,0,.12);scrollbar-color:#c7cbce transparent}',
            '#' + OVERLAY_ID + ' .nx-dropdown-menu::-webkit-scrollbar-thumb{background:#c7cbce}',
            '#' + OVERLAY_ID + ' .nx-dropdown-item{color:#232527}',
            '#' + OVERLAY_ID + ' .nx-dropdown-item:hover{background:#f2f4f5}',
            '#' + OVERLAY_ID + ' .nx-dropdown-item.selected{background:#e8f0fe;color:#0a84ff}',
            '#' + OVERLAY_ID + ' .nx-footer{border-top-color:#e1e4e8;color:#7a7d80}'
        ];

        var darkCSS = [
            '#' + OVERLAY_ID + ' .nx-modal{background:#232527;color:#e8e8e8}',
            '#' + OVERLAY_ID + ' .nx-header{border-bottom:1px solid #343638}',
            '#' + OVERLAY_ID + ' .nx-close{color:#9a9da0}',
            '#' + OVERLAY_ID + ' .nx-close:hover{background:#2c2e30;color:#fff}',
            '#' + OVERLAY_ID + ' .nx-body::-webkit-scrollbar-thumb{background:#3a3d40}',
            '#' + OVERLAY_ID + ' .nx-body::-webkit-scrollbar-thumb:hover{background:#4a4d50}',
            '#' + OVERLAY_ID + ' .nx-section-header{border-bottom-color:#343638}',
            '#' + OVERLAY_ID + ' .nx-section-header h3{color:#fff}',
            '#' + OVERLAY_ID + ' .nx-row{border-bottom-color:#2c2e30}',
            '#' + OVERLAY_ID + ' .nx-label{color:#e8e8e8}',
            '#' + OVERLAY_ID + ' .nx-desc{color:#9a9da0}',
            '#' + OVERLAY_ID + ' .nx-toggle .slider{background:#3d4043}',
            '#' + OVERLAY_ID + ' .nx-toggle .slider::before{background:#fff}',
            '#' + OVERLAY_ID + ' .nx-dropdown-btn{background:#2a2c2e;color:#e8e8e8;border-color:#3a3d40}',
            '#' + OVERLAY_ID + ' .nx-dropdown-menu{background:#2a2c2e;border-color:#3a3d40;box-shadow:0 6px 18px rgba(0,0,0,.5);scrollbar-color:#3a3d40 transparent}',
            '#' + OVERLAY_ID + ' .nx-dropdown-menu::-webkit-scrollbar-thumb{background:#3a3d40}',
            '#' + OVERLAY_ID + ' .nx-dropdown-item{color:#e8e8e8}',
            '#' + OVERLAY_ID + ' .nx-dropdown-item:hover{background:#3a3d40}',
            '#' + OVERLAY_ID + ' .nx-dropdown-item.selected{background:#1f3a5f;color:#6cb2ff}',
            '#' + OVERLAY_ID + ' .nx-footer{border-top-color:#343638;color:#9a9da0}'
        ];

        s.textContent = base.join('') + (dark() ? darkCSS.join('') : light.join(''));
        (document.head || document.documentElement).appendChild(s);
    }

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    function buildToggle(key, cfg) {
        var row = el('div', 'nx-row');
        var text = el('div', 'nx-row-text');
        text.appendChild(el('span', 'nx-label', cfg.label));
        text.appendChild(el('span', 'nx-desc', cfg.desc));
        row.appendChild(text);

        var toggle = el('label', 'nx-toggle');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = settings().get(key);

        input.addEventListener('change', function () {
            settings().set(key, input.checked);
            var f = features()[key];
            if (!f) return;
            if (input.checked && typeof f.apply === 'function') f.apply();
            else if (!input.checked && typeof f.teardown === 'function') f.teardown();
        });

        toggle.appendChild(input);
        toggle.appendChild(el('span', 'slider'));
        row.appendChild(toggle);
        return row;
    }

    function buildDropdown(key, cfg) {
        var row = el('div', 'nx-row');
        var text = el('div', 'nx-row-text');
        text.appendChild(el('span', 'nx-label', cfg.label));
        text.appendChild(el('span', 'nx-desc', cfg.desc));
        row.appendChild(text);

        var f = features()[key];
        var list = (f && f.FONTS && f.FONTS.length) ? f.FONTS : DEFAULT_FONTS;
        var currentId = (f && typeof f.getFontId === 'function')
            ? f.getFontId()
            : settings().getString(key + 'Id', 'default');
        var current = list.filter(function (o) { return o.id === currentId; })[0] || list[0];

        var wrap = el('div', 'nx-dropdown');

        var btn = el('button', 'nx-dropdown-btn');
        btn.type = 'button';
        var labelSpan = el('span', 'nx-dropdown-label', current.label);
        var arrow = el('span', 'nx-dropdown-arrow');
        btn.appendChild(labelSpan);
        btn.appendChild(arrow);
        wrap.appendChild(btn);

        var menu = el('div', 'nx-dropdown-menu');
        list.forEach(function (opt) {
            var item = el('div', 'nx-dropdown-item' + (opt.id === current.id ? ' selected' : ''), opt.label);
            item.addEventListener('click', function (e) {
                e.stopPropagation();
                settings().setString(key + 'Id', opt.id);
                var feat = features()[key];
                if (feat) {
                    if (typeof feat.setFontId === 'function') feat.setFontId(opt.id);
                    if (opt.id !== 'default' && typeof feat.apply === 'function') feat.apply();
                    if (opt.id === 'default' && typeof feat.teardown === 'function') feat.teardown();
                }
                labelSpan.textContent = opt.label;
                Array.prototype.forEach.call(menu.children, function (c) { c.classList.remove('selected'); });
                item.classList.add('selected');
                wrap.classList.remove('open');
            });
            menu.appendChild(item);
        });
        wrap.appendChild(menu);

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            wrap.classList.toggle('open');
        });

        document.addEventListener('click', function (ev) {
            if (wrap.contains(ev.target)) return;
            wrap.classList.remove('open');
        });

        row.appendChild(wrap);
        return row;
    }

    function buildBody() {
        var body = el('div', 'nx-body');

        CATS.forEach(function (cat) {
            var keys = Object.keys(OPTS).filter(function (k) { return OPTS[k].cat === cat.id; });
            if (!keys.length) return;

            var section = el('div', 'nx-section');
            var header = el('div', 'nx-section-header');
            header.appendChild(el('h3', '', cat.label));
            section.appendChild(header);

            keys.forEach(function (key) {
                var cfg = OPTS[key];
                section.appendChild(cfg.type === 'select' ? buildDropdown(key, cfg) : buildToggle(key, cfg));
            });

            body.appendChild(section);
        });

        return body;
    }

    var escHandler = null;

    function close() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay) overlay.remove();
        if (escHandler) {
            document.removeEventListener('keydown', escHandler);
            escHandler = null;
        }
        document.body.style.overflow = '';
    }

    function build() {
        close();
        injectStyle();

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        var modal = el('div', 'nx-modal');

        var header = el('div', 'nx-header');
        header.appendChild(el('h2', '', 'Nexus Settings'));
        var closeBtn = el('button', 'nx-close', '\u00d7');
        closeBtn.addEventListener('click', close);
        header.appendChild(closeBtn);
        modal.appendChild(header);

        modal.appendChild(buildBody());

        var footer = el('div', 'nx-footer');
        footer.appendChild(el('span', 'nx-version', 'Nexus ' + VERSION));
        modal.appendChild(footer);

        overlay.appendChild(modal);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });

        escHandler = function (e) {
            if (e.key === 'Escape') close();
        };
        document.addEventListener('keydown', escHandler);

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }

    window.NX.ui.modal = { build: build, close: close, version: VERSION };
})();
