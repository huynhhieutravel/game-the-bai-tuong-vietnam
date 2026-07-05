// @ts-check
import React from 'react';
import { PHASES } from '../../data/gameData';

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
        cancelTargeting
    } = props;
    return (
        <div className="action-buttons">
            {isMyTurn && gameState.phase === PHASES.DRAW && (
              <>
                <button className="btn-action primary" onClick={() => handleDraw()}>
                  🃏 Rút Bài
                </button>
                {me.heroes?.some((h, i) => h.skills?.some(s => s.id === 'nhiep-chinh')) && (
                  <button className="btn-action danger" style={{ marginLeft: '10px' }} onClick={() => handleDraw(true, false)}>
                    👑 Dùng Nhiếp Chính (Bỏ Rút Bài)
                  </button>
                )}
                {me.heroes?.some((h, i) => h.skills?.some(s => s.id === 'binh-ngo')) && me.hp < me.maxHp && (
                  <button className="btn-action success" style={{ marginLeft: '10px' }} onClick={() => handleDraw(false, true, false)}>
                    🛡️ Dùng Bình Ngô (Rút 3 lá)
                  </button>
                )}
                {me.heroes?.some((h, i) => h.skills?.some(s => s.id === 'khai-quoc')) && (
                  <button className="btn-action primary" style={{ marginLeft: '10px' }} onClick={() => handleDraw(false, false, true)}>
                    👑 Dùng Khai Quốc (Rút 4, Đưa 1)
                  </button>
                )}
              </>
            )}
            {isMyTurn && gameState.phase === PHASES.ACTION && !targetSession && (
              <>
                { (() => {
                    let skills = me.heroes ? me.heroes.flatMap((h, i) => {
                        return (h.skills || []).map(s => ({ ...s, heroIndex: i, isRevealed: me.revealedHeroes && me.revealedHeroes[i] }));
                    }).filter(s => s.type === 'ACTIVE' || s.type === 'ACTIVE_DEFENSIVE') : [];
                    
                    const myFaction = me.faction;
                    if (myFaction === 'sơn') {
                        const hasDinhQuocUser = gameState.players.some(p => p.id !== me.id && p.isAlive && p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.id === 'dinh-quoc')));
                        // Đảm bảo không bị trùng nếu chính mình là Đinh Điền
                        const iHaveDinhQuoc = skills.some(s => s.id === 'dinh-quoc' && s.isRevealed);
                        if (hasDinhQuocUser && !iHaveDinhQuoc) {
                            skills.push({ name: 'Định Quốc', desc: 'Đưa 1 lá bài cho tướng Định Quốc để họ hồi máu', isRevealed: true, isUsable: true });
                        }
                    }
                    return skills.map(s => {
                      if (!s.isRevealed) {
                        return (
                          <button 
                            key={s.name + '_hidden'} 
                            className="btn-action warning" 
                            onClick={() => {
                               if (window.confirm(`Bạn phải lật tướng để sử dụng kỹ năng [${s.name}]. Lật ngay?`)) {
                                  handleRevealClick(s.heroIndex);
                                  setTimeout(() => alert(`Đã lật tướng. Vui lòng bấm lại kỹ năng [${s.name}]!`), 100);
                               }
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
                          className={`btn-action ${activeSkill === s.name ? 'primary' : 'warning'}`} 
                          onClick={() => handleExecuteSkill(s.name)}
                          title={isSkillDisabled ? disableReason : s.desc}
                          disabled={isSkillDisabled}
                          style={{ opacity: isSkillDisabled ? 0.5 : 1, filter: isSkillDisabled ? 'grayscale(0.8)' : 'none' }}
                        >
                          ✨ {s.name} {activeSkill === s.name ? '(Đang chọn)' : ''}
                        </button>
                      );
                    });
                })() }
                <button className="btn-action danger" onClick={handleEndTurn}>
                  ⏭️ Kết Thúc
                </button>
              </>
            )}
            {targetSession && (
              <>
                {targetSession.targetingDef?.type === 'multiple' && (
                  <button
                    className="btn-action primary"
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
                               isReforge: targetSession.selectedTargets.length === 0
                           });
                       }
                       cancelTargeting();
                    }}
                  >
                    {targetSession.selectedTargets.length === 0 ? '⛓️ Rèn Lại (Bỏ 1 Rút 1)' : '🔗 Xác Nhận Xích'}
                  </button>
                )}
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
                    ✅ Xác nhận Dùng {targetSession.virtualCardName || targetSession.card.name}
                  </button>
                )}
                <button
                  className="btn-action secondary"
                  onClick={cancelTargeting}
                >
                  ✕ Hủy
                </button>
              </>
            )}
        </div>
    );
}
