(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var SEARCH_MATCH = '/apisite/catalog/v1/search/items';
    var PARAM = 'includeNotForSale=true';
    var STYLE_ID = 'nx-offsale-style';
    var PANEL_ID = 'nx-offsale-panel';
    var STORAGE_KEY = 'nx_offsale_enabled';

    var enabled = GM_getValue(STORAGE_KEY, false) === true;

    var CSS = [
        '#nx-offsale-panel{margin-top:14px}',
        '#nx-offsale-panel .nx-os-header{font-size:16px;font-weight:600;margin:0 0 6px;color:inherit}',
        '#nx-offsale-panel .nx-os-row{margin:0;display:flex;align-items:center;gap:6px}',
        '#nx-offsale-panel .nx-os-row input{margin:0}',
        '#nx-offsale-panel .nx-os-row label{margin:0 0 0 2px;font-size:13px;padding-left:4px;cursor:pointer}'
    ].join('');

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function isCatalogPage() {
        return location.pathname === '/catalog';
    }

    function shouldPatchSearch(url) {
        if (!enabled) return false;
        if (typeof url !== 'string') return false;
        if (url.indexOf(SEARCH_MATCH) === -1) return false;
        if (url.indexOf('includeNotForSale') !== -1) return false;
        return true;
    }

    var origOpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function(method, url) {
        if (isCatalogPage() && shouldPatchSearch(url)) {
            var sep = url.indexOf('?') === -1 ? '?' : '&';
            url = url + sep + PARAM;
        }
        return origOpen.call(this, method, url);
    };

    function findGenreBlock() {
        var headers = document.querySelectorAll('p[class*="header-"]');
        for (var i = 0; i < headers.length; i++) {
            if (headers[i].textContent.trim() === 'Genre') {
                return headers[i].parentElement;
            }
        }
        return null;
    }

    function buildPanel() {
        var wrap = document.createElement('div');
        wrap.id = PANEL_ID;

        var h = document.createElement('p');
        h.className = 'nx-os-header';
        h.textContent = 'Unavailable Items';
        wrap.appendChild(h);

        var showRow = document.createElement('p');
        showRow.className = 'nx-os-row';
        var showInput = document.createElement('input');
        showInput.type = 'radio';
        showInput.name = 'nx-offsale-toggle';
        showInput.id = 'nx-offsale-show';
        var showLabel = document.createElement('label');
        showLabel.htmlFor = 'nx-offsale-show';
        showLabel.textContent = 'Show';
        showRow.appendChild(showInput);
        showRow.appendChild(showLabel);
        wrap.appendChild(showRow);

        var hideRow = document.createElement('p');
        hideRow.className = 'nx-os-row';
        var hideInput = document.createElement('input');
        hideInput.type = 'radio';
        hideInput.name = 'nx-offsale-toggle';
        hideInput.id = 'nx-offsale-hide';
        var hideLabel = document.createElement('label');
        hideLabel.htmlFor = 'nx-offsale-hide';
        hideLabel.textContent = 'Hide';
        hideRow.appendChild(hideInput);
        hideRow.appendChild(hideLabel);
        wrap.appendChild(hideRow);

        showInput.checked = enabled;
        hideInput.checked = !enabled;

        showInput.addEventListener('change', function() {
            if (!showInput.checked) return;
            enabled = true;
            GM_setValue(STORAGE_KEY, true);
            location.reload();
        });
        hideInput.addEventListener('change', function() {
            if (!hideInput.checked) return;
            enabled = false;
            GM_setValue(STORAGE_KEY, false);
            location.reload();
        });

        return wrap;
    }

    function injectPanel() {
        if (!isCatalogPage()) return;
        if (document.getElementById(PANEL_ID)) return;

        var genreBlock = findGenreBlock();
        if (!genreBlock) return;

        ensureStyle();

        var parent = genreBlock.parentElement;
        if (!parent) return;

        parent.appendChild(buildPanel());
    }

    function removePanel() {
        var p = document.getElementById(PANEL_ID);
        if (p) p.remove();
    }

    window.NX.features.offsale = {
        apply: function() {
            injectPanel();
        },
        teardown: function() {
            removePanel();
        }
    };

})();
