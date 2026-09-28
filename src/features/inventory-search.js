(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    function dark() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    window.NX.features.inventorySearch = {
        apply: function() {
            var container = document.querySelector('.itemContainer-0-2-344, [class*="itemContainer-"]');
            if (!container) return;
            if (container.querySelector('.nx-inventory-search')) return;

            var d = dark();

            var wrap = document.createElement('div');
            wrap.className = 'nx-inventory-search';
            wrap.style.padding = '10px 0';
            wrap.style.width = '100%';

            var input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Search inventory...';
            input.style.padding = '8px 14px';
            input.style.border = '1px solid ' + (d ? '#3a3c3e' : '#c7cbce');
            input.style.borderRadius = '6px';
            input.style.fontSize = '14px';
            input.style.width = '100%';
            input.style.maxWidth = '400px';
            input.style.background = d ? '#2a2c2e' : '#ffffff';
            input.style.color = d ? '#e0e0e0' : '#232527';
            input.style.outline = 'none';
            input.style.boxSizing = 'border-box';
            input.style.fontFamily = 'inherit';

            input.addEventListener('focus', function() {
                input.style.borderColor = '#0a84ff';
            });
            input.addEventListener('blur', function() {
                input.style.borderColor = d ? '#3a3c3e' : '#c7cbce';
            });

            var timer = null;
            input.addEventListener('input', function() {
                clearTimeout(timer);
                timer = setTimeout(function() {
                    var q = input.value.toLowerCase().trim();
                    var items = container.querySelectorAll(
                        '.avatarCardWrapper-0-2-406, [class*="avatarCardWrapper-"]'
                    );
                    for (var i = 0; i < items.length; i++) {
                        var link = items[i].querySelector(
                            '.avatarCardItemLink-0-2-411, [class*="avatarCardItemLink-"]'
                        );
                        if (!link) continue;
                        items[i].style.display = link.textContent.toLowerCase().indexOf(q) !== -1
                            ? '' : 'none';
                    }
                }, 200);
            });

            wrap.appendChild(input);
            container.prepend(wrap);
        },
        teardown: function() {
            var el = document.querySelector('.nx-inventory-search');
            if (el) el.remove();
        }
    };
})();
