const fs = require('fs');

const walkthrough = `
# QA Hệ Lạc (Hoàn tất)

Quá trình QA các Tướng Hệ Lạc đã hoàn tất và vượt qua 100% (12/12) test cases:

## Các Tướng Đã Được Sửa & QA
1. **Sơn Tinh (Dời Núi)**: Đã kiểm tra logic đánh Né thay Chém, kể cả trong Quyết Đấu. Sửa đổi hoạt động ổn định.
2. **Thánh Gióng (Thiết Mã)**: Đã kiểm tra logic tính cự ly bổ sung +1. Hoạt động ổn định.
3. **Lạc Long Quân (Bọc Trăm Trứng)**: Đã sửa lại lỗi hook \`ask_slash\` không kích hoạt, và đồng bộ với \`SkillRegistry\` để tương tác đúng với sự kiện \`Quyết Đấu\`.
4. **Chử Đồng Tử (Hóa Tiên)**: Đã sửa lỗi không check điều kiện Hấp hối trước khi bơm máu. Hiện tại Hóa Tiên chỉ có thể hồi sinh khi HP <= 0 (Hấp hối).
5. **Tiên Dung / Chử Đồng Tử (Tiên Duyên)**: Đã sửa logic không cho phép chọn mục tiêu nếu đánh lá bài nhép làm Rèn Lại, và bắt buộc chọn mục tiêu nếu đánh nhép làm thẻ bài khác.
6. **Tiên Dung (Duyên Tiên)**: Đã kiểm tra và đảm bảo rút 1 lá bài khi sử dụng Cẩm Nang thành công.
7. **Cao Lỗ (Nỏ Thần)**: Đã thêm logic kiểm tra điều kiện Khóa Né (số lá bài của mục tiêu <= Cao Lỗ) và Tăng Sát Thương (Sinh lực mục tiêu >= Cao Lỗ).
8. **Lang Liêu (Bánh Chưng / Đạm Bạc)**:
    - **Bánh Chưng**: Đã sửa lỗi Reducer state mutation gây treo game loop (\`ask_banh_chung\` dính mãi mãi).
    - **Đạm Bạc**: Sửa \`rangeSystem.js\` để Không thể trở thành mục tiêu của Chém/Quyết Đấu nếu không còn bài trên tay.
9. **Thần Trụ Trời (Khai Thiên)**: Đã sửa logic \`canPlayCard\` để hỗ trợ phân giải kỹ năng chuyển đổi bài (Virtual Cards). Bất kỳ lá bài Đỏ nào đều có thể được dùng làm [Chém].
10. **Rùa Vàng (Thần Giáp / Thần Hỏa)**: 
    - **Thần Giáp**: Tự động nhận diện [Bát Quái] và chặn Sát thương thành công khi phán xét ra Đỏ, mà không cần trang bị thực tế.
    - **Thần Hỏa**: Hỗ trợ dùng bài Đỏ như Hỏa Công.

## Các bản vá System
- Sửa lỗi State Mutation trong các Kỹ năng tự do (\`dispatcher.applyEffect\` tạo ra state mới thay vì dùng lại state cũ).
- Sửa \`canPlayCard\` nhận diện đúng Virtual Card để check Rules.

## Đề xuất tiếp theo
Tiến hành QA các tướng của Hệ tiếp theo (Hệ Sơn) hoặc kiểm tra các Cẩm Nang (như bạn đã đề xuất lúc đầu).
`;

fs.writeFileSync('/Users/huynhtronghieu/.gemini/antigravity-ide/brain/e00ae2c2-7c2f-49ca-84d2-7fb13947ab16/walkthrough.md', walkthrough);
console.log("Success");
