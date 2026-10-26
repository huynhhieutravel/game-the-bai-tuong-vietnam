/**
 * Heroes Hệ 🔵 HÀ (Ngô) trong Việt Sát v4.
 * Bao gồm đầy đủ 15 vị tướng Hà với các kỹ năng chuyển hóa, bảo hộ và phán xét.
 */

import { SkillContract } from '../base/SkillContract.js';
import { getPlayerGender } from '../HeroRegistry.js';

// 1. Ngô Quyền
export const NgoQuyen = {
  id: 'ngo_quyen',
  name: 'Ngô Quyền',
  faction: 'ha',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'bach_dang',
      name: 'Bạch Đằng',
      type: 'active',
      frequency: 'turn',
      description: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể bỏ tùy ý số lá bài, sau đó rút số lá bài tương ứng. Nếu bằng cách này bạn bỏ toàn bộ bài trên tay, hãy rút thêm 1 lá bài.',
      canUse: (state, ctx) => {
        if (!ctx.owner || ctx.owner.hand?.length === 0) return false;
        if (ctx.owner.skillUsage?.bach_dang?.usedThisTurn) return false;
        return true;
      },
      execute: (state, ctx) => {
        const owner = ctx.owner;
        const handCards = owner.hand || [];
        if (handCards.length === 0) return;
        const cardIds = ctx.cardIds || (ctx.options && ctx.options.cardIds);
        let count = 0;
        let discardedAll = false;
        if (Array.isArray(cardIds) && cardIds.length > 0) {
          count = cardIds.length;
          discardedAll = (count === handCards.length);
          state.discardFromHand(owner.id, cardIds);
        } else {
          count = handCards.length;
          discardedAll = true;
          state.discardPile.push(...owner.hand);
          owner.hand = [];
        }
        const drawCount = discardedAll ? count + 1 : count;
        state.drawCards(owner.id, drawCount);
        owner.skillUsage = owner.skillUsage || {};
        owner.skillUsage.bach_dang = owner.skillUsage.bach_dang || {};
        owner.skillUsage.bach_dang.usedThisTurn = true;
        state.addLog(`🌊 [Bạch Đằng] kích hoạt: ${owner.name} đổi ${count} bài và rút ${drawCount} lá bài mới!`);
      }
    }),
    new SkillContract({
      id: 'hau_vien',
      name: 'Hậu Viện',
      type: 'reactive',
      description: 'Chúa Công Kỹ: Khi một tướng thuộc hệ 🔵 HÀ sử dụng [Đào] lên bản thân, nếu sinh lực của họ lớn hơn bạn, họ có thể để bạn hồi phục 1 điểm sinh lực thay cho mình. Nếu làm vậy, họ rút 1 lá bài.'
    })
  ]
};

// 2. Yết Kiêu
export const YetKieu = {
  id: 'yet_kieu',
  name: 'Yết Kiêu',
  faction: 'ha',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'lan_sau',
      name: 'Lặn Sâu',
      type: 'active',
      frequency: 'unlimited',
      description: 'Trong giai đoạn Hành động, bạn có thể mất 1 điểm Sinh lực, sau đó rút 2 lá bài.',
      canUse: (state, ctx) => ctx.owner.hp > 1,
      execute: (state, ctx) => {
        if (ctx.owner.hp <= 1) {
          throw new Error('[Lặn Sâu] Không thể mất máu khi chỉ còn 1 HP!');
        }
        ctx.owner.hp -= 1;
        state.drawCards(ctx.owner.id, 2);
        state.addLog(`🌊 [Lặn Sâu] kích hoạt: ${ctx.owner.name} mất 1 HP để rút 2 lá bài!`);
      }
    })
  ]
};

// 3. Nguyễn Trãi
export const NguyenTrai = {
  id: 'nguyen_trai',
  name: 'Nguyễn Trãi',
  faction: 'ha',
  gender: 'male',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'binh_ngo',
      name: 'Bình Ngô',
      type: 'reactive',
      trigger: 'DRAW_PHASE',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Trong giai đoạn Rút bài, bạn có thể rút thêm 1 lá bài (tổng cộng 3 lá bài).',
      execute: (state, ctx) => {
        ctx.owner.temporaryFlags = ctx.owner.temporaryFlags || {};
        ctx.owner.temporaryFlags.drawCardCount = 3;
        state.addLog(`📜 [Bình Ngô] kích hoạt: ${ctx.owner.name} được rút 3 lá bài trong lượt này!`);
      }
    }),
    new SkillContract({
      id: 'tam_cong',
      name: 'Tâm Công',
      type: 'active',
      frequency: 'turn',
      description: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể chỉ định một tướng khác chọn một chất bài. Sau đó, họ thu lấy ngẫu nhiên 1 lá bài trên tay bạn và mở ra. Nếu chất của lá bài đó khác với chất họ đã chọn, bạn gây 1 điểm sát thương lên họ.',
      canUse: (state, ctx) => {
        if (!ctx.owner || ctx.owner.hand?.length === 0) return false;
        if (ctx.owner.skillUsage?.tam_cong?.usedThisTurn) return false;
        return state.getAlivePlayers().some(p => p.id !== ctx.ownerId);
      },
      execute: (state, ctx) => {
        const target = ctx.target || (ctx.targets && state.getPlayer(ctx.targets[0])) || state.getAlivePlayers().find(p => p.id !== ctx.ownerId);
        if (!target) return;
        ctx.owner.skillUsage = ctx.owner.skillUsage || {};
        ctx.owner.skillUsage.tam_cong = ctx.owner.skillUsage.tam_cong || {};
        ctx.owner.skillUsage.tam_cong.usedThisTurn = true;
        state.priorityStack.push({
          type: 'ASK_SUIT',
          sourceId: ctx.ownerId,
          targetId: target.id,
          currentActorId: target.id,
          priorityQueue: [target.id],
          context: {
            sourceId: ctx.ownerId
          }
        });
      }
    })
  ]
};

// 4. Tô Hiến Thành
export const ToHienThanh = {
  id: 'to_hien_thanh',
  name: 'Tô Hiến Thành',
  faction: 'ha',
  gender: 'male',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'nhiep_chinh',
      name: 'Nhiếp Chính',
      type: 'lock',
      description: 'Tỏa Định Kỹ: Nếu trong giai đoạn Hành động bạn không sử dụng hoặc đánh ra [Chém], thì bạn có thể bỏ qua giai đoạn Bỏ bài (giữ toàn bộ bài trên tay).'
    })
  ]
};

// 5. Nguyên Phi Ỷ Lan
export const NguyenPhiYLan = {
  id: 'nguyen_phi_y_lan',
  name: 'Nguyên Phi Ỷ Lan',
  faction: 'ha',
  gender: 'female',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'thinh_chinh',
      name: 'Thính Chính',
      type: 'active',
      description: 'Bạn có thể sử dụng hoặc đánh ra một lá bài Đen trên tay như [Né].'
    }),
    new SkillContract({
      id: 'phat_tam',
      name: 'Phật Tâm',
      type: 'reactive',
      frequency: 'turn',
      trigger: 'BEGIN_PHASE',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Trong giai đoạn Chuẩn bị, bạn có thể tiến hành phán xét. Nếu kết quả là bài Đen, bạn có thể lặp lại quá trình này. Sau đó, thu lấy tất cả các lá bài phán xét màu Đen.',
      execute: (state, ctx) => {
        const owner = ctx.owner;
        const blackCards = [];
        while (true) {
          const judge = state.drawCardFromDeck();
          if (!judge) break;
          const isBlack = judge.color === 'black' || judge.suit === 'spade' || judge.suit === 'club' || judge.suit === '♠' || judge.suit === '♣';
          if (isBlack) {
            blackCards.push(judge);
            state.addLog(`🧘 [Phật Tâm] ${owner.name} phán xét ra lá [${judge.name} ${judge.suit}] (ĐEN), tiếp tục phán xét!`);
          } else {
            state.discardPile.push(judge);
            state.addLog(`🧘 [Phật Tâm] ${owner.name} phán xét ra lá [${judge.name} ${judge.suit}] (ĐỎ), kết thúc phán xét.`);
            break;
          }
        }
        if (blackCards.length > 0) {
          owner.hand.push(...blackCards);
          state.addLog(`🧘 [Phật Tâm] ${owner.name} thu được ${blackCards.length} lá bài Đen về tay!`);
        }
      }
    })
  ]
};

// 6. Hồ Xuân Hương
export const HoXuanHuong = {
  id: 'ho_xuan_huong',
  name: 'Hồ Xuân Hương',
  faction: 'ha',
  gender: 'female',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'duyen_tho',
      name: 'Duyên Thơ',
      type: 'active',
      frequency: 'turn',
      description: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể bỏ 2 lá bài trên tay. Sau đó, bạn và một tướng Nam đã bị thương mỗi người hồi phục 1 điểm Sinh lực.',
      canUse: (state, ctx) => {
        if (!ctx.owner || ctx.owner.hand?.length < 2) return false;
        if (ctx.owner.skillUsage?.duyen_tho?.usedThisTurn) return false;
        const validMale = state.getAlivePlayers().some(p => getPlayerGender(p) === 'male' && p.hp < p.maxHp);
        return validMale || ctx.owner.hp < ctx.owner.maxHp;
      },
      execute: (state, ctx) => {
        state.priorityStack.push({
          type: 'ASK_DUYEN_THO',
          sourceId: ctx.ownerId,
          targetId: ctx.ownerId,
          currentActorId: ctx.ownerId,
          priorityQueue: [ctx.ownerId],
          context: {
            reason: 'duyen_tho',
            validTargets: state.getAlivePlayers().filter(p => getPlayerGender(p) === 'male' && p.hp < p.maxHp).map(p => p.id)
          }
        });
      }
    }),
    new SkillContract({
      id: 'xuan_huong',
      name: 'Xuân Hương',
      type: 'reactive',
      trigger: 'ON_EQUIP_LOST',
      filter: (ctx) => ctx.ownerId === ctx.targetId,
      description: 'Sau khi bạn mất 1 lá bài ở khu Trang bị, bạn có thể rút 2 lá bài.',
      execute: (state, ctx) => {
        state.drawCards(ctx.ownerId, 2);
        state.addLog(`🌺 [Xuân Hương] kích hoạt: ${ctx.owner.name} mất trang bị, được rút 2 lá bài!`);
      }
    })
  ]
};

// 7. Ngọc Hân Công Chúa
export const NgocHanCongChua = {
  id: 'ngoc_han_cong_chua',
  name: 'Ngọc Hân Công Chúa',
  faction: 'ha',
  gender: 'female',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'hien_hau',
      name: 'Hiền Hậu',
      type: 'reactive',
      description: 'Khi bạn nhận sát thương, bạn có thể bỏ 1 lá bài ♥ trên tay để ngăn chặn sát thương đó, rồi chọn 1 tướng khác và chọn một: Tướng đó nhận 1 điểm sát thương, sau đó rút X lá bài (X là số Sinh lực đã mất của họ, tối đa 5). Tướng đó mất 1 điểm Sinh lực, sau đó thu lấy lá bài bạn vừa bỏ.'
    }),
    new SkillContract({
      id: 'quoc_sac',
      name: 'Quốc Sắc',
      type: 'lock',
      description: 'Tỏa Định Kỹ: Mọi lá bài Spade (♠) của bạn được xem như Heart (♥).'
    })
  ]
};

// 8. Dã Tượng
export const DaTuong = {
  id: 'da_tuong',
  name: 'Dã Tượng',
  faction: 'ha',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'ky_tap',
      name: 'Kỳ Tập',
      type: 'active',
      description: 'Bạn có thể sử dụng một lá bài Đen trên tay như một lá [Tước Bài].'
    })
  ]
};

// 9. Nguyễn Chích
export const NguyenChich = {
  id: 'nguyen_chich',
  name: 'Nguyễn Chích',
  faction: 'ha',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'nghe_an_ke',
      name: 'Nghệ An Kế',
      type: 'lock',
      description: 'Tỏa Định Kỹ: Bạn không thể trở thành mục tiêu của [Cướp Bài] và [Hỗn Loạn].'
    }),
    new SkillContract({
      id: 'hien_ke',
      name: 'Hiến Kế',
      type: 'reactive',
      trigger: 'ON_LOSE_LAST_HAND',
      filter: (ctx) => ctx.ownerId === ctx.targetId,
      description: 'Sau khi bạn mất lá bài cuối cùng trên tay, bạn có thể rút 1 lá bài.',
      execute: (state, ctx) => {
        state.drawCards(ctx.ownerId, 1);
        state.addLog(`📜 [Hiến Kế] kích hoạt: ${ctx.owner.name} mất lá bài cuối cùng trên tay, lập tức rút 1 lá bài!`);
      }
    })
  ]
};

// 10. Trần Nhật Duật
export const TranNhatDuat = {
  id: 'tran_nhat_duat',
  name: 'Trần Nhật Duật',
  faction: 'ha',
  gender: 'male',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'thong_ngon',
      name: 'Thông Ngôn',
      type: 'reactive',
      trigger: 'ON_JUDGED',
      filter: (ctx) => ctx.ownerId === ctx.targetId,
      description: 'Sau khi lá bài phán xét của bạn có hiệu lực, bạn có thể thu lấy lá bài đó.',
      execute: (state, ctx) => {
        if (ctx.judgeCard) {
          ctx.owner.hand.push(ctx.judgeCard);
          state.discardPile = state.discardPile.filter(c => c.id !== ctx.judgeCard.id);
          state.addLog(`📜 [Thông Ngôn] kích hoạt: ${ctx.owner.name} thu hồi lá phán xét [${ctx.judgeCard.name}]!`);
        }
      }
    }),
    new SkillContract({
      id: 'hoa_nghi',
      name: 'Hòa Nghị',
      type: 'reactive',
      trigger: 'ON_DAMAGED',
      filter: (ctx) => ctx.ownerId === ctx.targetId,
      description: 'Sau khi nhận 1 điểm sát thương, xem 2 lá bài trên cùng của chồng bài rút, sau đó phân phối những lá bài đó cho các tướng tùy ý.',
      execute: (state, ctx) => {
        const drawnCards = state.drawCards(ctx.ownerId, 2);
        state.priorityStack.push({
          type: 'ASK_HOA_NGHI',
          sourceId: ctx.ownerId,
          targetId: ctx.ownerId,
          currentActorId: ctx.ownerId,
          priorityQueue: [ctx.ownerId],
          context: {
            reason: 'hoa_nghi',
            drawnCards
          }
        });
      }
    })
  ]
};

// 11. Trần Khánh Dư
export const TranKhanhDu = {
  id: 'tran_khanh_du',
  name: 'Trần Khánh Dư',
  faction: 'ha',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'van_don',
      name: 'Vân Đồn',
      type: 'active',
      frequency: 'turn',
      description: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể đấu điểm với một tướng khác. Nếu thắng, trong lượt này bạn được sử dụng thêm 1 lá [Chém], [Chém] không giới hạn cự ly và có thể chỉ định thêm 1 mục tiêu. Nếu không thắng, bạn không thể sử dụng [Chém] trong lượt này.',
      canUse: (state, ctx) => {
        if (!ctx.owner || ctx.owner.hand?.length === 0) return false;
        if (ctx.owner.temporaryFlags?.vanDonUsed) return false;
        return state.getAlivePlayers().some(p => p.id !== ctx.ownerId && p.hand?.length > 0);
      },
      execute: (state, ctx) => {
        const targetId = ctx.targetId !== undefined ? ctx.targetId : ctx.target?.id;
        const validTarget = targetId !== undefined ? targetId : state.getAlivePlayers().find(p => p.id !== ctx.ownerId && p.hand?.length > 0)?.id;
        ctx.owner.temporaryFlags = ctx.owner.temporaryFlags || {};
        ctx.owner.temporaryFlags.vanDonUsed = true;
        state.priorityStack.push({
          type: 'ASK_VAN_DON',
          sourceId: ctx.ownerId,
          targetId: validTarget,
          currentActorId: ctx.ownerId,
          priorityQueue: [ctx.ownerId],
          context: {
            reason: 'van_don',
            sourceId: ctx.ownerId,
            targetId: validTarget
          }
        });
      }
    })
  ]
};

// 12. Mạc Đĩnh Chi
export const MacDinhChi = {
  id: 'mac_dinh_chi',
  name: 'Mạc Đĩnh Chi',
  faction: 'ha',
  gender: 'male',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'doi_su',
      name: 'Đối Sứ',
      type: 'reactive',
      trigger: 'ON_DAMAGED',
      filter: (ctx) => ctx.ownerId === ctx.targetId && ctx.actor && ctx.actor.hand && ctx.actor.hand.length > 0,
      description: 'Sau khi nhận sát thương, thu lấy 1 lá bài từ nguồn sát thương.',
      execute: (state, ctx) => {
        state.priorityStack.push({
          type: 'ASK_DOI_SU',
          sourceId: ctx.ownerId,
          targetId: ctx.actor.id,
          currentActorId: ctx.ownerId,
          priorityQueue: [ctx.ownerId],
          context: {
            reason: 'doi_su',
            actorId: ctx.actor.id
          }
        });
      }
    }),
    new SkillContract({
      id: 'ung_bien',
      name: 'Ứng Biến',
      type: 'reactive',
      description: 'Trước khi lá bài phán xét của một người chơi có hiệu lực, bạn có thể đánh ra 1 lá bài trên tay để thay thế lá bài phán xét đó.'
    })
  ]
};

// 13. Chu Văn An
export const ChuVanAn = {
  id: 'chu_van_an',
  name: 'Chu Văn An',
  faction: 'ha',
  gender: 'male',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'that_tram_so',
      name: 'Thất Trảm Sớ',
      type: 'reactive',
      trigger: 'ON_DAMAGED',
      filter: (ctx) => ctx.ownerId === ctx.targetId && ctx.actor,
      description: 'Sau khi nhận sát thương, bạn có thể tiến hành phán xét. Nếu kết quả không phải chất ♥, nguồn sát thương phải chọn một: Bỏ 2 lá bài trên tay; hoặc Nhận 1 điểm sát thương do bạn gây ra.',
      execute: (state, ctx) => {
        const judgeCard = state.drawCardFromDeck();
        if (!judgeCard) return;
        state.discardPile.push(judgeCard);
        state.addLog(`📜 [Thất Trảm Sớ] phán xét: ra lá chất [${judgeCard.suit}].`);

        const isHeart = judgeCard.suit === 'heart' || judgeCard.suit === '♥' || judgeCard.suit === 'cơ';
        if (!isHeart && ctx.actor && ctx.actor.isAlive) {
          state.priorityStack.push({
            type: 'ASK_THAT_TRAM_SO_PUNISH',
            sourceId: ctx.ownerId,
            targetId: ctx.actor.id,
            currentActorId: ctx.actor.id,
            priorityQueue: [ctx.actor.id],
            context: {
              reason: 'that_tram_so',
              sourceId: ctx.ownerId,
              judgeCard
            }
          });
        }
      }
    })
  ]
};

// 14. Nguyễn Địa Lô
export const NguyenDiaLo = {
  id: 'nguyen_dia_lo',
  name: 'Nguyễn Địa Lô',
  faction: 'ha',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'ho_chu',
      name: 'Hộ Chủ',
      type: 'lock',
      trigger: 'ON_DYING',
      filter: (ctx) => ctx.ownerId === ctx.targetId,
      description: 'Khi bạn rơi vào trạng thái Hấp hối, lật lá bài trên cùng của chồng bài rút và đặt lên tướng của bạn, gọi là "Trung". Nếu điểm số của lá bài này khác với tất cả các lá "Trung" đã có, bạn hồi phục đến 1 điểm Sinh lực. Nếu trùng điểm số, bỏ lá bài đó vào chồng bài bỏ. Khi trên tướng của bạn có "Trung", giới hạn trữ bài bằng số lá "Trung".',
      execute: (state, ctx) => {
        const owner = ctx.owner;
        const card = state.drawCardFromDeck();
        if (card) {
          owner.trungCards = owner.trungCards || [];
          const isDuplicate = owner.trungCards.some(c => c.rank === card.rank);
          if (!isDuplicate) {
            owner.trungCards.push(card);
            owner.hp = Math.max(1, owner.hp);
            state.addLog(`🛡️ [Hộ Chủ] ${owner.name} lật [Trung]: ${card.suit} ${card.rank} (không trùng điểm)! Thoát chết hồi phục lên 1 HP!`);
          } else {
            state.discardPile.push(card);
            state.addLog(`❌ [Hộ Chủ] ${owner.name} lật [Trung]: ${card.suit} ${card.rank} (bị trùng điểm)! Thất bại.`);
          }
        }
      }
    }),
    new SkillContract({
      id: 'can_gian',
      name: 'Can Gián',
      type: 'reactive',
      description: 'Khi một tướng bị bỏ hoặc bị thu lấy bài trên tay, bạn có thể mất 1 điểm Sinh lực. Nếu làm vậy, tướng đó rút 2 lá bài.',
      canUse: (state, ctx) => ctx.owner.hp > 1,
      execute: (state, ctx) => {
        if (ctx.owner.hp <= 1) return;
        const target = ctx.target;
        if (!target || !target.isAlive) return;
        ctx.owner.hp -= 1;
        state.drawCards(target.id, 2);
        state.addLog(`🕊️ [Can Gián] ${ctx.owner.name} mất 1 HP giúp ${target.name} rút 2 lá bài!`);
      }
    })
  ]
};

// 15. Công chúa An Tư
export const CongChuaAnTu = {
  id: 'cong_chua_an_tu',
  name: 'Công chúa An Tư',
  faction: 'ha',
  gender: 'female',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'hoa_than_an_tu',
      name: 'Hòa Thân',
      type: 'active',
      description: 'Trong giai đoạn Hành động, bạn có thể sử dụng một lá bài chất ♦ như [Lạc Bất Tư Thục].'
    }),
    new SkillContract({
      id: 'xa_than',
      name: 'Xả Thân',
      type: 'reactive',
      description: 'Khi bạn trở thành mục tiêu của [Chém], bạn có thể bỏ đi một lá bài và đem lá [Chém] này di chuyển sang một người chơi khác nằm trong phạm vi công kích của bạn.'
    })
  ]
};

export const HA_HEROES = [
  NgoQuyen,
  YetKieu,
  NguyenTrai,
  ToHienThanh,
  NguyenPhiYLan,
  HoXuanHuong,
  NgocHanCongChua,
  DaTuong,
  NguyenChich,
  TranNhatDuat,
  TranKhanhDu,
  MacDinhChi,
  ChuVanAn,
  NguyenDiaLo,
  CongChuaAnTu
];
