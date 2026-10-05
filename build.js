'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'build', 'bundle.js');

const FILES = [
    'src/core/settings.js',
    'src/core/csrf.js',
    'src/core/server.js',
    'src/features/remove-ads.js',
    'src/features/hide-alert.js',
    'src/features/rap.js',
    'src/features/inventory-search.js',
    'src/features/bulk-unfriend.js',
    'src/features/announcement.js',
    'src/features/custom-logo.js',
    'src/features/oldroblox.js',
    'src/features/hide-chat.js',
    'src/features/custom-font.js',
    'src/features/background.js',
    'src/features/UserBadge.js',
    'src/features/tradeValues.js'
    'src/ui/modal.js'
];

function read(rel) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
        console.error('missing file: ' + rel);
        process.exit(1);
    }
    return fs.readFileSync(abs, 'utf8');
}

function stripSourceMap(code) {
    return code.replace(/\n?\/\/# sourceMappingURL=.*$/mg, '');
}

const parts = [];
for (const rel of FILES) {
    parts.push('/* ' + rel + ' */\n' + stripSourceMap(read(rel)).trim());
}
const out = parts.join('\n\n') + '\n';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out, 'utf8');

const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
console.log('built build/bundle.js (' + kb + ' KB, ' + FILES.length + ' files)');
