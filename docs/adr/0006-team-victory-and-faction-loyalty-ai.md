# 0006. Điều Kiện Thắng Đồng Đội & Trí Tuệ Nhân Tạo Trung Thành Phe Phái (Faction Loyalty AI)

- **Status:** Accepted
- **Date:** 2026-10-23

## Ngữ Cảnh (Context)
Trong phiên bản cũ (v3), toàn bộ logic game nằm lẫn trong các file khổng lồ (`botLogic.js` 68 KB, `SkillRegistry.js` 2.921 dòng, `cardEffects.js` 75 KB) với cấu trúc phụ thuộc chéo, không có ngăn xếp phản hồi (PriorityStack) và thường xuyên xảy ra deadlock hoặc race condition. Khi kiến trúc lại sang **Engine v4**, mục tiêu hàng đầu là làm sạch lõi (LIFO PriorityStack, StateMachine 6 pha, tách mô-đun Tướng độc lập). Tuy nhiên, một số logic nghiệp vụ cao cấp của Quốc Chiến từ v3 (nhận diện đồng minh cùng phe, cứu viện đồng đội, kiểm tra thắng cuộc đồng đội) chưa được chuyển giao hoàn chỉnh sang v4.

## Quyết Định (Decision)
1. **Điều Kiện Thắng Đồng Đội (Team Victory Condition):** Trận đấu Quốc Chiến kết thúc khi:
   - Chỉ còn 1 người chơi sống sót, hoặc
   - Toàn bộ người chơi còn sống sót đều thuộc về cùng một Phe (`allSameFaction`).
   - Khi thỏa mãn, game kích hoạt trạng thái kết thúc (`state.gameOver = true`), tự động lật toàn bộ tướng của những người sống sót (Force Reveal) để vinh danh Phe đại thắng.
2. **Trí Tuệ Nhân Tạo Trung Thành Phe Phái (Faction Loyalty AI):**
   - Bot phân biệt rõ Đồng minh đã lộ diện (`_isKnownAlly`) và Kẻ thù đã lộ diện (`_isKnownEnemy`).
   - **Tuyệt đối không tấn công đồng minh:** Khi ra [Chém], [Quyết Đấu], [Cướp Bài], [Tước Bài], Bot loại bỏ hoàn toàn các đồng minh cùng phe khỏi danh sách mục tiêu.
   - **Tập trung hỏa lực:** Ưu tiên dồn sát thương vào kẻ thù đã lộ diện (đặc biệt là kẻ thù ít máu nhất).
   - **Cứu viện có chọn lọc:** Khi có yêu cầu cứu mạng (`ASK_PEACH`) hoặc giải cứu cẩm nang (`ASK_NEGATE`), Bot chỉ dùng Đào/Hóa Giải cho bản thân và đồng minh cùng phe, tuyệt đối không cứu kẻ thù.

## Hệ Quả (Consequences)
- Khôi phục trọn vẹn và nâng cấp toàn bộ tinh hoa logic Quốc Chiến từ v3 nhưng trên nền tảng Engine v4 sạch sẽ, mô-đun hóa, không deadlock.
- Nâng cao tính chân thực và kịch tính của các trận đấu Bot: các vị tướng cùng phe biết phối hợp bảo vệ lẫn nhau và tập trung tiêu diệt phe đối lập.
