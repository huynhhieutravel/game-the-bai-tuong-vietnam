// ==========================================
// Game API - Application Layer
// Dependency Inversion: Bọc lại Dispatcher, UI chỉ giao tiếp qua GameAPI
// ==========================================

export class GameAPI {
  constructor(dispatcher) {
    this.dispatcher = dispatcher;
  }

  // --- Core Actions ---
  playCard(sourceId, cardId, targetIds = [], customData = {}) {
    this.dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: {
        sourceId,
        cardId,
        targetIds,
        ...customData
      }
    });
  }

  respond(payload) {
    // Map UI payload format to Dispatcher format
    // UI sends: { askerId, doNegate, cardId, doSave, doBagua, doUse, ... }
    // Dispatcher expects: { playerId, responseType, data }
    const playerId = payload.askerId ?? payload.playerId ?? 0;
    let responseType = 'provide';
    if (payload.doNegate === false || payload.doSave === false || payload.doUse === false || payload.doReact === false) {
      responseType = 'skip';
    }
    if (payload.doBagua) {
      responseType = 'judge';
    }
    
    this.dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: {
        playerId,
        responseType,
        data: payload
      }
    });
  }

  useSkill(playerId, skillId, cardIds = [], targets = [], options = {}) {
    this.dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      payload: {
        playerId,
        skillId,
        cardIds,
        targets,
        ...options
      }
    });
  }
  
  skillResponse(sourceId, skillId, responsePayload = {}) {
    this.dispatcher.dispatchAction({
        type: 'ACTION_SKILL_RESPONSE',
        payload: {
            sourceId,
            skillId,
            ...responsePayload
        }
    });
  }

  // --- Turn Management ---
  drawPhase(targetId, skipDraw = false, drawExtra = false) {
    this.dispatcher.dispatchAction({
      type: 'ACTION_DRAW_CARDS',
      payload: {
        targetId,
        skipDraw,
        drawExtra
      }
    });
  }

  endPhase(targetId) {
    this.dispatcher.dispatchAction({
      type: 'ACTION_END_PHASE',
      payload: { targetId }
    });
  }

  discardCards(targetId, cardIds) {
    this.dispatcher.dispatchAction({
      type: 'ACTION_DISCARD',
      payload: {
        targetId,
        cardIds
      }
    });
  }
  
  // --- Setup / Meta Actions ---
  selectDraftHeroes(playerId, heroA, heroB) {
      // Vì logic selectDraftHeroes hiện là hàm rời thao tác state thẳng, ta có thể dispatch 1 action đặc biệt 
      // hoặc gói vào event. Nhưng tạm thời ta hỗ trợ nó dưới dạng method API.
      // Cần migrate selectDraftHeroes vào Dispatcher trong tương lai.
      this.dispatcher.dispatchAction({
          type: 'ACTION_SELECT_DRAFT',
          payload: { playerId, heroA, heroB }
      });
  }
  
  revealHero(playerId, heroIndex) {
      this.dispatcher.dispatchAction({
          type: 'ACTION_REVEAL_HERO',
          payload: { playerId, heroIndex }
      });
  }
}
