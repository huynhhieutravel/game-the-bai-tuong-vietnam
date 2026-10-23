/**
 * Heroes Hệ 🔴 VIỆT (Nguỵ) trong Việt Sát v4.
 * Đóng gói đầy đủ 7 vị tướng kèm các chốt chặn an toàn và AI fallback.
 */

import { SkillContract } from '../base/SkillContract.js';

// 1. Triệu Quang Phục
export const TrieuQuangPhuc = {
  id: 'trieu_quang_phuc',
  name: 'Triệu Quang Phục',
  faction: 'viet',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'da_trach',
      name: 'Dạ Trạch',
      type: 'reactive',
      frequency: 'turn',
      trigger: 'DRAW_PHASE',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Trong giai đoạn Rút bài, có thể thay vào đó cướp ngẫu nhiên 1 lá bài trên tay của tối đa 2 tướng khác.',
      execute: (state, ctx) => {
        const opponentsWithCards = state.getAlivePlayers().filter(p => p.id !== ctx.ownerId && p.hand && p.hand.length > 0);
        if (opponentsWithCards.length > 0) {
          state.priorityStack.push({
            type: 'ASK_DA_TRACH',
            sourceId: ctx.ownerId,
            targetId: ctx.ownerId,
            currentActorId: ctx.ownerId,
            priorityQueue: [ctx.ownerId]
          });
        }
      }
    })
  ]
};

// 2. Phùng Hưng
export const PhungHung = {
  id: 'phung_hung',
  name: 'Phùng Hưng',
  faction: 'viet',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'khoi_nghia',
      name: 'Khởi Nghĩa',
      type: 'reactive',
      frequency: 'turn',
      trigger: 'DRAW_PHASE',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Trong giai đoạn Rút bài, có thể rút ít hơn 1 lá bài để Chém và Quyết Đấu lượt này +1 sát thương.',
      execute: (state, ctx) => {
        state.priorityStack.push({
          type: 'ASK_KHOI_NGHIA',
          sourceId: ctx.ownerId,
          targetId: ctx.ownerId,
          currentActorId: ctx.ownerId,
          priorityQueue: [ctx.ownerId]
        });
      }
    })
  ]
};

// 3. Khúc Thừa Dụ
export const KhucThuaDu = {
  id: 'khuc_thua_du',
  name: 'Khúc Thừa Dụ',
  faction: 'viet',
  gender: 'male',
  hp: 3,
  maxHp: 3,
  skills: [
    new SkillContract({
      id: 'tu_chu',
      name: 'Tự Chủ',
      type: 'active',
      frequency: 'turn',
      description: 'Đấu điểm với tướng có HP cao hơn; thắng bắt họ chém người khác, thua bị họ chém.'
    }),
    new SkillContract({
      id: 'khoan_dan',
      name: 'Khoan Dân',
      type: 'reactive',
      trigger: 'ON_DAMAGED',
      filter: (ctx) => ctx.ownerId === ctx.targetId,
      description: 'Sau khi nhận sát thương, có thể chọn 1 tướng rút bài cho bằng giới hạn HP (tối đa 5).',
      execute: (state, ctx) => {
        state.priorityStack.push({
          type: 'ASK_KHOAN_DAN',
          sourceId: ctx.ownerId,
          targetId: ctx.ownerId,
          currentActorId: ctx.ownerId,
          priorityQueue: [ctx.ownerId],
          context: {
            damageAmount: ctx.damageAmount
          }
        });
      }
    })
  ]
};

// 4. Dương Đình Nghệ
export const DuongDinhNghe = {
  id: 'duong_dinh_nghe',
  name: 'Dương Đình Nghệ',
  faction: 'viet',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'duong_quan',
      name: 'Dưỡng Quân',
      type: 'active',
      description: 'Bỏ qua các pha trong lượt (Phán xét & Rút bài / Hành động & Bỏ trang bị / Bỏ bài & Lật mặt) để Chém không giới hạn cự ly.'
    }),
    new SkillContract({
      id: 'duong_quan_1',
      name: 'Dưỡng Quân (Pha Bắt đầu)',
      type: 'reactive',
      frequency: 'turn',
      trigger: 'BEGIN_PHASE',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Đầu lượt có thể bỏ qua Phán xét và Rút bài để Chém không giới hạn cự ly.',
      execute: (state, ctx) => {
        const hasDamBac = p => (p.skills && (p.skills.includes('dam_bac') || p.skills.some(s => s?.id === 'dam_bac'))) ||
          p.heroes?.some(h => h.id === 'lang_lieu' || h.skills?.some(s => s === 'dam_bac' || s?.id === 'dam_bac')) ||
          p.mainHeroId === 'lang_lieu' || p.subHeroId === 'lang_lieu';

        const otherAlive = state.getAlivePlayers().filter(p => {
          if (p.id === ctx.ownerId) return false;
          if (hasDamBac(p) && (!p.hand || p.hand.length === 0)) return false;
          return true;
        });
        if (otherAlive.length > 0) {
          state.priorityStack.push({
            type: 'ASK_DUONG_QUAN_1',
            sourceId: ctx.ownerId,
            targetId: ctx.ownerId,
            currentActorId: ctx.ownerId,
            priorityQueue: [ctx.ownerId],
            context: {
              validTargets: otherAlive.map(p => p.id)
            }
          });
        }
      }
    }),
    new SkillContract({
      id: 'duong_quan_3',
      name: 'Dưỡng Quân (Pha Bỏ bài)',
      type: 'reactive',
      frequency: 'turn',
      trigger: 'DISCARD_PHASE',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Pha Bỏ bài có thể lật úp mặt tướng và bỏ qua bỏ bài để Chém không giới hạn cự ly.',
      execute: (state, ctx) => {
        const hasDamBac = p => (p.skills && (p.skills.includes('dam_bac') || p.skills.some(s => s?.id === 'dam_bac'))) ||
          p.heroes?.some(h => h.id === 'lang_lieu' || h.skills?.some(s => s === 'dam_bac' || s?.id === 'dam_bac')) ||
          p.mainHeroId === 'lang_lieu' || p.subHeroId === 'lang_lieu';

        const otherAlive = state.getAlivePlayers().filter(p => {
          if (p.id === ctx.ownerId) return false;
          if (hasDamBac(p) && (!p.hand || p.hand.length === 0)) return false;
          return true;
        });
        if (otherAlive.length > 0 && ctx.owner.isFaceUp) {
          state.priorityStack.push({
            type: 'ASK_DUONG_QUAN_3',
            sourceId: ctx.ownerId,
            targetId: ctx.ownerId,
            currentActorId: ctx.ownerId,
            priorityQueue: [ctx.ownerId],
            context: {
              validTargets: otherAlive.map(p => p.id)
            }
          });
        }
      }
    })
  ]
};

// 5. Lý Thường Kiệt
export const LyThuongKiet = {
  id: 'ly_thuong_kiet',
  name: 'Lý Thường Kiệt',
  faction: 'viet',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'nam_quoc_son_ha',
      name: 'Nam Quốc Sơn Hà',
      type: 'reactive',
      trigger: 'ON_DAMAGED',
      filter: (ctx) => ctx.ownerId === ctx.targetId,
      description: 'Sau khi nhận sát thương, rút 1 lá bài và thu lấy lá bài gây sát thương.',
      execute: (state, ctx) => {
        state.priorityStack.push({
          type: 'ASK_NAM_QUOC_SON_HA',
          sourceId: ctx.ownerId,
          targetId: ctx.ownerId,
          currentActorId: ctx.ownerId,
          priorityQueue: [ctx.ownerId],
          context: {
            damageCard: ctx.card
          }
        });
      }
    }),
    new SkillContract({
      id: 'tien_phat',
      name: 'Tiên Phát',
      type: 'reactive',
      description: 'Chủ Công Kỹ: Khi cần Né, một tướng hệ Việt có thể Né giùm.'
    })
  ]
};

// 6. Trần Quang Khải
export const TranQuangKhai = {
  id: 'tran_quang_khai',
  name: 'Trần Quang Khải',
  faction: 'viet',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'doat_sao',
      name: 'Đoạt Sáo',
      type: 'reactive',
      frequency: 'turn',
      trigger: 'END_PHASE',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Cuối lượt lật mặt tướng và rút 4 bài, bỏ 1 bài (nếu là Trang bị thì sử dụng).',
      execute: (state, ctx) => {
        state.priorityStack.push({
          type: 'ASK_DOAT_SAO',
          sourceId: ctx.ownerId,
          targetId: ctx.ownerId,
          currentActorId: ctx.ownerId,
          priorityQueue: [ctx.ownerId]
        });
      }
    }),
    new SkillContract({
      id: 'chuong_duong',
      name: 'Chương Dương',
      type: 'active',
      description: 'Dùng trang bị như [Vô Giải Khả Kích].'
    })
  ]
};

// 7. Nguyễn Lữ
export const NguyenLu = {
  id: 'nguyen_lu',
  name: 'Nguyễn Lữ',
  faction: 'viet',
  gender: 'male',
  hp: 4,
  maxHp: 4,
  skills: [
    new SkillContract({
      id: 'tien_phong_nguyen_lu',
      name: 'Tiên Phong',
      type: 'active',
      frequency: 'turn',
      description: 'Mất 1 HP hoặc bỏ vũ khí -> Gây 1 sát thương lên người trong tầm.',
      execute: (state, ctx) => {
        const owner = ctx.owner;
        const target = ctx.target;
        owner.hp -= 1;
        state.addLog(`⚡ [Tiên Phong] kích hoạt: ${owner.name} mất 1 HP, gây 1 sát thương lên ${target.name}!`);
        target.hp -= 1;
      }
    })
  ]
};

export const VIET_HEROES = [
  TrieuQuangPhuc,
  PhungHung,
  KhucThuaDu,
  DuongDinhNghe,
  LyThuongKiet,
  TranQuangKhai,
  NguyenLu
];
