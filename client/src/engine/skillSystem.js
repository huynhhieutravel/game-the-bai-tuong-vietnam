import { addLog, getPlayerGender } from './gameState';

export const SKILL_TRIGGERS = {
  TURN_BEGIN: 'TURN_BEGIN',
  DRAW_PHASE: 'DRAW_PHASE',
  BEFORE_CARD_USE: 'BEFORE_CARD_USE',
  ON_DAMAGE_CALC: 'ON_DAMAGE_CALC',
  POST_DAMAGE: 'POST_DAMAGE',
  ON_CARD_PLAYED: 'ON_CARD_PLAYED',
  END_PHASE: 'END_PHASE',
  ON_TARGETED_SLASH: 'ON_TARGETED_SLASH',
  DYING: 'DYING',
  POST_DISCARD: 'POST_DISCARD',
  ON_EQUIP_LOST: 'ON_EQUIP_LOST',
  ON_PEACH: 'ON_PEACH',
};

/**
 * Tính toán và áp dụng các Tỏa Định Kỹ (Passive Skills)
 */
export function applyPassiveSkills(state) {
  // Reset các modifiers trước khi tính toán lại
  state.players.forEach(p => {
    p.rangeModifiers = { attack: 0, defense: 0 };
    p.hasPassiveBagua = false;
  });

  // Áp dụng Tỏa Định Kỹ
  state.players.forEach(p => {
    if (!p.revealedHeroes) return; // Bảo vệ trường hợp chưa draft xong

    const heroes = p.heroes || (p.hero ? [p.hero] : []);
    heroes.forEach((hero, index) => {
      // Bỏ qua nếu tướng này đang úp (Tỏa Định Kỹ mất tác dụng)
      if (!p.revealedHeroes[index]) return;
      // Thiết Mã (Thánh Gióng): Tầm đánh luôn +1 (tức là khoảng cách -1)
      if (hero.id === 'thanh-giong') {
        p.rangeModifiers.attack += 1; // Giảm khoảng cách tới người khác (tương đương Ngựa Tấn Công)
      }
      
      // Thần Giáp (Rùa Vàng): Luôn có Bát Quái trận đồ
      if (hero.id === 'rua-vang') {
        if (!p.equipment.some(eq => eq.type === 'armor')) {
          p.hasPassiveBagua = true;
        }
      }
    });
  });

  return state;
}

/**
 * Xử lý các Trigger Skills (Đầu lượt, Rút bài, v.v...)
 */
export function triggerSkill(trigger, state, player, payload = {}) {
  let newState = { ...state };
  if (!player.revealedHeroes || player.isSilenced) return newState;

  const heroes = player.heroes || (player.hero ? [player.hero] : []);
  
  heroes.forEach((hero, index) => {
    if (!player.revealedHeroes[index]) return;
    switch (hero.id) {
      // Dã Trạch (Triệu Quang Phục) và Khởi Nghĩa (Phùng Hưng) đã được chuyển sang SkillRegistry Hooks
      case 'nguyen-trai':
        if (trigger === SKILL_TRIGGERS.DRAW_PHASE) {
           if (payload.drawCount !== undefined) {
               payload.drawCount += 1;
               Object.assign(newState, addLog(newState, `📜 ${player.name} dùng [Bình Ngô], rút thêm 1 lá!`, 'important'));
           }
        }
        break;
      case 'khuc-thua-du':
        if (trigger === SKILL_TRIGGERS.ON_DAMAGE_CALC && !player.askedKhoanDan) {
           const interruptedEvent = newState.waitingForResponse ? { ...newState.waitingForResponse } : (payload.interruptedEvent || null);
           newState.waitingForResponse = {
             type: 'ask_khoan_dan',
             sourceId: player.id,
             amount: payload.amount,
             damageSourceId: payload.sourceId,
             interruptedEvent
           };
        }
        break;
      case 'ly-thuong-kiet':
        if (trigger === SKILL_TRIGGERS.ON_DAMAGE_CALC && !player.askedNqsh) {
           const interruptedEvent = newState.waitingForResponse ? { ...newState.waitingForResponse } : (payload.interruptedEvent || null);
           newState.waitingForResponse = {
             type: 'ask_nam_quoc_son_ha',
             sourceId: player.id,
             amount: payload.amount,
             damageSourceId: payload.sourceId,
             interruptedEvent
           };
        }
        break;
      case 'duong-dinh-nghe':
        if (trigger === SKILL_TRIGGERS.TURN_BEGIN && !newState.waitingForResponse && !player.askedDuongQuan) {
           newState.waitingForResponse = {
             type: 'ask_duong_quan',
             sourceId: player.id
           };
        }
        break;
      case 'nguyen-phi-y-lan':
        if (trigger === SKILL_TRIGGERS.TURN_BEGIN && !newState.waitingForResponse && !player.phatTamFinished) {
           newState.waitingForResponse = {
             type: 'ask_phat_tam',
             sourceId: player.id,
             drawnCards: player.phatTamDrawn || []
           };
        }
        break;
      case 'tran-quang-khai':
        if (trigger === SKILL_TRIGGERS.END_PHASE && !newState.waitingForResponse && !player.askedDoatSao && !player.isFlipped) {
           newState.waitingForResponse = {
             type: 'ask_doat_sao',
             sourceId: player.id
           };
        }
        break;
      case 'ngoc-han':
        if (trigger === SKILL_TRIGGERS.ON_DAMAGE_CALC && !player.askedHienHau && player.hand.some(c => c.suit === '♥' || c.suit === '♠')) {
           const interruptedEvent = newState.waitingForResponse ? { ...newState.waitingForResponse } : (payload.interruptedEvent || null);
           newState.waitingForResponse = {
             type: 'ask_hien_hau',
             sourceId: player.id,
             amount: payload.amount,
             damageSourceId: payload.sourceId,
             interruptedEvent
           };
        }
        break;
      case 'chu-van-an':
        if (trigger === SKILL_TRIGGERS.POST_DAMAGE && !player.askedThatTramSo && payload.sourceId !== undefined && payload.sourceId !== player.id) {
           const interruptedEvent = newState.waitingForResponse ? { ...newState.waitingForResponse } : (payload.interruptedEvent || null);
           newState.waitingForResponse = {
             type: 'ask_that_tram_so',
             sourceId: player.id,
             damageSourceId: payload.sourceId,
             interruptedEvent
           };
        }
        break;
      case 'mac-dinh-chi':
        if (trigger === SKILL_TRIGGERS.POST_DAMAGE && !player.askedDoiSu && payload.sourceId !== undefined && payload.sourceId !== player.id) {
           const interruptedEvent = newState.waitingForResponse ? { ...newState.waitingForResponse } : (payload.interruptedEvent || null);
           newState.waitingForResponse = {
             type: 'ask_doi_su',
             sourceId: player.id,
             damageSourceId: payload.sourceId,
             interruptedEvent
           };
        }
        break;
      case 'tran-nhat-duat':
        if (trigger === SKILL_TRIGGERS.POST_DAMAGE && !player.askedHoaNghi) {
           const interruptedEvent = newState.waitingForResponse ? { ...newState.waitingForResponse } : (payload.interruptedEvent || null);
           newState.waitingForResponse = {
             type: 'ask_hoa_nghi',
             sourceId: player.id,
             interruptedEvent
           };
        }
        break;
      case 'nguyen-dia-lo':
        if (trigger === SKILL_TRIGGERS.DYING && !player.askedHoChu) {
           const interruptedEvent = newState.waitingForResponse ? { ...newState.waitingForResponse } : (payload.interruptedEvent || null);
           newState.waitingForResponse = {
             type: 'ask_ho_chu',
             sourceId: player.id,
             interruptedEvent
           };
        }
        if (trigger === SKILL_TRIGGERS.POST_DISCARD && !player.askedCanGian && payload.targetId !== player.id) {
           const interruptedEvent = newState.waitingForResponse ? { ...newState.waitingForResponse } : (payload.interruptedEvent || null);
           newState.waitingForResponse = {
             type: 'ask_can_gian',
             sourceId: player.id,
             targetId: payload.targetId,
             interruptedEvent
           };
        }
        break;
      case 'cong-chua-an-tu':
        if (trigger === SKILL_TRIGGERS.ON_TARGETED_SLASH && !player.askedXaThan && player.hand.length > 0) {
           const interruptedEvent = newState.waitingForResponse ? { ...newState.waitingForResponse } : null;
           newState.waitingForResponse = {
             type: 'ask_xa_than',
             sourceId: player.id,
             cardPlayedId: payload.cardPlayedId,
             slashSourceId: payload.sourceId,
             interruptedEvent
           };
        }
        break;
      // Xuân Hương (Hồ Xuân Hương) đã được chuyển sang SkillRegistry Hooks
      case 'ngo-quyen':
        if (trigger === SKILL_TRIGGERS.ON_PEACH) {
           // Handled externally where peach is resolved because it involves the Peach user
        }
        break;
      case 'dinh-bo-linh':
        if (trigger === SKILL_TRIGGERS.POST_DAMAGE) {
           const { sourceId, isRedSlash } = payload;
           if (isRedSlash && sourceId !== undefined && sourceId !== player.id) {
               const interruptedEvent = newState.waitingForResponse ? { ...newState.waitingForResponse } : null;
               newState.waitingForResponse = {
                 type: 'ask_uy_chan',
                 sourceId: player.id,
                 targetId: sourceId,
                 interruptedEvent
               };
           }
        }
        break;
      case 'huyen-tran-cong-chua':
        if (trigger === SKILL_TRIGGERS.END_PHASE && !newState.waitingForResponse && !player.askedAnBang) {
           newState.waitingForResponse = {
             type: 'ask_an_bang',
             sourceId: player.id
           };
        }
        break;
      case 'dinh-dien':
        // Phạt Tội đã được xử lý trực tiếp trong logic Né ở cardEffects.js
        break;
      case 'do-doc-bao':
        if (trigger === SKILL_TRIGGERS.DRAW_PHASE && !newState.waitingForResponse && !player.askedPhaThanh) {
           newState.waitingForResponse = {
             type: 'ask_pha_thanh',
             sourceId: player.id
           };
        }
        break;
    }
  });

  return newState;
}

/**
 * Xử lý khi bấm nút Kỹ Năng (Active Skills)
 */
export function useActiveSkill(state, playerId, skillId, targets, cards) {
  let newState = { ...state };
  const player = newState.players.find(p => p.id === playerId);
  if (!player) return newState;

  switch (skillId) {
    case 'thuy-to':
      Object.assign(newState, addLog(newState, `🌊 ${player.name} phát động [Thủy Tổ]!`, 'important'));
      // Logic cho mượn bài...
      break;
    case 'boc-tram-trung':
      Object.assign(newState, addLog(newState, `🐉 ${player.name} phát động [Bọc Trăm Trứng]!`, 'important'));
      break;
    default:
      break;
  }
  return newState;
}
