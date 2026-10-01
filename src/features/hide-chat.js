(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var STYLE_ID = 'nx-hide-chat';
    var CSS =
        '#chat-container,' +
        '.chat-container,' +
        '.chat,' +
        '.chat-main,' +
        '.chat-windows-header,' +
        '.chat-body,' +
        '#dialogs,' +
        '.dialogs,' +
        '#dialogs-minimize,' +
        '.chat-placeholder,' +
        'iframe[src*="/theme2020/chat"],' +
        'iframe[title="Chat"]{' +
        'display:none !important;' +
        'visibility:hidden !important;' +
        'pointer-events:none !important;' +
        'width:0 !important;' +
        'height:0 !important;' +
        '}';

    var observer = null;

    function inject() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }

    function removeCSS(doc) {
        if (!doc) return;
        var s = doc.getElementById(STYLE_ID);
        if (s) s.remove();
    }

    function sweepDoc(doc) {
        if (!doc) return;
        var chat = doc.querySelector('#chat-container, .chat-container');
        if (chat) {
            chat.style.setProperty('display', 'none', 'important');
            chat.style.setProperty('visibility', 'hidden', 'important');
            chat.style.setProperty('pointer-events', 'none', 'important');
        }
        var frames = doc.querySelectorAll('iframe[src*="/theme2020/chat"], iframe[title="Chat"]');
        for (var i = 0; i < frames.length; i++) {
            frames[i].style.setProperty('display', 'none', 'important');
            frames[i].style.setProperty('visibility', 'hidden', 'important');
            frames[i].style.setProperty('width', '0', 'important');
            frames[i].style.setProperty('height', '0', 'important');
            frames[i].style.setProperty('pointer-events', 'none', 'important');
        }
    }

    function injectInto(doc) {
        if (!doc || !doc.head) return;
        if (doc.getElementById(STYLE_ID)) return;
        var s = doc.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        doc.head.appendChild(s);
    }

    function sweepAll() {
        inject();
        sweepDoc(document);
        var frames = document.getElementsByTagName('iframe');
        for (var i = 0; i < frames.length; i++) {
            var d;
            try { d = frames[i].contentDocument; } catch (e) { continue; }
            if (d) {
                try { injectInto(d); } catch (e) {}
                try { sweepDoc(d); } catch (e) {}
            }
        }
    }

    function startObserver() {
        if (observer || !document.body) return;
        observer = new MutationObserver(sweepAll);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function stopObserver() {
        if (observer) { observer.disconnect(); observer = null; }
    }

    function apply() {
        inject();
        sweepAll();
        if (document.body) startObserver();
        else document.addEventListener('DOMContentLoaded', function () {
            sweepAll();
            startObserver();
        }, { once: true });
    }

    function teardown() {
        removeCSS(document);
        var frames = document.getElementsByTagName('iframe');
        for (var i = 0; i < frames.length; i++) {
            var d;
            try { d = frames[i].contentDocument; } catch (e) { continue; }
            if (d) removeCSS(d);
        }
        stopObserver();
    }

    window.NX.features.hideChat = {
        apply: apply,
        teardown: teardown
    };
})();
