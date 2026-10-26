# ADR 0101: Thánh Gióng [Tre Ngà] Kích Hoạt Không Giới Hạn Theo Mỗi Lần [Chém] (Chu Cát Liên Nỏ Synergy)

## 1. Bối cảnh & Hiện tượng (Context & Bug Symptom)
- **Tình huống người chơi gặp phải:**
  - Người chơi cầm cặp tướng **Lạc Long Quân + Thánh Gióng** trang bị vũ khí **Chu Cát Liên Nỏ** (cho phép đánh [Chém] vô hạn lần trong lượt).
  - Lần [Chém] thứ 1: [Tre Ngà] kích hoạt phán xét $\rightarrow$ Nạn nhân không bỏ bài $\rightarrow$ Bị khóa [Né] và mất máu.
  - Lần [Chém] thứ 2: Người chơi tiếp tục đánh [Chém] lên cùng nạn nhân, nhưng **[Tre Ngà] KHÔNG KÍCH HOẠT**, khiến nạn nhân ung dung đánh ra lá [Né] đỡ đòn thành công.
- **Root Cause trong Engine:**
  - Trong `shared/engine_v4/heroes/base/SkillContract.js`:
    ```javascript
    this.frequency = config.frequency || (config.type === 'lock' ? 'unlimited' : 'turn');
    ```
    Mặc định, mọi kỹ năng không phải `type: 'lock'` nếu không khai báo tường minh `frequency` thì đều bị gán `frequency: 'turn'` (giới hạn 1 lần/lượt).
  - Kỹ năng `tre_nga` trong `shared/engine_v4/heroes/lac/index.js` khai báo `type: 'reactive'`, trigger `ON_SLASH_TARGET`, nhưng **thiếu thuộc tính `frequency: 'unlimited'`**.
  - Khi thực thi lần Chém thứ 1, `SkillContract._markUsed()` đã set `owner.skillUsage.tre_nga.usedThisTurn = true`.
  - Đến lần Chém thứ 2, `SkillContract.canUse()` kiểm tra `this.frequency === 'turn' && usage?.usedThisTurn` trả về `false`, khiến [Tre Ngà] bị chặn đứng.

---

## 2. Quyết định Kiến trúc & Sửa đổi (Architectural Decision)
1. **Bản chất Kỹ Năng [Tre Ngà]:**
   - Trong Tam Quốc Sát, kỹ năng này tương đương **Thiết Kỵ (Mã Siêu)** hoặc **Thao Võng (Bàng Đức)**: Kích hoạt theo **MỖI LẦN SỬ DỤNG [CHÉM] CHỈ ĐỊNH MỤC TIÊU**, không phải kỹ năng 1 lần mỗi lượt.
   - Khi có Chu Cát Liên Nỏ, mỗi đòn Chém tung ra đều phải tiến hành phán xét và ép mục tiêu bỏ bài cùng chất.
2. **Khai báo tường minh `frequency: 'unlimited'`:**
   - Trong `shared/engine_v4/heroes/lac/index.js`, bổ sung `frequency: 'unlimited'` cho `tre_nga`.
   - Vẫn được bảo vệ an toàn bởi cơ chế **Safe Turn Cap** (`maxTriggersPerTurn: 20`) trong `SkillContract.js` để ngăn chặn triệt để infinite loop recursion.
3. **Bổ sung Unit Test Khép kín:**
   - Cập nhật `shared/engine_v4/__tests__/heroes/ThanhGiongQA.test.js`: Thêm kịch bản Thánh Gióng trang bị Chu Cát Liên Nỏ Chém liên tiếp 2 lần, khẳng định [Tre Ngà] phán xét và khóa Né thành công ở cả 2 lần.

---

## 3. Kết quả Kiểm định (Validation)
- 110/110 test files passed (941/941 tests đạt 100%).
- Client Vite build thành công không lỗi bundle.
