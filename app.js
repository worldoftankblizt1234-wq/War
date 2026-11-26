// Game Client — demo, vanilla JS, no external dependencies.
// Luật đã chốt được dùng ở đây; mọi số demo chưa chốt đều ghi rõ DEMO.
// Không có TURN relay, không có key/secret nào trong file này.
// Host chưa được xây dựng: nút mô phỏng OPEN_BARRIER chỉ giả lập lệnh host.
"use strict";

var COLS = 32;
var ROWS = 24;
// Ví dụ lãnh thổ của người dùng: mỗi bên 30 ô, vùng trung lập 100 ô.
// Đây là TỈ LỆ ví dụ, không phải số ô trên map 32x24.
// Map demo 32x24 = 768 ô được chia theo tỉ lệ đó để minh họa:
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
var TERRAIN = {
  plains:      { label: "Đồng bằng",  cost: 1, defence: 0, icon: "" },
  forest:      { label: "Rừng",       cost: 2, defence: 1, icon: "🌲" },
  hills:       { label: "Đồi",        cost: 2, defence: 1, icon: "▲" },
  mountain:    { label: "Núi",        cost: 3, defence: 2, icon: "▲" },
  river:       { label: "Sông",       cost: 2, defence: 0, icon: "≈" },
  alluvial:    { label: "Đất bồi",    cost: 1, defence: 0, icon: "~" },
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
  team: null, // "red" | "blue"
  role: null, // "king" | "general"
  gold: DEMO_GOLD_START,
  pop: 0, // demo: dân khởi đầu 0, tăng khi Vua xây nhà
  troops: { infantry: 5000, archer: 0, catapult: 0 }, // đã chốt: 5.000 ban đầu
  landHeld: 0,
  timeSec: 0,
  timerId: null,
  selected: null,
  map: [] // {col,row,terrain,owner} owner: "blue"|"red"|null
};

function $(id) { return document.getElementById(id); }
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
  $(id).classList.add("active");
}
function fmt(n) { return n.toLocaleString("vi-VN"); }
function teamName(t) { return t === "red" ? "Đội Đỏ" : "Đội Xanh"; }

// ---- 1. Nhập tên ----
$("btn-enter-wait").addEventListener("click", function () {
  var name = $("player-name").value.trim();
  if (!name) { alert("Hãy nhập tên trước."); return; }
  state.name = name;
  $("wait-player-name").textContent = name;
  $("p2p-log").textContent =
    "P2P: đang tìm host trên cùng WiFi… (demo)\n" +
    "P2P: chưa kết nối host. Chờ lệnh OPEN_BARRIER từ host.\n" +
    "Lưu ý: host chưa được xây dựng, chưa có kết nối P2P thật.";
  showScreen("screen-wait");
});
$("btn-back-name").addEventListener("click", function () { showScreen("screen-name"); });

// ---- 2. Mô phỏng lệnh mở từ host ----
$("btn-simulate-host").addEventListener("click", function () {
  // Lệnh thật sẽ là { type: "OPEN_BARRIER" } gửi qua P2P từ host.
  // Host chưa có nên đây chỉ là mô phỏng demo.
  $("p2p-log").textContent += "\nNhận lệnh { type: \"OPEN_BARRIER\" } từ host (MÔ PHỎNG DEMO). Màn chắn đang mở…";
  document.querySelector("#screen-wait .barrier").classList.add("open");
  setTimeout(function () { showScreen("screen-team"); }, 900);
});

// ---- 3. Chọn đội + trợ giúp chia đội ----
$("team-red").addEventListener("click", function () { selectTeam("red"); });
$("team-blue").addEventListener("click", function () { selectTeam("blue"); });
function selectTeam(t) {
  state.team = t;
  $("team-red").classList.toggle("selected", t === "red");
  $("team-blue").classList.toggle("selected", t === "blue");
  $("team-chosen").textContent = "Đã chọn: " + teamName(t) + ".";
  $("btn-confirm-team").disabled = false;
}
$("btn-split").addEventListener("click", function () {
  var total = parseInt($("total-players").value, 10);
  var out = $("split-result");
  if (!total || total < 2 || total > 12) {
    out.textContent = "Nhập tổng số người từ 2 đến 12 (demo).";
    return;
  }
  var result = computeSplit(total);
  out.textContent = result.text;
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
  if (!state.team) return;
  $("draw-team").textContent = teamName(state.team);
  var slots = $("draw-slots");
  slots.innerHTML = "";
  [state.name, "Đồng đội 1 (demo)", "Đồng đội 2 (demo)"].forEach(function (n) {
    var d = document.createElement("div");
    d.className = "draw-slot";
    d.textContent = n;
    slots.appendChild(d);
  });
  $("draw-result").hidden = true;
  $("btn-to-loading").disabled = true;
  $("btn-draw").disabled = false;
  showScreen("screen-draw");
});

// ---- 4. Bốc thăm Vua ----
$("btn-draw").addEventListener("click", function () {
  $("btn-draw").disabled = true;
  var slots = document.querySelectorAll("#draw-slots .draw-slot");
  var i = 0, kingIndex = Math.floor(Math.random() * 3); // bốc ngẫu nhiên 1 trong 3
  var timer = setInterval(function () {
    slots.forEach(function (s) { s.classList.remove("highlight"); });
    slots[i % 3].classList.add("highlight");
    i++;
    if (i > 9) {
      clearInterval(timer);
      slots.forEach(function (s) { s.classList.remove("highlight"); });
      slots[kingIndex].classList.add("highlight");
      state.role = kingIndex === 0 ? "king" : "general";
      var res = $("draw-result");
      if (state.role === "king") {
        res.innerHTML = "<strong>" + state.name + " làm VUA.</strong> Vua có 1 mạng — Vua chết là thua, nhưng có thể chạy trốn với hộ tống. Vua lo xây thành / nhà, tăng dân, tuyển quân.";
      } else {
        res.innerHTML = "<strong>" + slots[kingIndex].textContent + " làm Vua. " + state.name + " làm TƯỚNG.</strong> Tướng có 3 mạng, quân khởi đầu 5.000 bộ binh, có 5 trại lớn và 5 phó tướng.";
      }
      res.hidden = false;
      $("btn-to-loading").disabled = false;
    }
  }, 160);
});

// ---- 5. Màn load rồi vào trận ----
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
  // Đánh dấu nhóm của bạn (Vua hay Tướng).
  $("group-king").classList.toggle("you", state.role === "king");
  $("group-general").classList.toggle("you", state.role === "general");
  $("mark-king").hidden = state.role !== "king";
  $("mark-general").hidden = state.role !== "general";
  if (!state.timerId) {
    state.timerId = setInterval(function () {
      state.timeSec++;
      var m = String(Math.floor(state.timeSec / 60)).padStart(2, "0");
      var s = String(state.timeSec % 60).padStart(2, "0");
      $("stat-time").textContent = m + ":" + s;
    }, 1000);
  }
}

// ---- 6. Map lục giác 32x24 ----
function renderMap() {
  var mapEl = $("map");
  mapEl.innerHTML = "";
  state.map = [];
  for (var row = 0; row < ROWS; row++) {
    var rowEl = document.createElement("div");
    rowEl.className = "hex-row";
    for (var col = 0; col < COLS; col++) {
      var terrain = terrainAt(col, row);
      var zone = zoneOf(col);
      var owner = zone === "neutral" ? null : zone; // đất nhà thuộc phe đó từ đầu
      var hex = { col: col, row: row, terrain: terrain, owner: owner };
      state.map.push(hex);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hex terrain-" + terrain;
      btn.dataset.col = col;
      btn.dataset.row = row;
      btn.title = TERRAIN[terrain].label + " (" + col + "," + row + ")";
      btn.textContent = TERRAIN[terrain].icon;
      if (owner) btn.classList.add("owner-" + owner);
      else btn.classList.add("owner-neutral");
      (function (h, el) {
        el.addEventListener("click", function () { selectHex(h, el); });
      })(hex, btn);
      rowEl.appendChild(btn);
    }
    mapEl.appendChild(rowEl);
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
  $("stat-troops").textContent = fmt(state.troops.infantry + state.troops.archer + state.troops.catapult) + " (bộ binh " + fmt(state.troops.infantry) + ")";
  $("troop-infantry").textContent = fmt(state.troops.infantry);
  $("troop-archer").textContent = fmt(state.troops.archer);
  $("troop-catapult").textContent = fmt(state.troops.catapult);
  updateLandHeld();
}

function selectHex(hex, el) {
  document.querySelectorAll(".hex.selected").forEach(function (h) { h.classList.remove("selected"); });
  el.classList.add("selected");
  state.selected = hex;
  var t = TERRAIN[hex.terrain];
  var ownerText = hex.owner === null ? "Trung lập — chưa ai chiếm (xám)" :
    hex.owner === "blue" ? "Đội Xanh" : "Đội Đỏ";
  var html = "<strong>" + t.label + " (" + hex.col + "," + hex.row + ")</strong><br>" +
    "Chủ: " + ownerText + "<br>" +
    "Chi phí di chuyển: " + t.cost + " (demo) · Phòng thủ: +" + t.defence + " (demo)<br>";
  if (hex.terrain === "palace") html += "Cung điện. Vua ở đây được thủ đô 100.000 quân bảo vệ (đã chốt).";
  if (hex.terrain === "camp") html += "Trại lớn của Tướng: điểm hồi sinh khi Tướng chết, chứa quân của Tướng đó.";
  if (hex.terrain === "recruitment") html += "Trại tuyển quân của Vua.";
  $("hex-info").innerHTML = html;

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
    addButton("Chiếm ô này (Tướng)", function () {
      hex.owner = team;
      el.classList.remove("owner-neutral");
      el.classList.add("owner-" + team);
      if (hex.terrain === "mine") {
        state.gold += DEMO_MINE_GOLD; // demo-only
        $("hex-info").innerHTML += "<br>Đã chiếm mỏ: +" + DEMO_MINE_GOLD + " vàng (demo).";
      } else {
        $("hex-info").innerHTML += "<br>Đã chiếm ô. Ô này giờ hiện màu đội bạn.";
      }
      updateHUD();
      selectHexRefresh(hex);
    });
  }
  if (role === "general" && hex.owner !== null && hex.owner !== team) {
    var note = document.createElement("p");
    note.className = "hint";
    note.textContent = "Ô của địch — cần đánh chiếm. Combat thật chưa được xây trong demo này.";
    actions.appendChild(note);
  }
  if (role === "king" && (hex.terrain === "plains" || hex.terrain === "alluvial")) {
    addButton("Xây nhà (Vua) — " + DEMO_HOUSE_COST + " vàng (demo)", function () {
      if (state.gold < DEMO_HOUSE_COST) { alert("Không đủ vàng (demo)."); return; }
      state.gold -= DEMO_HOUSE_COST;
      state.pop += 20; // đã chốt: 1 nhà ≈ 20 người
      $("hex-info").innerHTML += "<br>Đã xây 1 nhà: +" + 20 + " dân (đã chốt: 1 nhà ≈ 20 người).";
      updateHUD();
    });
    addButton("Tuyển quân (Vua) — +100 lính (demo)", function () {
      state.troops.infantry += DEMO_RECRUIT_TROOPS; // demo-only, tuyển thêm không giới hạn (đã chốt)
      $("hex-info").innerHTML += "<br>Đã tuyển thêm " + DEMO_RECRUIT_TROOPS + " lính (demo). Tổng quân tăng, không giới hạn.";
      updateHUD();
    });
  }
  if (!actions.children.length) {
    var p = document.createElement("p");
    p.className = "hint";
    p.textContent = "Không có hành động cho vai trò của bạn ở ô này trong demo.";
    actions.appendChild(p);
  }
}
function selectHexRefresh(hex) {
  // Cập nhật lại dòng chủ sau khi chiếm ô.
  var el = document.querySelector('.hex[data-col="' + hex.col + '"][data-row="' + hex.row + '"]');
  if (el) selectHex(hex, el);
}

// ---- Chuyển quân: giữ tổng 5.000 (đã chốt) ----
function convert(kind) {
  if (state.troops.infantry < 1000) { alert("Không đủ bộ binh để chuyển (cần 1.000)."); return; }
  state.troops.infantry -= 1000;
  state.troops[kind] += 1000;
  updateHUD();
}
$("btn-convert-archer").addEventListener("click", function () { convert("archer"); });
$("btn-convert-catapult").addEventListener("click", function () { convert("catapult"); });

// Khởi tạo HUD lần đầu (trước khi vào trận, các số hiển thị là số demo/mặc định).
updateHUD();
