import { CardRegistry } from '../registries/CardRegistry.js';
import { CARD_TYPES } from '../../constants/cardTypes.js';

/**
 * Lấy định nghĩa cơ chế chọn mục tiêu (Targeting Definition) của một lá bài
 */
export function getTargetingDefinition(state, playerId, cardNameOrId, physicalCard) {
  // 1. Nếu là trang bị (Equip) -> Luôn là self (tự trang bị cho mình)
  if (physicalCard && physicalCard.type === CARD_TYPES.EQUIP) {
    return { type: 'self' };
  }

  // 2. Tra cứu CardRegistry
  // Ưu tiên cardNameOrId nếu nó khác với ID của thẻ (có thể là virtualName như 'Chém')
  let actualCardName = cardNameOrId;
  if (physicalCard && cardNameOrId === physicalCard.id) {
     actualCardName = physicalCard.name;
  } else if (!actualCardName && physicalCard) {
     actualCardName = physicalCard.name;
  }
  
  const slug = actualCardName ? mapVietnameseToSlug(actualCardName) || actualCardName.replace(/-[0-9]+-[0-9]+$/, '') : null;
  const cardConfig = CardRegistry[slug] || Object.values(CardRegistry).find(c => c.name === actualCardName);

  if (cardConfig && cardConfig.targeting) {
    if (typeof cardConfig.targeting === 'function') {
        const player = state ? state.players.find(p => p.id === playerId) : null;
        return cardConfig.targeting(state, player, cardNameOrId);
    }
    return cardConfig.targeting;
  }

  // 3. Fallback an toàn nếu chưa cấu hình
  if (cardConfig && cardConfig.getValidTargets) {
     return { type: 'single' };
  }
  
  return { type: 'none' };
}

/**
 * Hàm phụ trợ map tên tiếng Việt (Tái sử dụng logic cũ)
 */
function mapVietnameseToSlug(name) {
  const map = {
    'Chém': 'chem', 'Né': 'ne', 'Đào': 'dao', 'Rượu': 'ruou',
    'Dã Man': 'da-man', 'Loạn Tiễn': 'loan-tien', 'Hồi Xuân': 'hoi-xuan',
    'Tước Bài': 'tuoc-bai', 'Cướp Bài': 'cuop-bai', 'Quyết Đấu': 'quyet-dau',
    'Mượn Đao': 'muon-dao', 'Vô Trung Sinh Hữu': 'vo-trung', 'Hỏa Công': 'hoa-cong',
    'Xiềng Xích': 'xieng-xich', 'Sấm Sét': 'sam-set', 'Binh Lương Thốn Đoạn': 'binh-luong',
    'Hỗn Loạn': 'hon-loan'
  };
  return map[name];
}

/**
 * Lấy danh sách ID mục tiêu hợp lệ cho "bước hiện tại" (step)
 */
export function getAvailableTargets(state, playerId, cardNameOrId, physicalCardId = null, currentSelectedTargets = []) {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];

  let physicalCard = null;
  const searchId = physicalCardId || cardNameOrId;
  if (searchId) {
     physicalCard = player.hand.find(c => c.id === searchId);
  }

  const targeting = getTargetingDefinition(state, playerId, cardNameOrId, physicalCard);

  // Auto-cast hoặc không cần mục tiêu
  if (targeting.type === 'none' || targeting.type === 'aoe' || targeting.type === 'self') {
     return []; 
  }

  // Single hoặc Multiple (Cùng 1 filter)
  if (targeting.type === 'single' || targeting.type === 'multiple') {
      let actualCardName = cardNameOrId;
      if (physicalCard && cardNameOrId === physicalCard.id) {
         actualCardName = physicalCard.name;
      } else if (!actualCardName && physicalCard) {
         actualCardName = physicalCard.name;
      }
      const slug = actualCardName ? mapVietnameseToSlug(actualCardName) || actualCardName.replace(/-[0-9]+-[0-9]+$/, '') : null;
      const cardConfig = CardRegistry[slug] || Object.values(CardRegistry).find(c => c.name === actualCardName);

      if (targeting.filter) {
          return targeting.filter(state, player, currentSelectedTargets).map(p => p.id);
      }
      if (cardConfig && cardConfig.getValidTargets) {
          return cardConfig.getValidTargets(state, player, searchId).map(p => p.id);
      }
  }

  // Sequence (Đa bước - Mượn Đao)
  if (targeting.type === 'sequence') {
      const stepIndex = currentSelectedTargets.length;
      if (stepIndex >= targeting.steps.length) return []; // Đã chọn xong
      
      const step = targeting.steps[stepIndex];
      if (step.filter) {
          return step.filter(state, player, currentSelectedTargets).map(p => p.id);
      }
  }

  return [];
}

/**
 * Xác thực xem mảng payloadTargets mà UI hoặc Client gửi lên có ĐỦ và ĐÚNG không
 */
export function validateTargetPayload(state, playerId, cardNameOrId, physicalCardId = null, payloadTargets = []) {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { valid: false, reason: 'Người chơi không hợp lệ' };

  let physicalCard = null;
  const searchId = physicalCardId || cardNameOrId;
  if (searchId) {
     physicalCard = player.hand.find(c => c.id === searchId);
  }

  const targeting = getTargetingDefinition(state, playerId, cardNameOrId, physicalCard);

  if (targeting.type === 'none' || targeting.type === 'aoe') {
     return { valid: true, requiresAutoCast: false }; // Có thể có hoặc không có payload, nhưng hợp lệ
  }

  if (targeting.type === 'self') {
     return { valid: true, requiresAutoCast: true, autoTarget: playerId };
  }

  if (targeting.type === 'single') {
     if (payloadTargets.length !== 1) return { valid: false, reason: 'Cần chọn đúng 1 mục tiêu' };
     const allowed = getAvailableTargets(state, playerId, cardNameOrId, physicalCardId, []);
     if (!allowed.includes(payloadTargets[0])) {
         console.error(`[DEBUG_TARGET_ERROR] playerId=${playerId}, cardName=${cardNameOrId}, allowed=${allowed}, target=${payloadTargets[0]}`);
     }
     return { valid: true };
  }

  if (targeting.type === 'multiple') {
     if (payloadTargets.length < targeting.min || payloadTargets.length > targeting.max) {
         return { valid: false, reason: `Số lượng mục tiêu phải từ ${targeting.min} đến ${targeting.max}` };
     }
     const allowed = getAvailableTargets(state, playerId, cardNameOrId, physicalCardId, []);
     const allValid = payloadTargets.every(id => allowed.includes(id));
     if (!allValid) return { valid: false, reason: 'Có mục tiêu không hợp lệ' };
     return { valid: true };
  }

  if (targeting.type === 'sequence') {
     if (payloadTargets.length !== targeting.steps.length) {
         return { valid: false, reason: `Cần chọn đủ ${targeting.steps.length} mục tiêu` };
     }
     // Giả lập từng bước để kiểm tra
     const simSelected = [];
     for (let i = 0; i < targeting.steps.length; i++) {
         const allowed = getAvailableTargets(state, playerId, cardNameOrId, physicalCardId, simSelected);
         const targetId = payloadTargets[i];
         if (!allowed.includes(targetId)) {
             return { valid: false, reason: `Mục tiêu bước ${i+1} không hợp lệ` };
         }
         simSelected.push(targetId);
     }
     return { valid: true };
  }

  return { valid: false, reason: 'Không rõ cấu hình targeting' };
}
