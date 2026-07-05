// ==========================================
// Actions - Các hành động từ UI truyền vào Engine
// ==========================================

export function PlayCardAction(playerId, cardId, targets = [], virtualCardName = null) {
  return {
    type: 'ACTION_PLAY_CARD',
    payload: {
      playerId,
      cardId,
      targets,
      virtualCardName // Hỗ trợ kỹ năng biến đổi bài (TRANSFORM)
    }
  };
}

export function DrawCardsAction(playerId) {
  return {
    type: 'ACTION_DRAW_CARDS',
    payload: {
      playerId
    }
  };
}

export function UseSkillAction(playerId, skillId, targets = []) {
  return {
    type: 'ACTION_USE_SKILL',
    payload: {
      playerId,
      skillId,
      targets
    }
  };
}

export function ReactAction(playerId, responseType, data) {
  return {
    type: 'ACTION_REACT',
    payload: {
      playerId,
      responseType,
      data // Ví dụ: cardId của lá Né, hoặc lựa chọn Yes/No
    }
  };
}

export function EndPhaseAction(playerId) {
  return {
    type: 'ACTION_END_PHASE',
    payload: {
      playerId
    }
  };
}

export function DiscardAction(playerId, cardIds) {
  return {
    type: 'ACTION_DISCARD',
    payload: {
      playerId,
      cardIds // Mảng các cardId muốn bỏ
    }
  };
}
