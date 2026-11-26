// Node self-test for hex-geometry.js — run: node test-hex.js
// Asserts on the real production geometry used by app.js:
//  - every hex has 6 distinct vertices and the correct regular-hex area
//  - every in-bounds neighbour pair is exactly sqrt(3)*s apart and shares
//    exactly ONE edge (two identical corner points, consecutive in both
//    polygons) — i.e. no overlaps and no diamond gaps
//  - non-neighbour hexes share no points at all
//  - every vertex lies inside the map bounding box from the formulas
// Exits 0 on PASS, 1 on FAIL.
"use strict";
var G = require("./hex-geometry.js");
var COLS = 32, ROWS = 24, S = 20;
var EPS = 1e-6;

function key(p) { return p[0].toFixed(6) + "," + p[1].toFixed(6); }
function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function polygonArea(pts) {
  var sum = 0;
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i], q = pts[(i + 1) % pts.length];
    sum += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(sum) / 2;
}
function sharedPoints(a, b) {
  var setB = {};
  b.forEach(function (p) { setB[key(p)] = true; });
  return a.filter(function (p) { return setB[key(p)]; });
}
// Sorted indices of the shared points inside pts. Consecutive mod 6 means
// they form an edge (handles the wrap-around edge between index 5 and 0).
function isEdgePair(pts, shared) {
  var idx = [];
  pts.forEach(function (p, i) {
    if (shared.some(function (sp) { return key(sp) === key(p); })) idx.push(i);
  });
  if (idx.length !== 2) return false;
  return (idx[1] - idx[0] === 1) || (idx[0] === 0 && idx[1] === 5);
}

var failures = [];
function check(cond, msg) { if (!cond) failures.push(msg); }

var expectedArea = (3 * Math.sqrt(3) / 2) * S * S;
var expectedDist = Math.sqrt(3) * S;
var checkedHexes = 0, checkedPairs = 0;

for (var row = 0; row < ROWS; row++) {
  for (var col = 0; col < COLS; col++) {
    checkedHexes++;
    var pts = G.hexPolygonPoints(col, row, S);
    check(pts.length === 6, "hex " + col + "," + row + " has " + pts.length + " vertices");
    var uniq = {};
    pts.forEach(function (p) { uniq[key(p)] = true; });
    check(Object.keys(uniq).length === 6, "hex " + col + "," + row + " has duplicate vertices");
    check(Math.abs(polygonArea(pts) - expectedArea) < 1e-6,
      "hex " + col + "," + row + " area " + polygonArea(pts) + " != " + expectedArea);
    var c = G.hexCenter(col, row, S);
    check(c[0] >= 0 && c[1] >= 0, "hex " + col + "," + row + " centre is negative");

    G.neighbours(col, row).forEach(function (d) {
      var ncol = col + d[0], nrow = row + d[1];
      if (ncol < 0 || ncol >= COLS || nrow < 0 || nrow >= ROWS) return;
      checkedPairs++;
      var npts = G.hexPolygonPoints(ncol, nrow, S);
      var nc = G.hexCenter(ncol, nrow, S);
      check(Math.abs(dist(c, nc) - expectedDist) < EPS,
        "centre distance " + col + "," + row + " -> " + ncol + "," + nrow + " = " + dist(c, nc).toFixed(4));
      var shared = sharedPoints(pts, npts);
      check(shared.length === 2,
        "hex " + col + "," + row + " and " + ncol + "," + nrow + " share " + shared.length + " points, expected exactly 2");
      if (shared.length === 2) {
        check(isEdgePair(pts, shared),
          "shared points are not one edge of hex " + col + "," + row);
        check(isEdgePair(npts, shared),
          "shared points are not one edge of hex " + ncol + "," + nrow);
      }
    });
  }
}

// Non-neighbours share no points: hex (0,0) vs every hex 3+ rows away.
var p00 = G.hexPolygonPoints(0, 0, S);
for (var r = 3; r < ROWS; r++) {
  for (var cc = 0; cc < COLS; cc++) {
    var sh = sharedPoints(p00, G.hexPolygonPoints(cc, r, S));
    check(sh.length === 0, "hex (0,0) shares " + sh.length + " points with (" + cc + "," + r + ")");
  }
}

// Map bounding box from the formulas, and every vertex inside it.
var w = G.mapWidth(COLS, S), h = G.mapHeight(ROWS, S);
check(Math.abs(w - Math.sqrt(3) * S * (COLS + 0.5)) < EPS, "mapWidth " + w);
check(Math.abs(h - (1.5 * S * (ROWS - 1) + 2 * S)) < EPS, "mapHeight " + h);
for (var rr = 0; rr < ROWS; rr++) {
  for (var ccc = 0; ccc < COLS; ccc++) {
    G.hexPolygonPoints(ccc, rr, S).forEach(function (p) {
      check(p[0] >= -EPS && p[0] <= w + EPS && p[1] >= -EPS && p[1] <= h + EPS,
        "vertex outside map bounds at " + ccc + "," + rr);
    });
  }
}

console.log("HEX GEOMETRY TEST");
console.log("  hexes checked: " + checkedHexes + " (" + COLS + "x" + ROWS + ", size s=" + S + ")");
console.log("  neighbour pairs checked: " + checkedPairs);
console.log("  expected neighbour centre distance: sqrt(3)*s = " + expectedDist.toFixed(4));
console.log("  expected hex area: " + expectedArea.toFixed(4));
console.log("  map size: " + w.toFixed(2) + " x " + h.toFixed(2));
if (failures.length === 0) {
  console.log("  RESULT: PASS — every neighbour pair shares exactly one edge, no overlaps, no gaps.");
} else {
  console.log("  RESULT: FAIL (" + failures.length + " failures)");
  failures.slice(0, 20).forEach(function (f) { console.log("   - " + f); });
  process.exit(1);
}
