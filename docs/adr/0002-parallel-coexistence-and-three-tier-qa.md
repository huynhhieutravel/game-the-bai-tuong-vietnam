# 0002. Chiến Lược Triển Khai Song Song & Quy Trình QA 3 Tầng

- **Status:** Accepted
- **Date:** 2026-10-22

Để bảo toàn 100% cơ chế trò chơi hiện tại và không làm gián đoạn hệ thống đang chạy trong quá trình chuyển đổi sang v4, chúng tôi quyết định phát triển Lõi v4 độc lập trong thư mục `shared/engine_v4/` (mô hình Parallel Coexistence) thay vì sửa đè lên engine cũ. Đồng thời, áp dụng quy trình QA 3 tầng khép kín: (1) Unit Test 1:1 cho từng kỹ năng tướng, (2) Game Invariants Test bắt buộc toàn cục (không quá 1 Chém/lượt, $HP \le 0$ bắt buộc qua Hấp hối), và (3) Giả lập tự động 1.000 ván đấu giữa các Bot (Headless Simulation) để kiểm tra deadlock, infinite loop và exception trước khi kết nối vào UI. Quyết định này giúp loại bỏ hoàn toàn rủi ro lỗi dây chuyền và đảm bảo tính nguyên vẹn của toàn bộ hơn 30 vị tướng.
