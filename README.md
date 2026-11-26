# Game — Chiến Thuật 6 Người (Client + Host)

Game chiến thuật thời cổ đại / trung cổ, 6 người, 2 đội (3v3).
Mỗi đội: **1 Vua + 2 Tướng**.

> Đây vẫn là bản demo, **chưa phải game hoàn chỉnh**: chưa có combat thật,
> chưa có đồng bộ trạng thái trận đầy đủ giữa các máy. Nhưng host và client
> giờ kết nối P2P **thật** bằng WebRTC — không còn nút mô phỏng nào nữa.

## Chạy thử (local)

Mở trực tiếp bằng trình duyệt, hoặc chạy server local:

```bash
cd war-strategy-6p-client
python3 -m http.server 8000
# rồi mở http://localhost:8000/
```

Không cần cài đặt gì thêm. Không có dependency ngoài: không CDN font/script, chạy offline được.

## Cách chơi 2 máy cùng WiFi (host thật)

Cần 2 thiết bị trên **cùng 1 WiFi** (hoặc 2 tab trình duyệt trên cùng 1 máy để thử).

**Bên host:**
1. Mở `host/host.html`.
2. Trang host hiện tên phòng (ví dụ `PHÒNG-7K2Q`) và mã phòng. Bấm **Sao chép mã phòng** rồi gửi mã đó cho client (qua chat, Zalo…).
3. Client sẽ đưa lại mã trả lời — dán mã đó vào ô **“Mã trả lời của client”** rồi bấm **Hoàn tất kết nối**.
4. Có bao nhiêu client thì bấm **Thêm client** bấy nhiêu lần (mỗi client có 1 mã phòng riêng).
5. Khi mọi người đã kết nối, bấm **Mở màn chắn**: host gửi lệnh mở thật, tự chia đội, bốc Vua ngẫu nhiên và gửi trạng thái cho mọi client.

**Bên client:**
1. Mở `index.html`, nhập tên.
2. Dán mã phòng của host vào ô **“Mã phòng của host”**, bấm **Kết nối tới host**.
3. Trang client hiện **mã trả lời của bạn** — sao chép mã đó đưa cho host.
4. Sau khi host hoàn tất kết nối, bấm **Tới màn chắn** và chờ lệnh mở thật từ host.
5. Host chia đội xong thì màn hình hiện đội và vai trò của bạn (do host bốc), rồi màn load, rồi vào trận.

Không cần server, không cần TURN relay, không cần key/secret nào. Kết nối
dùng `RTCPeerConnection` với `iceServers: []` (chỉ host candidates trên cùng WiFi).

## Giao thức tin nhắn (nhỏ, qua RTCDataChannel "game")

Host là nguồn duy nhất cho: mở màn chắn, chia đội, bốc Vua.

| Hướng | Tin nhắn | Nội dung |
|---|---|---|
| Client → Host | `JOIN` | `{type:"JOIN", name}` |
| Host → Client | `OPEN_BARRIER` | `{type:"OPEN_BARRIER"}` — mở màn chắn thật |
| Host → Client | `TEAM_ASSIGN` | `{type:"TEAM_ASSIGN", team, role, members, kingName, teamSize, bonusPct}` |
| Host → Client | `STATE` | `{type:"STATE", players, time}` — trạng thái chung |
| Client → Host | `STATE` | `{type:"STATE", name, gold, land}` — cập nhật nhỏ từ client |

## Luồng client

1. Màn hình chính: nhập tên.
2. Nhập mã phòng của host → tạo mã trả lời → đưa mã trả lời cho host.
3. Màn chắn: hiện **“Đang chờ host kết nối”**, chờ lệnh `OPEN_BARRIER` thật từ host.
4. Đội do host chia: Đỏ hoặc Xanh. Mỗi đội 3 slot: 1 Vua + 2 Tướng.
5. Kết quả bốc Vua do host gửi: hiện ai là Vua trong đội.
6. Màn load (thanh tiến trình, 2 cánh cửa mở ra), rồi vào trận.

## Trong trận

- Màn hình ngang, map lục giác **32×24 = 768 ô** hiện full màn hình. Map được vẽ
  bằng SVG polygon với hình học lục giác đúng (pointy-top, xem `hex-geometry.js`
  và tự kiểm tra bằng `node test-hex.js`): các ô kề nhau chia đúng 1 cạnh,
  không chồng lấn, không khe hở hình thoi. Kéo để di chuyển map, lăn chuột /
  nút + − để zoom.
- Thanh thông số là một lớp mỏng đè trên cạnh trên của map (không đẩy map xuống):
  thông số chung (vàng, dân, đất đang giữ, thời gian) + thông số riêng gọn cho
  Vua và cho Tướng. Nhóm của bạn được đánh dấu “BẠN”.
- Bấm vào một ô sẽ hiện panel nhỏ gọn ở góc dưới phải: tên địa hình, chủ, chi phí
  di chuyển, phòng thủ và nút hành động theo vai trò (Tướng chiếm đất / mỏ,
  Vua xây nhà / tuyển quân), kèm nút chuyển quân của Tướng. Không có panel luật
  hay đoạn giải thích dài trong màn hình trận.
- Vùng trung lập ở giữa hiện xám khi chưa ai chiếm, chỉ hiện màu phe khi phe đó tới chiếm.
  Vùng trung lập có mỏ, nhà thờ, thành, đất bồi, **không có núi**. Ai cũng có thể chiếm.

## Luật đã chốt (tóm tắt)

- **Tướng:** 3 mạng. Hồi sinh: căn cứ gốc → cung điện → căn cứ khác. Hết 3 mạng là
  chết hẳn, Vua tuyển Tướng mới thay đúng chỗ trống. Mỗi Tướng có 5 trại lớn
  (điểm hồi sinh, chứa quân) và 5 phó tướng chỉ huy theo lệnh.
- **Vua:** 1 mạng. Vua chết là thua. Vua có thể chạy trốn với hộ tống tới căn cứ
  khác và chơi tiếp. Vua xây thành / nhà, tăng dân, lo tuyển quân (trại tuyển quân).
- **Quân ban đầu mỗi Tướng:** 5.000 bộ binh. Chuyển một phần sang cung thủ / máy bắn đá
  thì tổng vẫn giữ 5.000 (ví dụ 4.000 bộ binh + 1.000 cung thủ). Tuyển thêm sau
  này thì không giới hạn.
- **Thủ đô:** 100.000 quân bảo vệ Vua.
- **Thành:** mỗi bên có 10 thành. Một khu dân cư chỉ tính là thành khi được bao quanh
  bởi tường dày 1 ô; thành gồm 19 ô (bán kính 2). 1 nhà ≈ 20 người.
- **Thời đại:** cổ đại / trung cổ. Quân: bộ binh, cung thủ, kỵ binh, tượng binh,
  máy bắn đá. **Không có quân hiện đại** (không tank, pháo binh, không quân, hải quân).
- **Chia đội:** chẵn người máy tự chia đôi; lẻ người chia lệch, ví dụ 7 người = 3 vs 4,
  đội ít người hơn được **+30% tiền** (đã chốt).
- **Mạng:** P2P chỉ trên cùng 1 WiFi, **không dùng TURN relay**. Không có key/secret nào
  trong repo này.

## Tỉ lệ lãnh thổ — ví dụ của người dùng

Người dùng đưa ví dụ: **mỗi bên 30 ô, vùng trung lập ở giữa 100 ô** (30-100-30).
Đó là tỉ lệ ví dụ, không phải số ô trên map 32×24.

Map 32×24 được chia theo tỉ lệ đó để minh họa: Xanh cột 0–5, trung lập cột 6–25,
Đỏ cột 26–31. Các số ô đã scale (144 / 480 / 144) là **số demo đã scale, không phải
số người dùng đưa ra** — đừng trích chúng như số đã chốt.

## Số demo (chưa chốt)

Các số sau trong code và UI chỉ là số demo để demo chạy được, **chưa chốt**:
vàng khởi đầu 1.000, xây nhà 100 vàng, chiếm mỏ +50 vàng, tuyển 1 lần +100 lính,
chi phí di chuyển / phòng thủ theo địa hình. Trong code chúng được ghi `DEMO_…`
và trong UI có ghi “demo”. Chỉ có tỉ lệ **+30%** là đã chốt.

## Tech stack dự kiến (chưa làm hết)

- Cloudflare Pages CDN cho tài nguyên tĩnh của game.
- Tải tài nguyên 1 lần, cache trong IndexedDB, trong trận chỉ đồng bộ thay đổi nhỏ.
- P2P WebRTC đồng bộ thay đổi trạng thái nhỏ giữa 6 người trên cùng WiFi.
- Ngân sách data: 500MB (metered).

Các mục trên là kế hoạch, **chưa được triển khai đầy đủ trong bản demo này**.

## File trong repo

| File | Mô tả |
|---|---|
| `index.html` | Client: nhập tên → mã phòng → màn chắn → đội → bốc Vua → load → trận |
| `styles.css` | Giao diện client + host (dark, màn hình ngang) |
| `app.js` | Logic client + kết nối P2P + vẽ map SVG |
| `hex-geometry.js` | Hình học lục giác pointy-top (dùng chung cho map và test) |
| `test-hex.js` | Tự kiểm tra hình học lục giác — chạy `node test-hex.js` |
| `host/host.html` | Host: tạo phòng, mã phòng, hoàn tất kết nối, mở màn chắn |
| `host/host.js` | Logic host: nhiều RTCPeerConnection, chia đội, bốc Vua |

---

## Short English summary

A vanilla HTML/CSS/JS 6-player 3v3 ancient/medieval strategy game client + real
host (no dependencies, works offline). The hex map (32×24) is now rendered as
inline SVG polygons with correct pointy-top hex geometry (verified by
`node test-hex.js`: every neighbour pair shares exactly one edge, no overlaps,
no diamond gaps). The fake host simulation is gone: the client joins a real host
by pasting the host's offer code and returning an answer code, then waits for a
real `OPEN_BARRIER` message over an RTCDataChannel. The host (`host/`) supports
multiple peer connections, auto-splits teams (even half/half, odd uneven e.g.
7 = 3 vs 4 with +30% money for the smaller team), draws the King at random, and
broadcasts state. Protocol: JOIN, OPEN_BARRIER, TEAM_ASSIGN, STATE. Networking
is P2P on the same WiFi only, no TURN relay, no secrets. Still a demo: no real
combat yet.
