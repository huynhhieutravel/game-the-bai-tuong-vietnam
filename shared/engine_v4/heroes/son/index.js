/**
 * Heroes Hệ 🟤 SƠN (Quần Hùng) trong Việt Sát v4.
 * Đóng gói đầy đủ 8 vị tướng với các kỹ năng đặc thù cao và bài học từ BUG_HISTORY.
 */

import { SkillContract } from '../base/SkillContract.js';

// 1. Tuệ Tĩnh
export const TueTinh = {
  id: 'tue_tinh',
  name: 'Tuệ Tĩnh',
  faction: 'son',
  gender: 'male',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'nam_duoc',
      name: 'Nam Dược',
      type: 'active',
      description: 'Ngoài lượt của bạn, có thể sử dụng bài Đỏ như [Đào].'
    }),
    new SkillContract({
      id: 'dieu_duoc',
      name: 'Diệu Dược',
      type: 'active',
      frequency: 'turn',
      description: 'Trong Action Phase, bỏ 1 bài trên tay để một tướng hồi 1 HP.',
      execute: (state, ctx) => {
        const target = ctx.target || ctx.owner;
        if (target.hp < target.maxHp) {
          target.hp += 1;
          state.addLog(`🌿 [Diệu Dược] kích hoạt: ${ctx.owner.name} chữa lành 1 HP cho ${target.name} (${target.hp}/${target.maxHp})!`);
        }
      }
    })
  ]
};

// 2. Đinh Bộ Lĩnh
export const DinhBoLinh = {
  id: 'dinh_bo_linh',
  name: 'Đinh Bộ Lĩnh',
  faction: 'son',
  gender: 'male',
  hp: 6,
  maxHp: 6,
  skills: [
    new SkillContract({
      id: 'uy_chan',
      name: 'Uy Chấn',
      type: 'lock',
      trigger: 'ON_DAMAGED',
      filter: (ctx) => {
        if (ctx.ownerId !== ctx.targetId) return false;
        const card = ctx.card;
        if (!card) return false;
        const isRed = card.color === 'red' || card.suit === 'hearts' || card.suit === 'diamonds';
        const isSlash = card.type === 'slash' || card.id?.includes('slash') || ctx.reason === 'slash';
        return isRed && isSlash;
      },
      description: 'Khi bị [Chém] Đỏ gây sát thương, kẻ tấn công phải chọn: hồi 1 HP hoặc rút 1 bài.',
      execute: (state, ctx) => {
        const attacker = ctx.actor || (ctx.sourceId !== undefined ? state.getPlayer(ctx.sourceId) : null);
        if (attacker && attacker.isAlive) {
          const canHeal = attacker.hp < attacker.maxHp;
          const wantHeal = ctx.choice === 'heal' || (canHeal && ctx.choice !== 'draw');
          if (canHeal && wantHeal) {
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + 1);
            state.addLog(`👑 [Uy Chấn] kích hoạt: ${ctx.owner.name} uy nghi lẫm liệt, kẻ tấn công ${attacker.name} chọn hồi 1 HP (${attacker.hp}/${attacker.maxHp})!`);
          } else {
            state.drawCards(attacker.id, 1);
            state.addLog(`👑 [Uy Chấn] kích hoạt: ${ctx.owner.name} uy nghi lẫm liệt, kẻ tấn công ${attacker.name} nhận 1 lá bài!`);
          }
        }
      }
    })
  ]
};

// 3. Nguyễn Bặc
export const NguyenBac = {
  id: 'nguyen_bac',
  name: 'Nguyễn Bặc',
  faction: 'son',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'binh_loan',
      name: 'Bình Loạn',
      type: 'active',
      description: '2 bài cùng chất dùng như lá [Loạn Tiễn].'
    }),
    new SkillContract({
      id: 'khai_quoc',
      name: 'Khai Quốc',
      type: 'lock',
      description: 'Chủ Công Kỹ: Giới hạn bài tay +2 × (số tướng hệ Sơn).'
    })
  ]
};

// 4. Huyền Trân Công Chúa
export const HuyenTranCongChua = {
  id: 'huyen_tran_cong_chua',
  name: 'Huyền Trân Công Chúa',
  faction: 'son',
  gender: 'female',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'hoa_than_huyen_tran',
      name: 'Hòa Thân',
      type: 'active',
      frequency: 'turn',
      description: 'Bỏ 1 bài -> Ép 2 tướng Nam Quyết Đấu với nhau.'
    }),
    new SkillContract({
      id: 'an_bang',
      name: 'An Bang',
      type: 'reactive',
      frequency: 'turn',
      trigger: 'END_PHASE',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Trong giai đoạn Kết thúc, được rút 1 lá bài.',
      execute: (state, ctx) => {
        state.drawCards(ctx.ownerId, 1);
        state.addLog(`🌸 [An Bang] kích hoạt: ${ctx.owner.name} rút 1 lá bài cuối lượt!`);
      }
    })
  ]
};

// 5. Đinh Điền
export const DinhDien = {
  id: 'dinh_dien',
  name: 'Đinh Điền',
  faction: 'son',
  gender: 'male',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'phat_toi_dinh_dien',
      name: 'Phạt Tội',
      type: 'reactive',
      trigger: 'ON_DODGE_SUCCESS',
      // CHỐT CHẶN: Chỉ kích hoạt khi chính Đinh Điền là người Né thành công!
      filter: (ctx) => ctx.ownerId === ctx.targetId && (ctx.actorId !== undefined || ctx.sourceId !== undefined),
      description: 'Khi Né thành công, ép kẻ tấn công chịu 1 damage hoặc cho Đinh Điền rút bài.',
      execute: (state, ctx) => {
        const attacker = ctx.actor || (ctx.sourceId !== undefined ? state.getPlayer(ctx.sourceId) : null);
        if (attacker && attacker.isAlive) {
          if (ctx.choice === 'draw') {
            state.drawCards(ctx.ownerId, 1);
            state.addLog(`⚡ [Phạt Tội] kích hoạt: ${ctx.owner.name} thu nhận 1 lá bài quân nhu!`);
          } else {
            state.addLog(`⚡ [Phạt Tội] kích hoạt: ${ctx.owner.name} trừng phạt kẻ tấn công ${attacker.name}!`);
            attacker.hp -= 1;
          }
        }
      }
    }),
    new SkillContract({
      id: 'quan_co',
      name: 'Quân Cơ',
      type: 'reactive',
      description: 'Đánh bài Đen để thay thế bài phán xét trước khi có hiệu lực.'
    }),
    new SkillContract({
      id: 'dinh_quoc',
      name: 'Định Quốc',
      type: 'active',
      description: 'Chủ Công Kỹ: Tướng Sơn có thể đưa lá [Né] hoặc [Sấm Sét] cho Đinh Điền.'
    })
  ]
};

// 6. Nguyễn Xí
export const NguyenXi = {
  id: 'nguyen_xi',
  name: 'Nguyễn Xí',
  faction: 'son',
  gender: 'male',
  hp: 5,
  maxHp: 5,
  skills: [
    new SkillContract({
      id: 'pha_quan_nguyen_xi',
      name: 'Phá Quân',
      type: 'lock',
      trigger: 'ON_SLASH_TARGET',
      // CHỐT CHẶN CHỐNG NHẢY KÉ: Chỉ kích hoạt khi Nguyễn Xí là người ra Chém!
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Chém bắt đối thủ dùng 2 [Né] mới né được.',
      execute: (state, ctx) => {
        state.addLog(`💥 [Phá Quân] kích hoạt: ${ctx.owner.name} uy dũng vô song, mục tiêu phải dùng 2 lá [Né]!`);
        return { requiredDodges: 2 };
      }
    })
  ]
};

// 7. Lê Ngân
export const LeNgan = {
  id: 'le_ngan',
  name: 'Lê Ngân',
  faction: 'son',
  gender: 'male',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'trung_dung',
      name: 'Trung Dũng',
      type: 'active',
      frequency: 'turn',
      description: 'Úp 1 bài dùng như bất kỳ lá bài nào.'
    }),
    new SkillContract({
      id: 'ho_gia',
      name: 'Hộ Giá',
      type: 'lock',
      description: 'Cấm nghi ngờ Trung Dũng; khi còn 1 HP các kỹ năng khác bị vô hiệu.'
    })
  ]
};

// 8. Đô đốc Bảo
export const DoDocBao = {
  id: 'do_doc_bao',
  name: 'Đô đốc Bảo',
  faction: 'son',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'pha_thanh',
      name: 'Phá Thành',
      type: 'reactive',
      frequency: 'turn',
      trigger: 'DRAW_PHASE',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Trong giai đoạn Rút bài, có thể phán xét thu lấy lá đó; dùng bài khác màu như [Quyết Đấu].',
      execute: (state, ctx) => {
        state.priorityStack.push({
          type: 'ASK_PHA_THANH',
          sourceId: ctx.ownerId,
          targetId: ctx.ownerId,
          currentActorId: ctx.ownerId,
          priorityQueue: [ctx.ownerId]
        });
      }
    })
  ]
};

export const SON_HEROES = [
  TueTinh,
  DinhBoLinh,
  NguyenBac,
  HuyenTranCongChua,
  DinhDien,
  NguyenXi,
  LeNgan,
  DoDocBao
];

