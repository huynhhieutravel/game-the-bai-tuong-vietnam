// ==========================================
// Effects - Các lệnh thay đổi State (được ném vào Reducer)
// ==========================================

export function DamageEffect(sourceId, targetId, amount, damageType = 'normal') {
  return {
    type: 'DAMAGE',
    sourceId,
    targetId,
    amount,
    damageType
  };
}

export function RecoverEffect(targetId, amount) {
  return {
    type: 'RECOVER',
    targetId,
    amount
  };
}

export function TurnOverEffect(targetId) {
  return {
    type: 'TURN_OVER',
    targetId
  };
}

export function DrawCardEffect(targetId, amount) {
  return {
    type: 'DRAW_CARD',
    targetId,
    amount
  };
}

export function ResetTurnFlagsEffect(targetId) {
  return {
    type: 'RESET_TURN_FLAGS',
    targetId
  };
}

export function MoveCardEffect(cardId, fromZone, toZone, fromPlayerId = null, toPlayerId = null, virtualCardName = null) {
  return {
    type: 'MOVE_CARD',
    cardId,
    fromZone,
    toZone,
    fromPlayerId,
    toPlayerId,
    virtualCardName
  };
}

// ============ Phase 1: State Ownership — New Effects ============

export function SetFlagEffect(playerId, flag, value) {
  return {
    type: 'SET_FLAG',
    playerId,  // null = global flag
    flag,
    value
  };
}

export function SetWaitingEffect(value) {
  return {
    type: 'SET_WAITING',
    value // null = clear, hoặc { type: 'ask_xxx', ... }
  };
}

export function AddLogEffect(message) {
  return {
    type: 'ADD_LOG',
    message
  };
}

export function PushEventEffect(event) {
  return {
    type: 'PUSH_EVENT',
    event // { type: 'EVENT_XXX', payload: { ... } }
  };
}

