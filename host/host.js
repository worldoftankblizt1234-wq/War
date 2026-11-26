// Host — WebRTC thật, file tĩnh, không server, không TURN relay.
// Host là nguồn duy nhất cho: mở màn chắn, chia đội, bốc Vua.
// Giao thức tin nhắn (xem README.md):
//   Client -> Host: JOIN {name}, STATE {name, gold, land}
//   Host -> Client: OPEN_BARRIER, TEAM_ASSIGN {team, role, members, kingName, teamSize, bonusPct}, STATE
// Ghép nối thủ công: host đưa mã phòng (offer) cho client, client đưa mã
// trả lời (answer) lại cho host. Mỗi client có 1 RTCPeerConnection riêng.
// Không có key/secret nào trong file này.
"use strict";

var ROOM = "PHÒNG-" + Math.random().toString(36).slice(2, 6).toUpperCase();
var peers = []; // {id, pc, dc, name, connected, completed, els}
var peerCounter = 0;

function $(id) { return document.getElementById(id); }
function logHost(line) {
  var log = $("host-log");
  log.textContent += (log.textContent ? "\n" : "") + line;
  log.scrollTop = log.scrollHeight;
}

// ---- Mã hoá / giải mã mã phòng (base64 JSON) ----
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
  function done() {
    if (btn) {
      var old = btn.textContent;
      btn.textContent = "ĐÃ SAO CHÉP ✓";
      setTimeout(function () { btn.textContent = old; }, 1500);
    }
  }
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

// ---- Chia đội: chẵn chia đôi, lẻ chia lệch, đội ít người +30% tiền (đã chốt) ----
function computeSplit(total) {
  if (total % 2 === 0) {
    return { small: total / 2, large: total / 2, bonusPct: 0 };
  }
  return { small: Math.floor(total / 2), large: Math.ceil(total / 2), bonusPct: 0.30 };
}
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// ---- Tạo 1 peer (1 RTCPeerConnection riêng cho 1 client) ----
function createPeer() {
  peerCounter++;
  var peer = { id: peerCounter, pc: null, dc: null, name: "", connected: false, completed: false, els: {} };
  peers.push(peer);

  // Thẻ UI cho peer này.
  var card = document.createElement("div");
  card.className = "peer-card";
  card.innerHTML =
    '<div class="peer-head"><strong>Client #' + peer.id + '</strong>' +
    '<span class="peer-status">Đang tạo mã phòng…</span></div>' +
    '<div class="peer-name">Tên: —</div>' +
    '<label>Mã phòng (đưa mã này cho client)</label>' +
    '<textarea class="code-box offer-code" rows="3" readonly placeholder="Đang tạo mã phòng…"></textarea>' +
    '<button class="btn secondary btn-copy-offer" type="button">SAO CHÉP MÃ PHÒNG</button>' +
    '<label>Mã trả lời của client</label>' +
    '<textarea class="code-box answer-code" rows="3" placeholder="Dán mã trả lời của client vào đây…"></textarea>' +
    '<button class="btn primary btn-complete" type="button">HOÀN TẤT KẾT NỐI</button>';
  $("peers").appendChild(card);
  peer.els = {
    card: card,
    status: card.querySelector(".peer-status"),
    name: card.querySelector(".peer-name"),
    offer: card.querySelector(".offer-code"),
    answer: card.querySelector(".answer-code"),
    copyBtn: card.querySelector(".btn-copy-offer"),
    completeBtn: card.querySelector(".btn-complete")
  };
  peer.els.copyBtn.addEventListener("click", function () {
    copyText(peer.els.offer.value, peer.els.copyBtn);
  });
  peer.els.completeBtn.addEventListener("click", function () { completePeer(peer); });

  // Không có STUN/TURN: chỉ dùng host candidates trên cùng WiFi.
  peer.pc = new RTCPeerConnection({ iceServers: [] });
  peer.dc = peer.pc.createDataChannel("game");
  peer.dc.onopen = function () {
    peer.connected = true;
    setPeerStatus(peer, "Đã kết nối ✓", true);
    logHost("Client #" + peer.id + ": kênh dữ liệu đã mở, chờ JOIN.");
    updatePlayersList();
    updateOpenButton();
  };
  peer.dc.onclose = function () {
    peer.connected = false;
    setPeerStatus(peer, "Đã mất kết nối", false);
    logHost("Client #" + peer.id + ": kênh dữ liệu đã đóng.");
    updatePlayersList();
    updateOpenButton();
  };
  peer.dc.onmessage = function (ev) {
    var msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (msg.type === "JOIN") {
      peer.name = String(msg.name || "").slice(0, 20) || ("Client #" + peer.id);
      peer.els.name.textContent = "Tên: " + peer.name;
      logHost("Client #" + peer.id + " đã tham gia: " + peer.name);
      updatePlayersList();
    } else if (msg.type === "STATE") {
      logHost("STATE từ " + (msg.name || peer.name) + ": vàng " + msg.gold + ", đất " + msg.land + " ô.");
    }
  };
  peer.pc.onconnectionstatechange = function () {
    logHost("Client #" + peer.id + ": trạng thái kết nối = " + peer.pc.connectionState);
  };

  // Tạo offer ngay để host sao chép mã phòng được luôn.
  peer.pc.createOffer()
    .then(function (offer) { return peer.pc.setLocalDescription(offer); })
    .then(function () { return waitIceComplete(peer.pc); })
    .then(function () {
      peer.els.offer.value = encodeCode({ type: "offer", room: ROOM, sdp: peer.pc.localDescription.sdp });
      setPeerStatus(peer, "Đã tạo mã phòng — đưa cho client", false);
      logHost("Client #" + peer.id + ": đã tạo mã phòng (" + ROOM + ").");
    })
    .catch(function (err) {
      setPeerStatus(peer, "Lỗi tạo mã phòng: " + err.message, false);
      logHost("Client #" + peer.id + ": lỗi tạo offer — " + err.message);
    });
  return peer;
}

function setPeerStatus(peer, text, connected) {
  peer.els.status.textContent = text;
  peer.els.status.classList.toggle("connected", !!connected);
}

function completePeer(peer) {
  if (peer.completed) return;
  var code = peer.els.answer.value.trim();
  if (!code) { setPeerStatus(peer, "Hãy dán mã trả lời của client vào ô trên trước.", false); return; }
  var answer;
  try {
    answer = decodeCode(code);
  } catch (e) {
    setPeerStatus(peer, "Mã trả lời không đúng định dạng. Hãy sao chép lại mã từ client.", false);
    return;
  }
  if (!answer || answer.type !== "answer" || !answer.sdp) {
    setPeerStatus(peer, "Mã trả lời không hợp lệ (thiếu SDP).", false);
    return;
  }
  peer.pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answer.sdp }))
    .then(function () {
      peer.completed = true;
      setPeerStatus(peer, "Đã nhận mã trả lời — đang kết nối…", false);
      logHost("Client #" + peer.id + ": đã nhận mã trả lời, đang hoàn tất kết nối.");
    })
    .catch(function (err) {
      setPeerStatus(peer, "Hoàn tất kết nối lỗi: " + err.message, false);
      logHost("Client #" + peer.id + ": hoàn tất kết nối lỗi: " + err.message);
    });
}

function connectedPeers() {
  return peers.filter(function (p) { return p.dc && p.dc.readyState === "open"; });
}
function sendToPeer(peer, msg) {
  if (peer.dc && peer.dc.readyState === "open") {
    peer.dc.send(JSON.stringify(msg));
  }
}
function updatePlayersList() {
  var el = $("host-players");
  var names = peers.filter(function (p) { return p.name; }).map(function (p) { return p.name; });
  if (!names.length) {
    el.textContent = "Chưa có người chơi nào kết nối.";
    return;
  }
  el.textContent = "Người chơi đã kết nối (" + names.length + "): " + names.join(" · ");
}
function updateOpenButton() {
  $("btn-open-barrier").disabled = connectedPeers().length === 0;
}

// ---- Mở màn chắn: gửi OPEN_BARRIER, chia đội, bốc Vua, gửi trạng thái ----
$("btn-open-barrier").addEventListener("click", function () {
  var connected = connectedPeers();
  if (!connected.length) {
    logHost("Chưa có client nào kết nối — nút mở màn chắn đang bị vô hiệu hóa.");
    return;
  }
  // 1. Mở màn chắn cho tất cả client.
  connected.forEach(function (p) { sendToPeer(p, { type: "OPEN_BARRIER" }); });
  logHost("Đã gửi OPEN_BARRIER cho " + connected.length + " client.");

  // 2. Chia đội: xáo trộn rồi chia theo số người (chẵn chia đôi, lẻ chia lệch).
  var players = shuffle(connected.map(function (p) {
    return { peer: p, name: p.name || ("Client #" + p.id) };
  }));
  var split = computeSplit(players.length);
  // Đội Đỏ nhận nhóm lớn, đội Xanh nhận nhóm nhỏ (đội nhỏ +30% tiền khi lẻ).
  var reds = players.slice(0, split.large);
  var blues = players.slice(split.large);
  var assignments = [];
  function assignTeam(members, team, bonusPct) {
    if (!members.length) return;
    var king = members[Math.floor(Math.random() * members.length)];
    members.forEach(function (m) {
      assignments.push({
        peer: m.peer, team: team,
        role: m.name === king.name ? "king" : "general",
        members: members.map(function (x) { return x.name; }),
        kingName: king.name,
        teamSize: members.length,
        bonusPct: bonusPct
      });
    });
    logHost("Đội " + (team === "red" ? "Đỏ" : "Xanh") + " (" + members.length + " người): " +
      members.map(function (x) { return x.name; }).join(", ") + " — Vua: " + king.name +
      (bonusPct ? " — đội ít người +30% tiền." : ""));
  }
  assignTeam(reds, "red", 0);
  assignTeam(blues, "blue", split.bonusPct);

  // 3. Gửi TEAM_ASSIGN cho từng client.
  assignments.forEach(function (a) {
    sendToPeer(a.peer, {
      type: "TEAM_ASSIGN",
      team: a.team, role: a.role,
      members: a.members, kingName: a.kingName,
      teamSize: a.teamSize, bonusPct: a.bonusPct
    });
  });

  // 4. Gửi trạng thái chung.
  var stateMsg = {
    type: "STATE",
    players: assignments.map(function (a) {
      return { name: a.peer.name, team: a.team, role: a.role };
    }),
    time: Date.now()
  };
  connected.forEach(function (p) { sendToPeer(p, stateMsg); });
  logHost("Đã chia đội và bốc Vua xong. Trận đấu bắt đầu.");
  $("btn-open-barrier").disabled = true;
});

$("btn-add-peer").addEventListener("click", function () {
  createPeer();
  logHost("Đã thêm 1 client mới — sao chép mã phòng mới cho client đó.");
});

// Khởi tạo: tên phòng + peer đầu tiên.
$("room-name").textContent = ROOM;
logHost("Host đã tạo phòng " + ROOM + ". Đang tạo mã phòng cho client đầu tiên…");
createPeer();
