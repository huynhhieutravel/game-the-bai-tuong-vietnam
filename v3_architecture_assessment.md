# 🏗️ Đánh Giá Toàn Diện Kiến Trúc v3 & Đề Xuất Nâng Cấp v4

> **Ngày lập:** 2026-07-05  
> **Phiên bản đánh giá:** v3 (sau 5 lần sửa lỗi lớn)  
> **Mục đích:** Lưu trữ vĩnh viễn bản chẩn đoán kiến trúc để tham chiếu khi nâng cấp v4

## Tổng Quan Dự Án Hiện Tại

| Chỉ số | Giá trị |
|---|---|
| Tổng dòng code (JS/JSX/CSS) | **~27,300 dòng** |
| File lớn nhất | `SkillRegistry.js` — **2,921 dòng** |
| File UI lớn nhất | `GameView.jsx` — **1,666 dòng** |
| File Modal lớn nhất | `ModalContainer.jsx` — **1,071 dòng** |
| Số lượng Modal riêng lẻ | **30 file** |
| Số lượng Unit Tests | **43 test cases** (6 file test) |
| Thư mục rỗng (unused) | 3 (`effects/`, `events/`, `actions/`, `hooks/`) |
| File chết / backup | `App.jsx.bak` (4,865 dòng), `phase4_backup/` (7 file), `botAI.js` (1,097 dòng) |

---

## Phần I — Điểm Mạnh Của v3 (Đã Làm Tốt)

### ✅ 1. Kiến trúc Dispatcher/Event-Driven
Engine đã chuyển thành công sang mô hình **Dispatcher → Action → Event → Effect → State**, thay thế hoàn toàn cách gọi trực tiếp hàm xử lý. Đây là nền tảng vững chắc cho multiplayer sau này.

### ✅ 2. Tách riêng Data-Driven Registries
Các Registry (`SkillRegistry`, `CardRegistry`, `HeroRegistry`, `EquipRegistry`) đóng vai trò "Database" nội bộ, giúp việc thêm mới tướng/bài/kỹ năng chỉ cần khai báo data mà không đụng vào logic.

### ✅ 3. Handler Pattern cho Dispatcher
Đã tách `Dispatcher.js` thành 3 handler chuyên biệt (`PhaseHandler`, `CombatHandler`, `TrickHandler`), giúp file chính không phình thêm.

### ✅ 4. Context-based State Management
Kiến trúc React dùng `GameProvider` + `SelectionProvider` tách biệt rõ State (render) vs API (hành động), tránh re-render toàn bộ UI.

### ✅ 5. Hệ thống Wiki/Documentation trong game
Có đầy đủ trang Wiki nội bộ (Heroes, Cards, Rules, Bug History), rất chuyên nghiệp cho việc QA và phát triển.

### ✅ 6. Bot AI có chiều sâu
Bot có hệ thống đánh giá faction, ưu tiên mục tiêu, fallback chống kẹt game — không phải AI đánh bừa.

---

## Phần II — Các Vấn Đề Cấu Trúc Nghiêm Trọng (Technical Debt)

### 🔴 Vấn đề 1: "God Component" — `GameView.jsx` (1,666 dòng)
**Mức độ: NGHIÊM TRỌNG**

File này gánh toàn bộ: logic xử lý kỹ năng, targeting, card click, draw, discard, draft, UI render... Mỗi lần fix bug là phải sờ vào file này, dẫn tới bug dây chuyền (như lỗi TDZ vừa rồi).

> ⚠️ **WARNING:** Đây là **rủi ro lớn nhất** của dự án. Mỗi tính năng mới thêm vào đều tăng xác suất va chạm code.

### 🔴 Vấn đề 2: "God Registry" — `SkillRegistry.js` (2,921 dòng)
**Mức độ: NGHIÊM TRỌNG**

Gần 3,000 dòng chứa logic của **tất cả** kỹ năng. Khi có ~30 tướng × 2-3 kỹ năng = ~70+ kỹ năng trong cùng 1 file. Rất khó tìm lỗi, dễ conflict khi sửa song song.

### 🟡 Vấn đề 3: File Chết / Code Zombie
**Mức độ: TRUNG BÌNH**

| File / Thư mục | Dòng | Tình trạng |
|---|---|---|
| `App.jsx.bak` | 4,865 | File backup khổng lồ, không ai import |
| `engine/phase4_backup/` | ~7 file | Thư mục backup nguyên hệ thống cũ |
| `engine/botAI.js` | 1,097 | Bot AI cũ, chỉ còn `SkillRegistry` comment nhắc tới |
| `engine/effects/` | 0 | Thư mục rỗng |
| `engine/events/` | 0 | Thư mục rỗng |
| `engine/actions/` | 0 | Thư mục rỗng |
| `hooks/` | 0 | Thư mục rỗng |

Tổng "xác chết" này chiếm ~6,000+ dòng code vô ích, gây nhiễu loạn khi tìm kiếm và điều hướng.

### 🟡 Vấn đề 4: Hệ Thống Legacy Bridge Cồng Kềnh
**Mức độ: TRUNG BÌNH**

File `engine/index.js` tồn tại duy nhất để chuyển đổi (bridge) API cũ sang Dispatcher mới. `GameView.jsx` vẫn import **14 hàm** từ file bridge này, thay vì gọi thẳng `gameAPI.xxx()`.

Hệ quả: Có **2 cách** làm cùng 1 việc (gọi qua bridge hoặc gọi qua GameAPI), dẫn tới confusion và bug Payload Mismatch.

### 🟡 Vấn đề 5: `ModalContainer.jsx` Monolithic (1,071 dòng)
**Mức độ: TRUNG BÌNH**

Mặc dù đã tách được 30 modal nhỏ ra riêng, file `ModalContainer.jsx` vẫn chứa logic routing + nhiều inline modal template chưa tách. Khi thêm kỹ năng mới, file này tiếp tục phình to.

### 🟢 Vấn đề 6: Duplicate `getState()`
**Mức độ: NHẸ**

`Dispatcher.js` khai báo `getState()` **2 lần** (dòng 40 và 44). Không gây crash nhưng là dấu hiệu code chưa được review kỹ.

### 🟢 Vấn đề 7: GameView import cả Engine lẫn GameAPI
**Mức độ: NHẸ**

`GameView.jsx` import từ **5 nguồn khác nhau** trong Engine (index, rules, ai, core, constants). Ranh giới "UI chỉ nói chuyện với API" bị phá vỡ.

---

## Phần III — Bảng Đánh Giá Tổng Thể v3

| Tiêu chí | Điểm | Ghi chú |
|---|---|---|
| **Engine Core** (Dispatcher/Reducer/Effects) | 8.5/10 | Kiến trúc Event-Driven vững chắc, chỉ cần cleanup |
| **Data Layer** (Registries/Data) | 7.0/10 | Hoạt động tốt nhưng SkillRegistry quá lớn |
| **UI Architecture** (Components/Modals) | 5.5/10 | GameView là God Component, tải nợ kỹ thuật lớn |
| **Code Hygiene** (Dead code/Naming) | 5.0/10 | Nhiều file zombie, bridge legacy, duplicate |
| **Testability** | 6.0/10 | 43 test cases cho Engine, 0 integration test |
| **Scalability** (Thêm tướng/bài/kỹ năng mới) | 6.5/10 | Registry pattern tốt, nhưng UI là nút cổ chai |
| **Tổng điểm** | **6.4/10** | Trung bình khá — **Engine tốt, UI cần tái cấu trúc** |

---

## Phần IV — Đề Xuất Nâng Cấp v4

> ℹ️ **IMPORTANT:** Em không khuyến khích viết lại (rewrite) toàn bộ. Thay vào đó, v4 nên là quá trình **tái cấu trúc từng bước (incremental refactor)** mà không phá vỡ chức năng hiện tại.

### Giai đoạn 1: Dọn dẹp (1-2 ngày)
- [ ] Xóa `App.jsx.bak`, `phase4_backup/`, `botAI.js` (cũ), thư mục rỗng
- [ ] Xóa duplicate `getState()` trong Dispatcher
- [ ] Ghi nhận danh sách file đã xóa vào Bug History

### Giai đoạn 2: Tách `GameView.jsx` (3-5 ngày)
- [ ] Tách logic targeting → `hooks/useTargeting.js`
- [ ] Tách logic skill execution → `hooks/useSkillExecution.js`
- [ ] Tách logic card interaction → `hooks/useCardInteraction.js`
- [ ] Tách logic draft → `components/game/DraftScreen.jsx`
- [ ] Tách render sections → `components/game/PlayerHand.jsx`, `OpponentZone.jsx`, `ActionBar.jsx`
- [ ] `GameView.jsx` chỉ còn là "shell" ghép các hook + component lại

### Giai đoạn 3: Loại bỏ Legacy Bridge (1-2 ngày)
- [ ] Chuyển toàn bộ import từ `engine/index.js` sang `gameAPI.xxx()` trong mọi component
- [ ] Giữ `engine/index.js` chỉ export utility thuần (`getDistance`, `rankToNumber`)
- [ ] Xóa các hàm wrapper (`drawCards`, `playCard`, `handleResponse`...) trong index.js

### Giai đoạn 4: Tách `SkillRegistry.js` (2-3 ngày)
- [ ] Chia thành file theo Phe: `skills/LacSkills.js`, `skills/SonSkills.js`, `skills/VietSkills.js`, `skills/NeutralSkills.js`
- [ ] `SkillRegistry.js` chỉ còn là file aggregate (gom các file con lại)

### Giai đoạn 5: Tăng cường Testing (2-3 ngày)
- [ ] Thêm Integration Tests cho flow: Draft → Draw → Play Card → Respond → End Turn
- [ ] Thêm Tests cho Active Skills (UI dispatch → Engine process → State change)
- [ ] Target: ≥80 test cases

---

## Open Questions

> ℹ️ **IMPORTANT:** Anh cần quyết định trước khi em bắt tay vào:

1. **Anh có muốn thực hiện v4 toàn bộ 5 giai đoạn, hay chỉ chọn một số giai đoạn ưu tiên?**
2. **Có tính năng mới nào (VD: multiplayer online, thêm tướng mới) đang cần gấp không?** Nếu có, em sẽ ưu tiên giai đoạn nào giúp tính năng đó dễ triển khai nhất.
3. **File `botAI.js` (1,097 dòng) trong engine root — có cần giữ làm tham khảo không, hay xóa luôn?**
