import { CARD_TYPES, CARD_SUBTYPES } from 'shared/constants/cardTypes.js';

export function validateDeck(cards) {
  const validTypes = Object.values(CARD_TYPES);
  
  for (const card of cards) {
    if (!validTypes.includes(card.type)) {
      throw new Error(`[VALIDATION ERROR] Lá bài "${card.name}" (${card.id}) có type "${card.type}" không hợp lệ. Chỉ chấp nhận: ${validTypes.join(', ')}`);
    }
  }
  
  console.log(`[VALIDATOR] Đã quét thành công ${cards.length} lá bài. Không có lỗi.`);
  return true;
}
