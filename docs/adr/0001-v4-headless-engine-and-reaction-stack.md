# 0001. Kiến Trúc Lõi Game v4: Headless State Machine & Reaction Stack

- **Status:** Accepted
- **Date:** 2026-10-22

Hệ thống v3 trước đây bị phụ thuộc vào biến cờ đơn lẻ `state.waitingForResponse` và một file `SkillRegistry.js` nguyên khối gần 3.000 dòng, dẫn đến lỗi kẹt game (hang), xung đột biến và lỗi dây chuyền mỗi khi sửa kỹ năng tướng. Chúng tôi quyết định tái thiết toàn bộ Core Engine thành một **Headless State Machine** đơn định (deterministic) độc lập với UI, sử dụng **Reaction Stack** (Ngăn xếp phản ứng) để điều phối vòng phản hồi (Né, Đào, Hóa Giải) theo chiều kim đồng hồ, và module hóa từng tướng thành các thư mục độc lập có Unit Test 1:1. Quyết định này giúp bảo toàn 100% cơ chế trò chơi gốc, loại bỏ hoàn toàn hiện tượng kẹt luồng và sẵn sàng cho kiến trúc Authoritative Server sau này.
