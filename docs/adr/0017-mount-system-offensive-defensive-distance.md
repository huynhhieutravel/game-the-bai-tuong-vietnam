# ADR 0017: Hệ Thống Tọa Kỵ (Ngựa), Tính Cự Ly Hiệu Dụng, Cộng Dồn Kỹ Năng & Bắn Hạ Ngựa Kỳ Lân Cung

## Trạng thái
Đã chấp thuận (Accepted) — Đã thống nhất qua phiên `/grill-with-docs`.

## Bối cảnh (Context)
Trong hệ thống Trang Bị của Việt Sát Engine v4, phân hệ **Tọa Kỵ (Ngựa / Mounts)** điều phối và biến đổi khoảng cách tương tác giữa các người chơi trên bàn cờ vòng tròn. Phân hệ bao gồm 2 loại ngựa đặc thù:
1. **Ngựa Tấn Công (-1)** (`Ngựa Chiến (-1)`): Giúp chủ nhân rút ngắn khoảng cách khi tấn công hoặc thi triển hành động hướng tới người chơi khác.
2. **Ngựa Phòng Thủ (+1)** (`Ngựa Thần (+1)`): Khiến mọi người chơi khác gặp khó khăn hơn khi tiếp cận chủ nhân bằng cách kéo giãn khoảng cách thêm +1.
3. **Bài toán tương tác**:
   - Cần xác định rõ 2 ô trang bị độc lập trên người chơi (`horse_attack` và `horse_defense`).
   - Công thức tính cự ly hiệu dụng cần đảm bảo khoảng cách tối thiểu giữa 2 người chơi khác nhau không bao giờ nhỏ hơn 1.
   - Cộng dồn đồng bộ với kỹ năng tướng (Thánh Gióng "Thiết Mã" -1, Sơn Tinh "Dời Núi" +1, Tiên Dung "Tiên Duyên" +1).
   - Ranh giới cự ly với Cẩm Nang (Cướp Bài yêu cầu cự ly $\le 1$).
   - Cơ chế bắn hạ ngựa của vũ khí Kỳ Lân Cung (Kylin Bow).

## Quyết định Thiết kế (Decisions)

### 1. Danh Mục Tọa Kỵ & Hai Ô Trang Bị Độc Lập
- Hệ thống hỗ trợ 2 ô Tọa Kỵ riêng biệt:
  - `player.equipment.horse_attack`: Chỉ lắp các thẻ bài thuộc phân loại `equip_mount_atk` (hoặc tên chứa `(-1)`).
  - `player.equipment.horse_defense`: Chỉ lắp các thẻ bài thuộc phân loại `equip_mount_def` (hoặc tên chứa `(+1)`).
- Một người chơi có thể trang bị đồng thời cả 1 Ngựa Tấn Công và 1 Ngựa Phòng Thủ. Khi trang bị một con ngựa mới cùng chủng loại, con ngựa cũ sẽ bị thay thế và đưa vào `discardPile` (kích hoạt `ON_EQUIP_LOST`).
- **Phân bổ trong bộ bài chuẩn 106 lá**:
  - 3 lá `Ngựa Chiến (-1)` (`CARD_SUBTYPES.EQUIP_MOUNT_ATK`).
  - 3 lá `Ngựa Thần (+1)` (`CARD_SUBTYPES.EQUIP_MOUNT_DEF`).

### 2. Công Thức Cự Ly Hiệu Dụng & Ràng Buộc Sàn Cự Ly = 1
- Khoảng cách vòng tròn vật lý giữa hai người chơi $i$ và $j$ trong danh sách người chơi còn sống ($N$ người):
  $$D_{\text{raw}} = \min(|i - j|, N - |i - j|)$$
- Khoảng cách hiệu dụng khi $i$ tiếp cận hoặc tấn công $j$:
  $$D_{\text{eff}} = \max(1, D_{\text{raw}} - \text{AtkMod} + \text{DefMod})$$
  - $\text{AtkMod} = 1$ nếu $i$ có trang bị `horse_attack`.
  - $\text{DefMod} = 1$ nếu $j$ có trang bị `horse_defense`.
- **Ràng buộc sàn (Minimum Floor)**: Cho dù $\text{AtkMod}$ có lớn đến mức nào, khoảng cách $D_{\text{eff}}$ giữa 2 người chơi khác biệt luôn được giới hạn tối thiểu là 1.

### 3. Cộng Dồn Với Kỹ Năng Tướng (Stacking Invariants)
- **Thánh Gióng — Thiết Mã**:
  - Kỹ năng nội tại giảm khoảng cách từ Gióng đến người khác đi 1 ($\text{AtkMod} += 1$).
  - Khi Gióng trang bị thêm `Ngựa Chiến (-1)`, tổng $\text{AtkMod} = 2$. Người ở vị trí đối diện cự ly gốc 3 sẽ bị rút ngắn còn cự ly 1.
- **Sơn Tinh — Dời Núi**:
  - Kỹ năng nội tại tăng khoảng cách từ người khác đến Sơn Tinh thêm 1 ($\text{DefMod} += 1$).
  - Khi Sơn Tinh trang bị thêm `Ngựa Thần (+1)`, tổng $\text{DefMod} = 2$. Kẻ địch kế bên cự ly gốc 1 sẽ nhìn Sơn Tinh ở cự ly 3.
- **Tiên Dung — Tiên Duyên**:
  - Tăng khoảng cách từ người khác giới tính đến Tiên Dung thêm 1, cộng dồn độc lập với Ngựa Phòng Thủ (+1).

### 4. Tác Động Lên Cẩm Nang Cự Ly (Cướp Bài & Mượn Đao)
- **Cướp Bài (Snatch)**:
  - Ràng buộc kích hoạt: $D_{\text{eff}} \le 1$.
  - Nếu nạn nhân kế bên ($D_{\text{raw}} = 1$) có `Ngựa Thần (+1)`, $D_{\text{eff}} = 2 \rightarrow$ Kẻ tấn công KHÔNG THỂ sử dụng Cướp Bài trừ khi có `Ngựa Chiến (-1)` hoặc kỹ năng bỏ qua cự ly cẩm nang (Tiên Dung).
- **Tước Bài (Dismantle)**:
  - Không giới hạn cự ly $\rightarrow$ Ngựa Phòng Thủ không có tác dụng ngăn cản Tước Bài.
- **Mượn Đao (Borrow Sword)**:
  - Tầm đánh của nạn nhân được tính dựa trên Vũ Khí và Ngựa Tấn Công của họ đến mục tiêu được chỉ định.

### 5. Cơ Chế Bắn Hạ Tọa Kỵ Bởi Kỳ Lân Cung (Kylin Bow)
- Khi tướng trang bị **Kỳ Lân Cung** (Tầm 5) dùng [Chém] gây sát thương lên mục tiêu sở hữu Ngựa:
  - Xạ thủ có quyền bắn hạ 1 con ngựa của mục tiêu.
  - **Thứ tự ưu tiên triệt hạ**: Bắn hạ `horse_defense` trước; nếu mục tiêu không có `horse_defense` thì bắn hạ `horse_attack`.
  - Ngựa bị bắn hạ được đưa vào `discardPile` và kích hoạt sự kiện `ON_EQUIP_LOST` (cho phép Hồ Xuân Hương kích hoạt rút 2 bài qua kỹ năng Xuân Hương).

## Hệ Quả (Consequences)
- Đóng đinh chuẩn xác quy tắc tính khoảng cách vòng tròn, giải quyết triệt để các tình huống cự ly trong thi triển Chém và Cẩm Nang.
- Xác lập 2 ô trang bị độc lập `horse_attack` và `horse_defense`, bảo toàn toàn vẹn trạng thái GameState.
- Bộ test suite `MountQA.test.js` kiểm thử toàn bộ các kịch bản cộng dồn, bắn hạ bởi Kỳ Lân Cung và biên luật cự ly.
