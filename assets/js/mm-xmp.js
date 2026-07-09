/* ── Made Mark XMP embedding library ─────────────────────────────────
   Shared by the /label/ format tools. Builds an mm: namespace XMP
   packet and writes it into the file:
     JPEG -> APP1 segment after the leading APP0/APP1 run
     PNG  -> iTXt "XML:com.adobe.xmp" chunk after IHDR
     GIF  -> "XMP DataXMP" Application Extension after the screen
             descriptor, in the Adobe raw-packet + magic-trailer form
     SVG  -> <metadata id="made-mark-xmp"> element after the root <svg>
   The raster/GIF paths splice bytes; SVG is text, so its path takes and
   returns a string. Existing Made Mark XMP is replaced, never duplicated.
   Exposes window.MMXMP. No dependencies.                             */

(function () {
  'use strict';

  /* ── XMP packet ── */
  function xmlEscape(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function buildXmp(markSlug, model, provider, license) {
    var fields = '   <mm:mark>https://mademark.org/marks/' + markSlug + '</mm:mark>\n';
    if (model) fields += '   <mm:model>' + xmlEscape(model) + '</mm:model>\n';
    if (provider) fields += '   <mm:provider>' + xmlEscape(provider) + '</mm:provider>\n';
    if (license) fields += '   <mm:sourceLicense>' + xmlEscape(license) + '</mm:sourceLicense>\n';
    return '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n' +
      '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Made Mark labeler">\n' +
      ' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
      '  <rdf:Description rdf:about="" xmlns:mm="https://mademark.org/ns/">\n' +
      fields +
      '  </rdf:Description>\n' +
      ' </rdf:RDF>\n' +
      '</x:xmpmeta>\n' +
      '<?xpacket end="w"?>';
  }

  /* ── JPEG: APP1 XMP segment ── */
  var XMP_HEADER = 'http://ns.adobe.com/xap/1.0/ ';
  function embedXmpJpeg(bytes, xmp) {
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) throw new Error('Not a valid JPEG file.');
    var payload = new TextEncoder().encode(XMP_HEADER + xmp);
    if (payload.length + 2 > 0xFFFF) throw new Error('Label too large for a JPEG segment.');
    var seg = new Uint8Array(4 + payload.length);
    seg[0] = 0xFF; seg[1] = 0xE1;
    seg[2] = (payload.length + 2) >> 8; seg[3] = (payload.length + 2) & 0xFF;
    seg.set(payload, 4);

    // Walk the leading marker segments up to SOS; note existing XMP APP1s.
    var pos = 2, insertAt = 2, drop = [];
    while (pos + 4 <= bytes.length && bytes[pos] === 0xFF) {
      var marker = bytes[pos + 1];
      if (marker === 0xDA || marker === 0xD9) break;           // SOS / EOI
      var len = (bytes[pos + 2] << 8) | bytes[pos + 3];
      var end = pos + 2 + len;
      if (marker === 0xE1) {
        var head = '';
        for (var i = pos + 4; i < Math.min(pos + 4 + 28, end); i++) head += String.fromCharCode(bytes[i]);
        if (head.indexOf('http://ns.adobe.com/xap') === 0) drop.push([pos, end]);
      }
      if (marker === 0xE0 || marker === 0xE1) insertAt = end;  // after APP0/APP1 run
      pos = end;
    }

    var parts = [], cursor = 0;
    drop.forEach(function (d) {                    // copy around dropped XMP segments
      if (d[0] > cursor) parts.push(bytes.subarray(cursor, d[0]));
      cursor = d[1];
    });
    parts.push(bytes.subarray(cursor));
    var cleaned = concat(parts);
    drop.forEach(function (d) { if (d[1] <= insertAt) insertAt -= (d[1] - d[0]); });
    return concat([cleaned.subarray(0, insertAt), seg, cleaned.subarray(insertAt)]);
  }

  /* ── PNG: iTXt chunk ── */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256), c;
    for (var n = 0; n < 256; n++) {
      c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  var PNG_SIG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  var XMP_KEYWORD = 'XML:com.adobe.xmp';
  function embedXmpPng(bytes, xmp) {
    for (var s = 0; s < 8; s++) if (bytes[s] !== PNG_SIG[s]) throw new Error('Not a valid PNG file.');
    var enc = new TextEncoder();
    // iTXt data: keyword NUL compFlag(0) compMethod(0) langTag NUL translated NUL text
    var kw = enc.encode(XMP_KEYWORD), text = enc.encode(xmp);
    var data = new Uint8Array(kw.length + 5 + text.length);
    data.set(kw, 0); data.set(text, kw.length + 5);          // the 5 bytes between stay 0
    var typeAndData = new Uint8Array(4 + data.length);
    typeAndData.set(enc.encode('iTXt'), 0); typeAndData.set(data, 4);
    var chunk = new Uint8Array(12 + data.length);
    writeU32(chunk, 0, data.length);
    chunk.set(typeAndData, 4);
    writeU32(chunk, 8 + data.length, crc32(typeAndData));

    // Walk chunks: find end of IHDR, drop existing XMP iTXt chunks.
    var pos = 8, insertAt = -1, drop = [];
    while (pos + 12 <= bytes.length) {
      var len = readU32(bytes, pos);
      var type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
      var end = pos + 12 + len;
      if (type === 'IHDR') insertAt = end;
      if (type === 'iTXt') {
        var k = '';
        for (var i = pos + 8; i < Math.min(pos + 8 + XMP_KEYWORD.length, end) && bytes[i] !== 0; i++) k += String.fromCharCode(bytes[i]);
        if (k === XMP_KEYWORD) drop.push([pos, end]);
      }
      if (type === 'IEND') break;
      pos = end;
    }
    if (insertAt < 0) throw new Error('Malformed PNG (no IHDR).');
    var parts = [], cursor = 0;
    drop.forEach(function (d) {
      if (d[0] > cursor) parts.push(bytes.subarray(cursor, d[0]));
      cursor = d[1];
    });
    parts.push(bytes.subarray(cursor));
    var cleaned = concat(parts);
    drop.forEach(function (d) { if (d[1] <= insertAt) insertAt -= (d[1] - d[0]); });
    return concat([cleaned.subarray(0, insertAt), chunk, cleaned.subarray(insertAt)]);
  }

  /* ── GIF: "XMP DataXMP" Application Extension ──
     The label rides in an Application Extension whose 11-byte identifier
     is "XMP DataXMP" (app id "XMP Data" + auth code "XMP"). The XMP packet
     is stored as ordinary GIF data sub-blocks (each ≤255 bytes, length-
     prefixed, 0x00-terminated) — provably valid for any packet content, so
     the GIF still decodes everywhere, and exiftool/Adobe reassemble the
     packet by concatenating the sub-blocks. (We deliberately avoid the raw-
     packet + "magic trailer" variant: its block-skip walk can terminate one
     byte early depending on packet bytes, which trips strict decoders.)
     Any existing Made Mark block is dropped first so re-labeling never
     duplicates.                                                        */
  var GIF_XMP_ID = 'XMP DataXMP';                          // app id(8) + auth code(3)
  var GIF_XMP_SIG = [0x21, 0xFF, 0x0B, 0x58, 0x4D, 0x50, 0x20, 0x44, 0x61, 0x74, 0x61, 0x58, 0x4D, 0x50];
  function gifSubBlocks(packet) {
    var parts = [], o = 0;
    while (o < packet.length) {
      var n = Math.min(255, packet.length - o);
      parts.push(new Uint8Array([n]));
      parts.push(packet.subarray(o, o + n));
      o += n;
    }
    parts.push(new Uint8Array([0]));                       // block terminator
    return concat(parts);
  }
  function findGifXmpExt(bytes) {                           // [start, end) of the app ext, or null
    outer:
    for (var i = 0; i + GIF_XMP_SIG.length <= bytes.length; i++) {
      for (var j = 0; j < GIF_XMP_SIG.length; j++) if (bytes[i + j] !== GIF_XMP_SIG[j]) continue outer;
      var p = i + GIF_XMP_SIG.length;                      // walk the data sub-blocks to the terminator
      while (p < bytes.length && bytes[p] !== 0) p += 1 + bytes[p];
      return [i, Math.min(p + 1, bytes.length)];
    }
    return null;
  }
  function embedXmpGif(bytes, xmp) {
    if (!(bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)) throw new Error('Not a valid GIF file.');
    // Block stream starts after the 6-byte header, 7-byte Logical Screen
    // Descriptor, and the Global Color Table if the packed field flags one.
    var packed = bytes[10];
    var gct = (packed & 0x80) ? 3 * (1 << ((packed & 0x07) + 1)) : 0;
    var insertAt = 13 + gct;

    var existing = findGifXmpExt(bytes);
    if (existing) {
      bytes = concat([bytes.subarray(0, existing[0]), bytes.subarray(existing[1])]);
      if (existing[1] <= insertAt) insertAt -= (existing[1] - existing[0]);
    }

    var enc = new TextEncoder();
    var id = enc.encode(GIF_XMP_ID), data = gifSubBlocks(enc.encode(xmp));
    var ext = new Uint8Array(3 + id.length + data.length);
    ext[0] = 0x21; ext[1] = 0xFF; ext[2] = 0x0B;
    ext.set(id, 3);
    ext.set(data, 3 + id.length);
    return concat([bytes.subarray(0, insertAt), ext, bytes.subarray(insertAt)]);
  }

  /* ── SVG: <metadata> element carrying the XMP packet ──
     SVG is XML, so the label rides inside the document's own
     <metadata> element as the serialized XMP packet — the standard
     place XMP-aware tools (exiftool, Illustrator) look. We tag the
     element with id="made-mark-xmp" so re-labeling replaces our block
     without touching any pre-existing <metadata>.                    */
  var SVG_META_ID = 'made-mark-xmp';
  var SVG_BADGE_ID = 'made-mark-badge';
  function embedXmpSvg(svgText, xmp) {
    var open = matchSvgOpenTag(svgText);
    // Drop any Made Mark metadata block from a previous pass.
    svgText = svgText.replace(
      new RegExp('[ \\t]*<metadata id="' + SVG_META_ID + '">[\\s\\S]*?</metadata>\\n?', 'g'), '');
    open = matchSvgOpenTag(svgText);                      // offsets shifted by the strip
    var block = '<metadata id="' + SVG_META_ID + '">' + xmp + '</metadata>';
    var at = open.index + open[0].length;
    return svgText.slice(0, at) + '\n' + block + svgText.slice(at);
  }

  /* Draw the mark icon into a corner by nesting the icon's own <svg>,
     positioned in the root's coordinate system (viewBox if present,
     else the pixel width/height). Returns the modified SVG string. */
  function svgWithBadge(svgText, iconSvgText, position) {
    var open = matchSvgOpenTag(svgText);
    var box = svgViewport(open[0]);                       // {minx,miny,w,h}
    var s = Math.min(box.w, box.h) * 0.12;
    var m = s * 0.5;
    var x = position === 'bottom-left' ? box.minx + m : box.minx + box.w - m - s;
    var y = box.miny + box.h - m - s;

    var iconOpen = matchSvgOpenTag(iconSvgText);
    var vb = iconOpen[0].match(/viewBox\s*=\s*["'][^"']*["']/i);
    var iconInner = iconSvgText.slice(
      iconOpen.index + iconOpen[0].length, iconSvgText.lastIndexOf('</svg>'));
    var nested = '<svg id="' + SVG_BADGE_ID + '" x="' + fmt(x) + '" y="' + fmt(y) +
      '" width="' + fmt(s) + '" height="' + fmt(s) + '" ' +
      (vb ? vb[0] : 'viewBox="0 0 512 512"') +
      ' xmlns="http://www.w3.org/2000/svg">' + iconInner + '</svg>';

    // Replace an earlier badge, then insert before the final </svg>.
    svgText = svgText.replace(
      new RegExp('<svg id="' + SVG_BADGE_ID + '"[\\s\\S]*?</svg>', 'i'), '');
    var close = svgText.lastIndexOf('</svg>');
    return svgText.slice(0, close) + nested + '\n' + svgText.slice(close);
  }

  function matchSvgOpenTag(text) {
    var m = text.match(/<svg\b[^>]*>/i);
    if (!m) throw new Error('Not a valid SVG file (no <svg> element).');
    return m;
  }
  function svgViewport(openTag) {
    var vb = openTag.match(/viewBox\s*=\s*["']\s*([\d.eE+-]+)[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)\s*["']/i);
    if (vb) return { minx: +vb[1], miny: +vb[2], w: +vb[3], h: +vb[4] };
    var wa = openTag.match(/\bwidth\s*=\s*["']?\s*([\d.]+)/i);
    var ha = openTag.match(/\bheight\s*=\s*["']?\s*([\d.]+)/i);
    if (!wa || !ha) throw new Error('This SVG has no viewBox and no pixel width/height, so a badge can’t be placed. Use metadata only.');
    return { minx: 0, miny: 0, w: +wa[1], h: +ha[1] };
  }
  function fmt(n) { return Math.round(n * 100) / 100; }

  /* Fetch a mark icon as raw SVG text (for nesting as a badge). */
  function fetchMarkIconText(markSlug) {
    return fetch('/assets/svg/mm-icon-' + markSlug + '.svg')
      .then(function (r) { if (!r.ok) throw new Error('Mark icon failed to load.'); return r.text(); });
  }

  /* ── byte helpers ── */
  function concat(arrays) {
    var total = 0;
    arrays.forEach(function (a) { total += a.length; });
    var out = new Uint8Array(total), off = 0;
    arrays.forEach(function (a) { out.set(a, off); off += a.length; });
    return out;
  }
  function readU32(b, p) { return ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) >>> 0; }
  function writeU32(b, p, v) { b[p] = (v >>> 24) & 0xFF; b[p + 1] = (v >>> 16) & 0xFF; b[p + 2] = (v >>> 8) & 0xFF; b[p + 3] = v & 0xFF; }

  /* ── SVG icon loader (guaranteed intrinsic dimensions for canvas) ──
     variant 'inverted': transparent background, white frame/glyph —
     for dark surfaces (the source icons carry their own white square). */
  function loadMarkIcon(markSlug, variant) {
    return fetch('/assets/svg/mm-icon-' + markSlug + '.svg')
      .then(function (r) { if (!r.ok) throw new Error('Mark icon failed to load.'); return r.text(); })
      .then(function (svgText) {
        if (variant === 'inverted') {
          svgText = svgText
            .replace(/fill="white"/g, 'fill="none"')
            .replace(/fill="#231F20"/gi, 'fill="#FFFFFF"');
        }
        if (!/<svg[^>]*\swidth=/.test(svgText)) {
          svgText = svgText.replace(/<svg/, '<svg width="512" height="512"');
        }
        return new Promise(function (resolve, reject) {
          var img = new Image();
          var url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
          img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
          img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Mark icon failed to render.')); };
          img.src = url;
        });
      });
  }

  window.MMXMP = {
    buildXmp: buildXmp,
    embedXmpJpeg: embedXmpJpeg,
    embedXmpPng: embedXmpPng,
    embedXmpGif: embedXmpGif,
    embedXmpSvg: embedXmpSvg,
    svgWithBadge: svgWithBadge,
    loadMarkIcon: loadMarkIcon,
    fetchMarkIconText: fetchMarkIconText,
    MARK_LABELS: {
      'human-made': 'Human Made',
      'human-designed-ai-made': 'Human Designed, AI Made',
      'ai-made': 'AI Made'
    }
  };
})();
