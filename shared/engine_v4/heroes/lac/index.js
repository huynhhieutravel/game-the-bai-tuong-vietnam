/**
 * Heroes Hệ 🟢 LẠC (Thục) trong Việt Sát v4.
 * Bao gồm đầy đủ 9 vị tướng với các kỹ năng độc nhất và chốt chặn an toàn.
 */

import { SkillContract } from '../base/SkillContract.js';

// 1. Thánh Gióng
export const ThanhGiong = {
  id: 'thanh_giong',
  name: 'Thánh Gióng',
  faction: 'lac',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'thiet_ma',
      name: 'Thiết Mã',
      type: 'lock',
      description: 'Khoảng cách từ bạn đến các tướng khác luôn được tính là -1.'
    }),
    new SkillContract({
      id: 'tre_nga',
      name: 'Tre Ngà',
      type: 'reactive',
      trigger: 'ON_SLASH_TARGET',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Sau khi sử dụng [Chém] chỉ định mục tiêu, tiến hành phán xét; mục tiêu phải bỏ bài cùng chất nếu không thì cấm Né.',
      execute: (state, ctx, stack) => {
        // Rút 1 lá phán xét an toàn
        const judgeCard = state.drawCardFromDeck();
        if (judgeCard) {
          state.discardPile.push(judgeCard);
          ctx.target.temporaryFlags = ctx.target.temporaryFlags || {};
          ctx.target.temporaryFlags.treNgaRequiredSuit = judgeCard.suit;
          ctx.target.temporaryFlags.skillsSuppressed = true;
          state.addLog(`🎋 [Tre Ngà] Toàn bộ kỹ năng không phải Tỏa Định Kỹ của ${ctx.target.name} bị vô hiệu hóa đến hết lượt! Phán xét ra chất [${judgeCard.suit}].`);
          return { treNgaJudgeSuit: judgeCard.suit };
        }
      }
    })
  ]
};

// 2. Sơn Tinh
export const SonTinh = {
  id: 'son_tinh',
  name: 'Sơn Tinh',
  faction: 'lac',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'doi_nui',
      name: 'Dời Núi',
      type: 'active',
      description: 'Bạn có thể sử dụng hoặc đánh ra một lá [Chém] như [Né], hoặc [Né] như [Chém].'
    })
  ]
};

// 3. Cao Lỗ (Hệ Lạc)
export const CaoLoLac = {
  id: 'cao_lo_lac',
  name: 'Cao Lỗ',
  faction: 'lac',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'no_than_cao_lo',
      name: 'Nỏ Thần',
      type: 'lock',
      description: 'Phạm vi công kích của [Chém] bạn sử dụng bằng đúng điểm số của lá bài đó. Sau khi [Chém] chỉ định mục tiêu, thực hiện các hiệu ứng sau nếu thỏa điều kiện: Nếu số bài trên tay của bạn không ít hơn mục tiêu, họ không thể sử dụng [Né]. Nếu Sinh lực của bạn không nhiều hơn mục tiêu, [Chém] đó gây thêm 1 điểm sát thương.',
      trigger: 'ON_SLASH_TARGET',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      execute: (state, ctx) => {
        const target = ctx.target;
        const owner = ctx.owner;
        let unavoidable = false;
        let damageAmount = ctx.damageAmount || 1;

        // Nếu bài trên tay không ít hơn mục tiêu -> Cấm Né
        if (owner.hand.length >= target.hand.length) {
          unavoidable = true;
          state.addLog(`🏹 [Nỏ Thần] kích hoạt: Số bài tay ${owner.name} >= ${target.name}, cấm sử dụng [Né]!`);
        }

        // Nếu HP không nhiều hơn mục tiêu -> +1 sát thương
        if (owner.hp <= target.hp) {
          damageAmount += 1;
          state.addLog(`🏹 [Nỏ Thần] kích hoạt: HP ${owner.name} <= ${target.name}, tăng thêm 1 điểm sát thương!`);
        }

        return { unavoidable, damageAmount };
      }
    })
  ]
};

// 4. Thần Trụ Trời
export const ThanTruTroi = {
  id: 'than_tru_troi',
  name: 'Thần Trụ Trời',
  faction: 'lac',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'khai_thien',
      name: 'Khai Thiên',
      type: 'active',
      description: 'Bạn có thể sử dụng hoặc đánh ra một lá bài Đỏ như một lá [Chém].'
    })
  ]
};

// 5. Rùa Vàng
export const RuaVang = {
  id: 'rua_vang',
  name: 'Rùa Vàng',
  faction: 'lac',
  gender: 'none',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'than_giap',
      name: 'Thần Giáp',
      type: 'lock',
      trigger: 'ON_NEED_DODGE',
      filter: (ctx) => ctx.ownerId === ctx.targetId && !ctx.owner.equipment.armor,
      description: 'Nếu không có Giáp, bạn được xem như đã trang bị [Bát Quái Trận] (phán xét Đỏ = Né).',
      execute: (state, ctx, stack) => {
        const judgeCard = state.drawCardFromDeck();
        if (!judgeCard) return { dodged: false };
        state.discardPile.push(judgeCard);
        state.addLog(`🛡️ [Thần Giáp] phán xét: ra lá [${judgeCard.name || judgeCard.id}] màu ${judgeCard.color || judgeCard.suit}.`);

        const isRed = judgeCard.color === 'red' || judgeCard.suit === 'heart' || judgeCard.suit === 'diamond' || judgeCard.suit === '♥' || judgeCard.suit === '♦';
        if (isRed) {
          state.addLog(`✨ Phán xét màu Đỏ, [Thần Giáp] tự động kích hoạt [Né] miễn phí!`);
          return { dodged: true };
        }
        return { dodged: false };
      }
    }),
    new SkillContract({
      id: 'than_hoa',
      name: 'Thần Hỏa',
      type: 'active',
      description: 'Có thể sử dụng bài Đỏ như [Hỏa Công].',
      canUse: (state, ctx) => {
        const p = ctx.owner || (state && state.getPlayer ? state.getPlayer(ctx.ownerId) : null);
        if (!p || !p.hand || p.hand.length === 0) return false;
        return p.hand.some(c => {
          const s = (c.suit || '').toString().toLowerCase();
          return s === 'heart' || s === 'diamond' || s === '♥' || s === '♦' || s === 'cơ' || s === 'rô' || c.color === 'red';
        });
      }
    }),
    new SkillContract({
      id: 'linh_giam',
      name: 'Linh Giám',
      type: 'active',
      description: 'Có thể sử dụng bài Đen như [Vô Giải Khả Kích].',
      canUse: (state, ctx) => {
        const p = ctx.owner || (state && state.getPlayer ? state.getPlayer(ctx.ownerId) : null);
        if (!p || !p.hand || p.hand.length === 0) return false;
        return p.hand.some(c => {
          const s = (c.suit || '').toString().toLowerCase();
          return s === 'spade' || s === 'club' || s === '♠' || s === '♣' || s === 'bích' || s === 'chuồn' || c.color === 'black';
        });
      }
    })
  ]
};

// 6. Chử Đồng Tử
export const ChuDongTu = {
  id: 'chu_dong_tu',
  name: 'Chử Đồng Tử',
  faction: 'lac',
  gender: 'male',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'tien_duyen_chu_dong_tu',
      name: 'Tiên Duyên',
      type: 'active',
      description: 'Bài ♣ có thể dùng như [Thiết Tác Liên Hoàn].',
      canUse: (state, ctx) => {
        const p = ctx.owner || (state && state.getPlayer ? state.getPlayer(ctx.ownerId) : null);
        if (!p || !p.hand || p.hand.length === 0) return false;
        return p.hand.some(c => {
          const s = (c.suit || '').toString().toLowerCase();
          return s === 'club' || s === 'clubs' || s === '♣' || s === 'chuồn' || s === 'nhép';
        });
      }
    }),
    new SkillContract({
      id: 'hoa_tien',
      name: 'Hóa Tiên',
      type: 'reactive',
      frequency: 'limited', // Hạn định 1 lần/trận
      trigger: 'ON_DYING',
      filter: (ctx) => ctx.ownerId === ctx.targetId,
      description: 'Khi Hấp hối: Bỏ hết bài & trang bị, hồi đầy 3 HP, rút 3 bài.',
      execute: (state, ctx, stack) => {
        const owner = ctx.owner;
        // Bỏ hết bài trên tay
        state.discardPile.push(...owner.hand);
        owner.hand = [];
        // Bỏ hết trang bị
        for (const slot in owner.equipment) {
          if (owner.equipment[slot]) {
            state.discardPile.push(owner.equipment[slot]);
            owner.equipment[slot] = null;
          }
        }
        // Bỏ hết cẩm nang trong khu phán xét
        if (owner.judgementArea && owner.judgementArea.length > 0) {
          state.discardPile.push(...owner.judgementArea);
          owner.judgementArea = [];
        }
        // Hồi phục 3 HP
        owner.hp = 3;
        // Rút 3 bài
        state.drawCards(owner.id, 3);
        state.addLog(`🌟 [Hóa Tiên] kích hoạt thành công! ${owner.name} hồi phục toàn bộ 3 HP và rút 3 lá bài!`);

        // Giải phóng Frame Hấp hối
        if (stack && !stack.isEmpty() && stack.peek().type === 'ASK_PEACH') {
          stack.pop();
        }
      }
    })
  ]
};

// 7. Tiên Dung
export const TienDung = {
  id: 'tien_dung',
  name: 'Tiên Dung',
  faction: 'lac',
  gender: 'female',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'duyen_tien',
      name: 'Duyên Tiên',
      type: 'reactive',
      frequency: 'unlimited',
      trigger: 'ON_TRICK_PLAYED',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Mỗi khi sử dụng Cẩm Nang Thường, rút 1 lá bài.',
      execute: (state, ctx) => {
        state.drawCards(ctx.ownerId, 1);
        state.addLog(`🌸 [Duyên Tiên] kích hoạt: ${ctx.owner.name} rút 1 lá bài!`);
      }
    }),
    new SkillContract({
      id: 'tien_duyen_khoang_cach',
      name: 'Tiên Duyên (Cự ly)',
      type: 'lock',
      description: 'Sử dụng Cẩm Nang không bị giới hạn khoảng cách.'
    })
  ]
};

// 8. Lang Liêu
export const LangLieu = {
  id: 'lang_lieu',
  name: 'Lang Liêu',
  faction: 'lac',
  gender: 'male',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'banh_chung',
      name: 'Bánh Chưng',
      type: 'reactive',
      frequency: 'turn',
      trigger: 'BEGIN_PHASE',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Đầu lượt xem X lá bài đầu chồng rút, xếp lại tùy ý lên đầu hoặc đáy chồng bài.',
      execute: (state, ctx) => {
        const aliveCount = state.getAlivePlayers().length;
        let viewCount = Math.min(aliveCount, 5);
        if (state.drawPile.length < viewCount) {
          state.recycleDiscardPile();
        }
        viewCount = Math.min(viewCount, state.drawPile.length);
        if (viewCount === 0) return;
        const viewedCards = state.drawPile.slice(-viewCount).reverse();
        state.addLog(`🍡 [Bánh Chưng] ${ctx.owner.name} kích hoạt: xem ${viewCount} lá bài đầu chồng rút để sắp xếp lại.`);
        state.priorityStack.push({
          type: 'ASK_BANH_CHUNG',
          sourceId: ctx.ownerId,
          targetId: ctx.ownerId,
          currentActorId: ctx.ownerId,
          priorityQueue: [ctx.ownerId],
          context: {
            viewedCards,
            viewCount
          }
        });
      }
    }),
    new SkillContract({
      id: 'dam_bac',
      name: 'Đạm Bạc',
      type: 'lock',
      description: 'Khi không có bài trên tay, không thể là mục tiêu của [Chém] hoặc [Quyết Đấu].'
    })
  ]
};

// 9. Lạc Long Quân
export const LacLongQuan = {
  id: 'lac_long_quan',
  name: 'Lạc Long Quân',
  faction: 'lac',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'thuy_to',
      name: 'Thủy Tổ',
      type: 'active',
      description: 'Cho bài đồng minh; cho >= 2 bài được dùng 1 Bài Cơ Bản miễn phí.'
    }),
    new SkillContract({
      id: 'boc_tram_trung',
      name: 'Bọc Trăm Trứng',
      type: 'active',
      description: 'Chủ Công Kỹ: Khi cần sử dụng hoặc đánh ra lá [Chém], tướng Lạc có thể ra bài giùm.'
    })
  ]
};

export const LAC_HEROES = [
  ThanhGiong,
  SonTinh,
  CaoLoLac,
  ThanTruTroi,
  RuaVang,
  ChuDongTu,
  TienDung,
  LangLieu,
  LacLongQuan
];
