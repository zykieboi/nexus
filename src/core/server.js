(function() {
    'use strict';

    window.NX = window.NX || {};

    var API = 'https://nexus-admin.masonreed-exe.workers.dev';

    function getToken() {
        var t = GM_getValue('nx_token', '');
        if (t && t.length >= 32) return t;
        var arr = new Uint8Array(32);
        (window.crypto || window.msCrypto).getRandomValues(arr);
        t = Array.from(arr).map(function(b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        GM_setValue('nx_token', t);
        return t;
    }

    function getDevSecret() {
        return GM_getValue('nx_dev_secret', '');
    }

    function request(method, path, body, extraHeaders) {
        return new Promise(function(resolve, reject) {
            var headers = {
                'Content-Type': 'application/json',
                'X-Nexus-Token': getToken()
            };
            var secret = getDevSecret();
            if (secret) headers['X-Nexus-Dev-Secret'] = secret;
            if (extraHeaders) {
                for (var k in extraHeaders) headers[k] = extraHeaders[k];
            }
            GM_xmlhttpRequest({
                method: method,
                url: API + path,
                headers: headers,
                data: body ? JSON.stringify(body) : undefined,
                onload: function(res) {
                    var data;
                    try { data = JSON.parse(res.responseText); }
                    catch (e) { data = { raw: res.responseText }; }
                    resolve({ status: res.status, data: data });
                },
                onerror: function() { reject(new Error('network error')); }
            });
        });
    }

    window.NX.server = {
        api: API,
        getToken: getToken,
        getDevSecret: getDevSecret,
        claim: function(aisakaId, username) {
            return request('POST', '/claim', { aisakaId: aisakaId, username: username });
        },
        me: function() { return request('GET', '/me'); },
        config: function() { return request('GET', '/config'); },
        adminUsers: function() { return request('GET', '/admin/users'); },
        adminTokens: function() { return request('GET', '/admin/tokens'); },
        adminRole: function(tokenPreview, role) {
            return request('POST', '/admin/role', { tokenPreview: tokenPreview, role: role });
        },
        adminAnnounce: function(text, isTest) {
            return request('POST', '/admin/announce', { text: text, test: !!isTest });
        },
        adminBan: function(tokenPreview, opts) {
            return request('POST', '/admin/ban', Object.assign({ tokenPreview: tokenPreview }, opts || {}));
        },
        adminUnban: function(tokenPreview) {
            return request('POST', '/admin/unban', { tokenPreview: tokenPreview });
        },
        adminLogs: function() { return request('GET', '/admin/logs'); },
        adminConfig: function(patch) { return request('POST', '/admin/config', patch || {}); }
    };
})();
