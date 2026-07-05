import { SkillRegistry } from '../registries/SkillRegistry';

// TODO: Xóa map này sau khi App.jsx chuyển hoàn toàn sang dùng skillId
const NAME_TO_ID_MAP = {
  'Tâm Công': 'tam-cong',
  'Thủy Tổ': 'thuy-to',
  'Uy Chấn (Tỏa Định Kỹ)': 'uy-chan'
};

export function canUseSkill(state, playerId, skillIdentifier) {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isAlive) return { valid: false, reason: 'Người chơi không hợp lệ' };
  
  if (player.isSilenced) return { valid: false, reason: 'Bạn đang bị khóa kỹ năng' };

  const skillId = NAME_TO_ID_MAP[skillIdentifier] || skillIdentifier;
  const skillConfig = SkillRegistry[skillId];

  if (!skillConfig) return { valid: false, reason: 'Kỹ năng không tồn tại' };

  if (skillConfig.type !== 'ACTIVE' && skillConfig.type !== 'LIMITED') {
    return { valid: false, reason: 'Kỹ năng này là bị động, không thể chủ động sử dụng' };
  }

  if (skillConfig.canUse) {
    const canUse = skillConfig.canUse(state, player);
    if (!canUse) return { valid: false, reason: 'Không thỏa mãn điều kiện dùng kỹ năng lúc này' };
  }

  return { valid: true };
}

export function getValidSkillTargets(state, playerId, skillIdentifier) {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isAlive) return [];

  const skillId = NAME_TO_ID_MAP[skillIdentifier] || skillIdentifier;
  const skillConfig = SkillRegistry[skillId];
  if (!skillConfig || !skillConfig.getValidTargets) return [];

  return skillConfig.getValidTargets(state, player);
}
