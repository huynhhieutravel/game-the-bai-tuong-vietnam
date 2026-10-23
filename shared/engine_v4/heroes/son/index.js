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
      filter: (ctx) => ctx.ownerId === ctx.targetId && ctx.card?.color === 'red' && ctx.card?.type === 'slash',
      description: 'Khi bị [Chém] Đỏ gây sát thương, kẻ tấn công phải chọn: hồi 1 HP hoặc rút 1 bài.',
      execute: (state, ctx) => {
        const attacker = ctx.actor;
        if (attacker && attacker.isAlive) {
          state.drawCards(attacker.id, 1);
          state.addLog(`👑 [Uy Chấn] kích hoạt: Kẻ tấn công ${attacker.name} được nhận 1 lá bài!`);
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
      filter: (ctx) => ctx.ownerId === ctx.targetId && ctx.actorId !== undefined,
      description: 'Khi Né thành công, ép kẻ tấn công chịu 1 damage hoặc cho Đinh Điền rút bài.',
      execute: (state, ctx) => {
        const attacker = ctx.actor;
        if (attacker && attacker.isAlive) {
          state.addLog(`⚡ [Phạt Tội] kích hoạt: ${ctx.owner.name} trừng phạt kẻ tấn công ${attacker.name}!`);
          attacker.hp -= 1;
        }
      }
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
        const judgeCard = state.drawCardFromDeck();
        if (judgeCard) {
          ctx.owner.hand.push(judgeCard);
          ctx.owner.temporaryFlags = ctx.owner.temporaryFlags || {};
          ctx.owner.temporaryFlags.skipDrawPhase = true;
          const isRed = judgeCard.color === 'red' || judgeCard.suit === 'heart' || judgeCard.suit === 'diamond' || judgeCard.suit === '♥' || judgeCard.suit === '♦';
          ctx.owner.temporaryFlags.phaThanhOppositeColor = isRed ? 'black' : 'red';
          state.addLog(`⚡ [Phá Thành] kích hoạt: ${ctx.owner.name} phán xét ra lá [${judgeCard.name || judgeCard.id}] màu ${judgeCard.color}, có thể dùng bài màu ${ctx.owner.temporaryFlags.phaThanhOppositeColor} như [Quyết Đấu]!`);
        }
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

