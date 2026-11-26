// Hex geometry — pointy-top hexes, odd-r offset coordinates.
// Pure functions, no DOM. Single source of truth for the map (app.js)
// and the node self-test (test-hex.js).
// Works in the browser (window.HexGeometry) and in Node (module.exports).
//
// Pointy-top hex, size s (centre to vertex):
//   width  = sqrt(3) * s
//   height = 2 * s
//   horizontal spacing between columns = sqrt(3) * s
//   vertical spacing between rows     = 1.5 * s
//   odd rows are offset right by half a hex width (sqrt(3)*s/2)
// Neighbouring hexes share exactly one full edge (two corner points),
// with no overlap and no gap.
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.HexGeometry = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var SQRT3 = Math.sqrt(3);

  // Vertices of a pointy-top hex: angles -90, -30, 30, 90, 150, 210 degrees.
  // Top and bottom are points; the left and right sides are vertical edges.
  function hexPoints(cx, cy, s) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 180) * (60 * i - 90);
      pts.push([cx + s * Math.cos(a), cy + s * Math.sin(a)]);
    }
    return pts;
  }

  // Centre of hex (col, row) in SVG coordinates, all >= 0.
  // x = sqrt(3)*s*(col + 0.5*(row odd)) + sqrt(3)*s/2
  // y = 1.5*s*row + s
  function hexCenter(col, row, s) {
    var x = SQRT3 * s * (col + 0.5 * (row & 1)) + (SQRT3 * s) / 2;
    var y = 1.5 * s * row + s;
    return [x, y];
  }

  function hexPolygonPoints(col, row, s) {
    var c = hexCenter(col, row, s);
    return hexPoints(c[0], c[1], s);
  }

  function pointsString(pts) {
    return pts.map(function (p) {
      return p[0].toFixed(2) + "," + p[1].toFixed(2);
    }).join(" ");
  }

  function mapWidth(cols, s) { return SQRT3 * s * (cols + 0.5); }
  function mapHeight(rows, s) { return 1.5 * s * (rows - 1) + 2 * s; }

  // Neighbours in odd-r offset coordinates (redblobgames).
  function neighbours(col, row) {
    if (row % 2 === 0) {
      return [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
    }
    return [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
  }

  return {
    SQRT3: SQRT3,
    hexPoints: hexPoints,
    hexCenter: hexCenter,
    hexPolygonPoints: hexPolygonPoints,
    pointsString: pointsString,
    mapWidth: mapWidth,
    mapHeight: mapHeight,
    neighbours: neighbours
  };
});
