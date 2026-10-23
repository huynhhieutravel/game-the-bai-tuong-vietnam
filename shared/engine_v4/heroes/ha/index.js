/**
 * Heroes Hệ 🔵 HÀ (Ngô) trong Việt Sát v4.
 * Bao gồm đầy đủ các tướng Hà với các kỹ năng chuyển hóa và bảo vệ đồng đội.
 */

import { SkillContract } from '../base/SkillContract.js';

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
      description: 'Bỏ X bài, rút X bài; nếu bỏ hết tay thì rút thêm 1 lá bài.',
      execute: (state, ctx) => {
        const owner = ctx.owner;
        const count = owner.hand.length;
        if (count > 0) {
          state.discardPile.push(...owner.hand);
          owner.hand = [];
          state.drawCards(owner.id, count + 1); // Rút count + 1 vì bỏ hết bài tay!
          state.addLog(`🌊 [Bạch Đằng] kích hoạt: ${owner.name} đổi toàn bộ ${count} bài và rút thêm 1 lá bài thưởng!`);
        }
      }
    }),
    new SkillContract({
      id: 'hau_vien',
      name: 'Hậu Viện',
      type: 'reactive',
      description: 'Chủ Công Kỹ: Khi tướng Hà ăn Đào có thể nhường cho Ngô Quyền hồi máu và rút 1 bài.'
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
      description: 'Mất 1 HP -> Rút 2 lá bài.',
      canUse: (state, ctx) => ctx.owner.hp > 1,
      execute: (state, ctx) => {
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
      description: 'Giai đoạn Rút bài được rút thêm 1 lá bài (tổng 3 lá).',
      execute: (state, ctx) => {
        ctx.owner.temporaryFlags.drawCardCount = 3;
        state.addLog(`📜 [Bình Ngô] kích hoạt: ${ctx.owner.name} được rút 3 lá bài!`);
      }
    }),
    new SkillContract({
      id: 'tam_cong',
      name: 'Tâm Công',
      type: 'active',
      frequency: 'turn',
      description: 'Đoán chất bài đối thủ; nếu sai họ nhận 1 sát thương.'
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
      id: 'nhiep_chinh_to_hien_thanh',
      name: 'Nhiếp Chính',
      type: 'lock',
      description: 'Nếu trong Action Phase không đánh Chém -> Bỏ qua Discard Phase (giữ toàn bộ bài tay).'
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
      id: 'nhiep_chinh_y_lan',
      name: 'Nhiếp Chính',
      type: 'active',
      description: 'Bài Đen trên tay có thể dùng như [Né].'
    }),
    new SkillContract({
      id: 'phat_tam',
      name: 'Phật Tâm',
      type: 'reactive',
      frequency: 'turn',
      trigger: 'BEGIN_PHASE',
      filter: (ctx) => ctx.ownerId === ctx.actorId,
      description: 'Đầu lượt phán xét bài Đen -> rút tiếp và thu toàn bộ bài Đen.'
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
      description: 'Bỏ 2 bài -> Hồi 1 HP cho mình và 1 tướng Nam bị thương.'
    }),
    new SkillContract({
      id: 'xuan_huong',
      name: 'Xuân Hương',
      type: 'reactive',
      trigger: 'ON_EQUIP_LOST',
      filter: (ctx) => ctx.ownerId === ctx.targetId,
      description: 'Khi mất 1 lá trang bị, được rút 2 lá bài.',
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
      description: 'Bỏ 1 lá Heart chặn damage, ép người khác nhận 1 damage hoặc mất 1 HP.'
    }),
    new SkillContract({
      id: 'quoc_sac',
      name: 'Quốc Sắc',
      type: 'lock',
      description: 'Mọi lá bài Spade (Bích) của mình được xem như Heart (Cơ).'
    })
  ]
};

// 8. Dã Tượng (Hệ Hà)
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
      description: 'Bạn có thể sử dụng một lá bài Đen như một lá [Tước Bài].'
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
      description: 'Tỏa Định Kỹ: Không thể trở thành mục tiêu của [Thuận Thủ Khiên Dương] và [Lạc Bất Tư Thục].'
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
      description: 'Sau khi nhận 1 điểm sát thương, xem 2 bài đầu chồng rút, chia cho người chơi tùy ý.',
      execute: (state, ctx) => {
        const drawn = state.drawCards(ctx.ownerId, 2);
        state.addLog(`🕊️ [Hòa Nghị] kích hoạt: ${ctx.owner.name} nhận 2 lá bài từ chồng bài rút!`);
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
      description: 'Đấu điểm; thắng được thêm 1 Chém vô hạn cự ly; thua bị cấm Chém lượt này.'
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
      filter: (ctx) => ctx.ownerId === ctx.targetId && ctx.actor && ctx.actor.hand.length > 0,
      description: 'Sau khi nhận sát thương, thu lấy 1 lá bài từ nguồn sát thương.',
      execute: (state, ctx) => {
        const stolen = ctx.actor.hand.pop();
        if (stolen) {
          ctx.owner.hand.push(stolen);
          state.addLog(`📜 [Đối Sứ] kích hoạt: ${ctx.owner.name} thu lấy 1 lá bài từ ${ctx.actor.name}!`);
        }
      }
    }),
    new SkillContract({
      id: 'ung_bien',
      name: 'Ứng Biến',
      type: 'reactive',
      description: 'Đánh ra 1 lá bài trên tay để thay thế lá bài phán xét.'
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
      description: 'Nhận sát thương: Phán xét không phải Heart thì nguồn sát thương bỏ 2 bài hoặc nhận 1 sát thương.',
      execute: (state, ctx) => {
        const judgeCard = state.drawCardFromDeck();
        if (!judgeCard) return;
        state.discardPile.push(judgeCard);
        state.addLog(`📜 [Thất Trảm Sớ] phán xét: ra lá chất [${judgeCard.suit}].`);

        if (judgeCard.suit !== 'heart' && judgeCard.suit !== '♥') {
          ctx.actor.hp -= 1;
          state.addLog(`⚡ Kẻ gây sát thương ${ctx.actor.name} nhận 1 sát thương do [Thất Trảm Sớ] gây ra!`);
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
      description: 'Hấp hối: Lật bài Trung, khác điểm với các lá cũ thì hồi 1 HP.',
      execute: (state, ctx, stack) => {
        const card = state.drawCardFromDeck();
        if (card) {
          state.discardPile.push(card);
          ctx.owner.hp = 1;
          state.addLog(`🛡️ [Hộ Chủ] kích hoạt: ${ctx.owner.name} lật lá Trung [${card.name || card.id}], hồi phục lên 1 HP!`);
          if (stack && !stack.isEmpty() && stack.peek().type === 'ASK_PEACH') {
            stack.pop();
          }
        }
      }
    }),
    new SkillContract({
      id: 'xa_than_dia_lo',
      name: 'Xả Thân',
      type: 'reactive',
      description: 'Đồng minh bị mất bài trên tay -> Mất 1 HP cho họ rút 2 bài.'
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
      description: 'Sử dụng bài Diamond (♦) như [Lạc Bất Tư Thục].'
    }),
    new SkillContract({
      id: 'xa_than_an_tu',
      name: 'Xả Thân',
      type: 'reactive',
      description: 'Bị Chém -> Bỏ 1 bài chuyển hướng Chém sang tướng khác trong tầm.'
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

