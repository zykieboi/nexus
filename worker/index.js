function json(obj, status, cors) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors }
    });
}

const ONLINE_TTL_MS = 2 * 60 * 1000;
const ONLINE_KEY = 'online_users';

const BADGES = {
    1043: 'nexus'
};

const TIERS = {
    nexus: {
        label: 'Nexus',
        color: '#7c3aed',
        icon: 'https://github.com/zykieboi/nexus/blob/main/img/opsec.png?raw=true'
    }
};

const BADGE_HITS = new Map();

function badgeFor(url) {
    const id = parseInt(url.searchParams.get('id'), 10);
    if (!id) return { badge: null };

    const now = Date.now();
    const rec = BADGE_HITS.get(id) || { count: 0, reset: now + 60000 };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + 60000; }
    rec.count++;
    BADGE_HITS.set(id, rec);
    if (rec.count > 30) return { badge: null };

    const tier = BADGES[id];
    if (!tier) return { badge: null };

    const meta = TIERS[tier] || { label: 'Nexus', color: '#7c3aed', icon: '' };
    return { badge: tier, label: meta.label, color: meta.color, icon: meta.icon };
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin') || '';
        const allowedOrigins = [
            'https://octane.wtf',
            'https://www.octane.wtf'
        ];
        const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

        const cors = {
            'Access-Control-Allow-Origin': allowOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Nexus-Token',
            'Access-Control-Allow-Credentials': 'true',
            'Vary': 'Origin'
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: cors });
        }

        if (url.pathname === '/api/nexus/ping') {
            const id = url.searchParams.get('id');
            if (id) ctx.waitUntil(trackOnline(env, id));
            return json({ ok: true }, 200, cors);
        }

        if (url.pathname === '/api/nexus/count') {
            const n = await countOnline(env);
            return json({ count: n }, 200, cors);
        }

        if (url.pathname === '/api/nexus/badge') {
            const result = badgeFor(url);
            return new Response(JSON.stringify(result), {
                status: 200,
                headers: {
                    ...cors,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=300'
                }
            });
        }

        if (url.pathname === '/api/nexus/badge-seen') {
            const profileId = url.searchParams.get('profileId');
            const viewerId = url.searchParams.get('viewerId') || '0';
            if (profileId) ctx.waitUntil(trackBadgeSeen(env, profileId, viewerId));
            return json({ ok: true }, 200, cors);
        }

        if (url.pathname === '/api/nexus/badge-count') {
            const id = url.searchParams.get('id');
            if (!id) return json({ error: 'missing id' }, 400, cors);
            const count = await getBadgeCount(env, id);
            const viewers = await getBadgeViewers(env, id);
            return json({ id: id, count: count, viewers: viewers }, 200, cors);
        }

        const token = request.headers.get('x-nexus-token');
        if (!token || token.length < 32) {
            return json({ error: 'missing token' }, 401, cors);
        }

        const key = 'user:' + token;
        let user = await env.NEXUS_KV.get(key, 'json');

        if (url.pathname === '/claim' && request.method === 'POST') {
            const body = await request.json();
            const aisakaId = parseInt(body.aisakaId, 10);
            const username = String(body.username || '').slice(0, 64);
            if (!aisakaId) return json({ error: 'invalid id' }, 400, cors);

            if (user) {
                user.aisakaId = aisakaId;
                user.username = username;
                user.lastSeen = Date.now();
                await env.NEXUS_KV.put(key, JSON.stringify(user));
                return json({ ok: true, alreadyClaimed: true }, 200, cors);
            }

            user = {
                aisakaId,
                username,
                firstSeen: Date.now(),
                lastSeen: Date.now()
            };
            await env.NEXUS_KV.put(key, JSON.stringify(user));

            return json({ ok: true, claimed: true }, 200, cors);
        }

        if (!user) return json({ error: 'unclaimed token' }, 401, cors);

        user.lastSeen = Date.now();
        await env.NEXUS_KV.put(key, JSON.stringify(user));

        if (url.pathname === '/me') {
            return json({
                user: {
                    aisakaId: user.aisakaId,
                    username: user.username
                }
            }, 200, cors);
        }

        if (url.pathname === '/config' && request.method === 'GET') {
            const announcement = await env.NEXUS_KV.get('announcement', 'json');
            const config = (await env.NEXUS_KV.get('config', 'json')) || {};
            return json({ announcement: announcement || null, config }, 200, cors);
        }

        return json({ error: 'not found' }, 404, cors);
    }
};

async function trackOnline(env, id) {
    const map = (await env.NEXUS_KV.get(ONLINE_KEY, 'json')) || {};
    map[id] = Date.now();
    await env.NEXUS_KV.put(ONLINE_KEY, JSON.stringify(map));
}

async function countOnline(env) {
    const map = (await env.NEXUS_KV.get(ONLINE_KEY, 'json')) || {};
    const cutoff = Date.now() - ONLINE_TTL_MS;
    let n = 0;
    for (const id in map) {
        if (map[id] >= cutoff) n++;
    }
    return n;
}

async function trackBadgeSeen(env, profileId, viewerId) {
    const countKey = 'badge_seen_count:' + profileId;
    const viewersKey = 'badge_seen_viewers:' + profileId;

    const current = parseInt(await env.NEXUS_KV.get(countKey) || '0', 10);
    await env.NEXUS_KV.put(countKey, String(current + 1));

    if (viewerId && viewerId !== '0') {
        const viewers = (await env.NEXUS_KV.get(viewersKey, 'json')) || {};
        viewers[viewerId] = Date.now();
        await env.NEXUS_KV.put(viewersKey, JSON.stringify(viewers));
    }
}

async function getBadgeCount(env, profileId) {
    return parseInt(await env.NEXUS_KV.get('badge_seen_count:' + profileId) || '0', 10);
}

async function getBadgeViewers(env, profileId) {
    const viewers = (await env.NEXUS_KV.get('badge_seen_viewers:' + profileId, 'json')) || {};
    return Object.keys(viewers).map(function (id) {
        return { id: id, lastSeen: viewers[id] };
    });
}
