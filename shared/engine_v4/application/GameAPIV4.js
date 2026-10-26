// @ts-check
/**
 * GameAPIV4.js
 * Application Layer đóng gói DispatcherV4.
 * Cung cấp giao diện phương thức đơn giản, an toàn cho React UI Components.
 */

export class GameAPIV4 {
  constructor(dispatcher) {
    this.dispatcher = dispatcher;
  }

  // --- Core Card Actions ---
  playCard(sourceId, cardId, targetIds = [], customData = {}) {
    const player = this.dispatcher.state?.getPlayer ? this.dispatcher.state.getPlayer(sourceId) : null;
    const isHuman = player ? !player.isBot : true;
    const interactive = customData.interactive !== undefined ? customData.interactive : isHuman;
    this.dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: {
        sourceId,
        cardId,
        targetIds,
        interactive,
        ...customData
      }
    });
  }

  respond(payload) {
    const playerId = payload.askerId ?? payload.playerId ?? 0;
    let responseType = payload.responseType || 'provide';
    if (payload.canceled) {
      responseType = 'cancel';
    } else if (
      payload.doNegate === false ||
      payload.doSave === false ||
      payload.doUse === false ||
      payload.doReact === false ||
      payload.doProvide === false ||
      payload.doJudge === false ||
      payload.doDoubt === false ||
      payload.reveal === false ||
      payload.doDiscard === false
    ) {
      responseType = 'skip';
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

  // --- Skill Actions ---
  useSkill(playerId, skillId, cardIds = [], targets = [], options = {}) {
    const player = this.dispatcher.state?.getPlayer ? this.dispatcher.state.getPlayer(playerId) : null;
    const isHuman = player ? !player.isBot : true;
    const interactive = options.interactive !== undefined ? options.interactive : isHuman;
    this.dispatcher.dispatchAction({
      type: 'ACTION_USE_SKILL',
      payload: {
        playerId,
        skillId,
        cardIds,
        targets,
        interactive,
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

  // --- Turn Lifecycle Management ---
  drawPhase(targetId, skipDraw = false, drawExtra = false, khaiQuoc = false) {
    this.dispatcher.dispatchAction({
      type: 'ACTION_DRAW_CARDS',
      payload: {
        targetId,
        skipDraw,
        drawExtra,
        khaiQuoc
      }
    });
  }

  endPhase(targetId) {
    this.dispatcher.dispatchAction({
      type: 'ACTION_END_PHASE',
      payload: { targetId }
    });
  }

  endTurn(playerId = null) {
    const targetId = playerId ?? this.dispatcher?.state?.currentTurnPlayerId ?? 0;
    this.endPhase(targetId);
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

  // --- Meta / Hero Actions ---
  selectDraftHeroes(playerId, heroA, heroB) {
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

  addLog(message, type = 'info') {
    if (this.dispatcher && typeof this.dispatcher.addLog === 'function') {
      this.dispatcher.addLog(message, type);
    }
  }

  setBotPace(pace) {
    if (this.botRunner && typeof this.botRunner.setPace === 'function') {
      this.botRunner.setPace(pace);
    }
  }
}

export { GameAPIV4 as GameAPI };
