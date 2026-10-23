import { CardRegistry } from '../registries/CardRegistry';
import { getCardSubType } from '../../data/gameData';
import { CARD_SUBTYPES, CARD_TYPES } from '../../constants/cardTypes';
import { getDistance, getAttackRange } from '../rangeSystem'; // Tạm thời dùng cũ
import { hasSkill } from '../gameState.js';
export function mapVietnameseToSlug(name) {
   if (!name) return name;
   const map = {
      'Chém': 'chem', 'Né': 'ne', 'Đào': 'dao', 'Rượu': 'ruou',
      'Dã Man': 'da-man',
      'Loạn Tiễn': 'loan-tien',
      'Tước Bài': 'tuoc-bai',
      'Cướp Bài': 'cuop-bai',
      'Quyết Đấu': 'quyet-dau',
      'Sấm Sét': 'sam-set', 'Hỗn Loạn': 'hon-loan',
      'Mượn Đao': 'muon-dao',
      'Hồi Xuân': 'hoi-xuan',
      'Hóa Giải': 'hoa-giai',
      'Xiềng Xích': 'xieng-xich',
      'Hỏa Công': 'hoa-cong',
      'Binh Lương Thốn Đoạn': 'binh-luong',
      'Vô Trung Sinh Hữu': 'vo-trung',
      
      // Trang bị
      'Liên Nỏ': 'lien-no',
      'Thanh Long Đao': 'thanh-long-dao',
      'Rìu Đá': 'riu-da',
      'Bát Quái': 'bat-quai',
      'Hắc Thuẫn': 'hac-thuan',
      'Bạch Ngân': 'bach-ngan',
      'Ngựa Chiến (-1)': 'ngua-chien',
      'Ngựa Thần (+1)': 'ngua-than',
      'Phương Thiên Kích': 'phuong-thien-kich',
      'Song Kiếm': 'song-kiem',
      'Quạt Sắt': 'quat-sat'
   };
   return map[name] || name;
}

export function canPlayCard(state, playerId, cardNameOrId, physicalCardId = null) {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isAlive) return { valid: false, reason: 'Người chơi không hợp lệ hoặc đã chết' };

  let physicalCard = null;
  const searchId = physicalCardId || cardNameOrId;
  if (searchId) {
     physicalCard = player.hand.find(c => c.id === searchId);
  }
  
  if (physicalCard && physicalCard.type === CARD_TYPES.EQUIP && (!physicalCardId || cardNameOrId === physicalCardId || cardNameOrId === physicalCard.name)) {
     // Đã gỡ bỏ luật chặn Cao Lỗ trang bị vũ khí. Cao Lỗ (Nỏ Thần) vẫn được phép mang vũ khí khác để lấy tầm đánh.
     return { valid: true };
  }

  const isVirtual = cardNameOrId && physicalCardId && cardNameOrId !== physicalCardId;
  const actualCardName = isVirtual ? cardNameOrId : (physicalCard ? physicalCard.name : cardNameOrId);
  const slug = mapVietnameseToSlug(actualCardName) || (actualCardName ? actualCardName.replace(/-[0-9]+-[0-9]+$/, '') : null);
  const cardConfig = CardRegistry[slug];
  if (!cardConfig) return { valid: false, reason: 'Thẻ bài không tồn tại' };

  if (cardConfig.canPlay) {
    const canPlay = cardConfig.canPlay(state, player, physicalCardId, isVirtual ? cardNameOrId : null);
    if (typeof canPlay === 'object') {
        if (!canPlay.valid) return canPlay;
    } else if (!canPlay) { 
        return { valid: false, reason: 'Không thỏa mãn điều kiện dùng bài' }; 
    }
  }

  return { valid: true };
}

export function getValidCardTargets(state, playerId, cardNameOrId, physicalCardId = null) {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isAlive) return [];

  let physicalCard = null;
  const searchId = physicalCardId || cardNameOrId;
  if (searchId) {
     physicalCard = player.hand.find(c => c.id === searchId);
  }
  
  if (physicalCard && physicalCard.type === 'equip' && (!physicalCardId || cardNameOrId === physicalCardId || cardNameOrId === physicalCard.name)) {
     return []; // Trang bị tự nhắm vào bản thân, không có target
  }

  const actualCardName = physicalCard ? physicalCard.name : cardNameOrId;
  const slug = mapVietnameseToSlug(actualCardName) || (actualCardName ? actualCardName.replace(/-[0-9]+-[0-9]+$/, '') : null);
  const cardConfig = CardRegistry[slug];
  if (!cardConfig || !cardConfig.getValidTargets) return [];

  return cardConfig.getValidTargets(state, player, physicalCardId);
}
