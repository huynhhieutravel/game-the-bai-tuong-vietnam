# ADR 0039: Thiết Kế & Kiểm Định Tướng Nguyễn Xí — Kỹ Năng Phá Quân

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Thái sư Cương Quốc công Nguyễn Xí, khai quốc công thần kiệt xuất của khởi nghĩa Lam Sơn dưới cờ Bình Định Vương Lê Lợi, vị dũng tướng bách chiến bách thắng. Trong Việt Sát v4, ông thuộc phe 🟢 Sơn với lượng máu dồi dào (5 HP) và kỹ năng tấn công áp đảo **Phá Quân** (`pha_quan_nguyen_xi`).

## Quyết định Kỹ thuật
1. **Phá Quân (`pha_quan_nguyen_xi` - Slash Dodge Requirement Lock):**
   - Sự kiện kích hoạt: `ON_SLASH_TARGET` khi Nguyễn Xí phát động một đòn [Chém] tấn công mục tiêu.
   - Bộ lọc kiểm tra nghiêm ngặt: `filter: (ctx) => ctx.ownerId === ctx.actorId`.
   - Hiệu ứng: Cưỡng chế nâng số lượng lá bài [Né] bắt buộc để giải trừ đòn Chém lên 2 lá:
     $$\text{requiredDodges} = 2$$
   - Tiến trình giải quyết phản hồi tại `CombatRules.respondDodge`:
     - Nếu mục tiêu mới chỉ đánh ra 1 lá [Né]: `dodgesProvided = 1` chưa đạt `requiredDodges = 2`, frame `ASK_DODGE` vẫn được duy trì trên đỉnh stack để chờ lá [Né] thứ hai.
     - Nếu mục tiêu không đánh thêm được lá [Né] thứ hai (chọn skip): Đòn Chém gây sát thương trực tiếp và trừ 1 HP của mục tiêu.
     - Nếu mục tiêu đánh đủ 2 lá [Né]: Giải trừ đòn Chém thành công, mục tiêu không bị mất máu.
   - Chống nhảy ké: Đòn Chém do các người chơi khác phát động không bị ảnh hưởng, giữ nguyên `requiredDodges = 1`.

## Hệ quả & Kiểm định
- Đã tạo test suite độc lập: `shared/engine_v4/__tests__/heroes/NguyenXiQA.test.js` kiểm tra 5/5 kịch bản:
  - Thuộc tính HeroRegistry phe Sơn (5 HP, Phá Quân).
  - Ra Chém tạo frame ASK_DODGE với requiredDodges = 2.
  - Mục tiêu đánh 1 Né rồi skip -> mất 1 HP.
  - Mục tiêu đánh đủ 2 Né -> Né thành công, giữ nguyên máu.
  - Chống nhảy ké khi người khác ra Chém.
- 100% test cases đã vượt qua.
