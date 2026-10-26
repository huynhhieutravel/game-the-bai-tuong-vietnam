/**
 * HeroRegistry.js
 * Quản lý Danh mục Tướng & Điều Phối Kỹ Năng Tự Động trong Việt Sát v4.
 * Đảm bảo tính mô-đun hóa, dễ mở rộng và kiểm soát chặt chẽ trigger.
 */

import { HEROES as GAME_DATA_HEROES } from '../../data/gameData.js';
import { 
  getPlayerGender as getCanonicalPlayerGender, 
  isSameFaction, 
  getCanonicalFaction, 
  getFactionLabel,
  normalizeGender,
  normalizeSkillId,
  normalizeSuit
} from '../../utils/translationHelper.js';

export class HeroRegistry {
  constructor() {
    this._heroes = new Map();
    this._skills = new Map();
  }

  /**
   * Đăng ký một Tướng mới vào hệ thống
   */
  registerHero(heroModule) {
    if (!heroModule.id || !heroModule.name) {
      throw new Error(`[HeroRegistry] Tướng không hợp lệ: thiếu id hoặc name`);
    }

    // Tự động bổ sung image, bio và faction chuẩn tiếng Việt từ database thẻ bài
    const normalizeStr = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const rawFac = normalizeStr(heroModule.faction || heroModule.rawFaction || '');
    const match = GAME_DATA_HEROES.find(gh => 
      gh.id === heroModule.id || 
      gh.id === heroModule.id.replace(/_/g, '-') ||
      gh.id === heroModule.id.replace(/-/g, '_')
    ) || GAME_DATA_HEROES.find(gh => 
      gh.name === heroModule.name && 
      normalizeStr(gh.faction) === rawFac
    );
    if (match) {
      if (!heroModule.image) heroModule.image = match.image;
      if (!heroModule.bio) heroModule.bio = match.bio;
      heroModule.rawFaction = (heroModule.faction || '').toLowerCase();
      heroModule.faction = match.faction; // 'Lạc' | 'Việt' | 'Hà' | 'Sơn'
      this._heroes.set(match.id, heroModule);
      this._heroes.set(match.id.replace(/-/g, '_'), heroModule);
      this._heroes.set(match.id.replace(/_/g, '-'), heroModule);
    } else {
      heroModule.rawFaction = (heroModule.faction || '').toLowerCase();
      const facMap = { lac: 'Lạc', viet: 'Việt', ha: 'Hà', son: 'Sơn' };
      heroModule.faction = facMap[heroModule.rawFaction] || heroModule.faction;
      if (!heroModule.image) {
        heroModule.image = `${heroModule.rawFaction}_${heroModule.id.replace(/_/g, '-')}.png`;
      }
    }

    this._heroes.set(heroModule.id, heroModule);
    const kebabId = heroModule.id.replace(/_/g, '-');
    const snakeId = heroModule.id.replace(/-/g, '_');
    this._heroes.set(kebabId, heroModule);
    this._heroes.set(snakeId, heroModule);

    // Đăng ký toàn bộ kỹ năng của tướng này
    if (Array.isArray(heroModule.skills)) {
      for (const skill of heroModule.skills) {
        this.registerSkill(skill, heroModule);
      }
    }
  }

  /**
   * Đăng ký một Kỹ năng vào hệ thống
   */
  registerSkill(skillContract, heroModule = null) {
    if (!skillContract.id) {
      throw new Error(`[HeroRegistry] Kỹ năng không hợp lệ: thiếu id`);
    }
    this._skills.set(skillContract.id, skillContract);
    const kebabId = skillContract.id.replace(/_/g, '-');
    const snakeId = skillContract.id.replace(/-/g, '_');
    this._skills.set(kebabId, skillContract);
    this._skills.set(snakeId, skillContract);

    if (skillContract.name) {
      // Ưu tiên kỹ năng chủ động / chính nếu trùng tên với kỹ năng bị động hoặc tỏa định
      if (!this._skills.has(skillContract.name) || skillContract.type === 'active') {
        this._skills.set(skillContract.name, skillContract);
      }

      // Tự động liên kết các alias ID từ database (chỉ quét trong đúng hero tương ứng hoặc trùng tên chuẩn xác)
      const targetHeroes = heroModule && heroModule.id
        ? GAME_DATA_HEROES.filter(gh => (gh.id || '').replace(/-/g, '_') === heroModule.id.replace(/-/g, '_'))
        : GAME_DATA_HEROES;

      for (const gh of targetHeroes) {
        for (const gs of (gh.skills || [])) {
          const isExactNameMatch = gs.name === skillContract.name;
          const isExactIdMatch = gs.id === skillContract.id || gs.id?.replace(/-/g, '_') === snakeId || gs.id?.replace(/_/g, '-') === kebabId;
          if (isExactNameMatch || isExactIdMatch) {
            this._skills.set(gs.id, skillContract);
            this._skills.set(gs.id.replace(/-/g, '_'), skillContract);
            this._skills.set(gs.id.replace(/_/g, '-'), skillContract);
          }
        }
      }
    }
  }

  get(heroId) {
    return this.getHero(heroId);
  }

  register(heroModule) {
    return this.registerHero(heroModule);
  }

  getHero(heroId) {
    if (!heroId) return null;
    const normalized = heroId.replace(/-/g, '_');
    const kebab = heroId.replace(/_/g, '-');
    return this._heroes.get(heroId) || this._heroes.get(normalized) || this._heroes.get(kebab) || null;
  }

  getSkill(skillId) {
    if (!skillId) return null;
    const normalized = skillId.replace(/-/g, '_');
    const kebab = skillId.replace(/_/g, '-');
    return this._skills.get(skillId) || this._skills.get(normalized) || this._skills.get(kebab) || null;
  }

  getAllHeroes() {
    return Array.from(new Set(this._heroes.values()));
  }

  /**
   * Xác định kỹ năng thuộc về Tướng 1 (index 0) hay Tướng 2 (index 1) của người chơi
   */
  getHeroIndexForSkill(player, skillId) {
    if (!player) return 0;
    const norm = skillId.replace(/-/g, '_');
    const keb = skillId.replace(/_/g, '-');
    const canonical = normalizeSkillId(skillId);

    const matchSkill = s => {
      const sid = s.id || s;
      return sid === skillId || sid === norm || sid === keb || normalizeSkillId(sid) === canonical;
    };

    if (player.heroes && player.heroes[0]) {
      const s0 = player.heroes[0].skills || [];
      if (s0.some(matchSkill)) return 0;
    }
    if (player.heroes && player.heroes[1]) {
      const s1 = player.heroes[1].skills || [];
      if (s1.some(matchSkill)) return 1;
    }

    const h1 = this.getHero(player.mainHeroId || player.heroId);
    if (h1 && (h1.skills || []).some(matchSkill)) {
      return 0;
    }

    const h2 = this.getHero(player.subHeroId);
    if (h2 && (h2.skills || []).some(matchSkill)) {
      return 1;
    }

    return 0;
  }

  /**
   * Kiểm tra người chơi có kỹ năng này không
   * @param {Object} player
   * @param {string} skillId
   * @param {boolean} requireRevealed Nếu true, bắt buộc vị tướng sở hữu phải đang lật mặt
   */
  hasSkill(player, skillId, requireRevealed = false) {
    if (!player) return false;
    const normalized = skillId.replace(/-/g, '_');
    const kebab = skillId.replace(/_/g, '-');
    const canonical = normalizeSkillId(skillId);

    const matchSkill = s => {
      const sid = s.id || s;
      return sid === skillId || sid === normalized || sid === kebab || normalizeSkillId(sid) === canonical;
    };

    let has = Array.isArray(player.skills) && player.skills.some(matchSkill);

    if (!has) {
      const h1 = this.getHero(player.mainHeroId || player.heroId);
      const h2 = this.getHero(player.subHeroId);
      if (h1 && (h1.skills || []).some(matchSkill)) has = true;
      if (h2 && (h2.skills || []).some(matchSkill)) has = true;
    }

    if (!has && Array.isArray(player.heroes)) {
      if (player.heroes[0] && (player.heroes[0].skills || []).some(matchSkill)) has = true;
      if (player.heroes[1] && (player.heroes[1].skills || []).some(matchSkill)) has = true;
    }

    if (!has) return false;

    if (requireRevealed) {
      const heroIdx = this.getHeroIndexForSkill(player, skillId);
      if (player.revealedHeroes && !player.revealedHeroes[heroIdx]) {
        return false;
      }
    }

    // Nếu người chơi đang bị khóa kỹ năng (Tre Ngà - Thánh Gióng): Vô hiệu hóa mọi kỹ năng không phải Tỏa Định Kỹ
    if (player.temporaryFlags?.skillsSuppressed && !this.isLockSkill(skillId)) {
      return false;
    }

    return true;
  }

  /**
   * Kiểm tra xem kỹ năng có phải là Tỏa Định Kỹ (Lock Skill) hay không
   */
  isLockSkill(skillId) {
    if (!skillId) return false;
    const norm = skillId.replace(/-/g, '_');
    const canonical = normalizeSkillId(skillId);
    const lockSkills = [
      'thiet_ma',
      'no_than_cao_lo',
      'no_than',
      'tien_duyen_khoang_cach',
      'dam_bac',
      'than_giap',
      'ho_gia',
      'quoc_sac',
      'nghe_an_ke',
      'nhiep_chinh',
      'nhiep_chinh_to_hien_thanh',
      'ho_chu',
      'uy_chan',
      'khai_quoc',
      'pha_quan_nguyen_xi',
      'pha_quan'
    ];
    return lockSkills.includes(norm) || lockSkills.includes(canonical);
  }

  /**
   * Lấy chất thực tế của lá bài khi tính đến các kỹ năng biến đổi chất (Quốc Sắc - Ngọc Hân Công Chúa: Spade -> Heart)
   * Hỗ trợ đa hình tham số: (player, card) hoặc (card, player)
   */
  getEffectiveSuit(arg1, arg2) {
    let player, card;
    if (arg1 && (arg1.hp !== undefined || arg1.heroes || arg1.hand || arg1.equipment)) {
      player = arg1;
      card = arg2;
    } else if (arg2 && (arg2.hp !== undefined || arg2.heroes || arg2.hand || arg2.equipment)) {
      player = arg2;
      card = arg1;
    } else {
      player = arg1;
      card = arg2;
    }
    if (!card) return null;
    const suit = (card.suit || '').toString().toLowerCase();
    if (player && this.hasSkill(player, 'quoc_sac', true) && (suit === 'spade' || suit === 'spades' || suit === '♠' || suit === 'bích')) {
      return 'heart';
    }
    return card.suit;
  }

  /**
   * Lấy màu thực tế của lá bài khi tính đến các kỹ năng biến đổi chất
   * Hỗ trợ đa hình tham số: (player, card) hoặc (card, player)
   */
  getEffectiveColor(arg1, arg2) {
    let player, card;
    if (arg1 && (arg1.hp !== undefined || arg1.heroes || arg1.hand || arg1.equipment)) {
      player = arg1;
      card = arg2;
    } else if (arg2 && (arg2.hp !== undefined || arg2.heroes || arg2.hand || arg2.equipment)) {
      player = arg2;
      card = arg1;
    } else {
      player = arg1;
      card = arg2;
    }
    if (!card) return null;
    const effSuit = this.getEffectiveSuit(player, card) || card.suit;
    if (effSuit) {
      const norm = normalizeSuit(effSuit);
      if (norm && norm.color && norm.code !== 'unknown') return norm.color;
    }
    return card.color || (card.suit ? normalizeSuit(card.suit).color : 'black');
  }

  /**
   * Kích hoạt và lọc các Trigger Kỹ Năng khi có Sự Kiện xảy ra trong game
   * Tự động hiển lộ tướng khi phát động kỹ năng bị động / phản ứng
   */
  dispatchTrigger(eventType, eventData, state) {
    const responses = [];

    for (const player of state.getAlivePlayers()) {
      if (!player.skills || player.skills.length === 0) continue;

      for (const skillId of player.skills) {
        const skill = this.getSkill(skillId);
        if (!skill) continue;

        const context = {
          owner: player,
          ownerId: player.id,
          actor: eventData.source || state.getPlayer(eventData.sourceId),
          actorId: eventData.sourceId,
          target: eventData.target || state.getPlayer(eventData.targetId),
          targetId: eventData.targetId,
          card: eventData.card || null,
          damageAmount: eventData.damageAmount || 0,
          ...eventData
        };

        if (skill.matchesTrigger({ type: eventType }, context) && skill.canUse(state, context)) {
          // Tự động lật mặt tướng nếu tướng sở hữu đang ẩn
          const heroIdx = this.getHeroIndexForSkill(player, skillId);
          if (player.revealedHeroes && !player.revealedHeroes[heroIdx]) {
            this.revealPlayerHero(state, player, heroIdx, skill.name);
          }

          // Thực thi kỹ năng hoặc đẩy yêu cầu vào stack
          const result = skill.execute(state, context, state.priorityStack);
          if (result && typeof result === 'object') {
            Object.assign(eventData, result);
          }
          responses.push({ skillId, playerId: player.id, result });
        }
      }
    }

    return responses;
  }

  /**
   * Lật mặt tướng của người chơi và xử lý trọn vẹn toàn bộ các cơ chế Quốc Chiến:
   * 1. Cập nhật player.revealedHeroes[heroIndex] = true
   * 2. Cập nhật faction & gender
   * 3. Thưởng Tiên Phong Cắm Cờ (+2 bài cho người đầu tiên lật tướng)
   * 4. Thưởng Âm Dương Giao Hòa (+1 bài khi lật đủ 2 tướng nếu tổng máu gốc là số lẻ)
   * 5. Kiểm tra cơ chế Dã Tâm (Careerist nếu số người cùng phe đã lật > N/2)
   */
  revealPlayerHero(state, player, heroIndex, triggeredSkillName = null, isExplicitReveal = false) {
    if (!player) return;
    player.revealedHeroes = player.revealedHeroes || [false, false];
    if (player.revealedHeroes[heroIndex]) return;

    // QUY TẮC QUỐC CHIẾN BẮT BUỘC:
    // Tướng đầu tiên lật mở BẮT BUỘC trở thành TƯỚNG CHÍNH (slot 0).
    // Nếu người chơi chọn lật tướng ở slot 1 đầu tiên (khi cả 2 đều đang úp):
    // Tướng này được xác lập làm Tướng Chính (swap sang slot 0), tướng còn lại là Tướng Phó (vẫn úp ở slot 1)!
    if (!player.revealedHeroes[0] && !player.revealedHeroes[1] && heroIndex === 1) {
      const tempMainId = player.mainHeroId || player.heroId;
      player.mainHeroId = player.subHeroId;
      player.subHeroId = tempMainId;
      player.heroId = player.mainHeroId;
      if (Array.isArray(player.heroes) && player.heroes.length >= 2) {
        [player.heroes[0], player.heroes[1]] = [player.heroes[1], player.heroes[0]];
      }
      heroIndex = 0;
    }

    player.revealedHeroes[heroIndex] = true;

    const heroId = heroIndex === 0 ? (player.mainHeroId || player.heroId) : player.subHeroId;
    const hero = this.getHero(heroId);
    const heroName = hero?.name || 'Tướng';
    const faction = hero?.faction ? ` (Phe ${hero.faction})` : '';
    if (hero?.faction) {
      player.faction = hero.faction;
    }

    if (triggeredSkillName) {
      state.addLog(`👁️ [${player.name}] phát động kỹ năng [${triggeredSkillName}], tự động hiển lộ chân dung [${heroName}]${faction}!`);
    } else {
      state.addLog(`👁️ ${player.name} đã lộ diện tướng [${heroName}]${faction}!`);
    }

    // QUY TẮC GIỚI TÍNH BẮT BUỘC:
    // Giới tính của nhân vật LUÔN LUÔN thuộc về Tướng Chính (slot 0).
    const h1Id = player.mainHeroId || player.heroId;
    const h2Id = player.subHeroId;
    const h1 = this.getHero(h1Id);
    const h2 = this.getHero(h2Id);
    player.gender = h1?.gender || 'male';

    // Phần thưởng Lộ Diện Tướng (chỉ trao khi người chơi chủ động lật tướng / Mở Tướng)
    if (isExplicitReveal) {
      // 1. Thưởng Tiên Phong Cắm Cờ: Người chơi đầu tiên trong ván đấu lộ diện tướng được nhận thưởng 2 lá bài
      if (!state.hasPioneerRewardClaimed) {
        state.hasPioneerRewardClaimed = true;
        state.pioneerPlayerId = player.id;
        const drawn = state.drawCards(player.id, 2);
        if (drawn && drawn.length > 0) {
          state.addLog(`🎉 [Tiên Phong Cắm Cờ] ${player.name} là người đầu tiên lộ diện tướng trong ván đấu, nhận thưởng ngay 2 lá bài!`);
        }
      }

      // 2. Thưởng Âm Dương Giao Hoà: Khi lật mặt cả 2 võ tướng, nếu tổng sinh lực của 2 tướng gốc là số lẻ -> thưởng rút 1 lá bài (1 lần/ván)
      if (player.revealedHeroes[0] && player.revealedHeroes[1] && !player.hasReceivedYinYangReward) {
        if (h1 && h2) {
          const h1Hp = h1.maxHp || h1.hp || 4;
          const h2Hp = h2.maxHp || h2.hp || 4;
          const totalRawHp = h1Hp + h2Hp;
          if (totalRawHp % 2 !== 0) {
            player.hasReceivedYinYangReward = true;
            const drawn = state.drawCards(player.id, 1);
            if (drawn && drawn.length > 0) {
              state.addLog(`☯️ [Âm Dương Giao Hoà] ${player.name} đã lộ diện cả 2 tướng có tổng sinh lực lẻ (${h1Hp} + ${h2Hp} = ${totalRawHp}), nhận thưởng bù 1 lá bài!`);
            }
          }
        }
      }
    }

    // 3. Kiểm tra Cơ Chế Dã Tâm (Careerist)
    if (!player.isDaTam && player.faction && player.faction !== 'none') {
      const maxAllowed = Math.floor(state.players.length / 2);
      const revealedSameFactionCount = state.players.filter(p =>
        p.revealedHeroes?.some(Boolean) &&
        isSameFaction(p, player) &&
        !p.isDaTam
      ).length;

      if (revealedSameFactionCount > maxAllowed) {
        player.isDaTam = true;
        state.addLog(`🐺 [Dã Tâm] Phe ${player.faction.toUpperCase()} đã vượt quá số lượng cho phép (${revealedSameFactionCount} > ${maxAllowed})! ${player.name} thoái hóa thành DÃ TÂM!`);
      }
    }
  }
}

export const globalHeroRegistry = new HeroRegistry();

// Tự động nạp sẵn toàn bộ 34 vị tướng của 4 phe vào globalHeroRegistry
import { LAC_HEROES } from './lac/index.js';
import { VIET_HEROES } from './viet/index.js';
import { HA_HEROES } from './ha/index.js';
import { SON_HEROES } from './son/index.js';

[...LAC_HEROES, ...VIET_HEROES, ...HA_HEROES, ...SON_HEROES].forEach(hero => {
  globalHeroRegistry.registerHero(hero);
});

// Helper functions tương thích hoàn toàn cho Client UI và Rules
export const hasSkill = (player, skillId) => globalHeroRegistry.hasSkill(player, skillId, true);
export const hasSkillEvenIfHidden = (player, skillId) => globalHeroRegistry.hasSkill(player, skillId, false);
export function getPlayerGender(player) {
  return getCanonicalPlayerGender(player);
}
export const getEffectiveSuit = (player, card) => globalHeroRegistry.getEffectiveSuit(player, card);
export const getEffectiveColor = (player, card) => globalHeroRegistry.getEffectiveColor(player, card);
export const getEffectiveCard = (player, card) => {
  if (!card) return null;
  return {
    ...card,
    suit: globalHeroRegistry.getEffectiveSuit(player, card) || card.suit,
    color: globalHeroRegistry.getEffectiveColor(player, card) || card.color
  };
};

export { isSameFaction, getCanonicalFaction, getFactionLabel };



