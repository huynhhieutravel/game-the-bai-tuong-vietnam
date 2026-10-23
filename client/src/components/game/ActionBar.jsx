// @ts-check
import React from 'react';
import { PHASES } from 'shared/data/gameData';
import { hasSkill } from 'shared/engine_v4/application/index.js';
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
                className="btn-action danger" 
                disabled={selectedDiscards.length !== discardAmount}
                onClick={confirmDiscard}
                style={{
                  opacity: selectedDiscards.length === discardAmount ? 1 : 0.6,
                  filter: selectedDiscards.length === discardAmount ? 'none' : 'grayscale(0.6)'
                }}
              >
                🗑️ Bỏ Bài ({selectedDiscards.length}/{discardAmount})
              </button>
            )}
            {isMyTurn && gameState.phase === PHASES.DRAW && !needsDiscard && (
              <>
                <button className="btn-action primary" onClick={() => handleDraw()}>
                  🃏 Rút Bài
                </button>

                {/* Bình Ngô is now automatically applied by the engine if the hero is revealed. */}
              </>
            )}
            {isMyTurn && gameState.phase === PHASES.ACTION && !targetSession && !needsDiscard && (
              <>
                <button className="btn-action danger btn-end-turn" onClick={handleEndTurn}>
                  ⏭️ Kết Thúc
                </button>
                { (() => {
                    let skills = me.heroes ? me.heroes.filter(Boolean).flatMap((h, i) => {
                        return ((h && h.skills) || []).map(s => ({ ...s, heroIndex: i, isRevealed: me.revealedHeroes && me.revealedHeroes[i] }));
                    }).filter(s => s.type === 'ACTIVE' || s.type === 'ACTIVE_DEFENSIVE') : [];
                    
                    const myFaction = me.faction;
                    if (myFaction === 'sơn') {
                        const hasDinhQuocUser = gameState.players.some(p => p.id !== me.id && p.isAlive && p.revealedHeroes.some(Boolean) && hasSkill(p, 'dinh-quoc'));
                        // Đảm bảo không bị trùng nếu chính mình là Đinh Điền
                        const iHaveDinhQuoc = skills.some(s => s.id === 'dinh-quoc' && s.isRevealed);
                        if (hasDinhQuocUser && !iHaveDinhQuoc) {
                            skills.push({ name: 'Định Quốc', desc: 'Đưa 1 lá [Né] hoặc [Sấm Sét] cho tướng có kỹ năng Định Quốc', isRevealed: true, isUsable: !me.dinhQuocUsedThisTurn && me.hand.length > 0 });
                        }
                    }
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
                            👁️ {s.name} (Ẩn)
                          </button>
                        );
                      }
                      
                      const isSkillDisabled = me.isSilenced || !s.isUsable;
                      const disableReason = me.isSilenced ? 'Kỹ năng bị khóa!' : (s.disableReason || 'Không thể sử dụng lúc này');

                      return (
                        <button 
                          key={s.name} 
                          className={`btn-action btn-skill ${activeSkill === s.name ? 'primary' : 'warning'}`} 
                          onClick={() => handleExecuteSkill(s.name)}
                          title={isSkillDisabled ? disableReason : s.desc}
                          disabled={isSkillDisabled}
                          style={{ opacity: isSkillDisabled ? 0.5 : 1, filter: isSkillDisabled ? 'grayscale(0.8)' : 'none' }}
                        >
                          ✨ {s.name} {activeSkill === s.name ? '✓' : ''}
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
                  ✕ Hủy
                </button>
                {targetSession.targetingDef?.type === 'multiple' && (() => {
                  const isXiengXich = targetSession.card?.name === 'Xiềng Xích' || targetSession.virtualCardName === 'Xiềng Xích' || activeSkill === 'Tiên Duyên';
                  const minTargets = targetSession.targetingDef.min !== undefined ? targetSession.targetingDef.min : 1;
                  const hasEnoughTargets = targetSession.selectedTargets.length >= minTargets;
                  const isReforge = isXiengXich && targetSession.selectedTargets.length === 0;
                  const canSubmit = isReforge || hasEnoughTargets;
                  
                  let label = `✅ Dùng ${targetSession.virtualCardName || targetSession.card?.name || activeSkill}`;
                  if (isXiengXich) {
                     label = isReforge ? '⛓️ Rèn Lại (Bỏ 1)' : '🔗 Xác Nhận Xích';
                  }

                  return (
                    <button
                      className="btn-action primary"
                      disabled={!canSubmit}
                      style={{ opacity: canSubmit ? 1 : 0.5, filter: canSubmit ? 'none' : 'grayscale(1)' }}
                      onClick={() => {
                         if (isActionPending.current) return;
                         isActionPending.current = true;
                         if (activeSkill === 'Tiên Duyên') {
                             gameAPI.dispatcher.dispatchAction({
                                 type: 'ACTION_USE_SKILL',
                                 payload: { playerId: me.id, skillId: 'tien-duyen-active', targets: targetSession.selectedTargets, options: { cardIds: [targetSession.card.id] } }
                             });
                         } else {
                             gameAPI.playCard(me.id, targetSession.card.id, targetSession.selectedTargets, { 
                                 virtualCardName: targetSession.virtualCardName,
                                 isReforge: isReforge
                             });
                         }
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
                    ✅ Dùng {targetSession.virtualCardName || targetSession.card.name}
                  </button>
                )}
              </>
            )}
        </div>
    );
}
