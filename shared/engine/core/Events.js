// ==========================================
// Events - Các khối Logic xử lý từng giai đoạn của Game
// ==========================================

export function PlayCardEvent(playerId, cardId, targets, virtualCardName = null) {
  return {
    type: 'EVENT_ACTION_PLAY_CARD',
    payload: { playerId, cardId, targets, virtualCardName }
  };
}

export function DamageEvent(sourceId, targetId, amount, damageType = 'normal', options = {}) {
  return {
    type: 'EVENT_DAMAGE',
    payload: { sourceId, targetId, amount, damageType, ...options }
  };
}

export function AskDodgeEvent(sourceId, targetId, cardId) {
  return {
    type: 'EVENT_ASK_DODGE',
    payload: { sourceId, targetId, cardId }
  };
}

export function DyingEvent(targetId) {
  return {
    type: 'EVENT_DYING',
    payload: { targetId }
  };
}
