(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-quick-search-style';
    var MARKER = 'nx-qs-item';
    var DEBOUNCE_MS = 200;
    var WAIT_TIMEOUT = 2000;
    var REINJECT_MS = 300;
    var THUMB_SIZE = 30;
    var GAME_ICON = '/img/placeholder/icon_one.png';
    var MAX_GAMES = 1;

    var currentRequest = 0;
    var debounceTimer = null;
    var interval = null;
    var avatarCache = {};
    var gameIconCache = {};
    var gameDetailCache = {};
    var lastQuery = '';
    var lastInjected = [];
    var lastPath = location.pathname;

    var PLAY_SVG = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path fill="#fff" d="M8 5v14l11-7z"/></svg>';

    function isOn() {
        return window.NX.settings && window.NX.settings.get('quickSearch');
    }

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + '{',
            '  width:100%;padding:0 6px;margin:0;white-space:normal;list-style:none;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' > a.new-navbar-search-anchor{',
            '  display:flex !important;align-items:center !important;',
            '  height:56px;padding:12px;box-sizing:border-box;text-decoration:none !important;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .navbar-list-option-icon.nx-qs-thumb{',
            '  flex:0 0 ' + THUMB_SIZE + 'px !important;',
            '  width:' + THUMB_SIZE + 'px !important;height:' + THUMB_SIZE + 'px !important;',
            '  min-width:' + THUMB_SIZE + 'px !important;max-width:' + THUMB_SIZE + 'px !important;',
            '  min-height:' + THUMB_SIZE + 'px !important;max-height:' + THUMB_SIZE + 'px !important;',
            '  border-radius:0 !important;background-color:#2c2e30 !important;',
            '  background-size:cover !important;background-position:center !important;',
            '  background-repeat:no-repeat !important;display:inline-block !important;',
            '  box-sizing:border-box !important;margin:0 12px 0 0 !important;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .navbar-list-option-text{',
            '  display:flex;flex-direction:column;justify-content:center;',
            '  flex:1 1 auto;min-width:0;overflow:hidden;line-height:1.2;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-name{',
            '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-username{',
            '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
            '  font-size:.8em;color:#8a8d90 !important;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-play{',
            '  flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;',
            '  width:48px;height:36px;margin-left:auto !important;margin-right:0;',
            '  border-radius:8px;background-color:#00b06f;border:1px solid #00b06f;',
            '  color:#fff;cursor:pointer;user-select:none;padding:0;',
            '  text-decoration:none !important;box-sizing:border-box;',
            '  transition:background-color .15s ease,border-color .15s ease;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-play:hover{',
            '  background-color:#00c47d;border-color:#00c47d;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-play:active{',
            '  background-color:#00a066;border-color:#00a066;',
            '}',
            'ul.dropdown-menu.new-dropdown-menu > li.' + MARKER + ' .nx-qs-play svg{',
            '  display:block;pointer-events:none;',
            '}'
        ].join('');
        document.head.appendChild(s);
    }

    function findSearchInput() {
        return document.getElementById('navbar-search-input');
    }

    function findNativeDropdown() {
        var lists = document.querySelectorAll('ul.dropdown-menu.new-dropdown-menu');
        for (var i = 0; i < lists.length; i++) {
            if (lists[i].querySelector('a.new-navbar-search-anchor')) return lists[i];
        }
        return null;
    }

    function waitForNativeDropdown() {
        return new Promise(function (resolve) {
            var start = Date.now();
            var check = function () {
                var d = findNativeDropdown();
                if (d) return resolve(d);
                if (Date.now() - start > WAIT_TIMEOUT) return resolve(null);
                setTimeout(check, 50);
            };
            check();
        });
    }

    function clearInjected() {
        document.querySelectorAll('li.' + MARKER).forEach(function (el) { el.remove(); });
    }

    function fetchJson(url) {
        return fetch(url, {
            credentials: 'include',
            headers: { accept: 'application/json' }
        }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    function fetchUserAvatar(userId) {
        var key = 'u' + userId;
        if (avatarCache[key]) return Promise.resolve(avatarCache[key]);
        return fetchJson('/apisite/thumbnails/v1/users/avatar-headshot?userIds=' + userId + '&size=150x150&format=png')
            .then(function (d) {
                var url = d && d.data && d.data[0] && d.data[0].imageUrl;
                if (url) avatarCache[key] = url;
                return url || null;
            })
            .catch(function () { return null; });
    }

    function fetchGameIcon(universeId) {
        var key = 'g' + universeId;
        if (gameIconCache[key]) return Promise.resolve(gameIconCache[key]);
        return fetchJson('/apisite/thumbnails/v1/games/icons?universeIds=' + universeId + '&size=150x150&format=Png')
            .then(function (d) {
                var url = d && d.data && d.data[0] && d.data[0].imageUrl;
                if (url) gameIconCache[key] = url;
                return url || null;
            })
            .catch(function () { return null; });
    }

    function fetchGameDetails(universeIds) {
        if (!universeIds.length) return Promise.resolve({});
        var key = universeIds.slice().sort().join(',');
        if (gameDetailCache[key]) return Promise.resolve(gameDetailCache[key]);

        return fetchJson('/apisite/games/v1/games?universeIds=' + universeIds.join(','))
            .then(function (d) {
                var arr = (d && d.data) || [];
                var map = {};
                arr.forEach(function (g) {
                    if (g && g.id != null) map[g.id] = g;
                });
                gameDetailCache[key] = map;
                return map;
            })
            .catch(function () { return {}; });
    }

    function exactMatch(name, query) {
        if (!name) return false;
        return name.toLowerCase().trim() === query.toLowerCase().trim();
    }

    function gamePopularity(game) {
        return (game.playing || 0) * 1000000 + (game.favoritedCount || 0) * 1000 + (game.visits || 0);
    }

    function prefixKey(name) {
        var n = (name || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '');
        return n.slice(0, 12);
    }

    function compareGames(a, b) {
        var pa = gamePopularity(a);
        var pb = gamePopularity(b);
        if (pa !== pb) return pb - pa;
        if (a.exactHit !== b.exactHit) return a.exactHit ? -1 : 1;
        var la = (a.name || '').length;
        var lb = (b.name || '').length;
        if (la !== lb) return la - lb;
        return (a.universeId || 0) - (b.universeId || 0);
    }

    function dedupeGames(games) {
        var best = {};
        games.forEach(function (g) {
            var key = prefixKey(g.name);
            if (!key) return;
            var existing = best[key];
            if (!existing || compareGames(g, existing) < 0) {
                best[key] = g;
            }
        });
        return Object.keys(best).map(function (k) { return best[k]; });
    }

    function launchGame(placeId) {
        var headers = { accept: 'application/json' };
        if (window.NX_CSRF) headers['x-csrf-token'] = window.NX_CSRF;

        return fetch('/game/get-join-script?placeId=' + placeId, {
            credentials: 'include',
            headers: headers
        }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function (data) {
            if (data && data.joinScriptUrl) {
                var a = document.createElement('a');
                a.href = 'octane-player' + data.joinScriptUrl;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(function () { a.remove(); }, 100);
            }
        }).catch(function () {});
    }

    function buildItem(entry) {
        var nativeLi = document.querySelector('ul.dropdown-menu.new-dropdown-menu li.navbar-search-option:not(.' + MARKER + ')');
        var nativeA = nativeLi ? nativeLi.querySelector('a.new-navbar-search-anchor') : null;

        var li = document.createElement('li');
        li.className = 'navbar-search-option rbx-clickable-li ' + MARKER;
        if (nativeLi) {
            nativeLi.classList.forEach(function (c) {
                if (c === 'new-selected' || c === MARKER) return;
                if (li.classList.contains(c)) return;
                li.classList.add(c);
            });
        }

        var a = document.createElement('a');
        a.className = nativeA ? nativeA.className : 'new-navbar-search-anchor';
        a.href = entry.href;

        var icon = document.createElement('span');
        icon.className = 'navbar-list-option-icon nx-qs-thumb';
        if (entry.iconUrl) icon.style.backgroundImage = 'url("' + entry.iconUrl + '")';
        a.appendChild(icon);

        var text = document.createElement('span');
        text.className = 'navbar-list-option-text';

        if (entry.secondary) {
            var name = document.createElement('span');
            name.className = 'nx-qs-name';
            name.textContent = entry.text;
            text.appendChild(name);

            var user = document.createElement('span');
            user.className = 'nx-qs-username';
            user.textContent = entry.secondary;
            text.appendChild(user);
        } else {
            var single = document.createElement('span');
            single.className = 'nx-qs-name';
            single.textContent = entry.text;
            text.appendChild(single);
        }
        a.appendChild(text);

        if (entry.playPlaceId) {
            var playBtn = document.createElement('button');
            playBtn.type = 'button';
            playBtn.className = 'nx-qs-play';
            playBtn.title = 'Play';
            playBtn.innerHTML = PLAY_SVG;

            playBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                launchGame(entry.playPlaceId);
            });
            a.appendChild(playBtn);
        }

        li.appendChild(a);
        return li;
    }

    function paintInjected() {
        var dropdown = findNativeDropdown();
        if (!dropdown) return false;
        if (!lastInjected.length) return false;
        if (dropdown.querySelector('li.' + MARKER)) return true;

        for (var i = lastInjected.length - 1; i >= 0; i--) {
            dropdown.insertBefore(buildItem(lastInjected[i]), dropdown.firstChild);
        }
        return true;
    }

    function doSearch(query) {
        var reqId = ++currentRequest;
        var q = query.trim();

        lastQuery = q;
        clearInjected();
        lastInjected = [];

        if (!q) return;

        Promise.all([
            fetchJson('/search/users/results?keyword=' + encodeURIComponent(q) + '&maxRows=10&startIndex=0')
                .then(function (d) { return d.UserSearchResults || []; })
                .catch(function () { return []; }),
            fetchJson('/apisite/games/v1/games/list?keyword=' + encodeURIComponent(q) + '&maxRows=25')
                .then(function (d) { return d.games || d.data || []; })
                .catch(function () { return []; })
        ]).then(function (results) {
            if (reqId !== currentRequest) return;

            var users = results[0].filter(function (u) {
                return exactMatch(u.Name, q) || exactMatch(u.DisplayName, q);
            }).slice(0, 1);

            var rawGames = results[1] || [];

            var universeIds = [];
            rawGames.forEach(function (g) {
                var uid = g.universeId || g.UniverseId || g.universe_id;
                if (uid && universeIds.indexOf(uid) === -1) universeIds.push(uid);
            });

            var playabilityPromise = universeIds.length
                ? fetchJson('/apisite/games/v1/games/multiget-playability-status?universeIds=' + universeIds.join(','))
                    .then(function (d) {
                        var arr = Array.isArray(d) ? d : (d && d.data) || [];
                        var map = {};
                        arr.forEach(function (item) {
                            if (item && item.universeId != null) map[item.universeId] = !!item.isPlayable;
                        });
                        return map;
                    })
                    .catch(function () { return {}; })
                : Promise.resolve({});

            return Promise.all([users, rawGames, playabilityPromise, fetchGameDetails(universeIds), q]);
        }).then(function (parts) {
            if (!parts) return;
            if (reqId !== currentRequest) return;

            var users = parts[0];
            var rawGames = parts[1];
            var playability = parts[2] || {};
            var details = parts[3] || {};
            var q = parts[4];

            var merged = [];
            rawGames.forEach(function (g) {
                var uid = g.universeId || g.UniverseId || g.universe_id;
                if (!uid) return;
                if (playability[uid] !== true) return;

                var d = details[uid] || {};
                var name = d.name || g.name || g.Name || 'Untitled';
                merged.push({
                    universeId: uid,
                    rootPlaceId: d.rootPlaceId || g.rootPlaceId || g.placeId || g.id,
                    name: name,
                    playing: d.playing || 0,
                    visits: d.visits || 0,
                    favoritedCount: d.favoritedCount || 0,
                    exactHit: exactMatch(name, q)
                });
            });

            var games = dedupeGames(merged).sort(compareGames).slice(0, MAX_GAMES);

            if (!users.length && !games.length) return;

            var tasks = [];

            if (users.length) {
                var u = users[0];
                var display = u.DisplayName || u.Name;
                var username = u.Name && u.DisplayName && u.Name !== u.DisplayName ? '@' + u.Name : '';
                tasks.push(fetchUserAvatar(u.UserId).then(function (thumb) {
                    return {
                        href: '/search/users?keyword=' + encodeURIComponent(u.Name || u.DisplayName),
                        text: display,
                        secondary: username,
                        iconUrl: thumb
                    };
                }));
            }

            games.forEach(function (g) {
                tasks.push(fetchGameIcon(g.universeId).then(function (icon) {
                    return {
                        href: '/games/' + g.rootPlaceId + '/--',
                        text: g.name,
                        secondary: '',
                        iconUrl: icon || GAME_ICON,
                        playPlaceId: g.rootPlaceId
                    };
                }));
            });

            Promise.all(tasks).then(function (entries) {
                if (reqId !== currentRequest) return;
                lastInjected = entries.filter(Boolean);
                waitForNativeDropdown().then(paintInjected);
            });
        });
    }

    function attachToInput(input) {
        if (input.dataset.nxQsAttached) return;
        input.dataset.nxQsAttached = '1';

        input.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () { doSearch(input.value); }, DEBOUNCE_MS);
        });

        input.addEventListener('focus', function () {
            if (input.value.trim() && !lastInjected.length) doSearch(input.value);
            else paintInjected();
        });
    }

    function tick() {
        var input = findSearchInput();
        if (input) attachToInput(input);

        if (lastInjected.length && lastQuery) {
            var i2 = findSearchInput();
            if (i2 && i2.value.trim() === lastQuery) paintInjected();
        }
    }

    function purge() {
        clearInjected();
        var input = findSearchInput();
        if (input) delete input.dataset.nxQsAttached;
        lastInjected = [];
        lastQuery = '';
    }

    function start() {
        if (interval) return;
        tick();
        interval = setInterval(function () {
            if (location.pathname !== lastPath) {
                lastPath = location.pathname;
                purge();
            }
            tick();
        }, REINJECT_MS);
    }

    function stop() {
        if (interval) { clearInterval(interval); interval = null; }
        clearTimeout(debounceTimer);
        debounceTimer = null;
        purge();
    }

    window.NX.features.quickSearch = {
        apply: function () {
            style();
            start();
        },
        teardown: function () {
            stop();
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
        }
    };
})();
