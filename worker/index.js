const DEV_IDS = [59420];
const ADMIN_RATE_LIMIT = 30;
const ADMIN_RATE_WINDOW_MS = 60000;

const ROLE_RANK = {
    user: 0,
    panel: 1,
    moderator: 2,
    admin: 3,
    dev: 4
};

function rankOf(role) {
    return ROLE_RANK[role] || 0;
}

function logKey() {
    return 'log:' + Date.now() + ':' + Math.random().toString(36).slice(2, 8);
}

function actorOf(user) {
    return (user && (user.username || String(user.aisakaId))) || 'unknown';
}

function roleFor(aisakaId, existing) {
    if (DEV_IDS.includes(aisakaId)) return 'dev';
    if (existing && existing.role) return existing.role;
    if (existing && existing.isAdmin) return 'admin';
    return 'user';
}

function migrate(user) {
    if (!user) return user;
    if (!user.role) {
        if (user.isAdmin) {
            user.role = DEV_IDS.includes(user.aisakaId) ? 'dev' : 'admin';
        } else {
            user.role = 'user';
        }
    }
    if (DEV_IDS.includes(user.aisakaId)) user.role = 'dev';
    user.isAdmin = rankOf(user.role) >= rankOf('admin');
    return user;
}

async function checkRateLimit(env, token) {
    const key = 'ratelimit:' + token;
    const now = Date.now();
    let entry = await env.NEXUS_KV.get(key, 'json');

    if (!entry || typeof entry.resetAt !== 'number' || entry.resetAt <= now) {
        entry = { count: 1, resetAt: now + ADMIN_RATE_WINDOW_MS };
        await env.NEXUS_KV.put(key, JSON.stringify(entry), { expirationTtl: 120 });
        return null;
    }

    if (entry.count >= ADMIN_RATE_LIMIT) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return { retryAfter };
    }

    entry.count += 1;
    await env.NEXUS_KV.put(key, JSON.stringify(entry), { expirationTtl: 120 });
    return null;
}

function isExpired(user) {
    return user && user.banned && user.banExpiresAt && user.banExpiresAt <= Date.now();
}

async function applyExpiry(env, key, user) {
    if (!isExpired(user)) return user;
    user.banned = false;
    delete user.banReason;
    delete user.banExpiresAt;
    await env.NEXUS_KV.put(key, JSON.stringify(user));
    await logAction(env, {
        ts: Date.now(),
        actor: 'system',
        action: 'user.unban',
        meta: (user.username || String(user.aisakaId)) + ' (expired)'
    });
    return user;
}

async function logAction(env, entry) {
    await env.NEXUS_KV.put(logKey(), JSON.stringify(entry));
    if (entry.discord !== false) {
        await sendDiscord(env, entry);
    }
}

async function sendDiscord(env, entry) {
    const url = env.DISCORD_WEBHOOK_URL;
    if (!url) return;
    const line = '[' + (entry.action || '?') + '] ' + (entry.actor || '?') +
        (entry.meta ? ' — ' + entry.meta : '');
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: line })
        });
    } catch (e) {}
}

function checkDevSecret(request, env) {
    const secret = env.NEXUS_DEV_SECRET;
    if (!secret) return 'unconfigured';
    const sent = request.headers.get('x-nexus-dev-secret');
    if (!sent || sent !== secret) return 'forbidden';
    return null;
}

function requireRank(user, minRole) {
    return rankOf(user.role) >= rankOf(minRole);
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const cors = {
            'Access-Control-Allow-Origin': 'https://www.aisaka.me',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Nexus-Token, X-Nexus-Dev-Secret',
            'Access-Control-Allow-Credentials': 'true'
        };

        if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

        const token = request.headers.get('x-nexus-token');
        if (!token || token.length < 32) return json({ error: 'missing token' }, 401, cors);

        const key = 'user:' + token;
        let user = await env.NEXUS_KV.get(key, 'json');

        if (url.pathname === '/claim' && request.method === 'POST') {
            const body = await request.json();
            const aisakaId = parseInt(body.aisakaId, 10);
            const username = String(body.username || '').slice(0, 64);
            if (!aisakaId) return json({ error: 'invalid id' }, 400, cors);

            const pendingKey = 'pending_role:' + aisakaId;
            const pending = await env.NEXUS_KV.get(pendingKey, 'json');

            if (user) {
                user = migrate(user);
                if (pending && pending.role && !DEV_IDS.includes(user.aisakaId)) {
                    user.role = pending.role;
                    user.isAdmin = rankOf(user.role) >= rankOf('admin');
                    await env.NEXUS_KV.delete(pendingKey);
                    await logAction(env, {
                        ts: Date.now(),
                        actor: 'system',
                        action: 'user.role.pending-applied',
                        meta: (user.username || String(user.aisakaId)) + ' → ' + user.role
                    });
                }
                user = await applyExpiry(env, key, user);
                await env.NEXUS_KV.put(key, JSON.stringify(user));
                return json({ ok: true, alreadyClaimed: true, role: user.role, isAdmin: user.isAdmin }, 200, cors);
            }

            let role = roleFor(aisakaId, null);
            if (pending && pending.role && !DEV_IDS.includes(aisakaId)) {
                role = pending.role;
                await env.NEXUS_KV.delete(pendingKey);
            }

            user = {
                aisakaId,
                username,
                role,
                isAdmin: rankOf(role) >= rankOf('admin'),
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                banned: false,
                lastDailyLog: 0
            };
            await env.NEXUS_KV.put(key, JSON.stringify(user));

            await logAction(env, {
                ts: Date.now(),
                actor: 'system',
                action: 'user.claim',
                meta: username + ' #' + aisakaId + ' [' + role + ']'
            });

            return json({ ok: true, claimed: true, role, isAdmin: user.isAdmin }, 200, cors);
        }

        if (!user) return json({ error: 'unclaimed token' }, 401, cors);

        user = migrate(user);
        user = await applyExpiry(env, key, user);

        if (user.banned) return json({ error: 'banned' }, 403, cors);

        user.lastSeen = Date.now();

        if (!user.lastDailyLog || Date.now() - user.lastDailyLog > 86400000) {
            user.lastDailyLog = Date.now();
            await logAction(env, {
                ts: Date.now(),
                actor: 'system',
                action: 'user.active',
                meta: user.username + ' #' + user.aisakaId
            });
        }

        await env.NEXUS_KV.put(key, JSON.stringify(user));

        if (url.pathname === '/me') {
            return json({ user: publicUser(user) }, 200, cors);
        }

        if (url.pathname === '/config' && request.method === 'GET') {
            let announcement = await env.NEXUS_KV.get('announcement', 'json');
            const config = (await env.NEXUS_KV.get('config', 'json')) || {};

            if (announcement && announcement.test) {
                if (announcement.byToken !== token) {
                    announcement = null;
                }
            }

            return json({ announcement: announcement || null, config }, 200, cors);
        }

        if (url.pathname.startsWith('/admin/')) {
            if (!requireRank(user, 'panel')) {
                return json({ error: 'forbidden' }, 403, cors);
            }

            const limited = await checkRateLimit(env, token);
            if (limited) {
                return json({ error: 'rate limited', retryAfter: limited.retryAfter }, 429, cors);
            }

            if (url.pathname === '/admin/users' && request.method === 'GET') {
                if (!requireRank(user, 'moderator')) return json({ error: 'forbidden' }, 403, cors);

                const list = await env.NEXUS_KV.list({ prefix: 'user:' });
                const users = [];
                for (const k of list.keys) {
                    let u = await env.NEXUS_KV.get(k.name, 'json');
                    if (!u) continue;
                    u = migrate(u);
                    u = await applyExpiry(env, k.name, u);
                    users.push(Object.assign(publicUser(u), {
                        tokenPreview: k.name.slice(6, 20) + '…'
                    }));
                }
                users.sort((a, b) => b.lastSeen - a.lastSeen);
                return json({ users }, 200, cors);
            }

            if (url.pathname === '/admin/logs' && request.method === 'GET') {
                const list = await env.NEXUS_KV.list({ prefix: 'log:' });
                const logs = [];
                for (const k of list.keys) {
                    const l = await env.NEXUS_KV.get(k.name, 'json');
                    if (l) logs.push(l);
                }
                logs.sort((a, b) => b.ts - a.ts);
                return json({ logs: logs.slice(0, 200) }, 200, cors);
            }

            if (url.pathname === '/admin/tokens' && request.method === 'GET') {
                if (!requireRank(user, 'dev')) return json({ error: 'forbidden' }, 403, cors);
                const secretErr = checkDevSecret(request, env);
                if (secretErr === 'unconfigured') return json({ error: 'dev secret not configured' }, 500, cors);
                if (secretErr === 'forbidden') return json({ error: 'forbidden' }, 403, cors);

                const list = await env.NEXUS_KV.list({ prefix: 'user:' });
                const tokens = [];
                for (const k of list.keys) {
                    const u = await env.NEXUS_KV.get(k.name, 'json');
                    if (!u) continue;
                    tokens.push({
                        token: k.name.slice(5),
                        aisakaId: u.aisakaId,
                        username: u.username,
                        role: u.role || (u.isAdmin ? 'admin' : 'user')
                    });
                }
                tokens.sort((a, b) => a.aisakaId - b.aisakaId);
                return json({ tokens }, 200, cors);
            }

            if (url.pathname === '/admin/role' && request.method === 'POST') {
                if (!requireRank(user, 'dev')) return json({ error: 'forbidden' }, 403, cors);
                const secretErr = checkDevSecret(request, env);
                if (secretErr === 'unconfigured') return json({ error: 'dev secret not configured' }, 500, cors);
                if (secretErr === 'forbidden') return json({ error: 'forbidden' }, 403, cors);

                const body = await request.json();
                const preview = String(body.tokenPreview || '');
                const nextRole = String(body.role || '');
                if (!preview) return json({ error: 'no preview' }, 400, cors);
                if (!(nextRole in ROLE_RANK)) return json({ error: 'invalid role' }, 400, cors);

                const list = await env.NEXUS_KV.list({ prefix: 'user:' });
                for (const k of list.keys) {
                    let u = await env.NEXUS_KV.get(k.name, 'json');
                    if (!u) continue;
                    if (k.name.slice(6, 20) + '…' === preview) {
                        u = migrate(u);
                        if (DEV_IDS.includes(u.aisakaId)) {
                            return json({ error: 'cannot change dev via panel' }, 400, cors);
                        }
                        u.role = nextRole;
                        u.isAdmin = rankOf(nextRole) >= rankOf('admin');
                        await env.NEXUS_KV.put(k.name, JSON.stringify(u));
                        await logAction(env, {
                            ts: Date.now(),
                            actor: actorOf(user),
                            action: 'user.role',
                            meta: (u.username || String(u.aisakaId)) + ' → ' + nextRole
                        });
                        return json({ ok: true, role: nextRole }, 200, cors);
                    }
                }
                return json({ error: 'not found' }, 404, cors);
            }

            if (url.pathname === '/admin/role-by-id' && request.method === 'POST') {
                if (!requireRank(user, 'dev')) return json({ error: 'forbidden' }, 403, cors);
                const secretErr = checkDevSecret(request, env);
                if (secretErr === 'unconfigured') return json({ error: 'dev secret not configured' }, 500, cors);
                if (secretErr === 'forbidden') return json({ error: 'forbidden' }, 403, cors);

                const body = await request.json();
                const aisakaId = parseInt(body.aisakaId, 10);
                const nextRole = String(body.role || '');
                if (!aisakaId) return json({ error: 'invalid id' }, 400, cors);
                if (!(nextRole in ROLE_RANK)) return json({ error: 'invalid role' }, 400, cors);
                if (DEV_IDS.includes(aisakaId)) {
                    return json({ error: 'cannot change dev via panel' }, 400, cors);
                }

                const list = await env.NEXUS_KV.list({ prefix: 'user:' });
                let updated = null;
                for (const k of list.keys) {
                    let u = await env.NEXUS_KV.get(k.name, 'json');
                    if (!u) continue;
                    if (parseInt(u.aisakaId, 10) === aisakaId) {
                        u = migrate(u);
                        u.role = nextRole;
                        u.isAdmin = rankOf(nextRole) >= rankOf('admin');
                        await env.NEXUS_KV.put(k.name, JSON.stringify(u));
                        updated = u;
                        break;
                    }
                }

                if (updated) {
                    await logAction(env, {
                        ts: Date.now(),
                        actor: actorOf(user),
                        action: 'user.role',
                        meta: (updated.username || String(updated.aisakaId)) + ' → ' + nextRole
                    });
                    return json({ ok: true, applied: true, role: nextRole }, 200, cors);
                }

                await env.NEXUS_KV.put('pending_role:' + aisakaId, JSON.stringify({
                    role: nextRole,
                    setAt: Date.now(),
                    setBy: actorOf(user)
                }));
                await logAction(env, {
                    ts: Date.now(),
                    actor: actorOf(user),
                    action: 'user.role.pending',
                    meta: '#' + aisakaId + ' → ' + nextRole + ' (not claimed yet)'
                });
                return json({ ok: true, applied: false, role: nextRole }, 200, cors);
            }

            if (url.pathname === '/admin/announce' && request.method === 'POST') {
                if (!requireRank(user, 'dev')) return json({ error: 'forbidden' }, 403, cors);

                const body = await request.json();
                const text = String(body.text || '').slice(0, 500);
                const isTest = !!body.test;

                await env.NEXUS_KV.put('announcement', JSON.stringify({
                    text,
                    updatedAt: Date.now(),
                    test: isTest,
                    byToken: isTest ? token : undefined
                }));
                await logAction(env, {
                    ts: Date.now(),
                    actor: actorOf(user),
                    action: isTest ? 'announce.test' : 'announce.post',
                    meta: text.slice(0, 80)
                });
                return json({ ok: true }, 200, cors);
            }

            if (url.pathname === '/admin/ban' && request.method === 'POST') {
                if (!requireRank(user, 'admin')) return json({ error: 'forbidden' }, 403, cors);

                const body = await request.json();
                const preview = String(body.tokenPreview || '');
                if (!preview) return json({ error: 'no preview' }, 400, cors);

                const reason = body.reason ? String(body.reason).slice(0, 200) : null;
                const expiresAt = body.expiresAt ? parseInt(body.expiresAt, 10) : null;

                const list = await env.NEXUS_KV.list({ prefix: 'user:' });
                for (const k of list.keys) {
                    let u = await env.NEXUS_KV.get(k.name, 'json');
                    if (!u) continue;
                    if (k.name.slice(6, 20) + '…' === preview) {
                        u = migrate(u);
                        if (rankOf(u.role) >= rankOf('admin') && !requireRank(user, 'dev')) {
                            return json({ error: 'cannot ban admin' }, 403, cors);
                        }
                        if (DEV_IDS.includes(u.aisakaId)) {
                            return json({ error: 'cannot ban dev' }, 400, cors);
                        }
                        u.banned = true;
                        if (reason) u.banReason = reason;
                        else delete u.banReason;
                        if (expiresAt && expiresAt > Date.now()) u.banExpiresAt = expiresAt;
                        else delete u.banExpiresAt;
                        await env.NEXUS_KV.put(k.name, JSON.stringify(u));
                        await logAction(env, {
                            ts: Date.now(),
                            actor: actorOf(user),
                            action: 'user.ban',
                            meta: (u.username || String(u.aisakaId)) + (reason ? ' — ' + reason : '')
                        });
                        return json({ ok: true, banned: true }, 200, cors);
                    }
                }
                return json({ error: 'not found' }, 404, cors);
            }

            if (url.pathname === '/admin/unban' && request.method === 'POST') {
                if (!requireRank(user, 'admin')) return json({ error: 'forbidden' }, 403, cors);

                const body = await request.json();
                const preview = String(body.tokenPreview || '');
                if (!preview) return json({ error: 'no preview' }, 400, cors);

                const list = await env.NEXUS_KV.list({ prefix: 'user:' });
                for (const k of list.keys) {
                    let u = await env.NEXUS_KV.get(k.name, 'json');
                    if (!u) continue;
                    if (k.name.slice(6, 20) + '…' === preview) {
                        u = migrate(u);
                        u.banned = false;
                        delete u.banReason;
                        delete u.banExpiresAt;
                        await env.NEXUS_KV.put(k.name, JSON.stringify(u));
                        await logAction(env, {
                            ts: Date.now(),
                            actor: actorOf(user),
                            action: 'user.unban',
                            meta: u.username || String(u.aisakaId)
                        });
                        return json({ ok: true, banned: false }, 200, cors);
                    }
                }
                return json({ error: 'not found' }, 404, cors);
            }

            if (url.pathname === '/admin/config' && request.method === 'POST') {
                if (!requireRank(user, 'dev')) return json({ error: 'forbidden' }, 403, cors);

                const body = await request.json();
                const current = (await env.NEXUS_KV.get('config', 'json')) || {};
                const next = { ...current, ...body };
                await env.NEXUS_KV.put('config', JSON.stringify(next));
                await logAction(env, {
                    ts: Date.now(),
                    actor: actorOf(user),
                    action: 'config.update',
                    meta: Object.keys(body).join(', ')
                });
                return json({ ok: true, config: next }, 200, cors);
            }
        }

        return json({ error: 'not found' }, 404, cors);
    }
};

function publicUser(u) {
    return {
        aisakaId: u.aisakaId,
        username: u.username,
        role: u.role || (u.isAdmin ? 'admin' : 'user'),
        isAdmin: rankOf(u.role) >= rankOf('admin'),
        banned: !!u.banned,
        banReason: u.banReason || null,
        banExpiresAt: u.banExpiresAt || null,
        firstSeen: u.firstSeen,
        lastSeen: u.lastSeen
    };
}

function json(obj, status, cors) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors }
    });
}
