(function() {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var API_V2 = 'https://octane.wtf/apisite/assetdelivery/v2/asset/?id=';
    var SIGNATURE = [60, 114, 111, 98, 108, 111, 120, 33];
    var SPRITE_URL = 'https://raw.githubusercontent.com/LockpickInteractive/studio-icons/main/ClassImages/2023-11-23%20ClassImages.png';
    var EXPLORER_ICON_URL = 'https://raw.githubusercontent.com/zykieboi/nexus/main/img/explorer.png';
    var CELL = 16;
    var COLS = 96;

    var STYLE_ID = 'nx-exp-style';
    var BTN_ID = 'nx-exp-btn';
    var OVERLAY_ID = 'nx-exp-overlay';
    var PANEL_ID = 'nx-exp-panel';

    var ICONS = {
        Workspace: 19, Players: 21, Lighting: 13,
        ReplicatedStorage: 72, ServerStorage: 74, ServerScriptService: 0,
        StarterGui: 46, StarterPack: 20, StarterPlayer: 88, SoundService: 31,
        Part: 1, MeshPart: 73, UnionOperation: 77, SpecialMesh: 8,
        BlockMesh: 8, CylinderMesh: 8, WedgePart: 1, SpawnLocation: 25,
        Decal: 7, Texture: 10, SurfaceAppearance: 10,
        ScreenGui: 47, Frame: 48, TextLabel: 50, TextButton: 51,
        TextBox: 51, ImageLabel: 49, ImageButton: 52, ScrollingFrame: 48,
        UIGridLayout: 26, UIListLayout: 26, UIPadding: 26, UICorner: 26,
        UIStroke: 26, UIGradient: 26,
        Script: 6, LocalScript: 18, ModuleScript: 71,
        StringValue: 4, NumberValue: 4, BoolValue: 4, ObjectValue: 4,
        IntValue: 4, CFrameValue: 4, Vector3Value: 4,
        Folder: 70, Model: 2, Humanoid: 9, Tool: 17,
        Accessory: 32, Shirt: 43, Pants: 44
    };

    function iconIndex(name) {
        return ICONS[name] !== undefined ? ICONS[name] : ICONS.Folder;
    }

    var T = {
        STRING: 0x01, BOOL: 0x02, INT: 0x03, FLOAT: 0x04, DOUBLE: 0x05,
        UDIM: 0x06, UDIM2: 0x07, RAY: 0x08, FACES: 0x09, AXES: 0x0a,
        BRICKCOLOR: 0x0b, COLOR3: 0x0c, VECTOR2: 0x0d, VECTOR3: 0x0e,
        VECTOR3INT16: 0x14, CFRAME: 0x10, QUATERNION: 0x11, ENUM: 0x12,
        REF: 0x13, NUMBER_SEQUENCE: 0x15, COLOR_SEQUENCE: 0x16,
        NUMBER_RANGE: 0x17, RECT: 0x18, PHYSICAL_PROPERTIES: 0x19,
        COLOR3UINT8: 0x1a, INT64: 0x1b, SHARED_STRING: 0x1c, BYTECODE: 0x1d,
        OPTIONAL_CFRAME: 0x1e, UNIQUE_ID: 0x1f, FONT: 0x20,
        SECURITY_CAPABILITIES: 0x21, CONTENT: 0x22
    };

    var sprite = null;
    var canvas = null;
    var iconCache = {};

    function loadSprite() {
        if (sprite) return Promise.resolve(sprite);
        return new Promise(function(resolve) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: SPRITE_URL,
                responseType: 'arraybuffer',
                onload: function(r) {
                    if (r.status < 200 || r.status >= 300) { resolve(null); return; }
                    var blob = new Blob([r.response], { type: 'image/png' });
                    var u = URL.createObjectURL(blob);
                    var img = new Image();
                    img.onload = function() {
                        sprite = img;
                        canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        canvas.getContext('2d').drawImage(img, 0, 0);
                        URL.revokeObjectURL(u);
                        resolve(img);
                    };
                    img.onerror = function() { URL.revokeObjectURL(u); resolve(null); };
                    img.src = u;
                },
                onerror: function() { resolve(null); }
            });
        });
    }

    function iconUrl(idx) {
        if (!canvas) return null;
        if (idx < 0 || idx >= COLS) return null;
        if (iconCache[idx] !== undefined) return iconCache[idx];
        var c = document.createElement('canvas');
        c.width = CELL;
        c.height = CELL;
        var ctx = c.getContext('2d');
        ctx.drawImage(canvas, idx * CELL, 0, CELL, CELL, 0, 0, CELL, CELL);
        var u = c.toDataURL('image/png');
        iconCache[idx] = u;
        return u;
    }

    function classIcon(name) {
        if (!canvas) return null;
        return iconUrl(iconIndex(name));
    }

    function unf(v) {
        var u = ((v << 31) | (v >>> 1)) >>> 0;
        unf._v.setUint32(0, u, true);
        return unf._v.getFloat32(0, true);
    }
    unf._v = new DataView(new ArrayBuffer(4));

    function Reader(buffer) {
        this.b = buffer;
        this.v = new DataView(buffer);
        this.i = 0;
    }
    Reader.prototype.jump = function(n) { this.i += n; };
    Reader.prototype.u8 = function() { return this.v.getUint8(this.i++); };
    Reader.prototype.u16 = function() { var x = this.v.getUint16(this.i, true); this.i += 2; return x; };
    Reader.prototype.i16 = function() { var x = this.v.getInt16(this.i, true); this.i += 2; return x; };
    Reader.prototype.u32 = function() { var x = this.v.getUint32(this.i, true); this.i += 4; return x; };
    Reader.prototype.f32 = function() { var x = this.v.getFloat32(this.i, true); this.i += 4; return x; };
    Reader.prototype.f64 = function() { var x = this.v.getFloat64(this.i, true); this.i += 8; return x; };
    Reader.prototype.str = function(n) {
        var b = new Uint8Array(this.b, this.i, n);
        this.i += n;
        return new TextDecoder().decode(b);
    };
    Reader.prototype.bytes = function(n) {
        var b = new Uint8Array(this.b, this.i, n);
        this.i += n;
        return b;
    };
    Reader.prototype.left = function() { return this.b.byteLength - this.i; };
    Reader.prototype.u32Array = function(n) {
        if (n < 0 || n > 0x1000000) throw new RangeError('bad n');
        var out = new Array(n);
        if (!n) return out;
        var bytes = n * 4;
        var raw = new Uint8Array(this.b, this.i, bytes);
        this.i += bytes;
        for (var i = 0; i < n; i++) {
            out[i] = ((raw[i] << 24) | (raw[i + n] << 16) |
                (raw[i + n * 2] << 8) | raw[i + n * 3]) >>> 0;
        }
        return out;
    };
    Reader.prototype.i32Array = function(n) {
        var v = this.u32Array(n);
        for (var i = 0; i < n; i++) {
            var u = v[i];
            v[i] = (u >>> 1) ^ -(u & 1);
        }
        return v;
    };
    Reader.prototype.f32Array = function(n) {
        var v = this.u32Array(n);
        for (var i = 0; i < n; i++) v[i] = unf(v[i]);
        return v;
    };
    Reader.prototype.i64Array = function(n) {
        if (n < 0 || n > 0x1000000) throw new RangeError('bad n');
        var out = new Array(n);
        if (!n) return out;
        var bytes = n * 8;
        var raw = new Uint8Array(this.b, this.i, bytes);
        this.i += bytes;
        for (var i = 0; i < n; i++) {
            var u = 0n;
            for (var b = 0; b < 8; b++) u = (u << 8n) | BigInt(raw[i + n * b]);
            out[i] = (u >> 1n) ^ -(u & 1n);
        }
        return out;
    };

    function lz4(input, size) {
        var out = new Uint8Array(size);
        var i = 0, j = 0;
        while (i < input.length) {
            var tok = input[i++];
            var lit = tok >> 4;
            if (lit > 0) {
                if (lit === 0x0f) {
                    var b;
                    do { b = input[i++]; lit += b; } while (b === 0xff);
                }
                for (var l = 0; l < lit; l++) out[j++] = input[i++];
            }
            if (i >= input.length) break;
            var off = input[i++] | (input[i++] << 8);
            var ml = (tok & 0x0f) + 4;
            if (ml === 0x0f + 4) {
                var b2;
                do { b2 = input[i++]; ml += b2; } while (b2 === 0xff);
            }
            var pos = j - off;
            for (var m = 0; m < ml; m++) out[j++] = out[pos++];
        }
        return out.buffer;
    }

    function zstd(input, size) {
        var out = new Uint8Array(size);
        var i = 0, j = 0;
        var magic = [0x28, 0xb5, 0x2f, 0xfd];
        for (var m = 0; m < 4; m++) if (input[i + m] !== magic[m]) return out.buffer;
        i += 4;
        if (i >= input.length) return out.buffer;
        var desc = input[i++];
        var fcs = (desc >> 6) & 3;
        var single = (desc >> 5) & 1;
        var dict = desc & 3;
        var ck = (desc >> 2) & 1;
        var fcsSize = single ? [1, 2, 4, 8][fcs] : [0, 1, 2, 4][fcs];
        if (!single) i += 1;
        if (dict === 3) i += 4;
        i += fcsSize;
        while (i + 3 <= input.length) {
            var h = input[i] | (input[i + 1] << 8) | (input[i + 2] << 16);
            i += 3;
            var last = h & 1;
            var bt = (h >> 1) & 3;
            var bs = h >> 3;
            if (bt === 0) {
                for (var k = 0; k < bs; k++) out[j++] = input[i++];
            } else if (bt === 1) {
                var r = input[i++];
                for (var k2 = 0; k2 < bs; k2++) out[j++] = r;
            } else {
                return out.buffer;
            }
            if (last) break;
        }
        if (ck) i += 4;
        return out.buffer;
    }

    function parseRbxm(buffer) {
        try {
            var rd = new Reader(buffer);
            var sig = rd.str(8);
            if (sig !== '<roblox!') return [];
            rd.jump(8);
            rd.u32();
            rd.u32();
            rd.jump(8);

            var insts = new Map();
            var meta = new Map();
            var shared = [];
            var roots = [];

            while (rd.left() > 4) {
                var ct = rd.str(4);
                if (ct === 'END\0') break;

                var cl = rd.u32();
                var dl = rd.u32();
                rd.jump(4);

                var data;
                if (cl === 0) {
                    var rb = rd.bytes(dl);
                    data = rb.buffer.slice(rb.byteOffset, rb.byteOffset + dl);
                } else {
                    var cd = rd.bytes(cl);
                    var isZ = cd[0] === 0x28 && cd[1] === 0xb5 && cd[2] === 0x2f && cd[3] === 0xfd;
                    data = isZ ? zstd(cd, dl) : lz4(cd, dl);
                }

                var r = new Reader(data);

                try {
                    if (ct === 'SSTR') {
                        r.u32();
                        var sc = r.u32();
                        for (var s = 0; s < sc; s++) {
                            r.bytes(16);
                            var sl = r.u32();
                            shared[s] = r.str(sl);
                        }
                    } else if (ct === 'INST') {
                        var cid = r.u32();
                        var nl = r.u32();
                        var cn = r.str(nl);
                        r.u8();
                        var ic = r.u32();
                        var ids = r.i32Array(ic);
                        var real = [];
                        var cur = 0;
                        for (var ii = 0; ii < ic; ii++) {
                            cur += ids[ii];
                            real.push(cur);
                        }
                        meta.set(cid, { className: cn, ids: real });
                        real.forEach(function(id) {
                            insts.set(id, {
                                ClassName: cn,
                                Reference: String(id),
                                Properties: {},
                                Children: []
                            });
                        });
                    } else if (ct === 'PROP') {
                        var pcid = r.u32();
                        var pnl = r.u32();
                        var pname = r.str(pnl);
                        var pt = r.u8();

                        var md = meta.get(pcid);
                        if (!md) continue;

                        var pids = md.ids;
                        var pc = pids.length;
                        var setP = function(idx, val) {
                            insts.get(pids[idx]).Properties[pname] = val;
                        };

                        if (pt === T.STRING) {
                            for (var i1 = 0; i1 < pc; i1++) {
                                var len = r.u32();
                                if (pname === 'AttributesSerialize') setP(i1, r.bytes(len).slice());
                                else setP(i1, r.str(len));
                            }
                        } else if (pt === T.BOOL) {
                            for (var i2 = 0; i2 < pc; i2++) setP(i2, r.u8() === 1);
                        } else if (pt === T.INT) {
                            var iv = r.i32Array(pc);
                            for (var i3 = 0; i3 < pc; i3++) setP(i3, iv[i3]);
                        } else if (pt === T.FLOAT) {
                            var fv = r.f32Array(pc);
                            for (var i4 = 0; i4 < pc; i4++) setP(i4, fv[i4]);
                        } else if (pt === T.DOUBLE) {
                            for (var i5 = 0; i5 < pc; i5++) setP(i5, r.f64());
                        } else if (pt === T.UDIM) {
                            var us = r.f32Array(pc);
                            var uo = r.i32Array(pc);
                            for (var i6 = 0; i6 < pc; i6++) setP(i6, { Scale: us[i6], Offset: uo[i6] });
                        } else if (pt === T.UDIM2) {
                            var uxs = r.f32Array(pc);
                            var uys = r.f32Array(pc);
                            var uxo = r.i32Array(pc);
                            var uyo = r.i32Array(pc);
                            for (var i7 = 0; i7 < pc; i7++) setP(i7, {
                                X: { Scale: uxs[i7], Offset: uxo[i7] },
                                Y: { Scale: uys[i7], Offset: uyo[i7] }
                            });
                        } else if (pt === T.RAY) {
                            for (var i8 = 0; i8 < pc; i8++) {
                                var ox = r.f32(), oy = r.f32(), oz = r.f32();
                                var dx = r.f32(), dy = r.f32(), dz = r.f32();
                                setP(i8, { Origin: { x: ox, y: oy, z: oz }, Direction: { x: dx, y: dy, z: dz } });
                            }
                        } else if (pt === T.FACES || pt === T.AXES) {
                            for (var i9 = 0; i9 < pc; i9++) setP(i9, r.u8());
                        } else if (pt === T.BRICKCOLOR) {
                            var bv = r.u32Array(pc);
                            for (var i10 = 0; i10 < pc; i10++) setP(i10, bv[i10]);
                        } else if (pt === T.COLOR3) {
                            var cr = r.f32Array(pc);
                            var cg = r.f32Array(pc);
                            var cb = r.f32Array(pc);
                            for (var i11 = 0; i11 < pc; i11++) setP(i11, { r: cr[i11], g: cg[i11], b: cb[i11] });
                        } else if (pt === T.VECTOR2) {
                            var v2x = r.f32Array(pc);
                            var v2y = r.f32Array(pc);
                            for (var i12 = 0; i12 < pc; i12++) setP(i12, { x: v2x[i12], y: v2y[i12] });
                        } else if (pt === T.VECTOR3) {
                            var v3x = r.f32Array(pc);
                            var v3y = r.f32Array(pc);
                            var v3z = r.f32Array(pc);
                            for (var i13 = 0; i13 < pc; i13++) setP(i13, { x: v3x[i13], y: v3y[i13], z: v3z[i13] });
                        } else if (pt === T.VECTOR3INT16) {
                            for (var i14 = 0; i14 < pc; i14++) setP(i14, {
                                x: r.i16(), y: r.i16(), z: r.i16()
                            });
                        } else if (pt === T.CFRAME) {
                            var rots = [];
                            for (var ri = 0; ri < pc; ri++) {
                                var id = r.u8();
                                if (id === 0) {
                                    var fl = [];
                                    for (var fi = 0; fi < 9; fi++) fl.push(r.f32());
                                    rots.push(fl);
                                } else {
                                    var gv = function(x) {
                                        if (x === 0) return [1, 0, 0];
                                        if (x === 1) return [0, 1, 0];
                                        if (x === 2) return [0, 0, 1];
                                        if (x === 3) return [-1, 0, 0];
                                        if (x === 4) return [0, -1, 0];
                                        return [0, 0, -1];
                                    };
                                    var rid = id - 1;
                                    var rt = gv(Math.floor(rid / 6));
                                    var up = gv(rid % 6);
                                    var bk = [
                                        rt[1] * up[2] - rt[2] * up[1],
                                        rt[2] * up[0] - rt[0] * up[2],
                                        rt[0] * up[1] - rt[1] * up[0]
                                    ];
                                    rots.push([
                                        rt[0], up[0], bk[0],
                                        rt[1], up[1], bk[1],
                                        rt[2], up[2], bk[2]
                                    ]);
                                }
                            }
                            var cfX = r.f32Array(pc);
                            var cfY = r.f32Array(pc);
                            var cfZ = r.f32Array(pc);
                            var clean = function(n) {
                                return Math.abs(n) < 1e-5 ? 0 : Math.round(n * 1e5) / 1e5;
                            };
                            for (var i15 = 0; i15 < pc; i15++) {
                                var rot = rots[i15];
                                var parts = [cfX[i15], cfY[i15], cfZ[i15],
                                    rot[0], rot[1], rot[2], rot[3], rot[4],
                                    rot[5], rot[6], rot[7], rot[8]].map(clean);
                                setP(i15, parts.join(', '));
                            }
                        } else if (pt === T.ENUM) {
                            var ev = r.u32Array(pc);
                            for (var i16 = 0; i16 < pc; i16++) setP(i16, ev[i16]);
                        } else if (pt === T.REF) {
                            var dl2 = r.i32Array(pc);
                            var ref = 0;
                            for (var i17 = 0; i17 < pc; i17++) {
                                ref += dl2[i17];
                                setP(i17, ref);
                            }
                        } else if (pt === T.NUMBER_SEQUENCE) {
                            for (var i18 = 0; i18 < pc; i18++) {
                                var nsl = r.u32();
                                var kps = [];
                                for (var k1 = 0; k1 < nsl; k1++) {
                                    kps.push({
                                        Time: r.f32(),
                                        Value: r.f32(),
                                        Envelope: r.f32()
                                    });
                                }
                                setP(i18, kps);
                            }
                        } else if (pt === T.COLOR_SEQUENCE) {
                            for (var i19 = 0; i19 < pc; i19++) {
                                var csl = r.u32();
                                var ckps = [];
                                for (var k2 = 0; k2 < csl; k2++) {
                                    var kp = {
                                        Time: r.f32(),
                                        Value: { r: r.f32(), g: r.f32(), b: r.f32() }
                                    };
                                    r.f32();
                                    ckps.push(kp);
                                }
                                setP(i19, ckps);
                            }
                        } else if (pt === T.NUMBER_RANGE) {
                            for (var i20 = 0; i20 < pc; i20++) setP(i20, {
                                Min: r.f32(), Max: r.f32()
                            });
                        } else if (pt === T.RECT) {
                            var rminX = r.f32Array(pc);
                            var rminY = r.f32Array(pc);
                            var rmaxX = r.f32Array(pc);
                            var rmaxY = r.f32Array(pc);
                            for (var i21 = 0; i21 < pc; i21++) setP(i21, {
                                Min: { x: rminX[i21], y: rminY[i21] },
                                Max: { x: rmaxX[i21], y: rmaxY[i21] }
                            });
                        } else if (pt === T.PHYSICAL_PROPERTIES) {
                            for (var i22 = 0; i22 < pc; i22++) {
                                var flag = r.u8();
                                if (flag & 1) {
                                    var pp = {
                                        Density: r.f32(),
                                        Friction: r.f32(),
                                        Elasticity: r.f32(),
                                        FrictionWeight: r.f32(),
                                        ElasticityWeight: r.f32()
                                    };
                                    if (flag & 2) r.f32();
                                    setP(i22, pp);
                                } else {
                                    setP(i22, false);
                                }
                            }
                        } else if (pt === T.COLOR3UINT8) {
                            var a1 = [], a2 = [], a3 = [];
                            for (var i23 = 0; i23 < pc; i23++) a1.push(r.u8());
                            for (var i24 = 0; i24 < pc; i24++) a2.push(r.u8());
                            for (var i25 = 0; i25 < pc; i25++) a3.push(r.u8());
                            for (var i26 = 0; i26 < pc; i26++) setP(i26, {
                                r: a1[i26], g: a2[i26], b: a3[i26]
                            });
                        } else if (pt === T.INT64) {
                            var i64 = r.i64Array(pc);
                            for (var i27 = 0; i27 < pc; i27++) setP(i27, i64[i27]);
                        } else if (pt === T.SHARED_STRING) {
                            var ss = r.u32Array(pc);
                            for (var i28 = 0; i28 < pc; i28++) setP(i28, shared[ss[i28]] || '');
                        } else if (pt === T.UNIQUE_ID) {
                            var uRaw = r.bytes(pc * 16);
                            for (var i29 = 0; i29 < pc; i29++) {
                                var hex = '';
                                for (var b2 = 0; b2 < 16; b2++) {
                                    hex += uRaw[b2 * pc + i29].toString(16).padStart(2, '0');
                                }
                                setP(i29, hex);
                            }
                        } else if (pt === T.FONT) {
                            for (var i30 = 0; i30 < pc; i30++) {
                                var famL = r.u32();
                                var fam = r.str(famL);
                                var w = r.u16();
                                var st = r.u8();
                                var cacheL = r.u32();
                                r.str(cacheL);
                                setP(i30, { Family: fam, Weight: w, Style: st });
                            }
                        } else if (pt === T.CONTENT) {
                            var srcT = r.i32Array(pc);
                            var numU = r.u32();
                            var uris = [];
                            for (var u = 0; u < numU; u++) {
                                var ul = r.u32();
                                uris.push(r.str(ul));
                            }
                            var numO = r.u32();
                            r.i32Array(numO);
                            var numE = r.u32();
                            r.i32Array(numE);
                            var uc = 0;
                            for (var i31 = 0; i31 < pc; i31++) {
                                setP(i31, srcT[i31] === 1 ? uris[uc++] : '');
                            }
                        } else {
                            r.i = r.b.byteLength;
                        }
                    } else if (ct === 'PRNT') {
                        r.u8();
                        var pCount = r.u32();
                        var childDelta = r.i32Array(pCount);
                        var parentDelta = r.i32Array(pCount);
                        var childId = 0, parentId = 0;
                        for (var i32 = 0; i32 < pCount; i32++) {
                            childId += childDelta[i32];
                            parentId += parentDelta[i32];
                            var co = insts.get(childId);
                            var po = insts.get(parentId);
                            if (co && po) po.Children.push(co);
                        }
                    }
                } catch (e) {}
            }

            var refs = new Set();
            insts.forEach(function(inst) {
                inst.Children.forEach(function(c) { refs.add(c.Reference); });
            });
            insts.forEach(function(inst, ref) {
                if (!refs.has(String(ref))) roots.push(inst);
            });
            return roots;
        } catch (e) {
            return [];
        }
    }

    function parseXml(text) {
        var doc = new DOMParser().parseFromString(text, 'text/xml');
        var rbx = doc.getElementsByTagName('roblox')[0];
        if (!rbx) return [];

        var clean = function(n) {
            return Math.abs(n) < 1e-5 ? 0 : Math.round(n * 1e5) / 1e5;
        };
        var childText = function(el, tag) {
            var c = Array.from(el.children).find(function(x) { return x.tagName === tag; });
            return c ? c.textContent.trim() : null;
        };
        var childNum = function(el, tag) {
            var t = childText(el, tag);
            return t == null ? 0 : Number(t);
        };
        var parseProp = function(prop) {
            var tag = prop.tagName;
            var text = prop.textContent.trim();
            switch (tag) {
                case 'string': case 'ProtectedString': case 'BinaryString': case 'SharedString':
                    return prop.textContent;
                case 'Content': case 'ContentId':
                    return childText(prop, 'url') || childText(prop, 'uri') || text;
                case 'float': case 'double': case 'int': case 'int64': case 'token':
                    return Number(text);
                case 'bool':
                    return text === 'true';
                case 'Color3':
                    return { r: childNum(prop, 'R'), g: childNum(prop, 'G'), b: childNum(prop, 'B') };
                case 'Color3uint8': {
                    var v = Number(text) >>> 0;
                    return { r: (v >>> 16) & 255, g: (v >>> 8) & 255, b: v & 255 };
                }
                case 'Vector2': case 'Vector2int16':
                    return { x: childNum(prop, 'X'), y: childNum(prop, 'Y') };
                case 'Vector3': case 'Vector3int16':
                    return { x: childNum(prop, 'X'), y: childNum(prop, 'Y'), z: childNum(prop, 'Z') };
                case 'UDim':
                    return { Scale: childNum(prop, 'S'), Offset: childNum(prop, 'O') };
                case 'UDim2':
                    return {
                        X: { Scale: childNum(prop, 'XS'), Offset: childNum(prop, 'XO') },
                        Y: { Scale: childNum(prop, 'YS'), Offset: childNum(prop, 'YO') }
                    };
                case 'NumberRange': {
                    var p = text.split(/\s+/).map(Number);
                    return { Min: p[0], Max: p[1] };
                }
                case 'CoordinateFrame': case 'OptionalCoordinateFrame': {
                    var cf = tag === 'OptionalCoordinateFrame'
                        ? Array.from(prop.children).find(function(x) { return x.tagName === 'CFrame'; })
                        : prop;
                    if (!cf) return null;
                    var keys = ['X', 'Y', 'Z', 'R00', 'R01', 'R02',
                        'R10', 'R11', 'R12', 'R20', 'R21', 'R22'];
                    return keys.map(function(k) { return clean(childNum(cf, k)); }).join(', ');
                }
                default:
                    return prop.textContent;
            }
        };
        var parseItem = function(node) {
            var inst = {
                ClassName: node.getAttribute('class'),
                Reference: node.getAttribute('referent') || node.getAttribute('refer'),
                Properties: {},
                Children: []
            };
            for (var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                if (child.tagName === 'Properties') {
                    for (var j = 0; j < child.children.length; j++) {
                        var prop = child.children[j];
                        var name = prop.getAttribute('name');
                        if (!name) continue;
                        inst.Properties[name] = parseProp(prop);
                    }
                } else if (child.tagName === 'Item') {
                    inst.Children.push(parseItem(child));
                }
            }
            return inst;
        };
        var out = [];
        for (var k = 0; k < rbx.children.length; k++) {
            var c = rbx.children[k];
            if (c.tagName === 'Item') out.push(parseItem(c));
        }
        return out;
    }

    function isBinary(buffer) {
        if (buffer.byteLength < 8) return false;
        var sig = new Uint8Array(buffer, 0, 8);
        for (var i = 0; i < SIGNATURE.length; i++) {
            if (sig[i] !== SIGNATURE[i]) return false;
        }
        return true;
    }

    function gmArray(url) {
        return new Promise(function(resolve, reject) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                onload: function(r) {
                    if (r.status >= 200 && r.status < 300) resolve(r.response);
                    else reject(new Error('HTTP ' + r.status));
                },
                onerror: function() { reject(new Error('network')); }
            });
        });
    }

    function gmJson(url) {
        return new Promise(function(resolve, reject) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(r) {
                    if (r.status < 200 || r.status >= 300) {
                        reject(new Error('HTTP ' + r.status));
                        return;
                    }
                    try { resolve(JSON.parse(r.responseText)); }
                    catch (e) { reject(e); }
                },
                onerror: function() { reject(new Error('network')); }
            });
        });
    }

    function loadTree(id) {
        var bad = { assetId: id, root: null, format: null, isValid: false };
        return gmJson(API_V2 + id).then(function(meta) {
            var loc = meta && meta.locations && meta.locations.location;
            if (!loc) return bad;
            return gmArray(loc).then(function(buffer) {
                var root = null, format = null;
                if (isBinary(buffer)) {
                    format = 'RBXM';
                    root = parseRbxm(buffer);
                } else {
                    format = 'XML';
                    var text = new TextDecoder('utf-8').decode(buffer);
                    if (text.indexOf('<roblox') !== -1) root = parseXml(text);
                }
                if (!root || !root.length) return bad;
                return { assetId: id, root: root, format: format, isValid: true };
            }).catch(function() { return bad; });
        }).catch(function() { return bad; });
    }

    function dark() {
        try { return localStorage.getItem('rbx_theme_v1') === 'dark'; }
        catch (e) { return false; }
    }

    var CSS = [
        '#nx-exp-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999998;',
        'display:flex;align-items:center;justify-content:center;font-family:inherit}',
        '#nx-exp-panel{width:90%;max-width:1100px;height:80vh;display:flex;flex-direction:column;',
        'overflow:hidden;border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,0.5)}',
        '#nx-exp-panel .nx-exp-head{display:flex;align-items:center;justify-content:space-between;',
        'padding:10px 14px;flex-shrink:0}',
        '#nx-exp-panel .nx-exp-title{font-size:14px;font-weight:600;margin:0}',
        '#nx-exp-panel .nx-exp-sub{font-size:11px;margin-top:1px;opacity:0.7}',
        '#nx-exp-panel .nx-exp-close{background:none;border:0;font-size:20px;line-height:1;',
        'cursor:pointer;padding:0 4px}',
        '#nx-exp-body{display:flex;flex:1;min-height:0}',
        '#nx-exp-tree{width:340px;flex-shrink:0;overflow:auto;padding:6px 0}',
        '#nx-exp-props{flex:1;overflow:auto;padding:12px 16px}',
        '.nx-exp-node{font-size:12px;line-height:1.45}',
        '.nx-exp-row{display:flex;align-items:center;gap:4px;padding:2px 8px;cursor:pointer;white-space:nowrap}',
        '.nx-exp-toggle{width:12px;text-align:center;font-size:9px;flex-shrink:0;opacity:0.7}',
        '.nx-exp-icon{width:16px;height:16px;flex-shrink:0;image-rendering:pixelated}',
        '.nx-exp-label{flex:1;overflow:hidden;text-overflow:ellipsis}',
        '.nx-exp-class{font-size:10px;margin-left:6px;opacity:0.55}',
        '.nx-exp-props-empty{text-align:center;padding:40px 0;font-size:12px;opacity:0.6}',
        '.nx-exp-prop-head{font-size:13px;font-weight:600;margin-bottom:10px;padding-bottom:6px;',
        'display:flex;align-items:center;gap:6px}',
        '.nx-exp-prop-group{margin-bottom:12px}',
        '.nx-exp-prop-group-title{font-size:10px;font-weight:600;letter-spacing:0.5px;',
        'text-transform:uppercase;opacity:0.6;margin-bottom:4px}',
        '.nx-exp-prop-row{display:grid;grid-template-columns:160px 1fr;gap:8px;padding:3px 0;font-size:12px}',
        '.nx-exp-prop-name{opacity:0.7}',
        '.nx-exp-prop-val{word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px}',
        '.nx-exp-footer{padding:8px 14px;font-size:11px;text-align:center;flex-shrink:0;',
        'font-style:italic;opacity:0.55}',
        '#nx-exp-panel.nx-dark{background:#232527;color:#e0e0e0}',
        '#nx-exp-panel.nx-dark .nx-exp-head{background:#1a1c1e;border-bottom:1px solid #2f3133}',
        '#nx-exp-panel.nx-dark .nx-exp-title{color:#fff}',
        '#nx-exp-panel.nx-dark .nx-exp-close{color:#9a9da0}',
        '#nx-exp-panel.nx-dark .nx-exp-close:hover{color:#fff}',
        '#nx-exp-panel.nx-dark #nx-exp-tree{background:#1a1c1e;border-right:1px solid #2f3133}',
        '#nx-exp-panel.nx-dark .nx-exp-row:hover{background:#2a2c2e}',
        '#nx-exp-panel.nx-dark .nx-exp-row.selected{background:#0a4a8f}',
        '#nx-exp-panel.nx-dark .nx-exp-class{color:#7a7d80}',
        '#nx-exp-panel.nx-dark .nx-exp-prop-head{border-bottom:1px solid #2f3133}',
        '#nx-exp-panel.nx-dark .nx-exp-prop-name{color:#9a9da0}',
        '#nx-exp-panel.nx-dark .nx-exp-prop-val{color:#e0e0e0}',
        '#nx-exp-panel.nx-dark .nx-exp-footer{border-top:1px solid #2f3133;color:#7a7d80}',
        '#nx-exp-panel.nx-light{background:#fff;color:#232527}',
        '#nx-exp-panel.nx-light .nx-exp-head{background:#f2f4f5;border-bottom:1px solid #c7cbce}',
        '#nx-exp-panel.nx-light .nx-exp-title{color:#232527}',
        '#nx-exp-panel.nx-light .nx-exp-close{color:#6a6d70}',
        '#nx-exp-panel.nx-light .nx-exp-close:hover{color:#000}',
        '#nx-exp-panel.nx-light #nx-exp-tree{background:#fafbfc;border-right:1px solid #e1e4e8}',
        '#nx-exp-panel.nx-light .nx-exp-row:hover{background:#e8eef5}',
        '#nx-exp-panel.nx-light .nx-exp-row.selected{background:#d3e3f3}',
        '#nx-exp-panel.nx-light .nx-exp-class{color:#7a7d80}',
        '#nx-exp-panel.nx-light .nx-exp-prop-head{border-bottom:1px solid #e1e4e8}',
        '#nx-exp-panel.nx-light .nx-exp-prop-name{color:#7a7d80}',
        '#nx-exp-panel.nx-light .nx-exp-prop-val{color:#232527}',
        '#nx-exp-panel.nx-light .nx-exp-footer{border-top:1px solid #e1e4e8;color:#7a7d80}',
        '#nx-exp-btn{display:flex;align-items:center;justify-content:center;width:40px;height:20px;',
        'box-sizing:border-box;cursor:pointer;',
        'background:linear-gradient(0deg,rgba(224,224,224,1) 0%,rgba(255,255,255,1) 100%);',
        'border:1px solid #777777;border-bottom:none;padding:0;margin:0 0 -1px 0;user-select:none}',
        '#nx-exp-btn:hover{background:linear-gradient(0deg,rgba(203,216,255,1) 0%,rgba(255,255,255,1) 100%)}',
        '#nx-exp-btn img{width:12px;height:12px;display:block;image-rendering:pixelated}',
        'html.octane-dark #nx-exp-btn{background:linear-gradient(0deg,rgba(60,60,60,1) 0%,rgba(90,90,90,1) 100%);border-color:#4a4a4a}',
        'html.octane-dark #nx-exp-btn:hover{background:linear-gradient(0deg,rgba(80,90,120,1) 0%,rgba(110,120,150,1) 100%)}'
    ].join('');

    function style() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function styleIn(doc) {
        if (!doc || doc.getElementById(STYLE_ID)) return;
        var s = doc.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        (doc.head || doc.documentElement).appendChild(s);
    }

    function assetId() {
        var m = location.pathname.match(/^\/catalog\/(\d+)/);
        return m ? m[1] : null;
    }

    function findAnchorIn(doc) {
    if (!doc) return null;

    var itemName = doc.querySelector('.item-name-container');
    if (itemName && itemName.parentElement) return itemName.parentElement;

    var title = doc.querySelector('[class*="title-0-2-"]')
        || doc.querySelector('h1')
        || doc.querySelector('h2')
        || doc.querySelector('[class*="title"]');
    if (!title) return null;

    var col = title.closest('.col-10')
        || title.closest('[class*="col-"]')
        || title.parentElement;
    if (!col) return null;

    var next = col.nextElementSibling
        || (col.parentElement && col.parentElement.querySelector('[class*="container-0-2-"]'))
        || col.parentElement;
    if (!next) return null;

    var gear = next.querySelector('[class*="container-0-2-"]')
        || next.querySelector('[class*="button"]')
        || next;
    return gear || next;
}

    function injectInto(doc, id) {
        if (!doc || !doc.body) return false;
        var existing = doc.getElementById(BTN_ID);
        if (existing && existing.dataset.assetId === id) return true;

        var anchor = findAnchorIn(doc);
        if (!anchor) return false;

        styleIn(doc);
        if (existing) existing.remove();

        var btn = doc.createElement('div');
        btn.id = BTN_ID;
        btn.dataset.assetId = id;
        btn.title = 'Explorer';

        var img = doc.createElement('img');
        img.src = EXPLORER_ICON_URL;
        img.onerror = function() {
            img.remove();
            btn.textContent = '\u25A6';
            btn.style.fontSize = '12px';
        };
        btn.appendChild(img);

        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            open(id);
        });

        anchor.insertBefore(btn, anchor.firstChild);
        return true;
    }

    function injectButton() {
        var id = assetId();
        if (!id) return;

        style();
        injectInto(document, id);

        var iframes = document.querySelectorAll('iframe[src*="/theme2020/catalog/"]');
        for (var i = 0; i < iframes.length; i++) {
            try {
                var d = iframes[i].contentDocument;
                if (d) injectInto(d, id);
            } catch (e) {}
        }
    }

    function node(inst, depth) {
        var wrap = document.createElement('div');
        wrap.className = 'nx-exp-node';

        var row = document.createElement('div');
        row.className = 'nx-exp-row';
        row.style.paddingLeft = (depth * 14 + 6) + 'px';

        var toggle = document.createElement('span');
        toggle.className = 'nx-exp-toggle';
        toggle.textContent = (inst.Children && inst.Children.length) ? '\u25B8' : '';

        var ic = document.createElement('img');
        ic.className = 'nx-exp-icon';
        var u = classIcon(inst.ClassName);
        if (u) ic.src = u;
        else ic.style.display = 'none';

        var label = document.createElement('span');
        label.className = 'nx-exp-label';
        label.textContent = (inst.Properties && inst.Properties.Name) || inst.ClassName;

        var cls = document.createElement('span');
        cls.className = 'nx-exp-class';
        cls.textContent = inst.ClassName;

        row.appendChild(toggle);
        row.appendChild(ic);
        row.appendChild(label);
        row.appendChild(cls);
        wrap.appendChild(row);

        var kids = document.createElement('div');
        kids.style.display = 'none';
        wrap.appendChild(kids);

        var built = false;
        var build = function() {
            if (built) return;
            built = true;
            (inst.Children || []).forEach(function(c) {
                kids.appendChild(node(c, depth + 1));
            });
        };

        if (inst.Children && inst.Children.length) {
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                var open = kids.style.display !== 'none';
                if (!open) build();
                kids.style.display = open ? 'none' : 'block';
                toggle.textContent = open ? '\u25B8' : '\u25BE';
            });
        }

        row.addEventListener('click', function() {
            var prev = document.querySelector('.nx-exp-row.selected');
            if (prev) prev.classList.remove('selected');
            row.classList.add('selected');
            props(inst);
        });

        return wrap;
    }

    function fmt(v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        if (typeof v === 'number') return String(Math.round(v * 1e4) / 1e4);
        if (typeof v === 'bigint') return v.toString();
        if (typeof v === 'string') return v;
        if (Array.isArray(v)) return v.length + ' keypoint' + (v.length === 1 ? '' : 's');
        if (v instanceof Uint8Array) return '(' + v.length + ' bytes)';
        if (typeof v === 'object') {
            if ('x' in v && 'y' in v) {
                return 'z' in v ? v.x + ', ' + v.y + ', ' + v.z : v.x + ', ' + v.y;
            }
            if ('r' in v && 'g' in v && 'b' in v) {
                var c = function(x) { return x <= 1 ? Math.round(x * 255) : Math.round(x); };
                return c(v.r) + ', ' + c(v.g) + ', ' + c(v.b);
            }
            if ('Scale' in v && 'Offset' in v) return '{' + v.Scale + ', ' + v.Offset + '}';
            if (v.X && v.Y && 'Scale' in v.X) {
                return '{' + v.X.Scale + ', ' + v.X.Offset + '}, {' + v.Y.Scale + ', ' + v.Y.Offset + '}';
            }
            if ('Min' in v && 'Max' in v) return v.Min + ' .. ' + v.Max;
            if ('Family' in v) return v.Family;
            try { return JSON.stringify(v); } catch (e) { return String(v); }
        }
        return String(v);
    }

    var HIDDEN = { HistoryId: 1, SourceAssetId: 1 };
    var GROUP = {
        Name: 'Data', ClassName: 'Data', Parent: 'Data',
        Size: 'Transform', Position: 'Transform', CFrame: 'Transform', Rotation: 'Transform',
        Anchored: 'Behavior', CanCollide: 'Behavior', Locked: 'Behavior',
        Color: 'Appearance', Material: 'Appearance', Transparency: 'Appearance',
        VertexColor: 'Appearance', Face: 'Appearance',
        Visible: 'Behavior', Enabled: 'Behavior',
        Image: 'Image', ImageColor3: 'Image', ImageTransparency: 'Image',
        ImageRectOffset: 'Image', ImageRectSize: 'Image',
        ScaleType: 'Image', SliceCenter: 'Image', SliceScale: 'Image',
        ResampleMode: 'Image', TileSize: 'Image',
        MeshId: 'Image', TextureId: 'Image', MeshType: 'Image',
        Texture: 'Image', Decal: 'Image',
        Offset: 'Transform', Scale: 'Transform',
        SoundId: 'Sound', Volume: 'Sound', Pitch: 'Sound',
        Looped: 'Sound', PlaybackSpeed: 'Sound'
    };

    function props(inst) {
        var pane = document.getElementById('nx-exp-props');
        if (!pane) return;
        pane.replaceChildren();

        var head = document.createElement('div');
        head.className = 'nx-exp-prop-head';

        var hic = document.createElement('img');
        hic.className = 'nx-exp-icon';
        var u = classIcon(inst.ClassName);
        if (u) hic.src = u;
        else hic.style.display = 'none';
        head.appendChild(hic);

        var txt = document.createElement('span');
        var name = (inst.Properties && inst.Properties.Name) || inst.ClassName;
        txt.textContent = name + ' \u2014 ' + inst.ClassName;
        head.appendChild(txt);
        pane.appendChild(head);

        var p = inst.Properties || {};
        var keys = Object.keys(p).filter(function(k) { return !HIDDEN[k]; });
        keys.sort();

        if (!keys.length) {
            var empty = document.createElement('div');
            empty.className = 'nx-exp-props-empty';
            empty.textContent = 'No properties.';
            pane.appendChild(empty);
            return;
        }

        var groups = {};
        keys.forEach(function(k) {
            var g = GROUP[k] || 'Data';
            (groups[g] = groups[g] || []).push(k);
        });

        Object.keys(groups).forEach(function(g) {
            var box = document.createElement('div');
            box.className = 'nx-exp-prop-group';

            var title = document.createElement('div');
            title.className = 'nx-exp-prop-group-title';
            title.textContent = g;
            box.appendChild(title);

            groups[g].forEach(function(k) {
                var row = document.createElement('div');
                row.className = 'nx-exp-prop-row';

                var n = document.createElement('div');
                n.className = 'nx-exp-prop-name';
                n.textContent = k;

                var v = document.createElement('div');
                v.className = 'nx-exp-prop-val';
                v.textContent = fmt(p[k]);

                row.appendChild(n);
                row.appendChild(v);
                box.appendChild(row);
            });
            pane.appendChild(box);
        });
    }

    function open(id) {
        style();
        var old = document.getElementById(OVERLAY_ID);
        if (old) old.remove();

        var d = dark();

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.className = d ? 'nx-dark' : 'nx-light';

        var head = document.createElement('div');
        head.className = 'nx-exp-head';

        var titleWrap = document.createElement('div');
        var title = document.createElement('h2');
        title.className = 'nx-exp-title';
        title.textContent = 'Explorer';

        var sub = document.createElement('div');
        sub.className = 'nx-exp-sub';
        sub.textContent = 'Asset #' + id + ' \u2014 loading\u2026';

        titleWrap.appendChild(title);
        titleWrap.appendChild(sub);
        head.appendChild(titleWrap);

        var close = document.createElement('button');
        close.className = 'nx-exp-close';
        close.textContent = '\u00d7';
        close.addEventListener('click', function() { overlay.remove(); });
        head.appendChild(close);

        var body = document.createElement('div');
        body.id = 'nx-exp-body';

        var tree = document.createElement('div');
        tree.id = 'nx-exp-tree';

        var propsPane = document.createElement('div');
        propsPane.id = 'nx-exp-props';

        var empty = document.createElement('div');
        empty.className = 'nx-exp-props-empty';
        empty.textContent = 'Select an instance.';
        propsPane.appendChild(empty);

        var footer = document.createElement('div');
        footer.className = 'nx-exp-footer';
        footer.textContent = 'Icons can make mistakes. Verify important information.';

        body.appendChild(tree);
        body.appendChild(propsPane);
        panel.appendChild(head);
        panel.appendChild(body);
        panel.appendChild(footer);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) overlay.remove();
        });

        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape' && document.getElementById(OVERLAY_ID)) {
                overlay.remove();
                document.removeEventListener('keydown', esc);
            }
        });

        loadTree(id).then(function(res) {
            if (!res || !res.isValid || !res.root || !res.root.length) {
                sub.textContent = 'Asset #' + id + ' \u2014 failed to load';
                tree.replaceChildren();
                var err = document.createElement('div');
                err.className = 'nx-exp-props-empty';
                err.textContent = 'Could not fetch or parse this asset.';
                tree.appendChild(err);
                return;
            }
            sub.textContent = 'Asset #' + id + ' \u2014 ' + res.format + ' \u2014 ' +
                res.root.length + ' root instance(s)';
            tree.replaceChildren();
            res.root.forEach(function(inst) {
                tree.appendChild(node(inst, 0));
            });
            props(res.root[0]);
        });
    }

    var observer = null;
    var lastHref = location.href;
    var iframeScanner = null;

    function teardownButton() {
        var b = document.getElementById(BTN_ID);
        if (b) b.remove();
        var iframes = document.querySelectorAll('iframe[src*="/theme2020/catalog/"]');
        for (var i = 0; i < iframes.length; i++) {
            try {
                var d = iframes[i].contentDocument;
                if (!d) continue;
                var b2 = d.getElementById(BTN_ID);
                if (b2) b2.remove();
            } catch (e) {}
        }
    }

    function close() {
        var o = document.getElementById(OVERLAY_ID);
        if (o) o.remove();
    }

    function scanIframes() {
        var iframes = document.querySelectorAll('iframe[src*="/theme2020/catalog/"]');
        for (var i = 0; i < iframes.length; i++) {
            iframes[i].addEventListener('load', function() {
                injectButton();
            });
        }
    }

    window.NX.features.explorer = {
        apply: function() {
            style();
            loadSprite().then(function() { injectButton(); });
            scanIframes();
            if (!iframeScanner) {
                iframeScanner = setInterval(injectButton, 800);
            }
            if (observer) return;
            observer = new MutationObserver(function() {
                if (location.href !== lastHref) {
                    lastHref = location.href;
                    teardownButton();
                }
                injectButton();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        },
        teardown: function() {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            if (iframeScanner) {
                clearInterval(iframeScanner);
                iframeScanner = null;
            }
            teardownButton();
            close();
        }
    };
})();
