# ADR 0052: QA Tướng Trần Khánh Dư (tran_khanh_du) — Vân Đồn

## 1. Bối cảnh & Mục tiêu
- **Tướng:** Trần Khánh Dư (`tran_khanh_du`) — Phe 🔵 HÀ.
- **Máu:** 4 HP / 4 Max HP. Giới tính: Nam.
- **Kỹ năng:**
  1. **Vân Đồn (`van_don`):** Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể đấu điểm với một tướng khác. Nếu thắng, trong lượt này bạn được sử dụng thêm 1 lá [Chém] (tổng cộng 2 Chém), [Chém] không giới hạn cự ly và có thể chỉ định thêm 1 mục tiêu. Nếu không thắng (thua hoặc hòa), bạn không thể sử dụng [Chém] trong lượt này.

## 2. Thiết kế Cơ chế & Ràng buộc
- **Vân Đồn:**
  - Chủ động kỹ (`active skill`): Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - Giới hạn: Mỗi lượt chỉ sử dụng 1 lần (`temporaryFlags.vanDonUsed = true`).
  - Cơ chế Đấu điểm (`ASK_VAN_DON`):
    - Trần Khánh Dư và mục tiêu mỗi người bí mật bỏ ra 1 lá bài trên tay.
    - So sánh điểm số theo chuẩn rank ($2 < 3 < \dots < 10 < J < Q < K < A$).
    - **Thắng ($Rank_{TKD} > Rank_{target}$):**
      - Bật cờ `vanDonWin = true`.
      - Được đánh thêm 1 lá [Chém] (tối đa 2 Chém trong lượt, assert qua `GameInvariants.assertSlashLimit`).
      - Các đòn Chém trong lượt không bị giới hạn cự ly (`isInfiniteRange = true`).
    - **Không thắng (Thua hoặc Hòa: $Rank_{TKD} \le Rank_{target}$):**
      - Bật cờ `vanDonLose = true`.
      - Bị phong ấn tuyệt đối: Không thể phát động [Chém] trong suốt lượt hiện tại (`CombatRules.playSlash` throw error).

## 3. Trạng thái kiểm thử
- Tạo test suite độc lập `shared/engine_v4/__tests__/heroes/TranKhanhDuQA.test.js`.
