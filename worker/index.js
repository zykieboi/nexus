function json(obj, status, cors) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors }
    });
}

const USER_COUNT_KEY = 'user_count';
const SEEN_TTL = 60 * 60 * 24;

async function trackUser(env, id) {
    if (!id) return;
    const dayKey = 'seen:' + id;
    const already = await env.NEXUS_KV.get(dayKey);
    if (already) return;
    await env.NEXUS_KV.put(dayKey, '1', { expirationTtl: SEEN_TTL });
    const n = parseInt(await env.NEXUS_KV.get(USER_COUNT_KEY) || '0', 10);
    await env.NEXUS_KV.put(USER_COUNT_KEY, String(n + 1));
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
            ctx.waitUntil(trackUser(env, id));
            return json({ ok: true }, 200, cors);
        }

        if (url.pathname === '/api/nexus/count') {
            const n = parseInt(await env.NEXUS_KV.get(USER_COUNT_KEY) || '0', 10);
            return json({ count: n }, 200, cors);
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
