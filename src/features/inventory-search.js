(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    window.NX.features.inventorySearch = {
        apply: function() {
            var container = document.querySelector('.itemContainer-0-2-344, [class*="itemContainer-"]');
            if (!container) {
                setTimeout(window.NX.features.inventorySearch.apply, 500);
                return;
            }
            if (container.querySelector('.nx-inventory-search')) return;

            var wrapper = document.createElement('div');
            wrapper.className = 'nx-inventory-search';
            wrapper.style.cssText = 'padding: 10px 0; width: 100%;';

            var input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Search inventory...';
            input.style.cssText = 'padding: 8px 14px; border: 1px solid #3a3c3e; border-radius: 6px; font-size: 14px; width: 100%; max-width: 400px; background: #2a2c2e; color: #e0e0e0; outline: none; box-sizing: border-box;';

            function filter() {
                var query = input.value.toLowerCase().trim();
                container.querySelectorAll('.avatarCardWrapper-0-2-406, [class*="avatarCardWrapper-"]').forEach(function(item) {
                    var link = item.querySelector('.avatarCardItemLink-0-2-411, [class*="avatarCardItemLink-"]');
                    if (!link) return;
                    item.style.display = link.textContent.toLowerCase().includes(query) ? '' : 'none';
                });
            }

            input.addEventListener('input', filter);
            wrapper.appendChild(input);
            container.prepend(wrapper);
        }
    };

})();
