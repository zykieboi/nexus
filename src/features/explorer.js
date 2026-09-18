(function () {
    'use strict';

    window.NX = window.NX || {};
    window.NX.features = window.NX.features || {};

    var API_V2 = 'https://www.aisaka.me/apisite/assetdelivery/v2/asset/?id=';
    var SIGNATURE = [60, 114, 111, 98, 108, 111, 120, 33];
    var SPRITE_URL = 'https://raw.githubusercontent.com/LockpickInteractive/studio-icons/main/ClassImages/2023-11-23%20ClassImages.png';
    var EXPLORER_ICON_URL = 'https://raw.githubusercontent.com/zykieboi/nexus/main/img/explorer.png';
    var SPRITE_CELL = 16;
    var SPRITE_COLS = 96;

    var STYLE_ID = 'nx-exp-style';
    var BTN_ID = 'nx-exp-btn';
    var OVERLAY_ID = 'nx-exp-overlay';
    var PANEL_ID = 'nx-exp-panel';

    var CLASS_ICON_INDEX = {
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

    function classIndexFor(className) {
        if (className in CLASS_ICON_INDEX) return CLASS_ICON_INDEX[className];
        return CLASS_ICON_INDEX.Folder;
    }

    var PROP_TYPES = {
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

    var spriteImage = null;
    var spriteCanvas = null;

    function loadSprite() {
        if (spriteImage) return Promise.resolve(spriteImage);
        return new Promise(function (resolve) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: SPRITE_URL,
                responseType: 'arraybuffer',
                onload: function (r) {
                    if (r.status < 200 || r.status >= 300) { resolve(null); return; }
                    var blob = new Blob([r.response], { type: 'image/png' });
                    var url = URL.createObjectURL(blob);
                    var img = new Image();
                    img.onload = function () {
                        spriteImage = img;
                        spriteCanvas = document.createElement('canvas');
                        spriteCanvas.width = img.width;
                        spriteCanvas.height = img.height;
                        spriteCanvas.getContext('2d').drawImage(img, 0, 0);
                        URL.revokeObjectURL(url);
                        resolve(img);
                    };
                    img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
                    img.src = url;
                },
                onerror: function () { resolve(null); }
            });
        });
    }

    var iconCache = {};

    function spriteIconDataUrl(index) {
        if (!spriteCanvas) return null;
        if (index < 0 || index >= SPRITE_COLS) return null;
        if (iconCache[index] !== undefined) return iconCache[index];
        var c = document.createElement('canvas');
        c.width = SPRITE_CELL;
        c.height = SPRITE_CELL;
        var ctx = c.getContext('2d');
        ctx.drawImage(spriteCanvas, index * SPRITE_CELL, 0, SPRITE_CELL, SPRITE_CELL, 0, 0, SPRITE_CELL, SPRITE_CELL);
        var url = c.toDataURL('image/png');
        iconCache[index] = url;
        return url;
    }

    function classIconDataUrl(className) {
        if (!spriteCanvas) return null;
        return spriteIconDataUrl(classIndexFor(className));
    }

    function untransformFloat(v) {
        var u = ((v << 31) | (v >>> 1)) >>> 0;
        untransformFloat._view.setUint32(0, u, true);
        return untransformFloat._view.getFloat32(0, true);
    }
    untransformFloat._view = new DataView(new ArrayBuffer(4));

    function ByteReader(buffer) {
        this.buffer = buffer;
        this.view = new DataView(buffer);
        this.index = 0;
    }
    ByteReader.prototype.jump = function (n) { this.index += n; };
    ByteReader.prototype.readUInt8 = function () { return this.view.getUint8(this.index++); };
    ByteReader.prototype.readUInt16LE = function () {
        var v = this.view.getUint16(this.index, true); this.index += 2; return v;
    };
    ByteReader.prototype.readInt16LE = function () {
        var v = this.view.getInt16(this.index, true); this.index += 2; return v;
    };
    ByteReader.prototype.readUInt32LE = function () {
        var v = this.view.getUint32(this.index, true); this.index += 4; return v;
    };
    ByteReader.prototype.readFloat32LE = function () {
        var v = this.view.getFloat32(this.index, true); this.index += 4; return v;
    };
    ByteReader.prototype.readFloat64LE = function () {
        var v = this.view.getFloat64(this.index, true); this.index += 8; return v;
    };
    ByteReader.prototype.readString = function (len) {
        var bytes = new Uint8Array(this.buffer, this.index, len);
        this.index += len;
        return new TextDecoder().decode(bytes);
    };
    ByteReader.prototype.readBytes = function (len) {
        var bytes = new Uint8Array(this.buffer, this.index, len);
        this.index += len;
        return bytes;
    };
    ByteReader.prototype.getRemaining = function () {
        return this.buffer.byteLength - this.index;
    };
    ByteReader.prototype.readInterleavedUInt32Array = function (count) {
        if (count < 0 || count > 0x1000000) throw new RangeError('bad count ' + count);
        var values = new Array(count);
        if (count === 0) return values;
        var byteCount = count * 4;
        var raw = new Uint8Array(this.buffer, this.index, byteCount);
        this.index += byteCount;
        for (var i = 0; i < count; i++) {
            values[i] = ((raw[i] << 24) | (raw[i + count] << 16) |
                (raw[i + count * 2] << 8) | raw[i + count * 3]) >>> 0;
        }
        return values;
    };
    ByteReader.prototype.readInterleavedInt32Array = function (count) {
        var values = this.readInterleavedUInt32Array(count);
        for (var i = 0; i < count; i++) {
            var u = values[i];
            values[i] = (u >>> 1) ^ -(u & 1);
        }
        return values;
    };
    ByteReader.prototype.readInterleavedFloatArray = function (count) {
        var values = this.readInterleavedUInt32Array(count);
        for (var i = 0; i < count; i++) values[i] = untransformFloat(values[i]);
        return values;
    };
    ByteReader.prototype.readInterleavedInt64Array = function (count) {
        if (count < 0 || count > 0x1000000) throw new RangeError('bad count ' + count);
        var values = new Array(count);
        if (count === 0) return values;
        var byteCount = count * 8;
        var raw = new Uint8Array(this.buffer, this.index, byteCount);
        this.index += byteCount;
        for (var i = 0; i < count; i++) {
            var u = 0n;
            for (var b = 0; b < 8; b++) u = (u << 8n) | BigInt(raw[i + count * b]);
            values[i] = (u >> 1n) ^ -(u & 1n);
        }
        return values;
    };

    function decompressLz4(input, outputSize) {
        var output = new Uint8Array(outputSize);
        var i = 0, j = 0;
        while (i < input.length) {
            var token = input[i++];
            var literalLength = token >> 4;
            if (literalLength > 0) {
                if (literalLength === 0x0f) {
                    var lenByte;
                    do { lenByte = input[i++]; literalLength += lenByte; } while (lenByte === 0xff);
                }
                for (var l = 0; l < literalLength; l++) output[j++] = input[i++];
            }
            if (i >= input.length) break;
            var offset = input[i++] | (input[i++] << 8);
            var matchLength = (token & 0x0f) + 4;
            if (matchLength === 0x0f + 4) {
                var lenByte2;
                do { lenByte2 = input[i++]; matchLength += lenByte2; } while (lenByte2 === 0xff);
            }
            var pos = j - offset;
            for (var m = 0; m < matchLength; m++) output[j++] = output[pos++];
        }
        return output.buffer;
    }

    function decompressZstd(input, outputSize) {
        var output = new Uint8Array(outputSize);
        var i = 0, j = 0;
        var MAGIC = [0x28, 0xb5, 0x2f, 0xfd];
        for (var m = 0; m < 4; m++) if (input[i + m] !== MAGIC[m]) return output.buffer;
        i += 4;
        if (i >= input.length) return output.buffer;
        var descriptor = input[i++];
        var fcsFlag = (descriptor >> 6) & 3;
        var singleSegment = (descriptor >> 5) & 1;
        var dictFlag = descriptor & 3;
        var hasContentChecksum = (descriptor >> 2) & 1;
        var fcsSize = singleSegment ? [1, 2, 4, 8][fcsFlag] : [0, 1, 2, 4][fcsFlag];
        if (singleSegment) {} else i += 1;
        if (dictFlag === 3) i += 4;
        i += fcsSize;
        while (i + 3 <= input.length) {
            var header = input[i] | (input[i + 1] << 8) | (input[i + 2] << 16);
            i += 3;
            var lastBlock = header & 1;
            var blockType = (header >> 1) & 3;
            var blockSize = header >> 3;
            if (blockType === 0) {
                for (var k = 0; k < blockSize; k++) output[j++] = input[i++];
            } else if (blockType === 1) {
                var rleByte = input[i++];
                for (var k2 = 0; k2 < blockSize; k2++) output[j++] = rleByte;
            } else {
                return output.buffer;
            }
            if (lastBlock) break;
        }
        if (hasContentChecksum) i += 4;
        return output.buffer;
    }

    function parseRbxm(buffer) {
        try {
            var reader = new ByteReader(buffer);
            var signature = reader.readString(8);
            if (signature !== '<roblox!') return [];
            reader.jump(8);
            reader.readUInt32LE();
            reader.readUInt32LE();
            reader.jump(8);

            var instances = new Map();
            var classMetadata = new Map();
            var sharedStrings = [];
            var roots = [];

            while (reader.getRemaining() > 4) {
                var chunkType = reader.readString(4);
                if (chunkType === 'END\0') break;

                var compressedLength = reader.readUInt32LE();
                var decompressedLength = reader.readUInt32LE();
                reader.jump(4);

                var dataBuffer;
                if (compressedLength === 0) {
                    var rawBytes = reader.readBytes(decompressedLength);
                    dataBuffer = rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + decompressedLength);
                } else {
                    var chunkData = reader.readBytes(compressedLength);
                    var isZstd = chunkData[0] === 0x28 && chunkData[1] === 0xb5 && chunkData[2] === 0x2f && chunkData[3] === 0xfd;
                    if (isZstd) {
                        dataBuffer = decompressZstd(chunkData, decompressedLength);
                    } else {
                        dataBuffer = decompressLz4(chunkData, decompressedLength);
                    }
                }

                var chunkReader = new ByteReader(dataBuffer);

                try {
                    if (chunkType === 'SSTR') {
                        chunkReader.readUInt32LE();
                        var sstrCount = chunkReader.readUInt32LE();
                        for (var s = 0; s < sstrCount; s++) {
                            chunkReader.readBytes(16);
                            var slen = chunkReader.readUInt32LE();
                            sharedStrings[s] = chunkReader.readString(slen);
                        }
                    } else if (chunkType === 'INST') {
                        var classId = chunkReader.readUInt32LE();
                        var cnLen = chunkReader.readUInt32LE();
                        var className = chunkReader.readString(cnLen);
                        chunkReader.readUInt8();
                        var iCount = chunkReader.readUInt32LE();
                        var ids = chunkReader.readInterleavedInt32Array(iCount);
                        var realIds = [];
                        var curId = 0;
                        for (var ii = 0; ii < iCount; ii++) {
                            curId += ids[ii];
                            realIds.push(curId);
                        }
                        classMetadata.set(classId, { className: className, instanceIds: realIds });
                        realIds.forEach(function (id) {
                            instances.set(id, {
                                ClassName: className,
                                Reference: String(id),
                                Properties: {},
                                Children: []
                            });
                        });
                    } else if (chunkType === 'PROP') {
                        var propClassId = chunkReader.readUInt32LE();
                        var pnLen = chunkReader.readUInt32LE();
                        var propName = chunkReader.readString(pnLen);
                        var propType = chunkReader.readUInt8();

                        var classData = classMetadata.get(propClassId);
                        if (!classData) continue;

                        var propIds = classData.instanceIds;
                        var propCount = propIds.length;
                        var setProp = function (idx, value) {
                            instances.get(propIds[idx]).Properties[propName] = value;
                        };

                        if (propType === PROP_TYPES.STRING) {
                            for (var i1 = 0; i1 < propCount; i1++) {
                                var len = chunkReader.readUInt32LE();
                                if (propName === 'AttributesSerialize') {
                                    setProp(i1, chunkReader.readBytes(len).slice());
                                } else {
                                    setProp(i1, chunkReader.readString(len));
                                }
                            }
                        } else if (propType === PROP_TYPES.BOOL) {
                            for (var i2 = 0; i2 < propCount; i2++) setProp(i2, chunkReader.readUInt8() === 1);
                        } else if (propType === PROP_TYPES.INT) {
                            var iv = chunkReader.readInterleavedInt32Array(propCount);
                            for (var i3 = 0; i3 < propCount; i3++) setProp(i3, iv[i3]);
                        } else if (propType === PROP_TYPES.FLOAT) {
                            var fv = chunkReader.readInterleavedFloatArray(propCount);
                            for (var i4 = 0; i4 < propCount; i4++) setProp(i4, fv[i4]);
                        } else if (propType === PROP_TYPES.DOUBLE) {
                            for (var i5 = 0; i5 < propCount; i5++) setProp(i5, chunkReader.readFloat64LE());
                        } else if (propType === PROP_TYPES.UDIM) {
                            var uScales = chunkReader.readInterleavedFloatArray(propCount);
                            var uOffsets = chunkReader.readInterleavedInt32Array(propCount);
                            for (var i6 = 0; i6 < propCount; i6++) setProp(i6, { Scale: uScales[i6], Offset: uOffsets[i6] });
                        } else if (propType === PROP_TYPES.UDIM2) {
                            var uxS = chunkReader.readInterleavedFloatArray(propCount);
                            var uyS = chunkReader.readInterleavedFloatArray(propCount);
                            var uxO = chunkReader.readInterleavedInt32Array(propCount);
                            var uyO = chunkReader.readInterleavedInt32Array(propCount);
                            for (var i7 = 0; i7 < propCount; i7++) setProp(i7, {
                                X: { Scale: uxS[i7], Offset: uxO[i7] },
                                Y: { Scale: uyS[i7], Offset: uyO[i7] }
                            });
                        } else if (propType === PROP_TYPES.RAY) {
                            for (var i8 = 0; i8 < propCount; i8++) {
                                var ox = chunkReader.readFloat32LE(), oy = chunkReader.readFloat32LE(), oz = chunkReader.readFloat32LE();
                                var dx = chunkReader.readFloat32LE(), dy = chunkReader.readFloat32LE(), dz = chunkReader.readFloat32LE();
                                setProp(i8, { Origin: { x: ox, y: oy, z: oz }, Direction: { x: dx, y: dy, z: dz } });
                            }
                        } else if (propType === PROP_TYPES.FACES || propType === PROP_TYPES.AXES) {
                            for (var i9 = 0; i9 < propCount; i9++) setProp(i9, chunkReader.readUInt8());
                        } else if (propType === PROP_TYPES.BRICKCOLOR) {
                            var bv = chunkReader.readInterleavedUInt32Array(propCount);
                            for (var i10 = 0; i10 < propCount; i10++) setProp(i10, bv[i10]);
                        } else if (propType === PROP_TYPES.COLOR3) {
                            var cr = chunkReader.readInterleavedFloatArray(propCount);
                            var cg = chunkReader.readInterleavedFloatArray(propCount);
                            var cb = chunkReader.readInterleavedFloatArray(propCount);
                            for (var i11 = 0; i11 < propCount; i11++) setProp(i11, { r: cr[i11], g: cg[i11], b: cb[i11] });
                        } else if (propType === PROP_TYPES.VECTOR2) {
                            var v2x = chunkReader.readInterleavedFloatArray(propCount);
                            var v2y = chunkReader.readInterleavedFloatArray(propCount);
                            for (var i12 = 0; i12 < propCount; i12++) setProp(i12, { x: v2x[i12], y: v2y[i12] });
                        } else if (propType === PROP_TYPES.VECTOR3) {
                            var v3x = chunkReader.readInterleavedFloatArray(propCount);
                            var v3y = chunkReader.readInterleavedFloatArray(propCount);
                            var v3z = chunkReader.readInterleavedFloatArray(propCount);
                            for (var i13 = 0; i13 < propCount; i13++) setProp(i13, { x: v3x[i13], y: v3y[i13], z: v3z[i13] });
                        } else if (propType === PROP_TYPES.VECTOR3INT16) {
                            for (var i14 = 0; i14 < propCount; i14++) setProp(i14, {
                                x: chunkReader.readInt16LE(),
                                y: chunkReader.readInt16LE(),
                                z: chunkReader.readInt16LE()
                            });
                        } else if (propType === PROP_TYPES.CFRAME) {
                            var rotations = [];
                            for (var instI = 0; instI < propCount; instI++) {
                                var rotId = chunkReader.readUInt8();
                                if (rotId === 0) {
                                    var floats = [];
                                    for (var fi = 0; fi < 9; fi++) floats.push(chunkReader.readFloat32LE());
                                    rotations.push(floats);
                                } else {
                                    var getVec = function (id) {
                                        if (id === 0) return [1, 0, 0];
                                        if (id === 1) return [0, 1, 0];
                                        if (id === 2) return [0, 0, 1];
                                        if (id === 3) return [-1, 0, 0];
                                        if (id === 4) return [0, -1, 0];
                                        return [0, 0, -1];
                                    };
                                    var rId = rotId - 1;
                                    var right = getVec(Math.floor(rId / 6));
                                    var up = getVec(rId % 6);
                                    var back = [
                                        right[1] * up[2] - right[2] * up[1],
                                        right[2] * up[0] - right[0] * up[2],
                                        right[0] * up[1] - right[1] * up[0]
                                    ];
                                    rotations.push([
                                        right[0], up[0], back[0],
                                        right[1], up[1], back[1],
                                        right[2], up[2], back[2]
                                    ]);
                                }
                            }
                            var cfX = chunkReader.readInterleavedFloatArray(propCount);
                            var cfY = chunkReader.readInterleavedFloatArray(propCount);
                            var cfZ = chunkReader.readInterleavedFloatArray(propCount);
                            var cleanNum = function (n) { return Math.abs(n) < 1e-5 ? 0 : Math.round(n * 1e5) / 1e5; };
                            for (var i15 = 0; i15 < propCount; i15++) {
                                var rot = rotations[i15];
                                var parts = [cfX[i15], cfY[i15], cfZ[i15], rot[0], rot[1], rot[2], rot[3], rot[4], rot[5], rot[6], rot[7], rot[8]].map(cleanNum);
                                setProp(i15, parts.join(', '));
                            }
                        } else if (propType === PROP_TYPES.ENUM) {
                            var ev = chunkReader.readInterleavedUInt32Array(propCount);
                            for (var i16 = 0; i16 < propCount; i16++) setProp(i16, ev[i16]);
                        } else if (propType === PROP_TYPES.REF) {
                            var deltas = chunkReader.readInterleavedInt32Array(propCount);
                            var refId = 0;
                            for (var i17 = 0; i17 < propCount; i17++) {
                                refId += deltas[i17];
                                setProp(i17, refId);
                            }
                        } else if (propType === PROP_TYPES.NUMBER_SEQUENCE) {
                            for (var i18 = 0; i18 < propCount; i18++) {
                                var nsLen = chunkReader.readUInt32LE();
                                var nkps = [];
                                for (var k1 = 0; k1 < nsLen; k1++) {
                                    nkps.push({
                                        Time: chunkReader.readFloat32LE(),
                                        Value: chunkReader.readFloat32LE(),
                                        Envelope: chunkReader.readFloat32LE()
                                    });
                                }
                                setProp(i18, nkps);
                            }
                        } else if (propType === PROP_TYPES.COLOR_SEQUENCE) {
                            for (var i19 = 0; i19 < propCount; i19++) {
                                var csLen = chunkReader.readUInt32LE();
                                var ckps = [];
                                for (var k2 = 0; k2 < csLen; k2++) {
                                    var kp = {
                                        Time: chunkReader.readFloat32LE(),
                                        Value: {
                                            r: chunkReader.readFloat32LE(),
                                            g: chunkReader.readFloat32LE(),
                                            b: chunkReader.readFloat32LE()
                                        }
                                    };
                                    chunkReader.readFloat32LE();
                                    ckps.push(kp);
                                }
                                setProp(i19, ckps);
                            }
                        } else if (propType === PROP_TYPES.NUMBER_RANGE) {
                            for (var i20 = 0; i20 < propCount; i20++) setProp(i20, {
                                Min: chunkReader.readFloat32LE(),
                                Max: chunkReader.readFloat32LE()
                            });
                        } else if (propType === PROP_TYPES.RECT) {
                            var rminX = chunkReader.readInterleavedFloatArray(propCount);
                            var rminY = chunkReader.readInterleavedFloatArray(propCount);
                            var rmaxX = chunkReader.readInterleavedFloatArray(propCount);
                            var rmaxY = chunkReader.readInterleavedFloatArray(propCount);
                            for (var i21 = 0; i21 < propCount; i21++) setProp(i21, {
                                Min: { x: rminX[i21], y: rminY[i21] },
                                Max: { x: rmaxX[i21], y: rmaxY[i21] }
                            });
                        } else if (propType === PROP_TYPES.PHYSICAL_PROPERTIES) {
                            for (var i22 = 0; i22 < propCount; i22++) {
                                var flag = chunkReader.readUInt8();
                                if (flag & 1) {
                                    var physProps = {
                                        Density: chunkReader.readFloat32LE(),
                                        Friction: chunkReader.readFloat32LE(),
                                        Elasticity: chunkReader.readFloat32LE(),
                                        FrictionWeight: chunkReader.readFloat32LE(),
                                        ElasticityWeight: chunkReader.readFloat32LE()
                                    };
                                    if (flag & 2) chunkReader.readFloat32LE();
                                    setProp(i22, physProps);
                                } else {
                                    setProp(i22, false);
                                }
                            }
                        } else if (propType === PROP_TYPES.COLOR3UINT8) {
                            var c3r = [], c3g = [], c3b = [];
                            for (var i23 = 0; i23 < propCount; i23++) c3r.push(chunkReader.readUInt8());
                            for (var i24 = 0; i24 < propCount; i24++) c3g.push(chunkReader.readUInt8());
                            for (var i25 = 0; i25 < propCount; i25++) c3b.push(chunkReader.readUInt8());
                            for (var i26 = 0; i26 < propCount; i26++) setProp(i26, { r: c3r[i26], g: c3g[i26], b: c3b[i26] });
                        } else if (propType === PROP_TYPES.INT64) {
                            var i64v = chunkReader.readInterleavedInt64Array(propCount);
                            for (var i27 = 0; i27 < propCount; i27++) setProp(i27, i64v[i27]);
                        } else if (propType === PROP_TYPES.SHARED_STRING) {
                            var ssIdx = chunkReader.readInterleavedUInt32Array(propCount);
                            for (var i28 = 0; i28 < propCount; i28++) setProp(i28, sharedStrings[ssIdx[i28]] || '');
                        } else if (propType === PROP_TYPES.UNIQUE_ID) {
                            var uRaw = chunkReader.readBytes(propCount * 16);
                            for (var i29 = 0; i29 < propCount; i29++) {
                                var hex = '';
                                for (var b2 = 0; b2 < 16; b2++) hex += uRaw[b2 * propCount + i29].toString(16).padStart(2, '0');
                                setProp(i29, hex);
                            }
                        } else if (propType === PROP_TYPES.FONT) {
                            for (var i30 = 0; i30 < propCount; i30++) {
                                var famLen = chunkReader.readUInt32LE();
                                var fam = chunkReader.readString(famLen);
                                var weight = chunkReader.readUInt16LE();
                                var style = chunkReader.readUInt8();
                                var cacheLen = chunkReader.readUInt32LE();
                                chunkReader.readString(cacheLen);
                                setProp(i30, { Family: fam, Weight: weight, Style: style });
                            }
                        } else if (propType === PROP_TYPES.CONTENT) {
                            var srcTypes = chunkReader.readInterleavedInt32Array(propCount);
                            var numUris = chunkReader.readUInt32LE();
                            var uris = [];
                            for (var u = 0; u < numUris; u++) {
                                var ulen = chunkReader.readUInt32LE();
                                uris.push(chunkReader.readString(ulen));
                            }
                            var numObjects = chunkReader.readUInt32LE();
                            chunkReader.readInterleavedInt32Array(numObjects);
                            var numExternal = chunkReader.readUInt32LE();
                            chunkReader.readInterleavedInt32Array(numExternal);
                            var uriCounter = 0;
                            for (var i31 = 0; i31 < propCount; i31++) setProp(i31, srcTypes[i31] === 1 ? uris[uriCounter++] : '');
                        } else {
                            chunkReader.index = chunkReader.buffer.byteLength;
                        }
                    } else if (chunkType === 'PRNT') {
                        chunkReader.readUInt8();
                        var pCount = chunkReader.readUInt32LE();
                        var childIdsDelta = chunkReader.readInterleavedInt32Array(pCount);
                        var parentIdsDelta = chunkReader.readInterleavedInt32Array(pCount);
                        var childId = 0, parentId = 0;
                        for (var i32 = 0; i32 < pCount; i32++) {
                            childId += childIdsDelta[i32];
                            parentId += parentIdsDelta[i32];
                            var childObj = instances.get(childId);
                            var parentObj = instances.get(parentId);
                            if (childObj && parentObj) parentObj.Children.push(childObj);
                        }
                    }
                } catch (chunkErr) {}
            }

            var childrenRefs = new Set();
            instances.forEach(function (inst) {
                inst.Children.forEach(function (child) { childrenRefs.add(child.Reference); });
            });
            instances.forEach(function (inst, ref) {
                if (!childrenRefs.has(String(ref))) roots.push(inst);
            });
            return roots;
        } catch (e) {
            return [];
        }
    }

    function parseRobloxXml(text) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(text, 'text/xml');
        var robloxNode = xmlDoc.getElementsByTagName('roblox')[0];
        if (!robloxNode) return [];

        var cleanNum = function (n) { return Math.abs(n) < 1e-5 ? 0 : Math.round(n * 1e5) / 1e5; };
        function childText(el, tag) {
            var c = Array.from(el.children).find(function (x) { return x.tagName === tag; });
            return c ? c.textContent.trim() : null;
        }
        function childNum(el, tag) {
            var t = childText(el, tag);
            return t == null ? 0 : Number(t);
        }
        function parseProp(prop) {
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
                        ? Array.from(prop.children).find(function (x) { return x.tagName === 'CFrame'; })
                        : prop;
                    if (!cf) return null;
                    var keys = ['X','Y','Z','R00','R01','R02','R10','R11','R12','R20','R21','R22'];
                    return keys.map(function (k) { return cleanNum(childNum(cf, k)); }).join(', ');
                }
                default:
                    return prop.textContent;
            }
        }
        function parseItem(node) {
            var instance = {
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
                        var propName = prop.getAttribute('name');
                        if (!propName) continue;
                        instance.Properties[propName] = parseProp(prop);
                    }
                } else if (child.tagName === 'Item') {
                    instance.Children.push(parseItem(child));
                }
            }
            return instance;
        }
        var result = [];
        for (var k = 0; k < robloxNode.children.length; k++) {
            var c = robloxNode.children[k];
            if (c.tagName === 'Item') result.push(parseItem(c));
        }
        return result;
    }

    function isBinaryFormat(buffer) {
        if (buffer.byteLength < 8) return false;
        var sig = new Uint8Array(buffer, 0, 8);
        for (var i = 0; i < SIGNATURE.length; i++) if (sig[i] !== SIGNATURE[i]) return false;
        return true;
    }

    function gmFetchArray(url) {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                onload: function (r) {
                    if (r.status >= 200 && r.status < 300) resolve(r.response);
                    else reject(new Error('HTTP ' + r.status));
                },
                onerror: function () { reject(new Error('network')); }
            });
        });
    }

    function gmFetchJson(url) {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function (r) {
                    if (r.status < 200 || r.status >= 300) { reject(new Error('HTTP ' + r.status)); return; }
                    try { resolve(JSON.parse(r.responseText)); }
                    catch (e) { reject(e); }
                },
                onerror: function () { reject(new Error('network')); }
            });
        });
    }

    function loadAssetTree(assetId) {
        var invalid = { assetId: assetId, root: null, format: null, isValid: false };
        return gmFetchJson(API_V2 + assetId).then(function (meta) {
            var loc = meta && meta.locations && meta.locations.location;
            if (!loc) return invalid;
            return gmFetchArray(loc).then(function (buffer) {
                var root = null, format = null;
                if (isBinaryFormat(buffer)) {
                    format = 'RBXM';
                    root = parseRbxm(buffer);
                } else {
                    format = 'XML';
                    var text = new TextDecoder('utf-8').decode(buffer);
                    if (text.indexOf('<roblox') !== -1) root = parseRobloxXml(text);
                }
                if (!root || !root.length) return invalid;
                return { assetId: assetId, root: root, format: format, isValid: true };
            }).catch(function () { return invalid; });
        }).catch(function () { return invalid; });
    }

    function isDarkTheme() {
        try {
            return localStorage.getItem('rbx_theme_v1') === 'dark';
        } catch (e) {
            return false;
        }
    }

    var CSS = [
        '#nx-exp-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999998;display:flex;align-items:center;justify-content:center;font-family:"Source Sans Pro","Segoe UI",Roboto,sans-serif}',
        '#nx-exp-panel{width:90%;max-width:1100px;height:80vh;display:flex;flex-direction:column;overflow:hidden;border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,0.5)}',
        '#nx-exp-panel .nx-exp-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;flex-shrink:0}',
        '#nx-exp-panel .nx-exp-title{font-size:14px;font-weight:600;margin:0}',
        '#nx-exp-panel .nx-exp-sub{font-size:11px;margin-top:1px;opacity:0.7}',
        '#nx-exp-panel .nx-exp-close{background:none;border:0;font-size:20px;line-height:1;cursor:pointer;padding:0 4px}',
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
        '.nx-exp-prop-head{font-size:13px;font-weight:600;margin-bottom:10px;padding-bottom:6px;display:flex;align-items:center;gap:6px}',
        '.nx-exp-prop-group{margin-bottom:12px}',
        '.nx-exp-prop-group-title{font-size:10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;opacity:0.6;margin-bottom:4px}',
        '.nx-exp-prop-row{display:grid;grid-template-columns:160px 1fr;gap:8px;padding:3px 0;font-size:12px}',
        '.nx-exp-prop-name{opacity:0.7}',
        '.nx-exp-prop-val{word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}',
        '.nx-exp-footer{padding:8px 14px;font-size:11px;text-align:center;flex-shrink:0;font-style:italic;opacity:0.55}',
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
        '#nx-exp-btn{display:flex;align-items:center;justify-content:center;width:40px;height:20px;box-sizing:border-box;cursor:pointer;background:linear-gradient(0deg,rgba(224,224,224,1) 0%,rgba(255,255,255,1) 100%);border:1px solid #777777;border-bottom:none;padding:0;margin:0 0 -1px 0;user-select:none}',
        '#nx-exp-btn:hover{background:linear-gradient(0deg,rgba(203,216,255,1) 0%,rgba(255,255,255,1) 100%)}',
        '#nx-exp-btn img{width:12px;height:12px;display:block;image-rendering:pixelated}',
        'body[data-nx-theme="dark"] #nx-exp-btn{background:linear-gradient(0deg,rgba(60,60,60,1) 0%,rgba(90,90,90,1) 100%);border-color:#4a4a4a}',
        'body[data-nx-theme="dark"] #nx-exp-btn:hover{background:linear-gradient(0deg,rgba(80,90,120,1) 0%,rgba(110,120,150,1) 100%)}'
    ].join('');

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function applyThemeAttr() {
        try {
            var dark = localStorage.getItem('rbx_theme_v1') === 'dark';
            if (dark) document.body.setAttribute('data-nx-theme', 'dark');
            else document.body.removeAttribute('data-nx-theme');
        } catch (e) {}
    }

    function getAssetIdFromUrl() {
        var m = location.pathname.match(/^\/catalog\/(\d+)/);
        return m ? m[1] : null;
    }

    function findAnchor() {
        var h1 = document.querySelector('[class*="title-0-2-"]');
        if (!h1) return null;
        var headerCol = h1.closest('.col-10');
        if (!headerCol) return null;
        var col2 = headerCol.nextElementSibling;
        if (!col2) return null;
        var gearContainer = col2.querySelector('[class*="container-0-2-"]');
        return gearContainer || col2;
    }

    function injectButton() {
        var assetId = getAssetIdFromUrl();
        if (!assetId) return;
        var existing = document.getElementById(BTN_ID);
        if (existing && existing.dataset.assetId === assetId) return;

        var anchor = findAnchor();
        if (!anchor) return;

        ensureStyle();
        applyThemeAttr();
        if (existing) existing.remove();

        var btn = document.createElement('div');
        btn.id = BTN_ID;
        btn.dataset.assetId = assetId;
        btn.title = 'Explorer';

        var img = document.createElement('img');
        img.src = EXPLORER_ICON_URL;
        img.onerror = function () {
            img.remove();
            btn.textContent = '\u25A6';
            btn.style.fontSize = '12px';
        };
        btn.appendChild(img);

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openExplorer(assetId);
        });

        anchor.insertBefore(btn, anchor.firstChild);
    }

    function buildTreeNode(instance, depth) {
        var node = document.createElement('div');
        node.className = 'nx-exp-node';

        var row = document.createElement('div');
        row.className = 'nx-exp-row';
        row.style.paddingLeft = (depth * 14 + 6) + 'px';

        var toggle = document.createElement('span');
        toggle.className = 'nx-exp-toggle';
        toggle.textContent = (instance.Children && instance.Children.length) ? '\u25B8' : '';

        var icon = document.createElement('img');
        icon.className = 'nx-exp-icon';
        var iconUrl = classIconDataUrl(instance.ClassName);
        if (iconUrl) icon.src = iconUrl;
        else icon.style.display = 'none';

        var label = document.createElement('span');
        label.className = 'nx-exp-label';
        label.textContent = (instance.Properties && instance.Properties.Name) || instance.ClassName;

        var cls = document.createElement('span');
        cls.className = 'nx-exp-class';
        cls.textContent = instance.ClassName;

        row.appendChild(toggle);
        row.appendChild(icon);
        row.appendChild(label);
        row.appendChild(cls);
        node.appendChild(row);

        var childrenWrap = document.createElement('div');
        childrenWrap.style.display = 'none';
        node.appendChild(childrenWrap);

        var built = false;
        function buildChildren() {
            if (built) return;
            built = true;
            (instance.Children || []).forEach(function (c) {
                childrenWrap.appendChild(buildTreeNode(c, depth + 1));
            });
        }

        if (instance.Children && instance.Children.length) {
            toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                var open = childrenWrap.style.display !== 'none';
                if (!open) buildChildren();
                childrenWrap.style.display = open ? 'none' : 'block';
                toggle.textContent = open ? '\u25B8' : '\u25BE';
            });
        }

        row.addEventListener('click', function () {
            var prev = document.querySelector('.nx-exp-row.selected');
            if (prev) prev.classList.remove('selected');
            row.classList.add('selected');
            renderProps(instance);
        });

        return node;
    }

    function formatValue(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'number') return String(Math.round(value * 1e4) / 1e4);
        if (typeof value === 'bigint') return value.toString();
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) return value.length + ' keypoint' + (value.length === 1 ? '' : 's');
        if (value instanceof Uint8Array) return '(' + value.length + ' bytes)';
        if (typeof value === 'object') {
            if ('x' in value && 'y' in value) {
                return 'z' in value
                    ? value.x + ', ' + value.y + ', ' + value.z
                    : value.x + ', ' + value.y;
            }
            if ('r' in value && 'g' in value && 'b' in value) {
                var to255 = function (c) { return c <= 1 ? Math.round(c * 255) : Math.round(c); };
                return to255(value.r) + ', ' + to255(value.g) + ', ' + to255(value.b);
            }
            if ('Scale' in value && 'Offset' in value) return '{' + value.Scale + ', ' + value.Offset + '}';
            if (value.X && value.Y && 'Scale' in value.X) {
                return '{' + value.X.Scale + ', ' + value.X.Offset + '}, {' + value.Y.Scale + ', ' + value.Y.Offset + '}';
            }
            if ('Min' in value && 'Max' in value) return value.Min + ' .. ' + value.Max;
            if ('Family' in value) return value.Family;
            try { return JSON.stringify(value); } catch (e) { return String(value); }
        }
        return String(value);
    }

    var HIDDEN_PROPS = { HistoryId: 1, SourceAssetId: 1 };
    var PROP_GROUP = {
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

    function renderProps(instance) {
        var pane = document.getElementById('nx-exp-props');
        if (!pane) return;
        pane.replaceChildren();

        var head = document.createElement('div');
        head.className = 'nx-exp-prop-head';

        var headIcon = document.createElement('img');
        headIcon.className = 'nx-exp-icon';
        var headIconUrl = classIconDataUrl(instance.ClassName);
        if (headIconUrl) headIcon.src = headIconUrl;
        else headIcon.style.display = 'none';
        head.appendChild(headIcon);

        var headText = document.createElement('span');
        var name = (instance.Properties && instance.Properties.Name) || instance.ClassName;
        headText.textContent = name + ' — ' + instance.ClassName;
        head.appendChild(headText);
        pane.appendChild(head);

        var props = instance.Properties || {};
        var keys = Object.keys(props).filter(function (k) { return !HIDDEN_PROPS[k]; });
        keys.sort();

        if (!keys.length) {
            var empty = document.createElement('div');
            empty.className = 'nx-exp-props-empty';
            empty.textContent = 'No properties.';
            pane.appendChild(empty);
            return;
        }

        var groups = {};
        keys.forEach(function (k) {
            var g = PROP_GROUP[k] || 'Data';
            (groups[g] = groups[g] || []).push(k);
        });

        Object.keys(groups).forEach(function (g) {
            var group = document.createElement('div');
            group.className = 'nx-exp-prop-group';
            var title = document.createElement('div');
            title.className = 'nx-exp-prop-group-title';
            title.textContent = g;
            group.appendChild(title);
            groups[g].forEach(function (k) {
                var row = document.createElement('div');
                row.className = 'nx-exp-prop-row';
                var n = document.createElement('div');
                n.className = 'nx-exp-prop-name';
                n.textContent = k;
                var v = document.createElement('div');
                v.className = 'nx-exp-prop-val';
                v.textContent = formatValue(props[k]);
                row.appendChild(n);
                row.appendChild(v);
                group.appendChild(row);
            });
            pane.appendChild(group);
        });
    }

    function openExplorer(assetId) {
        ensureStyle();
        applyThemeAttr();
        var existing = document.getElementById(OVERLAY_ID);
        if (existing) existing.remove();

        var dark = isDarkTheme();

        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.className = dark ? 'nx-dark' : 'nx-light';

        var head = document.createElement('div');
        head.className = 'nx-exp-head';
        var titleWrap = document.createElement('div');
        var title = document.createElement('h2');
        title.className = 'nx-exp-title';
        title.textContent = 'Explorer';
        var sub = document.createElement('div');
        sub.className = 'nx-exp-sub';
        sub.textContent = 'Asset #' + assetId + ' — loading…';
        titleWrap.appendChild(title);
        titleWrap.appendChild(sub);
        head.appendChild(titleWrap);

        var close = document.createElement('button');
        close.className = 'nx-exp-close';
        close.textContent = '\u00d7';
        close.addEventListener('click', function () { overlay.remove(); });
        head.appendChild(close);

        var body = document.createElement('div');
        body.id = 'nx-exp-body';

        var tree = document.createElement('div');
        tree.id = 'nx-exp-tree';

        var props = document.createElement('div');
        props.id = 'nx-exp-props';

        var emptyProps = document.createElement('div');
        emptyProps.className = 'nx-exp-props-empty';
        emptyProps.textContent = 'Select an instance.';
        props.appendChild(emptyProps);

        var footer = document.createElement('div');
        footer.className = 'nx-exp-footer';
        footer.textContent = 'Icons can make mistakes. Verify important information.';

        body.appendChild(tree);
        body.appendChild(props);
        panel.appendChild(head);
        panel.appendChild(body);
        panel.appendChild(footer);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.remove();
        });

        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape' && document.getElementById(OVERLAY_ID)) {
                overlay.remove();
                document.removeEventListener('keydown', esc);
            }
        });

        loadAssetTree(assetId).then(function (res) {
            if (!res || !res.isValid || !res.root || !res.root.length) {
                sub.textContent = 'Asset #' + assetId + ' — failed to load';
                tree.replaceChildren();
                var err = document.createElement('div');
                err.className = 'nx-exp-props-empty';
                err.textContent = 'Could not fetch or parse this asset.';
                tree.appendChild(err);
                return;
            }
            sub.textContent = 'Asset #' + assetId + ' — ' + res.format + ' — ' + res.root.length + ' root instance(s)';
            tree.replaceChildren();
            res.root.forEach(function (inst) {
                tree.appendChild(buildTreeNode(inst, 0));
            });
            renderProps(res.root[0]);
        });
    }

    var observer = null;
    var lastHref = location.href;

    function teardownButton() {
        var b = document.getElementById(BTN_ID);
        if (b) b.remove();
    }

    function closeOverlay() {
        var o = document.getElementById(OVERLAY_ID);
        if (o) o.remove();
    }

    window.NX.features.explorer = {
        apply: function () {
            ensureStyle();
            applyThemeAttr();
            loadSprite().then(function () {
                injectButton();
            });
            if (observer) return;
            observer = new MutationObserver(function () {
                if (location.href !== lastHref) {
                    lastHref = location.href;
                    teardownButton();
                }
                applyThemeAttr();
                injectButton();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        },
        teardown: function () {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            teardownButton();
            closeOverlay();
            document.body.removeAttribute('data-nx-theme');
        }
    };

})();
