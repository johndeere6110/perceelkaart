# BRP van het lopende jaar (concept) voor één regio, als tegels voor Perceel.gebruikRegio("brp2026/").
# PDOK geeft live alleen het laatste definitieve jaar; het concept staat alleen in de download (GeoPackage, ca. 2,8 GB):
#   https://service.pdok.nl/rvo/gewaspercelen/atom/downloads/gewaspercelen_concept_2026.gpkg
# Gebruik (Python 3 met pyogrio, shapely, pyproj):
#   python3 tools/brp-regio.py gewaspercelen_concept_2026.gpkg brp2026 105000,510000,155000,556000
#   (RD-vak x1,y1,x2,y2). Vervangt alle .json in de uitvoermap. Zonder download kan ook /vsicurl/<url> (traag voor een groot vak).
# Vereenvoudigd op 1 cm (oppervlakte per perceel hooguit ca. 1 m² anders), coördinaten op 7 decimalen,
# landschapselementen weggelaten. RD -> WGS84 zoals PDOK (getest: hoekpunten gelijk aan de PDOK-API).
# Compact (v 2): { v: 2, p: [eigenschappen], f: [[fid, bbox, p-index, geometrie]] }, coördinaten als hele getallen
# in 1e-7 graad; per ring het eerste punt, dan de verschillen (sluitpunt weggelaten). Ontcijferen: perceel.js regioZoek.
import sys, os, json, math, warnings, datetime, shapely, pyproj, pyogrio
warnings.filterwarnings("ignore")
bron, uit = sys.argv[1], sys.argv[2]
x1, y1, x2, y2 = map(float, sys.argv[3].split(","))       # RD-vak
dLon, dLat = 0.02, 0.0125                                   # tegel ca. 1,35 x 1,4 km
tr = pyproj.Transformer.from_crs(28992, 4326, always_xy=True)
meta, fids, geom, velden = pyogrio.raw.read(bron, layer="brp_gewas", bbox=(x1, y1, x2, y2), return_fids=True)
namen = list(meta["fields"])
print("percelen in het vak:", len(geom), flush=True)
lo1, la1 = tr.transform(x1, y1); lo2, la2 = tr.transform(x2, y2)
lon0, lat0 = math.floor(min(lo1, lo2) / dLon) * dLon, math.floor(min(la1, la2) / dLat) * dLat
tegels, n_land, opp_fout = {}, 0, []
rnd = lambda v: round(v, 7)
def ring(r): return [[rnd(a) for a in tr.transform(x, y)] for x, y in r.coords]
def compact(r):  # ring [[lon, lat], ...] (gesloten) -> [x0, y0, dx1, dy1, ...] in 1e-7 graad, zonder sluitpunt
    pts = [(round(a * 1e7), round(b * 1e7)) for a, b in r[:-1]]
    uit = [pts[0][0], pts[0][1]]
    for (a, b), (c, d) in zip(pts, pts[1:]): uit += [c - a, d - b]
    return uit
for k in range(len(geom)):
    p = {nm: (velden[i][k].item() if hasattr(velden[i][k], "item") else velden[i][k]) for i, nm in enumerate(namen)}
    if str(p.get("category", "")).lower() == "landschapselement": n_land += 1; continue
    g0 = shapely.force_2d(shapely.from_wkb(geom[k])); g = shapely.simplify(g0, 0.01, preserve_topology=True)
    opp_fout.append(abs(g.area - g0.area) / max(g0.area, 1))
    polys = list(g.geoms) if g.geom_type == "MultiPolygon" else [g]
    coords = [[ring(pl.exterior)] + [ring(h) for h in pl.interiors] for pl in polys]
    if len(coords) == 1: gj = {"type": "Polygon", "coordinates": coords[0]}
    else: gj = {"type": "MultiPolygon", "coordinates": coords}
    xs = [c[0] for poly in coords for c in poly[0]]; ys = [c[1] for poly in coords for c in poly[0]]
    bb = [min(xs), min(ys), max(xs), max(ys)]
    f = {"fid": int(fids[k]), "bbox": [round(v * 1e7) for v in bb], "properties": p, "g": [[compact(r) for r in poly] for poly in coords]}
    for i in range(math.floor((bb[0] - lon0) / dLon), math.floor((bb[2] - lon0) / dLon) + 1):
        for j in range(math.floor((bb[1] - lat0) / dLat), math.floor((bb[3] - lat0) / dLat) + 1):
            tegels.setdefault((i, j), []).append(f)
os.makedirs(uit, exist_ok=True)
for fn in os.listdir(uit):
    if fn.endswith(".json"): os.remove(os.path.join(uit, fn))
tot = 0
for (i, j), fs in tegels.items():
    props = []
    def pi(p):
        k = json.dumps(p, sort_keys=True, ensure_ascii=False)
        for n, q in enumerate(props):
            if q[0] == k: return n
        props.append((k, p)); return len(props) - 1
    rij = [[f["fid"], f["bbox"], pi(f["properties"]), f["g"]] for f in fs]
    t = json.dumps({"v": 2, "p": [q[1] for q in props], "f": rij}, separators=(",", ":"), ensure_ascii=False)
    tot += len(t)
    open(os.path.join(uit, "%d_%d.json" % (i, j)), "w", encoding="utf-8").write(t)
nx = max(i for i, j in tegels) + 1; ny = max(j for i, j in tegels) + 1
jaar = next((f["properties"].get("jaar") for fs in tegels.values() for f in fs), None)
status = next((f["properties"].get("status") for fs in tegels.values() for f in fs), "")
ix = {"jaar": jaar, "status": status, "bron": "PDOK BRP Gewaspercelen download (" + os.path.basename(sys.argv[4] if len(sys.argv) > 4 else bron) + ")",
      "geknipt": datetime.date.today().isoformat(), "id": "brp" + str(jaar) + ":", "rd": [x1, y1, x2, y2], "lon0": lon0, "lat0": lat0, "dLon": dLon, "dLat": dLat, "nx": nx, "ny": ny,
      "tegels": sorted("%d_%d" % k for k in tegels)}
open(os.path.join(uit, "index.json"), "w").write(json.dumps(ix, separators=(",", ":")))
print("max oppervlaktefout door vereenvoudigen: %.4f %%" % (100 * max(opp_fout)), "gemiddeld: %.5f %%" % (100 * sum(opp_fout) / len(opp_fout)))
print("tegels:", len(tegels), "landschapselementen overgeslagen:", n_land, "totaal MB:", round(tot / 1e6, 1))
