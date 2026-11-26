// Game Client — vanilla JS, no external dependencies.
// Kết nối P2P thật với host (WebRTC, copy-paste mã phòng / mã trả lời).
// Không có mô phỏng host, không có TURN relay, không có key/secret nào.
// Luật đã chốt được dùng ở đây; mọi số demo chưa chốt đều ghi rõ DEMO.
"use strict";

var COLS = 32;
var ROWS = 24;
var HEX_S = 20; // kích thước hex (tâm tới đỉnh), xem hex-geometry.js
var MAP_W = HexGeometry.mapWidth(COLS, HEX_S);
var MAP_H = HexGeometry.mapHeight(ROWS, HEX_S);
// Ví dụ lãnh thổ của người dùng: mỗi bên 30 ô, vùng trung lập 100 ô.
// Đây là TỈ LỆ ví dụ, không phải số ô trên map 32x24.
// Map 32x24 = 768 ô được chia theo tỉ lệ đó để minh họa:
//   Xanh: cột 0-5 (6x24=144 ô), Trung lập: cột 6-25 (20x24=480 ô),
//   Đỏ: cột 26-31 (6x24=144 ô). Các số 144/480/144 là số demo đã scale,
//   KHÔNG phải số người dùng đưa ra. Xem README.md.
var HOME_BLUE_MAX_COL = 5;
var HOME_RED_MIN_COL = 26;

// ---- Số demo chưa chốt (chỉ dùng trong demo, không phải luật đã chốt) ----
var DEMO_GOLD_START = 1000;      // demo-only: vàng khởi đầu (chưa chốt)
var DEMO_HOUSE_COST = 100;       // demo-only: xây 1 nhà tốn 100 vàng
var DEMO_MINE_GOLD = 50;         // demo-only: chiếm mỏ được 50 vàng
var DEMO_RECRUIT_TROOPS = 100;   // demo-only: 1 lần tuyển thêm 100 lính
// Các số đã chốt (không phải demo): 5.000 bộ binh ban đầu, 1 nhà ≈ 20 người,
// thủ đô 100.000 quân, +30% tiền cho đội ít người khi chia lẻ.

// Chi phí di chuyển / phòng thủ theo địa hình — số demo chưa chốt.
// Chỉ địa điểm đặc biệt (cung điện, mỏ, nhà thờ, thành, trại) mới có icon;
// địa hình thường chỉ khác màu, để map gọn, không loạn.
var TERRAIN = {
  plains:      { label: "Đồng bằng",  cost: 1, defence: 0, icon: "" },
  forest:      { label: "Rừng",       cost: 2, defence: 1, icon: "" },
  hills:       { label: "Đồi",        cost: 2, defence: 1, icon: "" },
  mountain:    { label: "Núi",        cost: 3, defence: 2, icon: "" },
  river:       { label: "Sông",       cost: 2, defence: 0, icon: "" },
  alluvial:    { label: "Đất bồi",    cost: 1, defence: 0, icon: "" },
  mine:        { label: "Mỏ vàng",    cost: 1, defence: 0, icon: "⛏" },
  church:      { label: "Nhà thờ",    cost: 1, defence: 1, icon: "✝" },
  city:        { label: "Thành",      cost: 1, defence: 2, icon: "🏰" },
  palace:      { label: "Cung điện",  cost: 1, defence: 3, icon: "♔" },
  camp:        { label: "Trại lớn",   cost: 1, defence: 1, icon: "⛺" },
  recruitment: { label: "Trại tuyển quân", cost: 1, defence: 1, icon: "⚑" }
};

function key(col, row) { return col + "," + row; }
function hash(col, row) { return (col * 73 + row * 149 + 31) % 100; }

// Vị trí đặc biệt trên map (tọa độ demo, chưa phải luật đã chốt về vị trí).
var SPECIAL = {};
SPECIAL[key(2, 11)] = "palace";   SPECIAL[key(29, 12)] = "palace";
SPECIAL[key(4, 13)] = "recruitment"; SPECIAL[key(27, 10)] = "recruitment";
// Trại lớn: mỗi Tướng 5 trại, mỗi đội 2 Tướng = 10 trại/đội (đã chốt về số lượng).
var BLUE_CAMPS = [[1,8],[3,8],[1,14],[4,9],[5,13],[0,10],[4,14],[2,16],[5,10],[3,15]];
BLUE_CAMPS.forEach(function (p) { SPECIAL[key(p[0], p[1])] = "camp"; });
BLUE_CAMPS.forEach(function (p) { SPECIAL[key(31 - p[0], p[1])] = "camp"; });
// Mỏ: 2 mỏ sân nhà mỗi đội + 6 mỏ trung lập = 10 mỏ (demo).
[[3,6],[5,17],[10,6],[14,18],[20,5],[22,16],[12,12],[18,10]].forEach(function (p) { SPECIAL[key(p[0], p[1])] = "mine"; });
SPECIAL[key(28, 6)] = "mine"; SPECIAL[key(26, 17)] = "mine";
// Nhà thờ và thành ở vùng trung lập (đã chốt: vùng trung lập có nhà thờ, thành).
SPECIAL[key(16, 8)] = "church";
SPECIAL[key(16, 12)] = "city";
// Sông dọc vùng trung lập + cầu, đất bồi ven sông (đã chốt: vùng trung lập có đất bồi).
var RIVER_ROWS = [3, 4, 5, 9, 10, 15, 16, 20, 21];
RIVER_ROWS.forEach(function (r) { SPECIAL[key(13, r)] = "river"; });
SPECIAL[key(13, 11)] = "river"; SPECIAL[key(13, 12)] = "river"; // cầu ở hàng 11-12
[[12, 11], [14, 11], [12, 12], [14, 12], [12, 18], [14, 6]].forEach(function (p) {
  if (!SPECIAL[key(p[0], p[1])]) SPECIAL[key(p[0], p[1])] = "alluvial";
});

function terrainAt(col, row) {
  if (SPECIAL[key(col, row)]) return SPECIAL[key(col, row)];
  var h = hash(col, row);
  var neutral = col > HOME_BLUE_MAX_COL && col < HOME_RED_MIN_COL;
  if (neutral) {
    // Vùng trung lập: không có núi (đã chốt).
    if (h < 55) return "plains";
    if (h < 70) return "forest";
    if (h < 80) return "hills";
    if (h < 88) return "alluvial";
    return "plains";
  }
  if (h < 50) return "plains";
  if (h < 65) return "forest";
  if (h < 75) return "hills";
  if (h < 83) return "mountain";
  return "plains";
}

function zoneOf(col) {
  if (col <= HOME_BLUE_MAX_COL) return "blue";
  if (col >= HOME_RED_MIN_COL) return "red";
  return "neutral";
}

// ---- State ----
var state = {
  name: "",
  team: null, // "red" | "blue" — do host chia
  role: null, // "king" | "general" — do host bốc
  assignment: null, // {team, role, members, kingName, teamSize, bonusPct} từ host
  gold: DEMO_GOLD_START,
  pop: 0, // demo: dân khởi đầu 0, tăng khi Vua xây nhà
  troops: { infantry: 5000, archer: 0, catapult: 0 }, // đã chốt: 5.000 ban đầu
  landHeld: 0,
  timeSec: 0,
  timerId: null,
  selected: null,
  map: [], // {col,row,terrain,owner} owner: "blue"|"red"|null
  pc: null,
  dc: null,
  connected: false
};

// ---- Map view: pan + zoom, map full màn hình ----
var view = { x: 0, y: 0, scale: 1, dragged: false };
function applyView() {
  $("map-svg").style.transform = "translate(" + view.x + "px," + view.y + "px) scale(" + view.scale + ")";
}
function fitView() {
  var vp = $("map-viewport");
  if (!vp) return;
  var s = Math.min(vp.clientWidth / MAP_W, vp.clientHeight / MAP_H, 1.15);
  if (s < 0.4) s = 0.4;
  view.scale = s;
  view.x = (vp.clientWidth - MAP_W * s) / 2;
  view.y = (vp.clientHeight - MAP_H * s) / 2;
  applyView();
}
function zoomAt(factor) {
  var vp = $("map-viewport");
  var cx = vp.clientWidth / 2, cy = vp.clientHeight / 2;
  var ns = Math.min(2.2, Math.max(0.4, view.scale * factor));
  view.x = cx - (cx - view.x) * (ns / view.scale);
  view.y = cy - (cy - view.y) * (ns / view.scale);
  view.scale = ns;
  applyView();
}

function $(id) { return document.getElementById(id); }
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
  $(id).classList.add("active");
}
function fmt(n) { return n.toLocaleString("vi-VN"); }
function teamName(t) { return t === "red" ? "Đội Đỏ" : "Đội Xanh"; }
function logP2P(line) {
  var log = $("p2p-log");
  log.textContent += (log.textContent ? "\n" : "") + line;
}
function setJoinStatus(text) { $("join-status").textContent = text; }

// ---- WebRTC: mã hoá / giải mã mã phòng, chờ ICE xong rồi mới tạo mã ----
function encodeCode(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}
function decodeCode(str) {
  return JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
}
function waitIceComplete(pc) {
  return new Promise(function (resolve) {
    var done = false;
    function finish() { if (!done) { done = true; resolve(); } }
    if (pc.iceGatheringState === "complete") { finish(); return; }
    pc.addEventListener("icecandidate", function (e) { if (!e.candidate) finish(); });
    pc.addEventListener("icegatheringstatechange", function () {
      if (pc.iceGatheringState === "complete") finish();
    });
    setTimeout(finish, 5000); // hết 5s thì dùng mã hiện có
  });
}
function copyText(text, btn) {
  function done() { if (btn) { var old = btn.textContent; btn.textContent = "ĐÃ SAO CHÉP ✓"; setTimeout(function () { btn.textContent = old; }, 1500); } }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
  } else { fallbackCopy(text); done(); }
}
function fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) { /* bỏ qua */ }
  document.body.removeChild(ta);
}

// ---- 1. Nhập tên ----
$("player-name").addEventListener("input", function () { $("name-error").textContent = ""; });
$("btn-enter-join").addEventListener("click", function () {
  var name = $("player-name").value.trim();
  if (!name) { $("name-error").textContent = "Hãy nhập tên trước rồi bấm TIẾP TỤC."; $("player-name").focus(); return; }
  $("name-error").textContent = "";
  state.name = name;
  showScreen("screen-join");
});
$("btn-back-name").addEventListener("click", function () { showScreen("screen-name"); });

// ---- 2. Nhập mã phòng của host, tạo mã trả lời (P2P thật) ----
$("btn-connect-host").addEventListener("click", async function () {
  var code = $("host-offer-code").value.trim();
  if (!code) { setJoinStatus("Chưa có mã phòng. Hãy dán mã phòng của host vào ô trên rồi bấm KẾT NỐI TỚI HOST."); return; }
  var offer;
  try {
    offer = decodeCode(code);
  } catch (e) {
    setJoinStatus("Mã phòng không đúng định dạng. Hãy sao chép lại mã từ host.");
    return;
  }
  if (!offer || offer.type !== "offer" || !offer.sdp) {
    setJoinStatus("Mã phòng không hợp lệ (thiếu SDP). Hãy sao chép lại mã từ host.");
    return;
  }
  setJoinStatus("Đang kết nối tới host" + (offer.room ? " (" + offer.room + ")" : "") + "…");
  $("btn-connect-host").disabled = true;
  try {
    // Không có STUN/TURN: chỉ dùng host candidates trên cùng WiFi.
    state.pc = new RTCPeerConnection({ iceServers: [] });
    state.pc.ondatachannel = function (ev) { setupDataChannel(ev.channel); };
    state.pc.onconnectionstatechange = function () {
      logP2P("P2P: trạng thái kết nối = " + state.pc.connectionState);
    };
    await state.pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: offer.sdp }));
    var answer = await state.pc.createAnswer();
    await state.pc.setLocalDescription(answer);
    await waitIceComplete(state.pc);
    $("client-answer-code").value = encodeCode({ type: "answer", sdp: state.pc.localDescription.sdp });
    $("answer-box").hidden = false;
    setJoinStatus("Đã tạo mã trả lời. Đưa mã này cho host để host hoàn tất kết nối, rồi bấm “Tới màn chắn”.");
    $("btn-to-wait").disabled = false;
  } catch (err) {
    setJoinStatus("Kết nối lỗi: " + err.message + " Hãy kiểm tra lại mã phòng và thử lại.");
    $("btn-connect-host").disabled = false;
  }
});
$("btn-copy-answer").addEventListener("click", function () {
  copyText($("client-answer-code").value, $("btn-copy-answer"));
});
$("btn-to-wait").addEventListener("click", function () {
  $("wait-player-name").textContent = state.name;
  $("conn-status").textContent = state.connected
    ? "Đã kết nối với host — chờ lệnh mở màn chắn."
    : "Đang chờ host hoàn tất kết nối…";
  $("p2p-log").textContent = "P2P: đã gửi mã trả lời cho host.\n" +
    "P2P: chờ host hoàn tất kết nối và gửi lệnh OPEN_BARRIER.";
  showScreen("screen-wait");
});
$("btn-back-join").addEventListener("click", function () { showScreen("screen-join"); });

// ---- Kênh dữ liệu với host ----
function setupDataChannel(dc) {
  state.dc = dc;
  dc.onopen = function () {
    state.connected = true;
    $("conn-status").textContent = "Đã kết nối với host — chờ lệnh mở màn chắn.";
    logP2P("P2P: kênh dữ liệu đã mở. Đã gửi JOIN { name: \"" + state.name + "\" }.");
    sendToHost({ type: "JOIN", name: state.name });
  };
  dc.onclose = function () {
    state.connected = false;
    $("conn-status").textContent = "Đã mất kết nối với host.";
    logP2P("P2P: kênh dữ liệu đã đóng.");
  };
  dc.onmessage = function (ev) {
    var msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    handleHostMessage(msg);
  };
}
function sendToHost(msg) {
  if (state.dc && state.dc.readyState === "open") {
    state.dc.send(JSON.stringify(msg));
  }
}
function handleHostMessage(msg) {
  if (msg.type === "OPEN_BARRIER") {
    // Lệnh mở thật từ host — không còn mô phỏng.
    logP2P("P2P: nhận lệnh { type: \"OPEN_BARRIER\" } từ host. Màn chắn đang mở…");
    document.querySelector("#screen-wait .barrier").classList.add("open");
    setTimeout(function () {
      showScreen("screen-team");
      renderAssignment();
    }, 900);
  } else if (msg.type === "TEAM_ASSIGN") {
    // Host chia đội và bốc Vua — host là nguồn duy nhất, client không tự bốc.
    state.assignment = msg;
    state.team = msg.team;
    state.role = msg.role;
    logP2P("P2P: host chia đội — " + teamName(msg.team) + ", vai trò: " +
      (msg.role === "king" ? "Vua" : "Tướng") + ".");
    if ($("screen-team").classList.contains("active")) renderAssignment();
  } else if (msg.type === "STATE") {
    logP2P("P2P: nhận cập nhật trạng thái từ host.");
    if (typeof msg.gold === "number") { state.gold = msg.gold; updateHUD(); }
  }
}

// ---- 3. Đội do host chia ----
function renderAssignment() {
  var a = state.assignment;
  var note = $("team-assign-note");
  if (!a) {
    note.textContent = "Đang chờ host chia đội…";
    $("team-chosen").textContent = "Chưa nhận đội từ host.";
    $("btn-confirm-team").disabled = true;
    return;
  }
  $("team-red").classList.toggle("selected", a.team === "red");
  $("team-blue").classList.toggle("selected", a.team === "blue");
  var bonusText = a.bonusPct ? " · Đội ít người +" + Math.round(a.bonusPct * 100) + "% tiền" : "";
  note.textContent = "Host đã chia bạn vào " + teamName(a.team) + " (" + a.teamSize + " người" + bonusText + ").";
  $("team-chosen").textContent = "Đã nhận đội: " + teamName(a.team) + ". Vai trò của bạn: " +
    (a.role === "king" ? "VUA (1 mạng)" : "TƯỚNG (3 mạng, 5.000 bộ binh)") + ".";
  $("btn-confirm-team").disabled = false;
}
$("btn-split").addEventListener("click", function () {
  var total = parseInt($("total-players").value, 10);
  var out = $("split-result");
  if (!total || total < 2 || total > 12) {
    out.textContent = "Nhập tổng số người từ 2 đến 12 (demo).";
    return;
  }
  out.textContent = computeSplit(total).text;
});
function computeSplit(total) {
  // Đã chốt: chẵn chia đôi, lẻ chia lệch, đội ít người +30% tiền.
  if (total % 2 === 0) {
    return { a: total / 2, b: total / 2, bonus: 0,
      text: total + " người = " + (total / 2) + " vs " + (total / 2) + ". Chia đều, không cộng thêm tiền." };
  }
  var small = Math.floor(total / 2), large = Math.ceil(total / 2);
  // Số tiền gốc 1.000 là số demo chưa chốt; chỉ tỉ lệ +30% là đã chốt.
  var demoBase = DEMO_GOLD_START;
  var demoBonusGold = Math.round(demoBase * 1.30);
  return { a: small, b: large, bonus: 0.30,
    text: total + " người = " + small + " vs " + large +
      ". Đội " + small + " người (ít người hơn) được +30% tiền " +
      "(demo: " + fmt(demoBase) + " → " + fmt(demoBonusGold) + " vàng)." };
}
$("btn-confirm-team").addEventListener("click", function () {
  if (!state.assignment) return;
  var a = state.assignment;
  $("draw-team").textContent = teamName(a.team);
  var slots = $("draw-slots");
  slots.innerHTML = "";
  (a.members || [state.name]).forEach(function (n) {
    var d = document.createElement("div");
    d.className = "draw-slot";
    d.textContent = n;
    slots.appendChild(d);
  });
  $("draw-result").hidden = true;
  $("btn-to-loading").disabled = true;
  showScreen("screen-draw");
  // Hiệu ứng bốc thăm: chạy highlight rồi dừng đúng ở Vua do host bốc.
  var slotEls = document.querySelectorAll("#draw-slots .draw-slot");
  var kingIndex = Math.max(0, (a.members || []).indexOf(a.kingName));
  var i = 0;
  var timer = setInterval(function () {
    slotEls.forEach(function (s) { s.classList.remove("highlight"); });
    slotEls[i % slotEls.length].classList.add("highlight");
    i++;
    if (i > 9) {
      clearInterval(timer);
      slotEls.forEach(function (s) { s.classList.remove("highlight"); });
      slotEls[kingIndex].classList.add("highlight");
      var res = $("draw-result");
      if (state.role === "king") {
        res.innerHTML = "<strong>" + state.name + " là VUA</strong> · 1 mạng";
      } else {
        res.innerHTML = "<strong>" + a.kingName + " là Vua</strong> · " +
          state.name + " là TƯỚNG · 3 mạng · 5.000 bộ binh";
      }
      res.hidden = false;
      $("btn-to-loading").disabled = false;
    }
  }, 160);
});

// ---- 4. Màn load rồi vào trận ----
$("btn-to-loading").addEventListener("click", function () {
  showScreen("screen-loading");
  var bar = $("progress-bar"), label = $("progress-label"), doors = $("loading-doors");
  doors.classList.remove("open");
  var p = 0;
  var timer = setInterval(function () {
    p += Math.floor(Math.random() * 12) + 4; // tốc độ load demo
    if (p >= 100) {
      p = 100;
      clearInterval(timer);
      doors.classList.add("open");
      setTimeout(enterMatch, 900);
    }
    bar.style.width = p + "%";
    label.textContent = p + "%";
  }, 180);
});

function enterMatch() {
  showScreen("screen-match");
  renderMap();
  updateHUD();
  var hudTeam = $("hud-team");
  hudTeam.classList.add("team-" + state.team);
  hudTeam.querySelector("b").textContent = teamName(state.team);
  // Đánh dấu nhóm của bạn (Vua hay Tướng).
  $("group-king").classList.toggle("you", state.role === "king");
  $("group-general").classList.toggle("you", state.role === "general");
  $("mark-king").hidden = state.role !== "king";
  $("mark-general").hidden = state.role !== "general";
  fitView();
  if (!state.timerId) {
    state.timerId = setInterval(function () {
      state.timeSec++;
      var m = String(Math.floor(state.timeSec / 60)).padStart(2, "0");
      var s = String(state.timeSec % 60).padStart(2, "0");
      $("stat-time").textContent = m + ":" + s;
    }, 1000);
  }
}

// ---- 5. Map lục giác 32x24 bằng SVG (hình học lục giác đúng) ----
// Mỗi ô là một <polygon> 6 đỉnh tính bằng HexGeometry (pointy-top, odd-r).
// Các ô kề nhau chia đúng 1 cạnh — không chồng lấn, không khe hở hình thoi.
// Xem test-hex.js: tự kiểm tra hình học bằng node.
var SVGNS = "http://www.w3.org/2000/svg";
function renderMap() {
  var svg = $("map-svg");
  svg.setAttribute("width", MAP_W);
  svg.setAttribute("height", MAP_H);
  svg.setAttribute("viewBox", "0 0 " + MAP_W + " " + MAP_H);
  var group = $("map-group");
  while (group.firstChild) group.removeChild(group.firstChild);
  state.map = [];
  for (var row = 0; row < ROWS; row++) {
    for (var col = 0; col < COLS; col++) {
      var terrain = terrainAt(col, row);
      var zone = zoneOf(col);
      var owner = zone === "neutral" ? null : zone; // đất nhà thuộc phe đó từ đầu
      var hex = { col: col, row: row, terrain: terrain, owner: owner };
      state.map.push(hex);
      var poly = document.createElementNS(SVGNS, "polygon");
      poly.setAttribute("points", HexGeometry.pointsString(HexGeometry.hexPolygonPoints(col, row, HEX_S)));
      poly.setAttribute("class", "hex terrain-" + terrain + (owner ? " owner-" + owner : " owner-neutral"));
      poly.setAttribute("data-col", col);
      poly.setAttribute("data-row", row);
      poly.setAttribute("data-terrain", terrain);
      (function (h, el) {
        el.addEventListener("click", function () {
          if (view.dragged) { view.dragged = false; return; }
          selectHex(h, el);
        });
      })(hex, poly);
      group.appendChild(poly);
      // Chỉ địa điểm đặc biệt mới có icon nhỏ (cung điện, mỏ, nhà thờ, thành, trại).
      var icon = TERRAIN[terrain].icon;
      if (icon) {
        var c = HexGeometry.hexCenter(col, row, HEX_S);
        var text = document.createElementNS(SVGNS, "text");
        text.setAttribute("x", c[0]);
        text.setAttribute("y", c[1]);
        text.setAttribute("class", "hex-icon");
        text.textContent = icon;
        group.appendChild(text);
      }
    }
  }
  updateLandHeld();
}

function updateLandHeld() {
  var mine = state.team;
  var count = state.map.filter(function (h) { return h.owner === mine; }).length;
  state.landHeld = count;
  $("stat-land").textContent = fmt(count);
}

function updateHUD() {
  $("stat-gold").textContent = fmt(state.gold);
  $("stat-pop").textContent = fmt(state.pop);
  var total = state.troops.infantry + state.troops.archer + state.troops.catapult;
  $("stat-troops").textContent = fmt(total);
  $("troop-infantry").textContent = fmt(state.troops.infantry);
  $("troop-archer").textContent = fmt(state.troops.archer);
  $("troop-catapult").textContent = fmt(state.troops.catapult);
  updateLandHeld();
}

function sendStateToHost() {
  sendToHost({ type: "STATE", name: state.name, gold: state.gold, land: state.landHeld });
}

// Panel ô đã chọn: gọn, chỉ tên ô, chủ, 2 chỉ số và nút hành động.
function selectHex(hex, el) {
  document.querySelectorAll(".hex.selected").forEach(function (h) { h.classList.remove("selected"); });
  el.classList.add("selected");
  state.selected = hex;
  var t = TERRAIN[hex.terrain];
  $("sel-name").textContent = t.label + " · " + hex.col + "," + hex.row;
  var ownerEl = $("sel-owner");
  ownerEl.textContent = hex.owner === null ? "TRUNG LẬP" : hex.owner === "blue" ? "ĐỘI XANH" : "ĐỘI ĐỎ";
  ownerEl.className = "owner-chip" + (hex.owner ? " owner-" + hex.owner : "");
  $("sel-cost").textContent = t.cost + " (demo)";
  $("sel-def").textContent = "+" + t.defence + " (demo)";
  var note = "—";
  if (hex.terrain === "palace") note = "Cung điện · Thủ đô 100.000 quân.";
  else if (hex.terrain === "camp") note = "Trại lớn · Điểm hồi sinh của Tướng.";
  else if (hex.terrain === "recruitment") note = "Trại tuyển quân của Vua.";
  else if (hex.terrain === "mine") note = "Mỏ vàng.";
  else if (hex.terrain === "church") note = "Nhà thờ.";
  else if (hex.terrain === "city") note = "Thành trung lập.";
  $("sel-note").textContent = note;

  var actions = $("hex-actions");
  actions.innerHTML = "";
  var role = state.role, team = state.team;

  function addButton(label, fn) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn secondary"; b.textContent = label;
    b.addEventListener("click", fn);
    actions.appendChild(b);
  }

  if (role === "general" && hex.owner === null) {
    addButton("Chiếm ô này", function () {
      hex.owner = team;
      el.classList.remove("owner-neutral");
      el.classList.add("owner-" + team);
      if (hex.terrain === "mine") {
        state.gold += DEMO_MINE_GOLD; // demo-only
        $("sel-note").textContent = "Đã chiếm mỏ: +" + DEMO_MINE_GOLD + " vàng (demo).";
      } else {
        $("sel-note").textContent = "Đã chiếm ô.";
      }
      updateHUD();
      sendStateToHost();
      selectHexRefresh(hex);
    });
  }
  if (role === "general" && hex.owner !== null && hex.owner !== team) {
    var noteEl = document.createElement("p");
    noteEl.className = "hint";
    noteEl.textContent = "Ô của địch — cần đánh chiếm. Combat thật chưa có trong demo này.";
    actions.appendChild(noteEl);
  }
  if (role === "king" && (hex.terrain === "plains" || hex.terrain === "alluvial")) {
    addButton("Xây nhà — " + DEMO_HOUSE_COST + " vàng (demo)", function () {
      if (state.gold < DEMO_HOUSE_COST) { $("sel-note").textContent = "Không đủ vàng để xây nhà (demo)."; return; }
      state.gold -= DEMO_HOUSE_COST;
      state.pop += 20; // đã chốt: 1 nhà ≈ 20 người
      $("sel-note").textContent = "Đã xây 1 nhà: +20 dân.";
      updateHUD();
      sendStateToHost();
    });
    addButton("Tuyển quân — +100 lính (demo)", function () {
      state.troops.infantry += DEMO_RECRUIT_TROOPS; // demo-only, tuyển thêm không giới hạn (đã chốt)
      $("sel-note").textContent = "Đã tuyển thêm " + DEMO_RECRUIT_TROOPS + " lính (demo).";
      updateHUD();
      sendStateToHost();
    });
  }
  if (!actions.children.length) {
    var p = document.createElement("p");
    p.className = "hint";
    p.textContent = "Không có hành động cho vai trò của bạn ở ô này.";
    actions.appendChild(p);
  }
}
function selectHexRefresh(hex) {
  // Cập nhật lại panel sau khi chiếm ô.
  var el = document.querySelector('.hex[data-col="' + hex.col + '"][data-row="' + hex.row + '"]');
  if (el) selectHex(hex, el);
}
$("sel-close").addEventListener("click", function () {
  document.querySelectorAll(".hex.selected").forEach(function (h) { h.classList.remove("selected"); });
  state.selected = null;
  $("sel-name").textContent = "Chọn một ô";
  $("sel-owner").textContent = "—";
  $("sel-owner").className = "owner-chip";
  $("sel-cost").textContent = "—";
  $("sel-def").textContent = "—";
  $("sel-note").textContent = "Chạm vào một ô trên map.";
  $("hex-actions").innerHTML = "";
});

// ---- Kéo / zoom map ----
(function () {
  var vp = $("map-viewport");
  var dragging = false, startX = 0, startY = 0, baseX = 0, baseY = 0, moved = 0;
  vp.addEventListener("pointerdown", function (e) {
    dragging = true; moved = 0;
    startX = e.clientX; startY = e.clientY; baseX = view.x; baseY = view.y;
    vp.classList.add("dragging");
    vp.setPointerCapture(e.pointerId);
  });
  vp.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX, dy = e.clientY - startY;
    moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
    view.x = baseX + dx; view.y = baseY + dy;
    applyView();
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    vp.classList.remove("dragging");
    if (moved > 6) view.dragged = true;
  }
  vp.addEventListener("pointerup", endDrag);
  vp.addEventListener("pointercancel", endDrag);
  vp.addEventListener("wheel", function (e) {
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });
})();
$("zoom-in").addEventListener("click", function () { zoomAt(1.25); });
$("zoom-out").addEventListener("click", function () { zoomAt(0.8); });
$("zoom-reset").addEventListener("click", function () { fitView(); });
window.addEventListener("resize", function () {
  if ($("screen-match").classList.contains("active")) fitView();
});

// ---- Chuyển quân: giữ tổng 5.000 (đã chốt) ----
function convert(kind) {
  if (state.troops.infantry < 1000) { var n = $("sel-note"); if (n) n.textContent = "Không đủ bộ binh để chuyển (cần 1.000)."; return; }
  state.troops.infantry -= 1000;
  state.troops[kind] += 1000;
  updateHUD();
}
$("btn-convert-archer").addEventListener("click", function () { convert("archer"); });
$("btn-convert-catapult").addEventListener("click", function () { convert("catapult"); });

// Khởi tạo HUD lần đầu (trước khi vào trận, các số hiển thị là số demo/mặc định).
updateHUD();

// Đánh dấu đã khởi động xong — đoạn kiểm tra trong index.html dùng cờ này
// để biết code có tải được hay không (nếu cờ này không bật, nút sẽ liệt).
window.__clientReady = true;
