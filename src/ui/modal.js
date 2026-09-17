(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.ui = window.NX.ui || {};

    var DEV_ID = 59420;

    function getMeId() {
        if (window.NX && typeof window.NX.getMeId === 'function') {
            return window.NX.getMeId();
        }
        return parseInt(localStorage.getItem('nx_me_id') || '0', 10);
    }

    window.NX.ui.modal = {
        build: function() {
            var existing = document.getElementById('nx-overlay');
            if (existing) existing.remove();

            var isDev = getMeId() === DEV_ID;

            var overlay = document.createElement('div');
            overlay.id = 'nx-overlay';

            var modal = document.createElement('div');
            modal.id = 'nx-modal';

            var header = document.createElement('div');
            header.className = 'nx-header';

            var title = document.createElement('h2');
            title.textContent = 'Nexus Settings';

            var sub = document.createElement('div');
            sub.className = 'sub';
            sub.textContent = 'Settings are saved automatically';

            var titleBlock = document.createElement('div');
            titleBlock.className = 'title-block';
            titleBlock.appendChild(title);
            titleBlock.appendChild(sub);

            var close = document.createElement('button');
            close.className = 'close';
            close.textContent = '×';
            close.onclick = function() { overlay.remove(); };

            header.appendChild(titleBlock);
            header.appendChild(close);

            var content = document.createElement('div');
            content.className = 'nx-content';

            var cats = [
                { id: 'visual', label: 'Visual' },
                { id: 'function', label: 'Function' },
                { id: 'performance', label: 'Performance' }
            ];

            var optMap = {
                hideAlert: {
                    cat: 'visual',
                    label: 'Hide Alert',
                    desc: 'Hides the alert banner under the navigation bar for now.'
                },
                nexusPanel: {
                    cat: 'visual',
                    label: 'Nexus Panel',
                    desc: 'Enables the /admin page and adds a Nexus Panel to the sidebar.',
                    devOnly: true
                },
                inventorySearch: {
                    cat: 'function',
                    label: 'Inventory Search',
                    desc: 'Adds a search bar to your inventory so you can filter items by name.'
                },
                bulkUnfriend: {
                    cat: 'function',
                    label: 'Bulk Unfriend',
                    desc: 'Select multiple friends and remove them all at once from the friends page.'
                },
                rap: {
                    cat: 'function',
                    label: 'RAP on Profile',
                    desc: 'Shows the user\'s total RAP next to their friends/followers stats.'
                },
                trade2020: {
                    cat: 'function',
                    label: '2020 Trade Theme',
                    desc: 'Replaces the default trade list and window with the 2020 Roblox layout.'
                },
                removeAds: {
                    cat: 'performance',
                    label: 'Remove Ads',
                    desc: 'Hides all advertisement banners and skyscrapers across the site.'
                }
            };

            cats.forEach(function(cat, ci) {
                var visibleKeys = Object.keys(optMap).filter(function(k) {
                    if (optMap[k].cat !== cat.id) return false;
                    if (optMap[k].devOnly && !isDev) return false;
                    return true;
                });
                if (!visibleKeys.length) return;

                var catDiv = document.createElement('div');
                catDiv.className = 'nx-cat';
                if (ci === 0) catDiv.classList.add('first');
                catDiv.textContent = cat.label;
                content.appendChild(catDiv);

                visibleKeys.forEach(function(key) {
                    var cfg = optMap[key];
                    var storedOn = window.NX.settings.get(key);

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

                    var toggle = document.createElement('label');
                    toggle.className = 'nx-toggle';

                    var input = document.createElement('input');
                    input.type = 'checkbox';
                    input.checked = storedOn;

                    input.addEventListener('change', (function(k) {
                        return function() {
                            window.NX.settings.set(k, this.checked);
                            if (this.checked) {
                                if (window.NX.features[k] && window.NX.features[k].apply) {
                                    window.NX.features[k].apply();
                                }
                            } else {
                                if (window.NX.features[k] && window.NX.features[k].teardown) {
                                    window.NX.features[k].teardown();
                                }
                            }
                        };
                    })(key));

                    var slider = document.createElement('span');
                    slider.className = 'slider';

                    toggle.appendChild(input);
                    toggle.appendChild(slider);
                    row.appendChild(text);
                    row.appendChild(toggle);
                    content.appendChild(row);
                });
            });

            var footer = document.createElement('div');
            footer.className = 'nx-footer';

            var saveBtn = document.createElement('button');
            saveBtn.className = 'save-btn';
            saveBtn.textContent = 'Save & Reload';
            saveBtn.onclick = function() { location.reload(); };

            footer.appendChild(saveBtn);

            modal.appendChild(header);
            modal.appendChild(content);
            modal.appendChild(footer);
            overlay.appendChild(modal);

            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) overlay.remove();
            });

            document.body.appendChild(overlay);
        }
    };

})();
