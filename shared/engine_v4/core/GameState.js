/**
 * GameState.js
 * Quản lý Trạng thái Game đơn định (Deterministic State) cho Việt Sát v4.
 * Tách biệt hoàn toàn khỏi React DOM/UI.
 */

import { PriorityStack } from './PriorityStack.js';
import { GameInvariants } from './Invariants.js';

export class GameState {
  constructor(config = {}) {
    this.players = (config.players || []).map(p => ({
      ...p,
      id: p.id,
      name: p.name || `Người chơi ${p.id}`,
      heroId: p.heroId || p.mainHeroId || null,
      mainHeroId: p.mainHeroId || p.heroId || null,
      subHeroId: p.subHeroId || null,
      revealedHeroes: p.revealedHeroes ? [...p.revealedHeroes] : [false, false],
      isBot: p.isBot ?? false,
      isVip: p.isVip ?? false,
      isFlipped: p.isFlipped ?? false,
      isChained: p.isChained ?? false,
      faction: p.faction || 'none',
      identity: p.identity || 'rebel', // 'lord' | 'loyalist' | 'rebel' | 'spy'
      isLord: p.isLord || false,
      hp: p.hp ?? 4,
      maxHp: p.maxHp ?? 4,
      gender: p.gender || 'male',
      hand: [...(p.hand || [])],
      equipment: Array.isArray(p.equipment)
        ? {
            weapon: p.equipment.find(c => c?.subtype === 'weapon' || c?.type === 'weapon') || null,
            armor: p.equipment.find(c => c?.subtype === 'armor' || c?.type === 'armor') || null,
            horse_attack: p.equipment.find(c => c?.subtype === 'horse_attack' || c?.type === 'horse_attack') || null,
            horse_defense: p.equipment.find(c => c?.subtype === 'horse_defense' || c?.type === 'horse_defense') || null
          }
        : {
            weapon: p.equipment?.weapon || null,
            armor: p.equipment?.armor || null,
            horse_attack: p.equipment?.horse_attack || null,
            horse_defense: p.equipment?.horse_defense || null
          },
      judgementArea: [...(p.judgementArea || [])],
      isAlive: p.isAlive ?? true,
      skills: [...(p.skills || [])],
      skillUsage: p.skillUsage ? { ...p.skillUsage } : {},
      turnStats: p.turnStats ? { ...p.turnStats } : {
        slashCount: 0,
        cardsDrawn: 0,
        damageDealt: 0,
        damageTaken: 0
      },
      temporaryFlags: p.temporaryFlags ? { ...p.temporaryFlags } : {}
    }));

    this.currentTurnPlayerId = config.currentTurnPlayerId ?? 0;
    this.currentPhase = config.currentPhase || 'BEGIN'; // 'BEGIN' | 'JUDGE' | 'DRAW' | 'ACTION' | 'DISCARD' | 'END'
    this.drawPile = [...(config.drawPile || [])];
    this.discardPile = [...(config.discardPile || [])];
    this.priorityStack = new PriorityStack();
    this.logs = [];
    this.initialTotalCards = config.initialTotalCards || (this.drawPile.length + this.discardPile.length);
  }

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId) || null;
  }

  getCurrentPlayer() {
    return this.getPlayer(this.currentTurnPlayerId);
  }

  getAlivePlayers() {
    return this.players.filter(p => p.isAlive);
  }

  /**
   * Tái chế Discard Pile vào Draw Pile khi hết bài rút
   */
  recycleDiscardPile() {
    if (!this.discardPile || this.discardPile.length === 0) return false;
    this.drawPile = [...this.discardPile];
    this.discardPile = [];
    this._shuffle(this.drawPile);
    this.addLog('Chồng bài rút đã được xáo lại từ bài bỏ.');
    return true;
  }

  /**
   * Lấy 1 lá bài từ Draw Pile (tự động recycle nếu hết bài)
   */
  drawCardFromDeck() {
    if (this.drawPile.length === 0) {
      if (!this.recycleDiscardPile()) {
        return null;
      }
    }
    return this.drawPile.pop() || null;
  }

  /**
   * Rút bài an toàn: Tự động xào bài từ discardPile nếu drawPile hết bài
   */
  drawCards(playerId, count = 1) {
    const player = this.getPlayer(playerId);
    if (!player || !player.isAlive || count <= 0) return [];

    const drawnCards = [];
    for (let i = 0; i < count; i++) {
      const card = this.drawCardFromDeck();
      if (!card) break;
      player.hand.push(card);
      drawnCards.push(card);
    }

    player.turnStats.cardsDrawn = (player.turnStats.cardsDrawn || 0) + drawnCards.length;
    return drawnCards;
  }

  /**
   * Bỏ bài từ tay xuống Discard Pile
   */
  discardFromHand(playerId, cardIds = []) {
    const player = this.getPlayer(playerId);
    if (!player) return [];

    const idsToDiscard = Array.isArray(cardIds) ? cardIds : [cardIds];
    const discarded = [];

    player.hand = player.hand.filter(card => {
      if (idsToDiscard.includes(card.id)) {
        discarded.push(card);
        this.discardPile.push(card);
        return false;
      }
      return true;
    });

    return discarded;
  }

  /**
   * Di chuyển 1 lá bài từ vùng A sang vùng B một cách nguyên tử (atomic)
   * Tuân thủ ADR 0004: Card Conservation Invariant
   */
  moveCard(cardId, fromZone, toZone) {
    let card = null;

    // 1. Trích xuất card từ fromZone
    if (fromZone.type === 'hand') {
      const p = this.getPlayer(fromZone.playerId);
      const idx = p?.hand?.findIndex(c => c.id === cardId);
      if (idx !== -1 && idx !== undefined) {
        [card] = p.hand.splice(idx, 1);
      }
    } else if (fromZone.type === 'equipment') {
      const p = this.getPlayer(fromZone.playerId);
      if (fromZone.slot && p?.equipment?.[fromZone.slot]?.id === cardId) {
        card = p.equipment[fromZone.slot];
        p.equipment[fromZone.slot] = null;
      } else if (p?.equipment) {
        for (const slot in p.equipment) {
          if (p.equipment[slot]?.id === cardId) {
            card = p.equipment[slot];
            p.equipment[slot] = null;
            break;
          }
        }
      }
    } else if (fromZone.type === 'judgementArea') {
      const p = this.getPlayer(fromZone.playerId);
      const idx = p?.judgementArea?.findIndex(c => c.id === cardId);
      if (idx !== -1 && idx !== undefined) {
        [card] = p.judgementArea.splice(idx, 1);
      }
    } else if (fromZone.type === 'drawPile') {
      const idx = this.drawPile.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        [card] = this.drawPile.splice(idx, 1);
      }
    } else if (fromZone.type === 'discardPile') {
      const idx = this.discardPile.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        [card] = this.discardPile.splice(idx, 1);
      }
    }

    if (!card) {
      console.warn(`[GameState.moveCard] Card ${cardId} not found in fromZone`, fromZone);
      return null;
    }

    // 2. Chuyển card vào toZone
    if (toZone.type === 'hand') {
      const p = this.getPlayer(toZone.playerId);
      if (p) {
        p.hand = p.hand || [];
        p.hand.push(card);
      }
    } else if (toZone.type === 'equipment') {
      const p = this.getPlayer(toZone.playerId);
      if (p && toZone.slot) {
        p.equipment = p.equipment || {};
        if (p.equipment[toZone.slot]) {
          this.discardPile.push(p.equipment[toZone.slot]);
        }
        p.equipment[toZone.slot] = card;
      }
    } else if (toZone.type === 'judgementArea') {
      const p = this.getPlayer(toZone.playerId);
      if (p) {
        p.judgementArea = p.judgementArea || [];
        p.judgementArea.push(card);
      }
    } else if (toZone.type === 'discardPile') {
      this.discardPile.push(card);
    } else if (toZone.type === 'drawPile') {
      if (toZone.position === 'top') {
        this.drawPile.unshift(card);
      } else {
        this.drawPile.push(card);
      }
    }

    return card;
  }

  addLog(message, metadata = {}) {
    this.logs.push({
      timestamp: Date.now(),
      message,
      phase: this.currentPhase,
      turnPlayerId: this.currentTurnPlayerId,
      ...metadata
    });
  }

  _shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Tạo Snapshot Client View (ẩn thông tin bí mật của đối thủ)
   */
  getClientState(viewerPlayerId) {
    return {
      currentTurnPlayerId: this.currentTurnPlayerId,
      currentPhase: this.currentPhase,
      drawPileCount: this.drawPile.length,
      discardPileCount: this.discardPile.length,
      topDiscard: this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null,
      priority: this.priorityStack.toClientView(viewerPlayerId),
      players: this.players.map(p => {
        const isViewer = p.id === viewerPlayerId;
        return {
          id: p.id,
          name: p.name,
          heroId: p.heroId,
          mainHeroId: p.mainHeroId,
          subHeroId: p.subHeroId,
          revealedHeroes: p.revealedHeroes,
          isBot: p.isBot,
          isVip: p.isVip,
          isFlipped: p.isFlipped,
          isChained: p.isChained,
          faction: p.faction,
          identity: p.isLord || isViewer ? p.identity : 'hidden',
          isLord: p.isLord,
          hp: p.hp,
          maxHp: p.maxHp,
          gender: p.gender,
          handCount: p.hand.length,
          hand: isViewer ? p.hand : null, // Chỉ thấy bài của chính mình!
          equipment: p.equipment,
          judgementArea: p.judgementArea,
          isAlive: p.isAlive,
          skills: p.skills
        };
      })
    };
  }
}
