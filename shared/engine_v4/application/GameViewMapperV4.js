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
import { 
  normalizeSkillType, 
  getCanonicalFaction, 
  getFactionLabel, 
  getPlayerGender, 
  normalizePhase,
  isEquip,
  isTrick,
  isBasicCard
} from '../../utils/translationHelper.js';

/**
 * Chuyển đổi Phase từ v4 (IN HOA) hoặc tiếng Việt sang constant của UI (thường)
 */
function mapPhaseToUI(v4Phase) {
  return normalizePhase(v4Phase);
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
        const currentResponder = frame.currentActorId ?? frame.context?.currentResponderId ?? frame.priorityQueue?.[0] ?? frame.targetId;
        const opponentId = currentResponder === frame.context?.attackerId ? frame.targetId : (frame.context?.attackerId ?? frame.sourceId);
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_slash',
          reason: 'quyet-dau',
          trickType: 'duel',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          duelTargetId: opponentId,
          opponentId,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context,
          responderId: currentResponder
        };
      } else if (frame.type === 'ASK_SLASH_RESPONSE') {
        const currentResponder = frame.currentActorId ?? frame.priorityQueue?.[0] ?? frame.targetId;
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_slash',
          reason: frame.context?.reason || 'nam-man',
          trickType: frame.context?.trickType || 'barbarian',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context,
          responderId: currentResponder
        };
      } else if (frame.type === 'ASK_CHANGE_JUDGE') {
        const actor = state.getPlayer ? state.getPlayer(frame.currentActorId) : (state.players || []).find(p => p.id === frame.currentActorId);
        const hasUngBien = actor && (globalHeroRegistry.hasSkill(actor, 'ung_bien', true) || globalHeroRegistry.hasSkill(actor, 'ung-bien', true));
        const resolvedSkills = frame.context?.skills || (hasUngBien ? ['ung-bien'] : ['quan-co']);
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_change_judge',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          reason: frame.context?.reason,
          judgeCard: frame.context?.judgeCard,
          skills: resolvedSkills,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context,
          responderId: frame.currentActorId
        };
      } else if (frame.type === 'ASK_HAU_VIEN') {
        const currentResponder = frame.currentActorId ?? frame.sourceId;
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_hau_vien',
          sourceId: frame.sourceId,
          targets: frame.context?.targets || [],
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context,
          responderId: currentResponder
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
      } else if (frame.type === 'ASK_HOA_THAN_AN_TU') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_hoa_than_an_tu',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_CAN_GIAN') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_can_gian',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_THONG_NGON') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_thong_ngon',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_PHAT_TAM') {
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_phat_tam',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          responderId: frame.currentActorId,
          ...frame.context
        };
      } else if (frame.type === 'ASK_WEAPON_SKILL') {
        const isSongKiem = frame.context?.weapon === 'Song Kiếm' || isEquip(frame.context?.weapon, 'song_kiem');
        const currentResponder = frame.currentActorId ?? (isSongKiem ? frame.targetId : frame.sourceId);
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_weapon_skill',
          weapon: frame.context?.weapon || frame.context?.weaponName,
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context,
          responderId: currentResponder
        };
      } else if (frame.type === 'ASK_DISMANTLE') {
        const currentResponder = frame.currentActorId ?? frame.sourceId;
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_dismantle',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          ...frame.context,
          responderId: currentResponder
        };
      } else if (frame.type === 'ASK_SNATCH') {
        const currentResponder = frame.currentActorId ?? frame.sourceId;
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_snatch',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          ...frame.context,
          responderId: currentResponder
        };
      } else if (frame.type === 'ASK_NEGATE') {
        const actorId = frame.currentActorId ?? frame.priorityQueue?.[0] ?? frame.targetId ?? frame.sourceId;
        vm.waitingForResponse = {
          id: frame.id,
          type: 'ask_negate',
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          card: frame.context?.card,
          delayedCard: frame.context?.delayedCard,
          isJudgementNegate: Boolean(frame.context?.isJudgementNegate),
          isNegated: (frame.context?.negateCount || 0) % 2 === 1,
          lastNegaterId: frame.context?.lastNegaterId,
          askQueue: [...(frame.priorityQueue || [])],
          ...frame.context,
          responderId: actorId
        };
      } else {
        const isDiscard = frame.type === 'ASK_DISCARD';
        const frameType = isDiscard ? 'discard_phase' : frame.type.toLowerCase();
        const amount = frame.context?.cardsToDiscard || 1;
        const currentResponder = frame.currentActorId ?? frame.priorityQueue?.[0] ?? frame.targetId ?? frame.sourceId;

        vm.waitingForResponse = {
          id: frame.id,
          type: frameType,
          reason: frame.context?.reason || (frame.type === 'ASK_DODGE' ? 'chem' : frameType),
          amount,
          cardsToDiscard: amount,
          sourceId: frame.sourceId,
          targetId: frame.targetId,
          askQueue: [...(frame.priorityQueue || [])],
          baguaAvailable: !frame.context?.baguaAttempted,
          ...frame.context,
          responderId: currentResponder
        };
      }

      // BẢO VỆ TUYỆT ĐỐI HỢP ĐỒNG (ADR 0080): responderId KHÔNG BAO GIỜ bị context rác ghi đè
      if (vm.waitingForResponse) {
        const canonicalResponder = frame.currentActorId ?? 
          frame.context?.currentResponderId ?? 
          ((frame.context?.weapon === 'Song Kiếm' || isEquip(frame.context?.weapon, 'song_kiem')) ? frame.targetId : undefined) ??
          frame.priorityQueue?.[0] ?? 
          frame.targetId ?? 
          frame.sourceId;
        if (canonicalResponder !== undefined && canonicalResponder !== null) {
          vm.waitingForResponse.responderId = canonicalResponder;
        }
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

      const seenSkillKeys = new Set();
      const uniqueSkills = (hero.skills || []).filter(skill => {
        const key = skill.name || SkillIdToName[skill.id] || skill.id;
        if (seenSkillKeys.has(key)) return false;
        seenSkillKeys.add(key);
        return true;
      });

      const resolvedSkills = uniqueSkills.map(skill => {
        const skillId = skill.id;
        const realName = skill.name || SkillIdToName[skillId] || skillId;
        const canonicalDesc = SkillDescriptions[skillId] 
          || SkillDescriptions[skillId?.replace(/_/g, '-')]
          || SkillDescriptions[skillId?.replace(/-/g, '_')]
          || SkillDescriptions[realName] 
          || SkillDescriptions[baseName];
        const desc = canonicalDesc || skill.description || '(Chưa có mô tả)';
        let isUsable = true;
        let disableReason = null;
        if (typeof skill.canUse === 'function') {
          try {
            const can = skill.canUse(state, { owner: p, ownerId: p.id, actorId: p.id });
            if (!can) {
              isUsable = false;
              disableReason = p.skillUsage?.[skillId]?.usedThisTurn ? 'Đã sử dụng trong lượt này' : 'Không đủ điều kiện kích hoạt';
            }
          } catch (_) {
            isUsable = true;
          }
        }

        const normType = normalizeSkillType(skill.type || (skill.trigger ? 'reactive' : (skill.frequency === 'limited' ? 'limited' : 'active')));

        return {
          id: skillId,
          name: realName,
          desc,
          type: normType.label,
          typeLabel: normType.label,
          typeCode: normType.code,
          rawType: normType.code,
          typeBadgeColor: normType.badgeColor,
          isActive: normType.isActive,
          isPassive: normType.isPassive,
          isLock: normType.isLock,
          isLimited: normType.isLimited,
          isUsable,
          disableReason
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
    if (p.isAlive) {
      alivePlayers.forEach(other => {
        if (other.id !== p.id) {
          try {
            pVM.distances[other.id] = RangeSystem.calculateDistance(p, other, alivePlayers);
          } catch (_) {
            pVM.distances[other.id] = 999;
          }
        }
      });
    }

    pVM.attackRange = RangeSystem.getAttackRange(p);
    try {
      pVM.distanceFromMe = (me && p.isAlive && me.isAlive)
        ? RangeSystem.calculateDistance(me, p, alivePlayers)
        : (p.isAlive ? 1 : '-');
    } catch (_) {
      pVM.distanceFromMe = p.isAlive ? 1 : '-';
    }

    // Tính toán isPlayable cho từng lá bài trên tay
    pVM.hand = (p.hand || []).map(card => {
      let isPlayable = true;
      let unplayableReason = '';

      if (vmPhase !== PHASES.ACTION || state.currentTurnPlayerId !== p.id) {
        isPlayable = false;
        unplayableReason = 'Chưa tới pha Hành Động của bạn';
      } else if (isBasicCard(card, 'ne')) {
        isPlayable = false;
        unplayableReason = 'Không thể chủ động sử dụng lá Né trong lượt';
      } else if (isTrick(card, 'hoa_giai') || card.type === 'negate') {
        isPlayable = false;
        unplayableReason = 'Lá [Hóa Giải] chỉ có thể sử dụng khi phản ứng cẩm nang';
      } else if (isBasicCard(card, 'chem')) {
        const weapon = p.equipment?.weapon;
        const weaponName = weapon?.name || '';
        const weaponId = String(weapon?.id || weapon?.idKey || weapon?.key || '');
        const hasCrossbow = isEquip(weapon, 'lien_no') ||
          weaponName === 'Liên Nỏ' || 
          weaponId === 'crossbow' || 
          weaponId.includes('lien-no') || 
          weaponId.includes('liên-nỏ') || 
          weaponId.includes('lien_no') ||
          Boolean(p.temporaryFlags?.unlimitedSlash);
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
      } else if ((card.name === 'Sấm Sét' || card.idKey === 'sam_set') && p.judgementArea?.some(c => c.name === 'Sấm Sét' || c.idKey === 'sam_set' || c.idKey === 'sam-set')) {
        isPlayable = false;
        unplayableReason = 'Bạn đã có Sấm Sét trong khu phán xét';
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
    const rawFac = p.faction || hero1?.faction || 'lac';
    pVM.canonicalFaction = getCanonicalFaction(rawFac);
    pVM.rawFaction = pVM.canonicalFaction;
    if (!isSelf && !isGameOver && !pVM.isRevealed) {
      pVM.faction = 'none';
      pVM.rawFaction = 'none';
      pVM.canonicalFaction = 'none';
    } else if (pVM.isDaTam) {
      pVM.faction = 'Dã Tâm';
      pVM.canonicalFaction = 'datam';
      pVM.rawFaction = 'datam';
    } else {
      pVM.faction = getFactionLabel(pVM.canonicalFaction);
    }

    return pVM;
  });

  return vm;
}

export const GameViewMapperV4 = { toViewModel };

