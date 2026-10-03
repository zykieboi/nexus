(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-custom-font';
    var STORAGE_KEY = 'nx_custom_font';

    var FONTS = [
        { id: 'default',    label: 'Default',          stack: '' },
        { id: 'roboto',     label: 'Roboto',           stack: '"Roboto", sans-serif' },
        { id: 'opensans',   label: 'Open Sans',        stack: '"Open Sans", sans-serif' },
        { id: 'lato',       label: 'Lato',             stack: '"Lato", sans-serif' },
        { id: 'montserrat', label: 'Montserrat',       stack: '"Montserrat", sans-serif' },
        { id: 'inter',      label: 'Inter',            stack: '"Inter", sans-serif' },
        { id: 'poppins',    label: 'Poppins',          stack: '"Poppins", sans-serif' },
        { id: 'nunito',     label: 'Nunito',           stack: '"Nunito", sans-serif' },
        { id: 'jetbrains',  label: 'JetBrains Mono',   stack: '"JetBrains Mono", monospace' },
        { id: 'comic',      label: 'Comic Sans',       stack: '"Comic Sans MS", cursive' }
    ];

    var GOOGLE_FONTS = [
        'Roboto', 'Open Sans', 'Lato', 'Montserrat',
        'Inter', 'Poppins', 'Nunito', 'JetBrains Mono'
    ];

    function getFontId() {
        try { return localStorage.getItem(STORAGE_KEY) || 'default'; }
        catch (e) { return 'default'; }
    }

    function setFontId(id) {
        try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}
        inject();
    }

    function fontById(id) {
        for (var i = 0; i < FONTS.length; i++) {
            if (FONTS[i].id === id) return FONTS[i];
        }
        return FONTS[0];
    }

    var linksInjected = false;
    function injectGoogleFonts() {
        if (linksInjected) return;
        linksInjected = true;
        var families = GOOGLE_FONTS.map(function (f) {
            return 'family=' + f.replace(/ /g, '+') + ':wght@400;500;600;700';
        }).join('&');
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?' + families + '&display=swap';
        (document.head || document.documentElement).appendChild(l);
    }

    function inject() {
        var old = document.getElementById(STYLE_ID);
        if (old) old.remove();

        var cfg = fontById(getFontId());
        if (!cfg.stack) return;

        injectGoogleFonts();

        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent =
            'html, body, #__next, .gotham-font, .gotham-font * {' +
            'font-family: ' + cfg.stack + ' !important;' +
            '}';
        (document.head || document.documentElement).appendChild(s);
    }

    function apply() {
        inject();
        new MutationObserver(function () {
            if (!document.getElementById(STYLE_ID) && getFontId() !== 'default') inject();
        }).observe(document.head || document.documentElement, { childList: true });
    }

    function teardown() {
        var s = document.getElementById(STYLE_ID);
        if (s) s.remove();
    }

    window.NX.features.customFont = {
        apply: apply,
        teardown: teardown,
        FONTS: FONTS,
        getFontId: getFontId,
        setFontId: function (id) { setFontId(id); },
        fontById: fontById
    };
})();
