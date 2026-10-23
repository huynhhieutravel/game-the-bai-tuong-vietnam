# 0003. Chuẩn Hóa Cấu Trúc Trạng Thái Cặp Tướng (Dual Heroes) & Cơ Chế Lộ Diện Trong Quốc Chiến

- **Status:** Accepted
- **Date:** 2026-10-22

## Ngữ Cảnh (Context)
Trước đây khi chuyển tiếp trạng thái từ pha Chọn tướng (Draft) sang Bàn cờ chính thức (`GameState`), hàm khởi tạo đã lọc và loại bỏ thủ công các trường `subHeroId`, `mainHeroId`, `revealedHeroes`, `isBot`, `isVip`. Hậu quả là `p.subHeroId` bị `undefined`, khiến toàn bộ UI bị lỗi ô bài tướng phụ trống rỗng (black card), tên tướng hiển thị `?`, và Modal chi tiết chỉ còn một mảng tối. Ngoài ra, việc thiếu cơ chế quản lý trạng thái hiển lộ độc lập cho từng tướng dẫn đến việc kỹ năng bị động có nguy cơ phát động khi tướng vẫn đang ẩn, vi phạm luật chơi gốc Quốc Chiến.

## Quyết Định (Decision)
1. **Bảo Toàn Trạng Thái Đầy Đủ (State Invariance):** Bắt buộc giữ nguyên `mainHeroId`, `subHeroId`, `revealedHeroes: [bool, bool]`, `isBot`, `isVip`, `isFlipped`, `isChained` trong mọi tầng: Engine `GameState`, Server `GameRoom`, và Client `GameViewMapper`.
2. **Cơ Chế Lộ Diện Tướng (Reveal Mechanics):** Mỗi người chơi khởi đầu với `revealedHeroes: [false, false]`. Người chơi có thể chủ động lật tướng thông qua nút "Lật" trên giao diện hoặc tự động hiển lộ khi phát động kỹ năng bị động tương ứng.
3. **Tính Toán Máu Kết Hợp (Combined Health):** Máu tối đa được tính tự động từ 2 tướng bằng công thức chuẩn: `maxHp = Math.floor((h1.maxHp + h2.maxHp) / 2)`.

## Hệ Quả (Consequences)
- Loại bỏ hoàn toàn lỗi mất tướng 2, đảm bảo tương thích 100% giữa dữ liệu logic bàn cờ và render giao diện.
- Tạo nền tảng để triển khai trọn vẹn logic ẩn/hiện phe phái và tính điểm đồng đội trong chế độ Quốc Chiến cho cả Singleplayer và Server Multiplayer.
