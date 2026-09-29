(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    function fmt(n) {
        n = Number(n) || 0;
        if (n < 1000) return String(n);
        if (n < 1000000) {
            var k = n / 1000;
            return (k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')) + 'K';
        }
        var m = n / 1000000;
        return (m >= 100 ? Math.round(m) : m.toFixed(2).replace(/\.?0+$/, '')) + 'M';
    }

    function userFromUrl() {
        var m = location.pathname.match(/\/users\/(\d+)\/profile/);
        if (m) return m[1];
        var p = new URLSearchParams(location.search);
        return p.get('userId') || p.get('viewerId');
    }

    function fixRapRow(doc, userId) {
        if (!doc || !doc.body || doc.__nxRapDone) return;

        var labels = doc.querySelectorAll('.details-info .text-label');
        var rapLabel = null;
        for (var i = 0; i < labels.length; i++) {
            if ((labels[i].textContent || '').trim().toUpperCase() === 'RAP') {
                rapLabel = labels[i];
                break;
            }
        }
        if (!rapLabel) return;

        var li = rapLabel.closest('li');
        if (!li) return;

        var valueEl = li.querySelector('.font-header-2');
        if (!valueEl) return;

        if (valueEl.dataset.nxRap === userId) return;
        doc.__nxRapDone = userId;

        fetch('/users/' + userId + '/limiteds', { credentials: 'include' })
            .then(function(r) { return r.text(); })
            .then(function(html) {
                var match = html.match(/Total RAP:[\s\S]{0,400}?([\d,]+)/i);
                if (!match) { doc.__nxRapDone = null; return; }
                var n = parseInt(match[1].replace(/,/g, ''), 10);
                if (isNaN(n)) { doc.__nxRapDone = null; return; }

                valueEl.textContent = fmt(n);
                valueEl.setAttribute('title', String(n));
                valueEl.dataset.nxRap = userId;
            })
            .catch(function() {
                doc.__nxRapDone = null;
            });
    }

    function scan() {
        var id = userFromUrl();
        if (!id) return;

        fixRapRow(document, id);

        var frames = document.querySelectorAll('iframe[src*="/theme2020/users/"]');
        for (var i = 0; i < frames.length; i++) {
            try {
                var d = frames[i].contentDocument;
                if (d) fixRapRow(d, id);
            } catch (e) {}
        }
    }

    var scanner = null;
    var observer = null;

    window.NX.features.rap = {
        apply: function() {
            scan();
            if (!scanner) scanner = setInterval(scan, 400);
            if (observer) return;
            var target = document.body || document.documentElement;
            if (!target) return;
            observer = new MutationObserver(scan);
            observer.observe(target, { childList: true, subtree: true });
        },
        teardown: function() {
            if (scanner) { clearInterval(scanner); scanner = null; }
            if (observer) { observer.disconnect(); observer = null; }
        }
    };
})();
