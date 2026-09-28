(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    function dark() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    window.NX.features.bulkUnfriend = {
        apply: function() {
            var container = document.querySelector(
                '.friendsContainer-0-2-204, [class*="friendsContainer-"]'
            );
            var existing = document.querySelector('.nx-bulk-toolbar');

            if (!container) {
                if (existing) existing.remove();
                document.querySelectorAll('.nx-friend-checkbox').forEach(function(c) { c.remove(); });
                return;
            }

            var header = container.querySelector('h2');
            if (!header || header.textContent.indexOf('FRIENDS') === -1) {
                if (existing) existing.remove();
                document.querySelectorAll('.nx-friend-checkbox').forEach(function(c) { c.remove(); });
                return;
            }

            if (container.querySelector('.nx-bulk-toolbar')) return;

            var cards = container.querySelectorAll(
                '.friendCardWrapper-0-2-207, [class*="friendCardWrapper-"]'
            );
            if (!cards.length) return;

            var d = dark();
            var counterColor = d ? '#9a9da0' : '#666';
            var secondary = d ? '#3a3d40' : '#e1e4e8';
            var secondaryHover = d ? '#4a4d50' : '#d0d4d8';
            var secondaryText = d ? '#e0e0e0' : '#232527';

            cards.forEach(function(card) {
                if (card.querySelector('.nx-friend-checkbox')) return;
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'nx-friend-checkbox';
                cb.style.cssText =
                    'position:absolute;top:8px;right:8px;z-index:10;' +
                    'width:18px;height:18px;cursor:pointer;';
                card.style.position = 'relative';
                card.appendChild(cb);
            });

            var bar = document.createElement('div');
            bar.className = 'nx-bulk-toolbar';
            bar.style.cssText =
                'display:flex;align-items:center;gap:12px;padding:10px 0;' +
                'margin-bottom:10px;flex-wrap:wrap;';

            var selectAll = document.createElement('button');
            selectAll.textContent = 'Select All';
            selectAll.style.cssText =
                'padding:6px 14px;background:#00a2ff;color:#fff;border:none;' +
                'border-radius:4px;cursor:pointer;font-size:13px;font-family:inherit;';

            var deselect = document.createElement('button');
            deselect.textContent = 'Deselect All';
            deselect.style.cssText =
                'padding:6px 14px;background:' + secondary + ';color:' + secondaryText + ';' +
                'border:none;border-radius:4px;cursor:pointer;font-size:13px;font-family:inherit;';

            var unfriend = document.createElement('button');
            unfriend.textContent = 'Unfriend Selected';
            unfriend.style.cssText =
                'padding:6px 14px;background:#d9534f;color:#fff;border:none;' +
                'border-radius:4px;cursor:pointer;font-size:13px;margin-left:auto;' +
                'font-family:inherit;';

            var counter = document.createElement('span');
            counter.style.cssText = 'font-size:13px;color:' + counterColor + ';';
            counter.textContent = '0 selected';

            function update() {
                var n = container.querySelectorAll('.nx-friend-checkbox:checked').length;
                counter.textContent = n + ' selected';
            }

            selectAll.onclick = function() {
                container.querySelectorAll('.nx-friend-checkbox').forEach(function(c) {
                    c.checked = true;
                });
                update();
            };

            deselect.onclick = function() {
                container.querySelectorAll('.nx-friend-checkbox').forEach(function(c) {
                    c.checked = false;
                });
                update();
            };

            unfriend.onclick = async function() {
                var checked = container.querySelectorAll('.nx-friend-checkbox:checked');
                if (!checked.length) return alert('No friends selected');
                if (!confirm('Unfriend ' + checked.length + ' friend(s)?')) return;

                var csrf = window.NX_CSRF;
                if (!csrf) return alert('No CSRF token captured yet.');

                var ids = [];
                for (var i = 0; i < checked.length; i++) {
                    var card = checked[i].closest(
                        '.friendCardWrapper-0-2-207, [class*="friendCardWrapper-"]'
                    );
                    if (!card) continue;
                    var link = card.querySelector('a[href*="/users/"]');
                    if (!link) continue;
                    var m = link.getAttribute('href').match(/\/users\/(\d+)/);
                    if (!m) continue;
                    ids.push(parseInt(m[1], 10));
                }

                if (!ids.length) return alert('No valid friends found');

                var ok = 0;
                var fail = 0;

                for (var j = 0; j < ids.length; j++) {
                    var id = ids[j];
                    try {
                        var r = await fetch('/apisite/friends/v1/users/' + id + '/unfriend', {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-Token': csrf
                            },
                            body: JSON.stringify({ targetUserId: id })
                        });
                        if (r.ok) {
                            ok++;
                            var a = document.querySelector('a[href*="/users/' + id + '/"]');
                            if (a) {
                                var w = a.closest(
                                    '.friendCardWrapper-0-2-207, [class*="friendCardWrapper-"]'
                                );
                                if (w) {
                                    w.style.opacity = '0.3';
                                    w.style.pointerEvents = 'none';
                                }
                            }
                        } else {
                            fail++;
                        }
                    } catch (e) {
                        fail++;
                    }
                    await new Promise(function(res) { setTimeout(res, 2000); });
                }

                alert('Unfriended: ' + ok + '\nFailed: ' + fail);
                location.reload();
            };

            container.addEventListener('change', function(e) {
                if (e.target.classList.contains('nx-friend-checkbox')) update();
            });

            bar.appendChild(selectAll);
            bar.appendChild(deselect);
            bar.appendChild(counter);
            bar.appendChild(unfriend);

            var firstRow = container.querySelector('.row');
            if (firstRow) firstRow.parentNode.insertBefore(bar, firstRow);
            else container.prepend(bar);
        },
        teardown: function() {
            var bar = document.querySelector('.nx-bulk-toolbar');
            if (bar) bar.remove();
            document.querySelectorAll('.nx-friend-checkbox').forEach(function(c) { c.remove(); });
        }
    };
})();
