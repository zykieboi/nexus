(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    window.NX.features.bulkUnfriend = {
        apply: function() {
            var container = document.querySelector('.friendsContainer-0-2-204, [class*="friendsContainer-"]');
            var existingToolbar = document.querySelector('.nx-bulk-toolbar');

            if (!container) {
                if (existingToolbar) existingToolbar.remove();
                document.querySelectorAll('.nx-friend-checkbox').forEach(function(cb) { cb.remove(); });
                return;
            }

            var header = container.querySelector('h2');
            if (!header || !header.textContent.includes('FRIENDS')) {
                if (existingToolbar) existingToolbar.remove();
                document.querySelectorAll('.nx-friend-checkbox').forEach(function(cb) { cb.remove(); });
                return;
            }

            if (container.querySelector('.nx-bulk-toolbar')) return;

            var cards = container.querySelectorAll('.friendCardWrapper-0-2-207, [class*="friendCardWrapper-"]');
            if (!cards.length) {
                setTimeout(window.NX.features.bulkUnfriend.apply, 500);
                return;
            }

            cards.forEach(function(card) {
                if (card.querySelector('.nx-friend-checkbox')) return;
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'nx-friend-checkbox';
                cb.style.cssText = 'position: absolute; top: 8px; right: 8px; z-index: 10; width: 18px; height: 18px; cursor: pointer;';
                card.style.position = 'relative';
                card.appendChild(cb);
            });

            var toolbar = document.createElement('div');
            toolbar.className = 'nx-bulk-toolbar';
            toolbar.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 10px 0; margin-bottom: 10px;';

            var selectAll = document.createElement('button');
            selectAll.textContent = 'Select All';
            selectAll.style.cssText = 'padding: 6px 14px; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;';

            var deselectAll = document.createElement('button');
            deselectAll.textContent = 'Deselect All';
            deselectAll.style.cssText = 'padding: 6px 14px; background: #555; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;';

            var unfriendBtn = document.createElement('button');
            unfriendBtn.textContent = 'Unfriend Selected';
            unfriendBtn.style.cssText = 'padding: 6px 14px; background: #d9534f; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; margin-left: auto;';

            var counter = document.createElement('span');
            counter.style.cssText = 'font-size: 13px; color: #999;';
            counter.textContent = '0 selected';

            function updateCount() {
                counter.textContent = container.querySelectorAll('.nx-friend-checkbox:checked').length + ' selected';
            }

            selectAll.onclick = function() {
                container.querySelectorAll('.nx-friend-checkbox').forEach(function(cb) { cb.checked = true; });
                updateCount();
            };

            deselectAll.onclick = function() {
                container.querySelectorAll('.nx-friend-checkbox').forEach(function(cb) { cb.checked = false; });
                updateCount();
            };

            unfriendBtn.onclick = async function() {
                var checked = container.querySelectorAll('.nx-friend-checkbox:checked');
                if (!checked.length) return alert('No friends selected');
                if (!confirm('Unfriend ' + checked.length + ' friend(s)?')) return;

                var csrfToken = window.NX_CSRF;
                if (!csrfToken) return alert('No CSRF token captured yet. Please unfriend someone manually first.');

                var targetIds = [];
                for (var i = 0; i < checked.length; i++) {
                    var card = checked[i].closest('.friendCardWrapper-0-2-207, [class*="friendCardWrapper-"]');
                    if (!card) continue;
                    var link = card.querySelector('a[href*="/users/"]');
                    if (!link) continue;
                    var m = link.getAttribute('href').match(/\/users\/(\d+)/);
                    if (!m) continue;
                    targetIds.push(parseInt(m[1]));
                }

                if (!targetIds.length) return alert('No valid friends found');

                var ok = 0, fail = 0;

                for (var i = 0; i < targetIds.length; i++) {
                    var targetId = targetIds[i];

                    try {
                        var r = await fetch('/apisite/friends/v1/users/' + targetId + '/unfriend', {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-Token': csrfToken
                            },
                            body: JSON.stringify({ targetUserId: targetId })
                        });

                        if (r.ok) {
                            ok++;
                            var card = document.querySelector('a[href*="/users/' + targetId + '/"]');
                            if (card) {
                                var wrapper = card.closest('.friendCardWrapper-0-2-207, [class*="friendCardWrapper-"]');
                                if (wrapper) {
                                    wrapper.style.opacity = '0.3';
                                    wrapper.style.pointerEvents = 'none';
                                }
                            }
                        } else {
                            console.log('Failed:', targetId, r.status);
                            fail++;
                        }
                    } catch (e) {
                        console.log('Error:', targetId, e);
                        fail++;
                    }

                    await new Promise(function(res) { setTimeout(res, 2000); });
                }

                alert('Unfriended: ' + ok + '\nFailed: ' + fail);
                location.reload();
            };

            container.addEventListener('change', function(e) {
                if (e.target.classList.contains('nx-friend-checkbox')) updateCount();
            });

            toolbar.appendChild(selectAll);
            toolbar.appendChild(deselectAll);
            toolbar.appendChild(counter);
            toolbar.appendChild(unfriendBtn);

            var firstRow = container.querySelector('.row');
            if (firstRow) firstRow.parentNode.insertBefore(toolbar, firstRow);
            else container.prepend(toolbar);
        }
    };

})();
