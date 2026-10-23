/**
 * HeroRegistry.js
 * Quản lý Danh mục Tướng & Điều Phối Kỹ Năng Tự Động trong Việt Sát v4.
 * Đảm bảo tính mô-đun hóa, dễ mở rộng và kiểm soát chặt chẽ trigger.
 */

import { HEROES as GAME_DATA_HEROES } from '../../data/gameData.js';

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
    const rawFac = (heroModule.faction || heroModule.rawFaction || '').toLowerCase();
    const match = GAME_DATA_HEROES.find(gh => 
      gh.id === heroModule.id || 
      gh.id === heroModule.id.replace(/_/g, '-') ||
      gh.id === heroModule.id.replace(/-/g, '_')
    ) || GAME_DATA_HEROES.find(gh => 
      gh.name === heroModule.name && 
      (gh.faction || '').toLowerCase() === rawFac
    );
    if (match) {
      if (!heroModule.image) heroModule.image = match.image;
      if (!heroModule.bio) heroModule.bio = match.bio;
      heroModule.rawFaction = (heroModule.faction || '').toLowerCase();
      heroModule.faction = match.faction; // 'Lạc' | 'Việt' | 'Hà' | 'Sơn'
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
        this.registerSkill(skill);
      }
    }
  }

  /**
   * Đăng ký một Kỹ năng vào hệ thống
   */
  registerSkill(skillContract) {
    if (!skillContract.id) {
      throw new Error(`[HeroRegistry] Kỹ năng không hợp lệ: thiếu id`);
    }
    this._skills.set(skillContract.id, skillContract);
    const kebabId = skillContract.id.replace(/_/g, '-');
    const snakeId = skillContract.id.replace(/-/g, '_');
    this._skills.set(kebabId, skillContract);
    this._skills.set(snakeId, skillContract);

    if (skillContract.name) {
      this._skills.set(skillContract.name, skillContract);
      // Tự động liên kết các alias ID từ database (vd: tien-phong -> Tiên Phong)
      for (const gh of GAME_DATA_HEROES) {
        for (const gs of (gh.skills || [])) {
          if (gs.name === skillContract.name || gs.name.includes(skillContract.name) || skillContract.name.includes(gs.name)) {
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

    const h1 = this.getHero(player.mainHeroId || player.heroId);
    if (h1 && (h1.skills || []).some(s => s.id === skillId || s.id === norm || s.id === keb)) {
      return 0;
    }

    const h2 = this.getHero(player.subHeroId);
    if (h2 && (h2.skills || []).some(s => s.id === skillId || s.id === norm || s.id === keb)) {
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

    let has = Array.isArray(player.skills) && (
      player.skills.includes(skillId) ||
      player.skills.includes(normalized) ||
      player.skills.includes(kebab)
    );

    if (!has) {
      const h1 = this.getHero(player.mainHeroId || player.heroId);
      const h2 = this.getHero(player.subHeroId);
      if (h1 && (h1.skills || []).some(s => s.id === skillId || s.id === normalized || s.id === kebab)) has = true;
      if (h2 && (h2.skills || []).some(s => s.id === skillId || s.id === normalized || s.id === kebab)) has = true;
    }

    if (!has) return false;

    if (requireRevealed) {
      const heroIdx = this.getHeroIndexForSkill(player, skillId);
      if (player.revealedHeroes && !player.revealedHeroes[heroIdx]) {
        return false;
      }
    }

    return true;
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
            player.revealedHeroes[heroIdx] = true;
            const heroId = heroIdx === 0 ? (player.mainHeroId || player.heroId) : player.subHeroId;
            const hero = this.getHero(heroId);
            if (hero) {
              player.faction = hero.faction;
              state.addLog(`👁️ [${player.name}] phát động kỹ năng [${skill.name}], tự động hiển lộ chân dung [${hero.name}] (Phe ${hero.faction})!`);

              // Kiểm tra cơ chế Dã Tâm (Careerist)
              const alivePlayers = state.getAlivePlayers();
              const sameFactionCount = alivePlayers.filter(p => 
                p.id !== player.id && 
                p.faction === hero.faction && 
                !p.isDaTam && 
                p.revealedHeroes && (p.revealedHeroes[0] || p.revealedHeroes[1])
              ).length;
              const threshold = Math.floor(state.players.length / 2);
              if (sameFactionCount >= threshold && !player.isDaTam) {
                player.isDaTam = true;
                state.addLog(`🐺 [DÃ TÂM]: Số lượng phe ${hero.faction} đã vượt quá giới hạn (${sameFactionCount + 1} > ${threshold})! ${player.name} thoái hóa thành DÃ TÂM độc lập!`);
              }
            }
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

