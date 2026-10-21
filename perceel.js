// perceel.js versie 8 (bron: repo perceelkaart). Kopie elders? Houd dit nummer gelijk.
// Perceel: zoek het BRP-gewasperceel (PDOK, RVO) op een GPS-positie en bereken de oppervlakte.
// Losse module zonder afhankelijkheden. In de browser: window.Perceel, in Node: require("./perceel.js").
//
//   Perceel.zoekOpMijnLocatie().then(r => r.perceel.ha)        // GPS + PDOK, valt terug op opgeslagen percelen
//   Perceel.zoekOpPunt(lon, lat)                                // zelfde, met een bekende positie
//   Perceel.oppervlakteHa(geometry), Perceel.bevatPunt(geometry, lon, lat)
//   Perceel.zijden(geometry), Perceel.rechteZijde(zijden, key)   // randstukjes en lengtes, voor bufferstroken
//   Perceel.zoekWater(geometry) + Perceel.waterLangsZijden(geometry, water)   // randen langs BGT-water
//   Perceel.sporen(geometry, breedte, { andereKant, buitenronde, clip })   // spuit-/strooisporen langs de langste zijde
//     clip = polygon-clipping (optioneel): maakt de buitenronde exact, ook bij smalle armen en inhammen
//   Perceel.verschuif(geometry, d)   // buitenrand d meter naar binnen (negatief: naar buiten), eenvoudig
//   Perceel.samenvoegen(geometries, clip, naad)   // percelen tot één vorm, naden tot 2×naad m dicht; null als los
//   opts.abPunt [lon, lat] bij sporen(): de AB-lijn langs de kant die het dichtst bij dat punt ligt
//   opts.sectie (m) bij sporen(): laatste gang in hele secties; de baan toont alleen wat aan staat
//
// Fouten zijn Error-objecten met .code: "geen-gps", "gps-geweigerd", "gps-timeout", "gps-onbekend",
// "offline" (geen verbinding en niks opgeslagen op deze plek), "server", "geen-perceel". De .message is Nederlands.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Perceel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const API = "https://api.pdok.nl/rvo/gewaspercelen/ogc/v1/collections/brpgewas/items";
  const R = 6378137; // WGS84-straal, zelfde als turf.area
  const DEF = {
    cacheKey: "perceelCache",
    cacheMax: 300,        // max aantal opgeslagen percelen
    marge: 0.002,         // bbox rond het punt in graden (± ca. 150-220 m), haalt ook buurpercelen op voor offline
    limit: 200,
    timeout: 12000,       // ms voor de PDOK-aanvraag
    gpsTimeout: 20000,
    storage: null,        // standaard localStorage
    fetch: null           // standaard globale fetch
  };
  const opts = o => Object.assign({}, DEF, o || {});
  const fout = (code, msg) => { const e = new Error(msg); e.code = code; return e; };

  /* ---------- Geometrie ---------- */
  // Polygon -> [ringen], MultiPolygon -> [[ringen], ...]
  const polygonen = g => !g ? [] : g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];

  // Sferische ringoppervlakte in m² (Chamberlain & Duquette, zoals turf.area)
  function ringM2(ring) {
    const n = ring.length;
    if (n < 3) return 0;
    const rad = d => d * Math.PI / 180;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const p1 = ring[i], p2 = ring[(i + 1) % n], p3 = ring[(i + 2) % n];
      s += (rad(p3[0]) - rad(p1[0])) * Math.sin(rad(p2[1]));
    }
    return Math.abs(s * R * R / 2);
  }
  function oppervlakteM2(geometry) {
    return polygonen(geometry).reduce((t, rings) =>
      t + rings.reduce((a, ring, i) => i === 0 ? a + ringM2(ring) : a - ringM2(ring), 0), 0);
  }
  const oppervlakteHa = geometry => Math.round(oppervlakteM2(geometry) / 100) / 100;

  // Ray casting; buitenring wel, gaten niet
  function inRing(ring, x, y) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const bevatPunt = (geometry, lon, lat) =>
    polygonen(geometry).some(rings => rings.length && inRing(rings[0], lon, lat) && !rings.slice(1).some(h => inRing(h, lon, lat)));

  /* ---------- Zijden (voor bufferstroken langs water) ---------- */
  // Afstand in m over de bol (haversine, zelfde straal als de oppervlakte)
  function afstandM(a, b) {
    const rad = d => d * Math.PI / 180;
    const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  // Alle randstukjes van een perceel; key "p0r0s12" = polygoon 0, ring 0 (buitenrand), stukje 12
  function zijden(geometry) {
    const uit = [];
    polygonen(geometry).forEach((rings, pi) => rings.forEach((ring, ri) => {
      const n = ring.length - (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? 1 : 0);
      for (let si = 0; si < n; si++) {
        const a = ring[si], b = ring[(si + 1) % n];
        uit.push({ key: "p" + pi + "r" + ri + "s" + si, pi, ri, si, n, a, b, m: afstandM(a, b) });
      }
    }));
    return uit;
  }
  // Richting van een stukje in graden (vlak benaderd, prima voor perceelmaat)
  const richting = z => Math.atan2(z.b[1] - z.a[1], (z.b[0] - z.a[0]) * Math.cos(z.a[1] * Math.PI / 180)) * 180 / Math.PI;
  const hoekVerschil = (x, y) => { const d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; };
  // Het rechte stuk rand rond één stukje: buren die minder dan maxHoek graden afwijken van dat stukje
  function rechteZijde(alle, key, maxHoek) {
    maxHoek = maxHoek == null ? 30 : maxHoek;
    const z0 = alle.find(z => z.key === key); if (!z0) return [];
    const ring = alle.filter(z => z.pi === z0.pi && z.ri === z0.ri), r0 = richting(z0), uit = [z0.key];
    for (const stap of [1, -1]) {
      for (let i = 1; i < ring.length; i++) {
        const z = ring[((z0.si + stap * i) % ring.length + ring.length) % ring.length];
        if (uit.includes(z.key)) break;
        if (z.m > 0.01 && hoekVerschil(richting(z), r0) > maxHoek) break;
        uit.push(z.key);
      }
    }
    return uit;
  }

  /* ---------- Water langs het perceel (BGT waterdeel) ---------- */
  const BGT_WATER = "https://api.pdok.nl/lv/bgt/ogc/v1/collections/waterdeel/items";
  // Greppel of droge sloot? BGT-veldnamen staan niet vast, dus alle tekstwaarden doorzoeken
  const isDroog = f => Object.values(f.properties || {}).some(v => typeof v === "string" && /greppel|droge sloot/i.test(v));

  // Haal de BGT-waterdelen op rond een perceel (bbox + marge in graden, ~25 m)
  async function zoekWater(geometry, o) {
    o = opts(o);
    const f = o.fetch || (typeof fetch !== "undefined" ? fetch : null);
    if (!f) throw fout("offline", "Geen internet beschikbaar in deze omgeving.");
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    polygonen(geometry).forEach(rings => rings[0].forEach(c => { x1 = Math.min(x1, c[0]); y1 = Math.min(y1, c[1]); x2 = Math.max(x2, c[0]); y2 = Math.max(y2, c[1]); }));
    const m = 0.0004;
    const url = BGT_WATER + "?f=json&limit=1000&bbox=" + [x1 - m, y1 - m, x2 + m, y2 + m].map(v => v.toFixed(6)).join(",");
    const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = ac ? setTimeout(() => ac.abort(), o.timeout * 2) : null;
    let res;
    try { res = await f(url, { signal: ac ? ac.signal : undefined, headers: { Accept: "application/geo+json, application/json" } }); }
    catch (e) { throw fout("offline", "Geen verbinding met PDOK (BGT)."); }
    finally { if (t) clearTimeout(t); }
    if (!res.ok) throw fout("server", "PDOK (BGT) gaf een fout (" + res.status + ").");
    let data;
    try { data = await res.json(); } catch (e) { throw fout("server", "Onverwacht antwoord van PDOK (BGT)."); }
    return Array.isArray(data && data.features) ? data.features.filter(x => x && x.geometry && polygonen(x.geometry).length) : [];
  }

  // Welke randstukjes lopen langs water? Geeft { key: { droog: bool } } voor elk stukje waarvan
  // het grootste deel binnen `tol` meter van een waterdeel ligt.
  function waterLangsZijden(geometry, water, tol) {
    tol = tol == null ? 6 : tol;
    const alle = zijden(geometry), uit = {};
    if (!alle.length || !water.length) return uit;
    // Lokaal vlak in meters rond het perceel
    const lat0 = alle[0].a[1], kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
    const xy = c => [c[0] * kx, c[1] * ky];
    const wd = water.map(w => ({ droog: isDroog(w), polys: polygonen(w.geometry).map(rings => rings.map(r => r.map(xy))) }));
    const binnen = (rings, p) => inRing(rings[0], p[0], p[1]) && !rings.slice(1).some(h => inRing(h, p[0], p[1]));
    const totLijn = (p, a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
      return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    };
    // Dichtstbijzijnde water bij een punt: { d, droog }
    const naast = p => {
      let best = { d: Infinity, droog: false };
      wd.forEach(w => w.polys.forEach(rings => {
        if (binnen(rings, p)) { if (best.d > 0 || (!w.droog && best.droog)) best = { d: 0, droog: w.droog }; return; }
        rings.forEach(r => { for (let i = 0; i < r.length - 1; i++) { const d = totLijn(p, r[i], r[i + 1]); if (d < best.d) best = { d, droog: w.droog }; } });
      }));
      return best;
    };
    alle.forEach(z => {
      if (z.m < 0.5) return;
      const a = xy(z.a), b = xy(z.b), n = Math.max(2, Math.ceil(z.m / 5));
      let nat = 0, droog = 0;
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n, r = naast([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
        if (r.d <= tol) { if (r.droog) droog++; else nat++; }
      }
      if ((nat + droog) / n >= 0.6) uit[z.key] = { droog: droog > nat };
    });
    return uit;
  }

  /* ---------- Rand naar binnen verschuiven (buitenronde) ---------- */
  // ring in meters (gesloten). Geeft de rand d meter naar binnen terug, ook gesloten.
  function binnenrand(ring, d) {
    // Dubbele en bijna rechte punten eruit: BRP-randen hebben veel kleine stukjes
    let pts = ring.slice(0, -1).filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 0.3);
    for (let ronde = 0; ronde < 3; ronde++) pts = pts.filter((p, i, a) => {
      const v = a[(i - 1 + a.length) % a.length], w = a[(i + 1) % a.length];
      const h1 = Math.atan2(p[1] - v[1], p[0] - v[0]), h2 = Math.atan2(w[1] - p[1], w[0] - p[0]);
      let dh = Math.abs(h1 - h2) % (2 * Math.PI); if (dh > Math.PI) dh = 2 * Math.PI - dh;
      return a.length <= 3 || dh > 4 * Math.PI / 180;
    });
    const n = pts.length; if (n < 3) return null;
    let opp = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; opp += a[0] * b[1] - b[0] * a[1]; }
    const sgn = opp > 0 ? 1 : -1; // tegen de klok in: binnen ligt links
    const lijnen = pts.map((a, i) => {
      const b = pts[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l;
      const nx = -uy * sgn, ny = ux * sgn;
      return { p: [a[0] + nx * d, a[1] + ny * d], u: [ux, uy], nrm: [nx, ny] };
    });
    const uit = pts.map((p, i) => {
      const L1 = lijnen[(i - 1 + n) % n], L2 = lijnen[i];
      const kruis = L1.u[0] * L2.u[1] - L1.u[1] * L2.u[0];
      if (Math.abs(kruis) < 1e-3) return L2.p;
      const t = ((L2.p[0] - L1.p[0]) * L2.u[1] - (L2.p[1] - L1.p[1]) * L2.u[0]) / kruis;
      const q = [L1.p[0] + L1.u[0] * t, L1.p[1] + L1.u[1] * t];
      // Scherpe punt: niet verder dan 3× d van de hoek
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 3 * Math.abs(d)) { const mx = L1.nrm[0] + L2.nrm[0], my = L1.nrm[1] + L2.nrm[1], ml = Math.hypot(mx, my) || 1; return [p[0] + mx / ml * d, p[1] + my / ml * d]; }
      return q;
    });
    uit.push(uit[0]);
    return uit;
  }
  // Douglas-Peucker voor een gesloten ring in meters: minder punten, zelfde vorm (binnen tol)
  function vereenvoudig(r, tol) {
    if (r.length < 5) return r;
    const houd = r.map(() => false); houd[0] = houd[r.length - 1] = true;
    let ver = 1, vd = -1;
    r.forEach((p, i) => { const dd = Math.hypot(p[0] - r[0][0], p[1] - r[0][1]); if (dd > vd) { vd = dd; ver = i; } });
    houd[ver] = true;
    const stap = (i, j) => {
      const a = r[i], b = r[j], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      let md = 0, mi = -1;
      for (let k = i + 1; k < j; k++) {
        const p = r[k], t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
        const dd = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
        if (dd > md) { md = dd; mi = k; }
      }
      if (md > tol) { houd[mi] = true; stap(i, mi); stap(mi, j); }
    };
    stap(0, ver); stap(ver, r.length - 1);
    return r.filter((p, i) => houd[i]);
  }
  // Deel van het perceel dat verder dan d meter van elke rand ligt (MultiPolygon in meters).
  // Exact: perceel min een strook van d rond elke rand. Smalle armen vallen weg, inhammen kloppen.
  function binnenGebied(polyM, d, clip) {
    // De rekenbibliotheek struikelt soms over punten die (bijna) samenvallen: dan opnieuw met een iets grovere rand
    const pogingen = [0.3, 0.5, 1, 2];
    for (let i = 0; i < pogingen.length; i++) {
      try { return binnenGebiedEen(polyM, d, clip, pogingen[i], i); } catch (e) { if (i === pogingen.length - 1) throw e; }
    }
  }
  // Stroken (en hoekcirkels) van d meter rond elke rand. alleHoeken: ook bij uitstekende hoeken (voor dikker maken).
  function randVormen(polyM, d, tol, poging, alleHoeken) {
    const rand = [], sch = poging * 1e-3;
    // Hoekcirkels een fractie groter en gedraaid, zodat hun punten niet op de hoeken van de randstroken vallen
    const rc = d * (1 + 5e-4), hoek0 = 0.137 + poging * 0.29, e = 0.02;
    polyM.forEach(rings => rings.forEach((ring, ri) => {
      const r = vereenvoudig(ring, tol).map(p => [p[0] + sch, p[1] - sch * 0.7]);
      const n = r.length - 1;
      let opp = 0; for (let j = 0; j < n; j++) opp += r[j][0] * r[j + 1][1] - r[j + 1][0] * r[j][1];
      for (let j = 0; j < n; j++) {
        const a = r[j], b = r[j + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (l < 0.01) continue;
        const ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l, nx = -uy * d, ny = ux * d;
        // Strook langs de rand, aan beide uiteinden een paar cm langer zodat buren overlappen
        const a2 = [a[0] - ux * e, a[1] - uy * e], b2 = [b[0] + ux * e, b[1] + uy * e];
        rand.push([[[a2[0] + nx, a2[1] + ny], [b2[0] + nx, b2[1] + ny], [b2[0] - nx, b2[1] - ny], [a2[0] - nx, a2[1] - ny], [a2[0] + nx, a2[1] + ny]]]);
        // Cirkel bij een inspringende hoek (anders blijft daar binnen een gat); bij gaten en bij uitzetten overal
        const v = r[(j - 1 + n) % n], kruis = (a[0] - v[0]) * (b[1] - a[1]) - (a[1] - v[1]) * (b[0] - a[0]);
        if (alleHoeken || ri > 0 || kruis * opp < 0) {
          const schijf = [];
          for (let k = 0; k < 16; k++) { const t = hoek0 + k / 16 * 2 * Math.PI; schijf.push([a[0] + rc * Math.cos(t), a[1] + rc * Math.sin(t)]); }
          schijf.push(schijf[0]);
          rand.push([schijf]);
        }
      }
    }));
    return rand;
  }
  function binnenGebiedEen(polyM, d, clip, tol, poging) {
    return clip.difference(polyM, clip.union(...randVormen(polyM, d, tol, poging, false)));
  }
  const oppM = poly => poly.reduce((t, r, i) => { let a = 0; for (let k = 0; k < r.length - 1; k++) a += r[k][0] * r[k + 1][1] - r[k + 1][0] * r[k][1]; return t + (i ? -1 : 1) * Math.abs(a / 2); }, 0);
  // Percelen samenvoegen tot één vorm: alles `naad` m dikker, samenvoegen, weer `naad` m dunner (naden tot 2×naad dicht).
  // Geeft een Polygon, of null als ze niet tegen elkaar liggen.
  function samenvoegen(geoms, clip, naad) {
    naad = naad || 1;
    const alle = geoms.flatMap(polygonen);
    if (!alle.length || !clip) return null;
    const lat0 = alle[0][0][0][1], lon0 = alle[0][0][0][0], f = lat0 * Math.PI / 180;
    const ky = 111132.92 - 559.82 * Math.cos(2 * f) + 1.175 * Math.cos(4 * f), kx = 111412.84 * Math.cos(f) - 93.5 * Math.cos(3 * f);
    const polyM = alle.map(rings => [rings[0].map(c => [(c[0] - lon0) * kx, (c[1] - lat0) * ky])]);
    for (let poging = 0; poging < 4; poging++) {
      try {
        const dik = clip.union(...polyM, ...randVormen(polyM, naad, [0.1, 0.3, 0.5, 1][poging], poging, true));
        if (dik.length !== 1) return null;
        const dun = binnenGebied([[dik[0][0]]], naad, clip);
        if (!dun.length) return null;
        const grootste = dun.reduce((a, b) => oppM(b) > oppM(a) ? b : a);
        return { type: "Polygon", coordinates: [grootste[0].map(p => [lon0 + p[0] / kx, lat0 + p[1] / ky])] };
      } catch (e) { /* volgende poging */ }
    }
    return null;
  }
  const ringLengte = r => r.reduce((t, p, i) => i ? t + Math.hypot(p[0] - r[i - 1][0], p[1] - r[i - 1][1]) : 0, 0);

  // Buitenrand van (het grootste deel van) een perceel d meter naar binnen; negatief = naar buiten
  function verschuif(geometry, d) {
    const polys = polygonen(geometry);
    if (!polys.length) return null;
    const groot = polys.reduce((a, b) => oppervlakteM2({ type: "Polygon", coordinates: [b[0]] }) > oppervlakteM2({ type: "Polygon", coordinates: [a[0]] }) ? b : a);
    const lat0 = groot[0][0][1], lon0 = groot[0][0][0], f = lat0 * Math.PI / 180;
    const ky = 111132.92 - 559.82 * Math.cos(2 * f), kx = 111412.84 * Math.cos(f) - 93.5 * Math.cos(3 * f);
    const r = binnenrand(groot[0].map(c => [(c[0] - lon0) * kx, (c[1] - lat0) * ky]), d);
    return r ? { type: "Polygon", coordinates: [r.map(p => [lon0 + p[0] / kx, lat0 + p[1] / ky])] } : null;
  }

  /* ---------- Spuit- of strooisporen langs de lange kant ---------- */
  // Sporen evenwijdig aan de langste rechte zijde (AB-lijn), om de `breedte` meter.
  // Spoor 1 ligt op een halve breedte van die zijde. opts.andereKant: beginnen aan de overkant.
  function sporen(geometry, breedte, opts) {
    opts = opts || {};
    const polys = polygonen(geometry);
    if (!polys.length || !(breedte > 0)) return null;
    // Lokaal vlak in meters (graadlengtes op deze breedte)
    const lat0 = polys[0][0][0][1], lon0 = polys[0][0][0][0], f = lat0 * Math.PI / 180;
    const ky = 111132.92 - 559.82 * Math.cos(2 * f) + 1.175 * Math.cos(4 * f), kx = 111412.84 * Math.cos(f) - 93.5 * Math.cos(3 * f);
    const naarM = c => [(c[0] - lon0) * kx, (c[1] - lat0) * ky];
    const naarLL = p => [lon0 + p[0] / kx, lat0 + p[1] / ky];
    // AB-kant: een echte rechte zijde, van hoek tot hoek (rand vereenvoudigd tot op 1 m).
    // opts.abPunt [lon, lat]: de kant die het dichtst bij dat punt ligt; anders de langste.
    const buitenM = vereenvoudig(polys[0][0].map(naarM), 1);
    const zs = [];
    for (let j = 0; j < buitenM.length - 1; j++) {
      const a = buitenM[j], b = buitenM[j + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l > 0.01) zs.push({ a, b, l, h: Math.atan2(b[1] - a[1], b[0] - a[0]) });
    }
    if (!zs.length) return null;
    const N = zs.length;
    let ki = 0;
    if (opts.abPunt) {
      const p = naarM(opts.abPunt); let bd = Infinity;
      zs.forEach((z, j) => {
        const dx = z.b[0] - z.a[0], dy = z.b[1] - z.a[1], t = Math.max(0, Math.min(1, ((p[0] - z.a[0]) * dx + (p[1] - z.a[1]) * dy) / (z.l * z.l)));
        const d = Math.hypot(p[0] - z.a[0] - t * dx, p[1] - z.a[1] - t * dy);
        if (d < bd) { bd = d; ki = j; }
      });
    } else zs.forEach((z, j) => { if (z.l > zs[ki].l) ki = j; });
    // Beste rechte lijn door alle echte randpunten op dit stuk (binnen 0,75 m): ruis middelt uit, een knik ernaast telt niet mee
    const z = zs[ki], u0 = [(z.b[0] - z.a[0]) / z.l, (z.b[1] - z.a[1]) / z.l];
    const op = polys[0][0].map(naarM).filter(p => {
      const dx = p[0] - z.a[0], dy = p[1] - z.a[1], t = dx * u0[0] + dy * u0[1];
      return Math.abs(dx * u0[1] - dy * u0[0]) <= 0.75 && t >= -0.5 && t <= z.l + 0.5;
    });
    let ux = u0[0], uy = u0[1], cx = (z.a[0] + z.b[0]) / 2, cy0 = (z.a[1] + z.b[1]) / 2;
    if (op.length >= 3) {
      cx = op.reduce((t, p) => t + p[0], 0) / op.length; cy0 = op.reduce((t, p) => t + p[1], 0) / op.length;
      let sxx = 0, sxy = 0, syy = 0;
      op.forEach(p => { const dx = p[0] - cx, dy = p[1] - cy0; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; });
      const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      ux = Math.cos(th); uy = Math.sin(th);
      if (ux * u0[0] + uy * u0[1] < 0) { ux = -ux; uy = -uy; }
    }
    // A en B: de uiteinden van dit stuk, op de gevonden lijn
    const proj = p => (p[0] - cx) * ux + (p[1] - cy0) * uy;
    const t0 = Math.min(proj(z.a), proj(z.b)), t1 = Math.max(proj(z.a), proj(z.b));
    const pA = [cx + ux * t0, cy0 + uy * t0];
    const len = t1 - t0;
    const ab = { m: len };
    // Gedraaid stelsel: x langs de AB-kant, y loodrecht erop; de AB-kant ligt op y = 0
    const anker = pA;
    const rot = p => [(p[0] - anker[0]) * ux + (p[1] - anker[1]) * uy, -(p[0] - anker[0]) * uy + (p[1] - anker[1]) * ux];
    const terug = (x, y) => naarLL([anker[0] + x * ux - y * uy, anker[1] + x * uy + y * ux]);
    const polyM = polys.map(rings => rings.map(r => r.map(c => rot(naarM(c)))));
    const ringen = polyM.flatMap(rings => rings);
    let ymin = Infinity, ymax = -Infinity, xmin = Infinity, xmax = -Infinity;
    ringen[0].forEach(p => { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]); });
    // Aan welke kant van de AB-kant ligt het perceel? (zwaartepunt)
    let cy = 0, ca = 0;
    for (let k = 0; k < ringen[0].length - 1; k++) { const p = ringen[0][k], q = ringen[0][k + 1], c = p[0] * q[1] - q[0] * p[1]; ca += c; cy += (p[1] + q[1]) * c; }
    // Gangen tellen vanaf de AB-kant zelf, zodat ze op beide uiteinden even ver van de kant liggen
    let richtingY = cy / ca >= 0 ? 1 : -1;
    const W = richtingY === 1 ? ymax : -ymin;
    let startY = 0;
    if (opts.andereKant) { startY = richtingY === 1 ? ymax : ymin; richtingY = -richtingY; }
    // Buitenronde: eerst een baan langs de hele rand; de gangen doen alleen het midden,
    // en de spuit gaat uit bij het bandenspoor van de buitenronde (halve breedte van de rand)
    const ronde = opts.buitenronde ? (() => {
      if (opts.clip) {
        try {
          // Bandenspoor: rand van het gebied op een halve breedte van de kant; baan: alles binnen één breedte van de kant
          const spoorG = binnenGebied(polyM, breedte / 2, opts.clip), binnenG = binnenGebied(polyM, breedte, opts.clip);
          const banden = binnenG.length ? opts.clip.difference(polyM, binnenG) : polyM;
          const sporen = spoorG.flatMap(p => p);
          return { sporen, banden, knip: sporen, exact: true };
        } catch (e) { /* lukt het niet, dan de eenvoudige manier hieronder (exact: false) */ }
      }
      const spoor = binnenrand(ringen[0], breedte / 2);
      if (!spoor) return null;
      const binnen = W > 2 * breedte + 0.5 ? binnenrand(ringen[0], breedte) : null;
      return { sporen: [spoor], banden: [[ringen[0]].concat(binnen ? [binnen] : [])], knip: [spoor], exact: false };
    })() : null;
    const marge = ronde ? breedte : 0;      // strook langs de lange kanten die de buitenronde al doet
    const midden = W - 2 * marge;           // breedte die de gangen nog moeten doen
    // Rest onder 0,5 m telt niet: de perceelgrens zelf is ongeveer een meter nauwkeurig
    const n = ronde ? (midden > 0.5 && ronde.knip.length ? Math.ceil((midden - 0.5) / breedte) : 0) : Math.max(1, Math.ceil((W - 0.5) / breedte));
    const rest = n ? midden - (n - 1) * breedte : 0; // wat de laatste gang nog moet doen
    const knipRingen = ronde ? ronde.knip : ringen;
    // Stukken van de lijn y binnen het perceel (snijpunten met alle randen, paarsgewijs)
    const snij = y => {
      const xs = [];
      // Half-open regel: een hoekpunt precies op de lijn telt maar aan één kant, anders klapt binnen/buiten om
      knipRingen.forEach(r => { for (let j = 0; j < r.length - 1; j++) { const p = r[j], q = r[j + 1]; if ((p[1] > y) !== (q[1] > y)) xs.push(p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1])); } });
      xs.sort((a, b) => a - b);
      const d = [];
      for (let j = 0; j + 1 < xs.length; j += 2) if (xs[j + 1] - xs[j] > 0.5) d.push({ van: xs[j], tot: xs[j + 1] });
      return d;
    };
    const half = breedte / 2, uit = [];
    // Secties: de laatste gang hoeft maar een deel te doen; zet zoveel hele secties aan als nodig
    const sectie = opts.sectie > 0 && opts.sectie <= breedte ? opts.sectie : 0;
    const sectiesTotaal = sectie ? Math.round(breedte / sectie) : 0;
    const sectiesAan = sectie && n && rest < breedte - 0.05 ? Math.min(sectiesTotaal, Math.max(1, Math.ceil((rest - 0.05) / sectie))) : sectiesTotaal;
    for (let i = 0; i < n; i++) {
      const y = startY + richtingY * (marge + (i + 0.5) * breedte);
      let delen = snij(y);
      // Zonder buitenronde kan het spoor van de laatste gang net buiten het perceel vallen (smalle rest):
      // dan de lengte meten langs de rand. Een gang zonder rijdbaar stuk (smalle plek, buitenronde doet het) vervalt.
      if (!delen.length && !ronde && i === n - 1) delen = snij(startY + richtingY * (W - Math.min(0.5, W / 2)));
      if (!delen.length) continue;
      const nr = uit.length + 1;
      uit.push({
        nr,
        heen: nr % 2 === 1, // heen en weer: oneven gangen van A naar B
        lengte: delen.reduce((t, d) => t + d.tot - d.van, 0),
        lijnen: delen.map(d => [terug(d.van, y), terug(d.tot, y)]),
        // Baan die de spuitboom raakt, afgeknipt op het perceel (de spuit gaat niet buiten de kant)
        banen: delen.flatMap(d => {
          // Laatste gang met secties: alleen het deel dat aan staat, gerekend vanaf de kant van de vorige gang
          let y1 = y - half, y2 = y + half;
          if (sectie && i === n - 1 && sectiesAan < sectiesTotaal) {
            const nabij = y - richtingY * half, ver = nabij + richtingY * sectiesAan * sectie;
            y1 = Math.min(nabij, ver); y2 = Math.max(nabij, ver);
          }
          const rh = [[d.van, y1], [d.tot, y1], [d.tot, y2], [d.van, y2], [d.van, y1]];
          let delenM = [[rh]];
          if (opts.clip) { try { delenM = opts.clip.intersection([[rh]], polyM); } catch (e) { /* dan de hele rechthoek */ } }
          return delenM.map(poly => poly.map(r => r.map(p => terug(p[0], p[1]))));
        })
      });
    }
    const rondeUit = ronde ? {
      lengte: ronde.sporen.reduce((t, r) => t + ringLengte(r), 0),
      sporen: ronde.sporen.map(r => r.map(p => terug(p[0], p[1]))),
      // Baan van de buitenronde, per deel: buitenrand met gaten
      banden: ronde.banden.map(poly => poly.map(r => r.map(p => terug(p[0], p[1])))),
      exact: ronde.exact,
      // Smal perceel: de buitenronde overlapt zichzelf in het midden
      dubbel: W < 2 * breedte ? 2 * breedte - W : 0
    } : null;
    return {
      breedte, gangen: uit.length, perceelBreedte: W, perceelLengte: xmax - xmin, rest, ronde: rondeUit,
      buitenKant: uit.length && rest < breedte - 0.05 ? Math.max(0, breedte - rest) : 0,
      secties: sectie ? { breedte: sectie, totaal: sectiesTotaal, aan: sectiesAan, laatsteLengte: uit.length ? uit[uit.length - 1].lengte : 0 } : null,
      abLengte: ab.m, a: terug(0, 0), b: terug(len, 0), sporen: uit,
      // Koers van de AB-lijn in graden t.o.v. het ware noorden, met de klok mee (zoals op een GPS-terminal)
      // (uit de richting in meters oost/noord op de WGS84-ellipsoïde, zoals een GPS-terminal rekent)
      koers: (Math.atan2(ux, uy) * 180 / Math.PI + 360) % 360,
      totaalM: uit.reduce((t, s) => t + s.lengte, 0) + (rondeUit ? rondeUit.lengte : 0)
    };
  }

  const isLandschap = f => String((f.properties || {}).category || "").toLowerCase() === "landschapselement";

  // Vertaal een feature naar wat de app nodig heeft
  function perceelVan(f, bron) {
    const p = f.properties || {};
    return {
      id: f.id != null ? f.id : null,
      gewas: p.gewas || "", gewascode: p.gewascode != null ? p.gewascode : null,
      category: p.category || "", jaar: p.jaar != null ? p.jaar : null, status: p.status || "",
      ha: oppervlakteHa(f.geometry), bron: bron, opgehaald: f._ts || Date.now(),
      geometry: f.geometry, eigenschappen: p
    };
  }

  // Perceel onder het punt; bij overlap (meerdere jaren) het nieuwste jaar
  function kies(features, lon, lat) {
    const hits = features.filter(f => f && f.geometry && !isLandschap(f) && bevatPunt(f.geometry, lon, lat));
    hits.sort((a, b) => (Number((b.properties || {}).jaar) || 0) - (Number((a.properties || {}).jaar) || 0));
    return hits[0] || null;
  }

  /* ---------- Opslag (laatst opgehaalde percelen) ---------- */
  function opslag(o) {
    if (o.storage) return o.storage;
    try { return typeof localStorage !== "undefined" ? localStorage : null; } catch (e) { return null; }
  }
  function leesCache(o) {
    const st = opslag(o); if (!st) return [];
    try { const v = JSON.parse(st.getItem(o.cacheKey) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  // Rondt coördinaten af op 7 decimalen (~1 cm) om ruimte te sparen
  const rond = c => typeof c[0] === "number" ? [Math.round(c[0] * 1e7) / 1e7, Math.round(c[1] * 1e7) / 1e7] : c.map(rond);
  const sleutel = f => f.id != null ? "id:" + f.id : "g:" + JSON.stringify(f.geometry.coordinates).slice(0, 200);
  function schrijfCache(o, nieuw) {
    const st = opslag(o); if (!st || !nieuw.length) return;
    const ts = Date.now();
    const mp = new Map();
    // nieuwste eerst, oude daarachter; dubbele eruit
    nieuw.map(f => ({ id: f.id, properties: f.properties, geometry: { type: f.geometry.type, coordinates: rond(f.geometry.coordinates) }, _ts: ts }))
      .concat(leesCache(o)).forEach(f => { const k = sleutel(f); if (!mp.has(k)) mp.set(k, f); });
    let lijst = [...mp.values()].slice(0, o.cacheMax);
    // Past het niet, dan steeds de oudste helft weggooien
    while (lijst.length) {
      try { st.setItem(o.cacheKey, JSON.stringify(lijst)); return; } catch (e) { lijst = lijst.slice(0, Math.floor(lijst.length / 2)); }
    }
  }
  const wisCache = o => { o = opts(o); const st = opslag(o); try { if (st) st.removeItem(o.cacheKey); } catch (e) {} };
  const aantalOpgeslagen = o => leesCache(opts(o)).length;

  /* ---------- PDOK ---------- */
  async function haalOp(lon, lat, o) {
    const f = o.fetch || (typeof fetch !== "undefined" ? fetch : null);
    if (!f) throw fout("offline", "Geen internet beschikbaar in deze omgeving.");
    const d = o.marge;
    const url = API + "?f=json&limit=" + o.limit + "&bbox=" + [lon - d, lat - d, lon + d, lat + d].map(v => v.toFixed(6)).join(",");
    const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = ac ? setTimeout(() => ac.abort(), o.timeout) : null;
    let res;
    try { res = await f(url, { signal: ac ? ac.signal : undefined, headers: { Accept: "application/geo+json, application/json" } }); }
    catch (e) { throw fout("offline", "Geen verbinding met PDOK."); }
    finally { if (t) clearTimeout(t); }
    if (!res.ok) throw fout("server", "PDOK gaf een fout (" + res.status + "). Probeer het later nog eens.");
    let data;
    try { data = await res.json(); } catch (e) { throw fout("server", "Onverwacht antwoord van PDOK."); }
    return Array.isArray(data && data.features) ? data.features.filter(x => x && x.geometry) : [];
  }

  // Zoek het perceel op een punt: eerst online, bij geen verbinding uit de opgeslagen percelen
  async function zoekOpPunt(lon, lat, o) {
    o = opts(o);
    let features = null, netFout = null;
    try { features = await haalOp(lon, lat, o); } catch (e) { netFout = e; }
    if (features) {
      schrijfCache(o, features.filter(f => !isLandschap(f)));
      let hit = kies(features, lon, lat);
      // Volle pagina zonder treffer: het perceel kan op een volgende pagina staan, dan alleen het punt zelf
      if (!hit && features.length >= o.limit) {
        try { const klein = await haalOp(lon, lat, Object.assign({}, o, { marge: 0.0002 })); schrijfCache(o, klein.filter(f => !isLandschap(f))); hit = kies(klein, lon, lat); } catch (e) {}
      }
      if (!hit) throw fout("geen-perceel", "Op deze plek ligt geen landbouwperceel in de BRP. Sta je op de kavel? Vul anders de oppervlakte zelf in.");
      return { perceel: perceelVan(hit, "online"), lon, lat };
    }
    const hit = kies(leesCache(o), lon, lat);
    if (hit) return { perceel: perceelVan(hit, "opgeslagen"), lon, lat, waarschuwing: netFout && netFout.message };
    if (netFout && netFout.code === "offline")
      throw fout("offline", "Geen verbinding, en dit perceel is nog niet eerder opgehaald. Vul de oppervlakte zelf in, of probeer het als je bereik hebt.");
    throw netFout;
  }

  /* ---------- GPS ---------- */
  function positie(o) {
    o = opts(o);
    return new Promise((resolve, reject) => {
      const geo = typeof navigator !== "undefined" && navigator.geolocation;
      if (!geo) { reject(fout("geen-gps", "Dit toestel of deze browser geeft geen locatie.")); return; }
      geo.getCurrentPosition(
        p => resolve({ lon: p.coords.longitude, lat: p.coords.latitude, nauwkeurigheid: p.coords.accuracy }),
        e => reject(e && e.code === 1 ? fout("gps-geweigerd", "Locatie geweigerd. Sta locatie toe voor deze app in je instellingen.")
          : e && e.code === 3 ? fout("gps-timeout", "Geen GPS-positie gevonden binnen de tijd. Probeer het buiten nog eens.")
          : fout("gps-onbekend", "Locatie niet beschikbaar. Staat GPS aan?")),
        { enableHighAccuracy: true, timeout: o.gpsTimeout, maximumAge: 5000 }
      );
    });
  }

  async function zoekOpMijnLocatie(o) {
    const p = await positie(o);
    const r = await zoekOpPunt(p.lon, p.lat, o);
    r.nauwkeurigheid = p.nauwkeurigheid;
    return r;
  }

  return { zoekOpMijnLocatie, zoekOpPunt, positie, oppervlakteHa, oppervlakteM2, bevatPunt, zijden, rechteZijde, afstandM, zoekWater, waterLangsZijden, sporen, verschuif, samenvoegen, wisCache, aantalOpgeslagen, API };
});
