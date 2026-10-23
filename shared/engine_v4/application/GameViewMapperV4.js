// @ts-check
/**
 * GameViewMapperV4.js
 * Anti-Corruption Layer (ACL) chuyển đổi GameState v4 thành ViewModel sạch cho React UI.
 * Bảo toàn 100% dữ liệu hiển thị, thẻ bài, tầm đánh và kỹ năng tướng.
 */

import { globalHeroRegistry } from '../heroes/HeroRegistry.js';
import { RangeSystem } from '../rules/RangeSystem.js';
import { PHASES } from '../../constants/phases.js';
import { SkillDescriptions, SkillIdToName } from '../../data/SkillDescriptions.js';
import { getFullPlayerName } from '../../utils/playerHelpers.js';

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
      logs: (state.logs || []).map(l => {
        if (typeof l === 'string') return { text: l, message: l, timestamp: Date.now() };
        const text = l.text || l.message || '';
        return { ...l, text, message: text };
      }),
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
    logs: (state.logs || state.history || []).map(l => {
      if (typeof l === 'string') return { text: l, message: l, timestamp: Date.now() };
      const text = l.text || l.message || '';
      return { ...l, text, message: text };
    }),
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
        const actor = state.getPlayer ? state.getPlayer(frame.currentActorId) : (state.players || []).find(p => p.id === frame.currentActorId);
        const hasUngBien = actor && (globalHeroRegistry.hasSkill(actor, 'ung_bien', true) || globalHeroRegistry.hasSkill(actor, 'ung-bien', true));
        const resolvedSkills = frame.context?.skills || (hasUngBien ? ['ung-bien'] : ['quan-co']);
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_change_judge',
          responderId: frame.currentActorId,
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          reason: frame.context?.reason,
          judgeCard: frame.context?.judgeCard,
          skills: resolvedSkills,
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
      } else if (frame.type === 'ASK_HOACONG_REVEAL') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_hoacong_reveal',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_HOACONG_DISCARD') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_hoacong_discard',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          revealedCard: frame.context?.revealedCard,
          ...frame.context
        };
      } else if (frame.type === 'ASK_BANH_CHUNG') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_banh_chung',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          viewedCards: frame.context?.viewedCards || [],
          viewCount: frame.context?.viewCount || 0,
          ...frame.context
        };
      } else if (frame.type === 'ASK_DOAT_SAO') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_doat_sao',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_DOAT_SAO_DISCARD') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_doat_sao_discard',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_HIEN_HAU') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_hien_hau',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_KHOAN_DAN') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_khoan_dan',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          amount: frame.context?.damageAmount || 1,
          ...frame.context
        };
      } else if (frame.type === 'ASK_TRE_NGA_DISCARD') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_tre_nga_discard',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          judgeSuit: frame.context?.judgeSuit,
          ...frame.context
        };
      } else if (frame.type === 'ASK_THAT_TRAM_SO_PUNISH') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_that_tram_so_punish',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          judgeCard: frame.context?.judgeCard,
          ...frame.context
        };
      } else if (frame.type === 'ASK_DOI_SU') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_doi_su',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_HOA_NGHI') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_hoa_nghi',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          drawnCards: frame.context?.drawnCards || [],
          ...frame.context
        };
      } else if (frame.type === 'ASK_DA_TRACH') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_da_trach',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_KHOI_NGHIA') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_khoi_nghia',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_PHA_THANH') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_pha_thanh',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_NAM_QUOC_SON_HA') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_nam_quoc_son_ha',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          damageCard: frame.context?.damageCard,
          ...frame.context
        };
      } else if (frame.type === 'ASK_TIEN_PHONG') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_tien_phong',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_SUIT') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_suit',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_HO_CHU') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_ho_chu',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_VAN_DON') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_van_don',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_XA_THAN') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_xa_than',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_DUYEN_THO') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_duyen_tho',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
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
          responderId: frame.currentActorId ?? frame.priorityQueue?.[0] ?? frame.targetId ?? frame.sourceId,
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

    const isSelf = p.id === mainPlayerId;
    const isGameOver = Boolean(state.gameOver);

    // Che giấu danh tính và kỹ năng võ tướng chưa lộ diện của đối thủ (bảo mật dữ liệu)
    const maskHero = (h) => ({
      id: 'hidden',
      name: 'Tướng Ẩn',
      faction: 'none',
      gender: 'none',
      hp: h?.hp,
      maxHp: h?.maxHp,
      image: null,
      bio: '',
      isRevealed: false,
      skills: []
    });

    const safeHero1 = (isSelf || hero1.isRevealed || isGameOver) ? hero1 : maskHero(hero1);
    const safeHero2 = (isSelf || hero2.isRevealed || isGameOver) ? hero2 : maskHero(hero2);

    pVM.heroes = [safeHero1, safeHero2];
    pVM.revealedHeroes = revealedHeroes;

    if (!isSelf && !isGameOver) {
      if (!hero1.isRevealed) {
        pVM.mainHeroId = null;
        if (pVM.heroId) pVM.heroId = null;
      }
      if (!hero2.isRevealed) {
        pVM.subHeroId = null;
      }

      // 1. Che giấu phe phái và giới tính nếu đối thủ chưa lộ diện bất kỳ tướng nào
      const isOpponentRevealed = Boolean(revealedHeroes[0] || revealedHeroes[1] || p.isRevealed);
      if (!isOpponentRevealed) {
        pVM.faction = 'none';
        pVM.gender = 'none';
      }

      // 2. Che giấu danh sách skills ngầm của đối thủ (chỉ giữ skills của tướng đã lật)
      const visibleSkills = [];
      if (hero1.isRevealed && hero1.skills) {
        visibleSkills.push(...hero1.skills.map(s => s.id));
      }
      if (hero2.isRevealed && hero2.skills) {
        visibleSkills.push(...hero2.skills.map(s => s.id));
      }
      pVM.skills = visibleSkills;
    }

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
      } else if (card.type === 'slash' || card.name === 'Chém') {
        const weaponId = p.equipment?.weapon?.id || p.equipment?.weapon?.key || p.equipment?.weapon?.name || '';
        const hasCrossbow = weaponId === 'crossbow' || weaponId === 'lien-no' || weaponId === 'Liên Nỏ' || weaponId.includes('lien_no');
        const maxSlashes = p.temporaryFlags?.vanDonWin ? 2 : 1;

        if (p.temporaryFlags?.vanDonLose) {
          isPlayable = false;
          unplayableReason = 'Thất bại đấu điểm Vân Đồn, bị cấm Chém lượt này';
        } else if ((p.turnStats?.slashCount || 0) >= maxSlashes && !hasCrossbow) {
          isPlayable = false;
          unplayableReason = maxSlashes > 1 ? `Mỗi lượt chỉ được đánh ${maxSlashes} lá Chém` : 'Mỗi lượt chỉ được đánh 1 lá Chém';
        }
      } else if ((card.type === 'peach' || card.name === 'Đào') && p.hp >= p.maxHp) {
        isPlayable = false;
        unplayableReason = 'Máu đã đầy, không thể ăn Đào';
      } else if ((card.type === 'wine' || card.name === 'Rượu') && (p.turnStats?.wineCount || 0) >= 1) {
        isPlayable = false;
        unplayableReason = 'Mỗi lượt chỉ được uống Rượu 1 lần trong pha Hành động';
      }

      return {
        ...card,
        isPlayable,
        unplayableReason
      };
    });

    pVM.hpText = `${p.hp}/${p.maxHp}`;
    pVM.displayName = getFullPlayerName(p);
    pVM.isRevealed = Boolean(pVM.revealedHeroes && pVM.revealedHeroes.some(Boolean));
    if (!isSelf && !isGameOver && !pVM.isRevealed) {
      pVM.faction = 'none';
    } else {
      pVM.faction = p.faction || hero1?.faction || 'Lạc';
    }

    return pVM;
  });

  return vm;
}
