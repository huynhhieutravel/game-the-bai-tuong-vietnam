// @ts-check
import React from 'react';
import { PHASES } from 'shared/data/gameData';
import { hasSkill } from 'shared/engine_v4/application/index.js';
import { normalizeSkillType, normalizeSkillId, getCanonicalFaction } from 'shared/utils/translationHelper';
/**
 * @typedef {import('../../engine/types/view/PlayerViewModel').PlayerViewModel} PlayerViewModel
 * @typedef {import('../../engine/types/view/GameViewModel').GameViewModel} GameViewModel
 * 
 * @typedef {Object} ActionBarProps
 * @property {PlayerViewModel} me
 * @property {boolean} isMyTurn
 * @property {GameViewModel} gameState
 * @property {any} gameAPI
 * @property {string} [activeSkill]
 * @property {any} targetSession
 * @property {import('react').MutableRefObject<boolean>} isActionPending
 * @property {any} handleDraw
 * @property {any} handleRevealClick
 * @property {any} handleExecuteSkill
 * @property {any} handleEndTurn
 * @property {any} cancelTargeting
 * @property {boolean} [needsDiscard]
 * @property {number} [discardAmount]
 * @property {Array<number>} [selectedDiscards]
 * @property {() => void} [confirmDiscard]
 * 
 * @param {ActionBarProps} props
 */
export function ActionBar(props) {
    const {
        me,
        isMyTurn,
        gameState,
        gameAPI,
        activeSkill,
        targetSession,
        isActionPending,
        handleDraw,
        handleRevealClick,
        handleExecuteSkill,
        handleEndTurn,
        cancelTargeting,
        needsDiscard,
        discardAmount = 0,
        selectedDiscards = [],
        confirmDiscard
    } = props;
    return (
        <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
            {needsDiscard && (
              <button 
                className="btn-action danger btn-discard" 
                disabled={selectedDiscards.length !== discardAmount}
                onClick={confirmDiscard}
                style={{
                  opacity: selectedDiscards.length === discardAmount ? 1 : 0.6,
                  filter: selectedDiscards.length === discardAmount ? 'none' : 'grayscale(0.6)'
                }}
              >
                Bỏ Bài ({selectedDiscards.length}/{discardAmount})
              </button>
            )}
            {isMyTurn && ((gameState.phase || '').toLowerCase() === 'draw') && !needsDiscard && (
              <>
                <button className="btn-action primary" onClick={() => handleDraw()}>
                  Rút Bài
                </button>

                {/* Bình Ngô is now automatically applied by the engine if the hero is revealed. */}
              </>
            )}
            {isMyTurn && ((gameState.phase || '').toLowerCase() === 'action') && !targetSession && !needsDiscard && (
              <>
                <button className="btn-action danger btn-end-turn" onClick={handleEndTurn}>
                  Kết Thúc
                </button>
                { (() => {
                    const isActionSkill = (s) => {
                        if (!s) return false;
                        if (s.isActive || s.typeCode === 'active') return true;
                        const norm = normalizeSkillType(s.type);
                        if (norm.isActive) return true;
                        const normId = normalizeSkillId(s.id || s.name);
                        const activeNormIds = [
                            'hoa_than', 'dieu_duoc', 'tu_chu', 'binh_loan', 'thuy_to', 
                            'duyen_tho', 'tam_cong', 'bach_dang', 'lan_sau', 'van_don', 
                            'ky_tap', 'doi_nui', 'pha_thanh', 'than_hoa', 'khai_thien', 
                            'dinh_quoc', 'tien_phong', 'tien_duyen', 'doat_sao', 'can_gian',
                            'boc_tram_trung'
                        ];
                        return activeNormIds.includes(normId);
                    };

                    let skills = me.heroes ? me.heroes.filter(Boolean).flatMap((h, i) => {
                        return ((h && h.skills) || []).map(s => ({ ...s, heroIndex: i, isRevealed: me.revealedHeroes && me.revealedHeroes[i] }));
                    }).filter(isActionSkill) : [];
                    
                    if (getCanonicalFaction(me.faction) === 'son') {
                        const hasDinhQuocUser = gameState.players.some(p => p.id !== me.id && p.isAlive && p.revealedHeroes.some(Boolean) && hasSkill(p, 'dinh-quoc'));
                        // Đảm bảo không bị trùng nếu chính mình là Đinh Điền
                        const iHaveDinhQuoc = skills.some(s => (s.id === 'dinh-quoc' || s.id === 'dinh_quoc' || s.name === 'Định Quốc') && s.isRevealed);
                        if (hasDinhQuocUser && !iHaveDinhQuoc) {
                            skills.push({ name: 'Định Quốc', desc: 'Đưa 1 lá [Né] hoặc [Sấm Sét] cho tướng có kỹ năng Định Quốc', isRevealed: true, isUsable: !me.dinhQuocUsedThisTurn && me.hand.length > 0 });
                        }
                    }

                    // Deduplicate skills by unique identifier to ensure no duplicate buttons appear on ActionBar
                    const seenSkillNames = new Set();
                    skills = skills.filter(s => {
                        const key = (s.name || s.id || '').trim();
                        if (seenSkillNames.has(key)) return false;
                        seenSkillNames.add(key);
                        return true;
                    });
                    return skills.map(s => {
                      if (!s.isRevealed) {
                        return (
                          <button 
                            key={s.name + '_hidden'} 
                            className="btn-action warning btn-skill" 
                            onClick={() => {
                               handleRevealClick(s.heroIndex);
                               handleExecuteSkill(s.name);
                            }}
                            title="Tướng đang ẩn. Nhấn để lật tướng."
                            disabled={me.isSilenced}
                            style={{ opacity: me.isSilenced ? 0.5 : 0.8, filter: 'grayscale(0.5)' }}
                          >
                            {s.name} (Ẩn)
                          </button>
                        );
                      }
                      
                      const normId = normalizeSkillId(s.id || s.name);
                      let isSkillDisabled = me.isSilenced || !s.isUsable;
                      let disableReason = me.isSilenced ? 'Kỹ năng bị khóa!' : (s.disableReason || 'Không thể sử dụng lúc này');

                      if (normId === 'boc_tram_trung') {
                        const hasCrossbow = me.equipment?.weapon?.idKey === 'lien_no';
                        const hasUsedSlash = (me.turnStats?.slashCount || 0) >= 1 && !hasCrossbow;
                        const hasLacAlly = gameState.players.some(p => p.id !== me.id && p.isAlive && !p.isDaTam && (p.revealedHeroes ? p.revealedHeroes.some(Boolean) : p.isRevealed !== false) && (getCanonicalFaction(p.faction) === 'lac'));
                        if (hasUsedSlash) {
                          isSkillDisabled = true;
                          disableReason = 'Đã hết số lần Chém trong lượt này!';
                        } else if (!hasLacAlly) {
                          isSkillDisabled = true;
                          disableReason = 'Không có đồng minh hệ Lạc nào đang lộ diện!';
                        } else {
                          isSkillDisabled = me.isSilenced;
                        }
                      }

                      return (
                        <button 
                          key={s.name} 
                          className={`btn-action btn-skill ${activeSkill === s.name ? 'primary' : 'warning'}`} 
                          onClick={() => handleExecuteSkill(s.name)}
                          title={isSkillDisabled ? disableReason : s.desc}
                          disabled={isSkillDisabled}
                          style={{ opacity: isSkillDisabled ? 0.5 : 1, filter: isSkillDisabled ? 'grayscale(0.8)' : 'none' }}
                        >
                          {s.name}
                        </button>
                      );
                    });
                })() }
              </>
            )}
            {targetSession && (
              <>
                <button
                  className="btn-action secondary btn-cancel"
                  onClick={cancelTargeting}
                >
                  Hủy
                </button>
                {targetSession.targetingDef?.type === 'multiple' && (() => {
                  const isXiengXich = targetSession.card?.name === 'Xiềng Xích' || targetSession.virtualCardName === 'Xiềng Xích' || activeSkill === 'Tiên Duyên';
                  const minTargets = targetSession.targetingDef.min !== undefined ? targetSession.targetingDef.min : 1;
                  const maxTargets = targetSession.targetingDef.max !== undefined ? targetSession.targetingDef.max : 2;
                  const selectedCount = targetSession.selectedTargets.length;
                  const hasEnoughTargets = selectedCount >= minTargets;
                  const isReforge = isXiengXich && selectedCount === 0;
                  const canSubmit = isReforge || hasEnoughTargets;
                  
                  let label = `Dùng ${targetSession.virtualCardName || targetSession.card?.name || activeSkill}`;
                  if (isXiengXich) {
                     label = isReforge ? 'Rèn Lại (Bỏ 1)' : `Khóa Xích (${selectedCount}/${maxTargets})`;
                  } else {
                     label = `Xác Nhận (${selectedCount}/${maxTargets})`;
                  }

                  return (
                    <button
                      className="btn-action primary"
                      disabled={!canSubmit}
                      style={{ opacity: canSubmit ? 1 : 0.5, filter: canSubmit ? 'none' : 'grayscale(1)' }}
                      onClick={() => {
                         if (isActionPending.current) return;
                         isActionPending.current = true;
                         const isXiengXich = targetSession.card?.name === 'Xiềng Xích' || targetSession.virtualCardName === 'Xiềng Xích' || activeSkill === 'Tiên Duyên';
                         gameAPI.playCard(me.id, targetSession.card.id, targetSession.selectedTargets, { 
                             virtualCardName: targetSession.virtualCardName || (isXiengXich ? 'Xiềng Xích' : undefined),
                             isReforge: isReforge,
                             reforge: isReforge,
                             asChain: isXiengXich
                         });
                         cancelTargeting();
                      }}
                    >
                      {label}
                    </button>
                  );
                })()}
                {['none', 'aoe', 'self'].includes(targetSession.targetingDef?.type) && (
                  <button
                    className="btn-action primary"
                    onClick={() => {
                        if (isActionPending.current) return;
                        isActionPending.current = true;
                        gameAPI.playCard(me.id, targetSession.card.id, [], { virtualCardName: targetSession.virtualCardName });
                        cancelTargeting();
                    }}
                  >
                    Dùng {targetSession.virtualCardName || targetSession.card.name}
                  </button>
                )}
              </>
            )}
        </div>
    );
}
