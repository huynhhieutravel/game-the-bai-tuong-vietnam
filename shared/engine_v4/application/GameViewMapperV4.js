// @ts-check
/**
 * GameViewMapperV4.js
 * Anti-Corruption Layer (ACL) chuyển đổi GameState v4 thành ViewModel sạch cho React UI.
 * Bảo toàn 100% dữ liệu hiển thị, thẻ bài, tầm đánh và kỹ năng tướng.
 */

import { globalHeroRegistry } from '../heroes/HeroRegistry.js';
import { RangeSystem } from '../rules/RangeSystem.js';
import { PHASES } from '../../constants/phases.js';
import { SkillDescriptions, SkillIdToName } from '../../engine/registries/SkillDescriptions.js';
import { getFullPlayerName } from '../../utils/playerHelpers.js';
import { canPlayCard } from '../../engine/rules/CardRules.js';

/**
 * Chuyển đổi Phase từ v4 (IN HOA) sang constant của UI (thường)
 */
function mapPhaseToUI(v4Phase) {
  if (!v4Phase) return PHASES.ACTION;
  switch (v4Phase) {
    case 'BEGIN': return PHASES.START;
    case 'JUDGE': return PHASES.JUDGEMENT;
    case 'DRAW': return PHASES.DRAW;
    case 'ACTION': return PHASES.ACTION;
    case 'DISCARD': return PHASES.DISCARD;
    case 'END': return PHASES.END;
    case 'draft': return PHASES.DRAFT;
    default: return v4Phase.toLowerCase();
  }
}

/**
 * Chuyển đổi GameState v4 thành GameViewModel
 * @param {any} state 
 * @param {number} mainPlayerId 
 */
export function toViewModel(state, mainPlayerId = 0) {
  if (!state) return state;

  // Nếu vẫn đang trong DRAFT phase
  if (state.phase === PHASES.DRAFT || state.phase === 'draft') {
    return {
      phase: PHASES.DRAFT,
      playedCards: [],
      logs: state.logs || [],
      reactions: [],
      gameOver: false,
      winner: null,
      waitingForResponse: null,
      players: (state.players || []).map(p => ({
        ...p,
        heroes: p.heroes || [{}, {}],
        revealedHeroes: p.revealedHeroes || [false, false],
        distances: {},
        attackRange: 1,
        distanceFromMe: 1,
        hpText: `${p.hp}/${p.maxHp}`,
        displayName: p.name,
        isRevealed: false,
        faction: p.faction || 'Lạc',
        equipment: [],
        judgementArea: []
      })),
      deck: [],
      discardPile: [],
      currentPlayerIndex: 0,
      turn: 1,
      chainedDamageQueue: []
    };
  }

  const vmPhase = mapPhaseToUI(state.currentPhase || state.phase);

  const vm = {
    phase: vmPhase,
    playedCards: state.playedCards ? [...state.playedCards] : [],
    logs: (state.logs || state.history || []).map(l => typeof l === 'string' ? { message: l, timestamp: Date.now() } : l),
    reactions: state.reactions ? [...state.reactions] : [],
    gameOver: state.gameOver || false,
    winner: state.winner || null,
    waitingForResponse: null,
    players: [],
    deck: state.drawPile || state.deck || [],
    discardPile: state.discardPile || [],
    currentPlayerIndex: state.currentTurnPlayerId ?? state.currentPlayerIndex ?? 0,
    turn: state.turn || 1,
    chainedDamageQueue: state.chainedDamageQueue || []
  };

  // Ánh xạ PriorityFrame từ PriorityStack sang waitingForResponse cho UI
  if (state.priorityStack && typeof state.priorityStack.peek === 'function') {
    const frame = state.priorityStack.peek();
    if (frame) {
      if (frame.type === 'ASK_BORROW_SLASH') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_slash',
          reason: 'muon-dao',
          responderId: frame.currentActorId,
          sourceId: frame.sourceId,
          borrowerId: frame.context?.borrowerId,
          targetId: frame.context?.targetBId,
          weapon: frame.context?.weapon,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context
        };
      } else if (frame.type === 'ASK_SLASH_DUEL') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_slash',
          reason: 'quyet-dau',
          trickType: 'duel',
          responderId: frame.currentActorId || frame.context?.currentResponderId || frame.targetId,
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          duelTargetId: frame.context?.attackerId === frame.currentActorId ? frame.targetId : frame.sourceId,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context
        };
      } else if (frame.type === 'ASK_SLASH_RESPONSE') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_slash',
          reason: frame.context?.reason || 'nam-man',
          trickType: frame.context?.trickType || 'barbarian',
          responderId: frame.currentActorId || frame.targetId,
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context
        };
      } else if (frame.type === 'ASK_CHANGE_JUDGE') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_change_judge',
          responderId: frame.currentActorId,
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          reason: frame.context?.reason,
          judgeCard: frame.context?.judgeCard,
          skills: frame.context?.skills,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context
        };
      } else if (frame.type === 'ASK_HAU_VIEN') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_hau_vien',
          sourceId: frame.sourceId,
          responderId: frame.currentActorId || frame.sourceId,
          targets: frame.context?.targets || [],
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context
        };
      } else if (frame.type === 'ASK_BOC_TRAM_TRUNG_DODGE') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_boc_tram_trung_dodge',
          sourceId: frame.sourceId,
          responderId: frame.currentActorId,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context
        };
      } else if (frame.type === 'ASK_BOC_TRAM_TRUNG_SLASH') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_boc_tram_trung_slash',
          sourceId: frame.sourceId,
          responderId: frame.currentActorId,
          isDefensive: frame.context?.isDefensive,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context
        };
      } else if (frame.type === 'ASK_TIEN_PHAT') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_tien_phat',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context
        };
      } else {
        const isDiscard = frame.type === 'ASK_DISCARD';
        const frameType = isDiscard ? 'discard_phase' : frame.type.toLowerCase();
        const amount = frame.context?.cardsToDiscard || 1;

        vm.waitingForResponse = {
          id: frame.id,
          type: frameType,
          reason: frame.context?.reason || (frame.type === 'ASK_DODGE' ? 'chem' : frameType),
          amount,
          cardsToDiscard: amount,
          responderId: frame.currentActorId,
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          askQueue: [...(frame.priorityQueue || [])],
          baguaAvailable: !frame.context?.baguaAttempted,
          ...frame.context
        };
      }
    }
  } else if (state.waitingForResponse) {
    vm.waitingForResponse = { ...state.waitingForResponse };
    if (vm.waitingForResponse.askQueue && vm.waitingForResponse.askQueue.length > 0) {
      vm.waitingForResponse.responderId = vm.waitingForResponse.askQueue[0];
    } else if (vm.waitingForResponse.responderId === undefined) {
      vm.waitingForResponse.responderId = vm.waitingForResponse.targetId ?? vm.waitingForResponse.sourceId;
    }
  }

  const alivePlayers = (state.players || []).filter(p => p.isAlive);
  const me = (state.players || []).find(p => p.id === mainPlayerId) || state.players[0];

  // Hydrate Players
  vm.players = (state.players || []).map(p => {
    const pVM = { ...p };

    // Resolve Heroes
    const resolveHero = (heroId) => {
      if (!heroId) return { name: '', skills: [] };
      const hero = globalHeroRegistry.getHero(heroId);
      if (!hero) return { name: heroId, skills: [] };

      const resolvedSkills = (hero.skills || []).map(skill => {
        const skillId = skill.id;
        const realName = skill.name || SkillIdToName[skillId] || skillId;
        const baseName = SkillIdToName[skillId] || realName;
        const desc = skill.description || SkillDescriptions[skillId] || SkillDescriptions[realName] || SkillDescriptions[baseName] || '(Chưa có mô tả)';
        return {
          id: skillId,
          name: realName,
          desc,
          type: (skill.type || '').toUpperCase(),
          isUsable: true,
          disableReason: null
        };
      });

      return {
        id: hero.id,
        name: hero.name,
        faction: hero.faction,
        gender: hero.gender || 'male',
        hp: hero.hp,
        maxHp: hero.maxHp,
        image: hero.image,
        bio: hero.bio,
        skills: resolvedSkills
      };
    };

    const hero1 = resolveHero(p.mainHeroId || p.heroId);
    const hero2 = resolveHero(p.subHeroId);
    const revealedHeroes = p.revealedHeroes ? [...p.revealedHeroes] : [false, false];
    hero1.isRevealed = Boolean(revealedHeroes[0]);
    hero2.isRevealed = Boolean(revealedHeroes[1]);
    pVM.heroes = [hero1, hero2];
    pVM.revealedHeroes = revealedHeroes;

    // Chuyển đổi equipment object thành mảng tương thích hoàn toàn UI
    const eqList = Array.isArray(p.equipment)
      ? [...p.equipment]
      : Object.values(p.equipment || {}).filter(Boolean);
    eqList.weapon = p.equipment?.weapon || null;
    eqList.armor = p.equipment?.armor || null;
    eqList.horse_attack = p.equipment?.horse_attack || null;
    eqList.horse_defense = p.equipment?.horse_defense || null;
    pVM.equipment = eqList;

    pVM.judgementArea = p.judgementArea || p.judges || [];

    // Tính toán tầm đánh & cự ly
    pVM.distances = {};
    alivePlayers.forEach(other => {
      if (other.id !== p.id) {
        pVM.distances[other.id] = RangeSystem.calculateDistance(p, other, alivePlayers);
      }
    });

    pVM.attackRange = RangeSystem.getAttackRange(p);
    pVM.distanceFromMe = me ? RangeSystem.calculateDistance(me, p, alivePlayers) : 1;

    // Tính toán isPlayable cho từng lá bài trên tay
    pVM.hand = (p.hand || []).map(card => {
      let isPlayable = true;
      let unplayableReason = '';

      if (vmPhase !== PHASES.ACTION || state.currentTurnPlayerId !== p.id) {
        isPlayable = false;
        unplayableReason = 'Chưa tới pha Hành Động của bạn';
      } else if (card.type === 'dodge' || card.name === 'Né') {
        isPlayable = false;
        unplayableReason = 'Không thể chủ động sử dụng lá Né trong lượt';
      } else if ((card.type === 'slash' || card.name === 'Chém') && (p.turnStats?.slashCount || 0) >= 1 && p.equipment?.weapon?.id !== 'crossbow') {
        isPlayable = false;
        unplayableReason = 'Mỗi lượt chỉ được đánh 1 lá Chém';
      } else if ((card.type === 'peach' || card.name === 'Đào') && p.hp >= p.maxHp) {
        isPlayable = false;
        unplayableReason = 'Máu đã đầy, không thể ăn Đào';
      }

      return {
        ...card,
        isPlayable,
        unplayableReason
      };
    });

    // Helper strings cho UI
    pVM.hpText = `${p.hp}/${p.maxHp}`;
    pVM.displayName = getFullPlayerName(p);
    pVM.isRevealed = Boolean(pVM.revealedHeroes && pVM.revealedHeroes.some(Boolean));
    pVM.faction = p.faction || hero1?.faction || 'Lạc';

    return pVM;
  });

  return vm;
}
