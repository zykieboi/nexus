(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    window.NX.features.rap = {
        apply: function() {
            if (document.querySelector('.nx-rap-stat')) return;
            if (window.NX._rapLoading) return;

            var pathMatch = window.location.pathname.match(/\/users\/(\d+)\/profile/);
            if (!pathMatch) return;
            var userId = pathMatch[1];

            var statHeaders = document.querySelectorAll('[class*="statHeader-"]');
            if (!statHeaders.length) {
                setTimeout(window.NX.features.rap.apply, 500);
                return;
            }

            var followingHeader = null;
            for (var i = 0; i < statHeaders.length; i++) {
                if (statHeaders[i].textContent.trim() === 'Following') {
                    followingHeader = statHeaders[i];
                    break;
                }
            }
            if (!followingHeader) {
                setTimeout(window.NX.features.rap.apply, 500);
                return;
            }

            var followingStatRow = followingHeader.closest('[class*="statRow-"]');
            if (!followingStatRow) return;

            var followingCol = followingStatRow.closest('[class*="wrapper-"]');
            if (!followingCol) followingCol = followingStatRow.parentElement;
            if (!followingCol || !followingCol.parentElement) return;

            window.NX._rapLoading = true;

            fetch('/internal/limiteds?userId=' + userId, { credentials: 'include' })
                .then(function(r) { return r.text(); })
                .then(function(html) {
                    window.NX._rapLoading = false;
                    if (document.querySelector('.nx-rap-stat')) return;

                    var match = html.match(/Total RAP:[\s\S]{0,200}?([\d,]+)/i);
                    if (!match) return;

                    var wrapper = followingCol.cloneNode(true);
                    wrapper.classList.add('nx-rap-stat');

                    var valueEl = wrapper.querySelector('[class*="statValue-"]');
                    var headerEl = wrapper.querySelector('[class*="statHeader-"]');

                    if (valueEl) {
                        valueEl.innerHTML = '';
                        var link = document.createElement('a');
                        link.href = '/internal/limiteds?userId=' + userId;
                        link.textContent = match[1];
                        valueEl.appendChild(link);
                    }
                    if (headerEl) headerEl.textContent = 'RAP';

                    followingCol.parentElement.insertBefore(wrapper, followingCol.nextSibling);
                })
                .catch(function() {
                    window.NX._rapLoading = false;
                });
        },
        teardown: function() {
            var el = document.querySelector('.nx-rap-stat');
            if (el) el.remove();
            window.NX._rapLoading = false;
        }
    };

})();
