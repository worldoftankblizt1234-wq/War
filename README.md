# Game Client — Chiến Thuật 6 Người (Demo)

Bản demo client cho game chiến thuật thời cổ đại / trung cổ, 6 người, 2 đội (3v3).
Mỗi đội: **1 Vua + 2 Tướng**.

> Đây là bản demo client để thử luồng màn hình và map. **Chưa phải game thật.
> Host chưa được xây dựng, chưa có kết nối P2P thật, chưa có combat thật.**

## Chạy thử (local)

Mở trực tiếp file `index.html` bằng trình duyệt, hoặc chạy server local:

```bash
cd war-strategy-6p-client
python3 -m http.server 8000
# rồi mở http://localhost:8000/
```

Không cần cài đặt gì thêm. Không có dependency ngoài: không CDN font/script, chạy offline được.

## Luồng client đã chốt

1. Màn hình chính: nhập tên.
2. Màn chắn: hiện **“Đang chờ host kết nối”**.
3. Host gửi lệnh P2P để mở màn chắn — host **chưa được xây dựng**, nên trong demo có nút
   **“Mô phỏng lệnh mở từ host (OPEN_BARRIER)”** để giả lập lệnh đó.
4. Chọn đội: Đỏ hoặc Xanh. Mỗi đội 3 slot: 1 Vua + 2 Tướng.
5. Máy bốc thăm ngẫu nhiên ai làm Vua trong đội.
6. Màn load (thanh tiến trình, 2 cánh cửa mở ra), rồi vào trận.

## Trong trận

- Màn hình ngang, map lục giác **32×24 = 768 ô** hiện full màn hình. Map gọn, màu
  địa hình dịu, không có nhãn tọa độ hay nút bật/tắt rườm rà. Kéo để di chuyển map,
  lăn chuột / nút + − để zoom.
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

Map demo 32×24 được chia theo tỉ lệ đó để minh họa: Xanh cột 0–5, trung lập cột 6–25,
Đỏ cột 26–31. Các số ô đã scale (144 / 480 / 144) là **số demo đã scale, không phải
số người dùng đưa ra** — đừng trích chúng như số đã chốt.

## Số demo (chưa chốt)

Các số sau trong code và UI chỉ là số demo để demo chạy được, **chưa chốt**:
vàng khởi đầu 1.000, xây nhà 100 vàng, chiếm mỏ +50 vàng, tuyển 1 lần +100 lính,
chi phí di chuyển / phòng thủ theo địa hình. Trong code chúng được ghi `DEMO_…`
và trong UI có ghi “demo”. Chỉ có tỉ lệ **+30%** là đã chốt.

## Tech stack dự kiến (chưa làm trong demo này)

- Cloudflare Pages CDN cho tài nguyên tĩnh của game.
- Tải tài nguyên 1 lần, cache trong IndexedDB, trong trận chỉ đồng bộ thay đổi nhỏ.
- P2P WebRTC đồng bộ thay đổi trạng thái nhỏ giữa 6 người trên cùng WiFi.
- Ngân sách data: 500MB (metered).

Các mục trên là kế hoạch, **chưa được triển khai trong bản demo client này**.

---

## Short English summary

A vanilla HTML/CSS/JS demo client (no dependencies, works offline) for a 6-player,
3v3 ancient/medieval strategy game: 1 King + 2 Generals per team. Flow: enter name →
“waiting for host” barrier → simulated host `OPEN_BARRIER` (real host/P2P not built yet)
→ pick Red or Blue → random King draw → loading screen → landscape full-screen
32×24 hex map (768 hexes) with a slim stats bar overlaid on the top edge of the map
and a compact clickable-hex panel (no rules text in the match screen). Settled rules include
3 lives for Generals, 1 life for the King, 5,000 starting infantry per General,
10 cities per side, and +30% money for the smaller team on an odd split (e.g. 7 = 3 vs 4).
Networking is P2P on the same WiFi only, no TURN relay. Run locally by opening
`index.html` or `python3 -m http.server`.
