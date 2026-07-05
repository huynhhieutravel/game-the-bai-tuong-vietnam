// @ts-check
import React, { useState, useEffect } from 'react';
import { VipHeroSelectorModal } from '../modals/VipHeroSelectorModal';
import { HEROES } from '../../data/gameData';

/**
 * @typedef {import('../../engine/types/view/PlayerViewModel').PlayerViewModel} PlayerViewModel
 * @typedef {import('../../engine/types/view/GameViewModel').GameViewModel} GameViewModel
 * 
 * @typedef {Object} DraftScreenProps
 * @property {GameViewModel} gameState
 * @property {PlayerViewModel} me
 * @property {any} gameController
 * 
 * @param {DraftScreenProps} props
 */
export function DraftScreen(props) {
    const { gameState, me, gameController } = props;
    const [draftSelection, setDraftSelection] = useState([]);
    const [draftTimer, setDraftTimer] = useState(30);
    const [showVipModal, setShowVipModal] = useState(false);

    // Draft Timer logic
    useEffect(() => {
        if (!gameState) return;
        
        let timer;
        if (draftTimer > 0 && !me.hasDrafted) {
          timer = setInterval(() => {
            setDraftTimer(prev => prev - 1);
          }, 1000);
        } else if (draftTimer === 0 && !me.hasDrafted) {
          // Auto-select if time runs out, grouping by faction first
          const factions = {};
          me.draftHeroes.forEach(h => {
            if (!factions[h.faction]) factions[h.faction] = [];
            factions[h.faction].push(h);
          });
          let selectedPair = null;
          for (const fac in factions) {
            if (factions[fac].length >= 2) {
              selectedPair = [factions[fac][0].id, factions[fac][1].id];
              break;
            }
          }
          if (selectedPair) {
            gameController.selectDraftHeroes(me.id, selectedPair[0], selectedPair[1]);
          } else {
            gameController.selectDraftHeroes(me.id, me.draftHeroes[0]?.id, me.draftHeroes[1]?.id || me.draftHeroes[0]?.id);
          }
        }
    
        return () => {
          if (timer) clearInterval(timer);
        };
    }, [draftTimer, me.hasDrafted, me.id, me.draftHeroes, gameState, gameController]);

    // Bot Auto-pick logic (Runs once during draft)
    useEffect(() => {
        if (!gameState) return;
        const botsToDraft = gameState.players.filter(p => p.isBot && !p.hasDrafted);
        if (botsToDraft.length === 0) return;
        
        botsToDraft.forEach(bot => {
            const factions = {};
            bot.draftHeroes.forEach(h => {
                if (!factions[h.faction]) factions[h.faction] = [];
                factions[h.faction].push(h);
            });
            let selectedPair = null;
            for (const fac in factions) {
                if (factions[fac].length >= 2) {
                    selectedPair = [factions[fac][0].id, factions[fac][1].id];
                    break;
                }
            }
            if (selectedPair) {
                gameController.selectDraftHeroes(bot.id, selectedPair[0], selectedPair[1]);
            } else {
                gameController.selectDraftHeroes(bot.id, bot.draftHeroes[0]?.id, bot.draftHeroes[1]?.id || bot.draftHeroes[0]?.id);
            }
        });
    }, [gameState, gameController]);

    const handleDraftSelect = (heroId) => {
        const selectedHero = me.draftHeroes.find(h => h.id === heroId) || HEROES[heroId];
        setDraftSelection(prev => {
            if (prev.includes(heroId)) return prev.filter(id => id !== heroId);
            if (prev.length === 1) {
                const firstHeroId = prev[0];
                const firstHero = me.draftHeroes.find(h => h.id === firstHeroId) || HEROES[firstHeroId];
                if (firstHero && selectedHero && firstHero.faction !== selectedHero.faction) {
                    return prev; // Cấm click tướng khác phe
                }
            }
            if (prev.length < 2) return [...prev, heroId];
            return prev;
        });
    };
    
    const handleVipSelect = (heroId) => {
        const selectedHero = HEROES.find(h => h.id === heroId) || HEROES[heroId];
        setDraftSelection(prev => {
            if (prev.includes(heroId)) return prev.filter(id => id !== heroId);
            if (prev.length === 1) {
                const firstHeroId = prev[0];
                const firstHero = me.draftHeroes.find(h => h.id === firstHeroId) || HEROES[firstHeroId];
                if (firstHero && selectedHero && firstHero.faction !== selectedHero.faction) {
                    return prev;
                }
            }
            if (prev.length < 2) return [...prev, heroId];
            return prev;
        });
    };
    
    const handleDraftConfirm = () => {
        gameController.selectDraftHeroes(me.id, draftSelection[0], draftSelection[1] || draftSelection[0]);
    };

    return (
        <div className="draft-board" style={{ padding: '20px 40px', maxWidth: '100%', margin: '0 auto', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', overflowY: 'auto' }}>
            <h2 style={{ color: 'var(--color-gold)', fontSize: '2rem', marginBottom: '10px', textShadow: '0 0 10px rgba(212, 168, 67, 0.5)' }}>⏳ Chọn 2 Tướng Cùng Phe ({draftTimer}s)</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginBottom: '40px' }}>Chế độ Quốc Chiến: Chọn 2 tướng cùng màu để xác định phe của bạn.</p>
            
            <div className="draft-heroes-container" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '25px' }}>
            {!me.hasDrafted ? me.draftHeroes.map(hero => {
                const isSelected = draftSelection.includes(hero.id);
                const firstSelectedHero = draftSelection.length > 0 ? (me.draftHeroes.find(h => h.id === draftSelection[0]) || HEROES[draftSelection[0]]) : null;
                const isUnselectable = firstSelectedHero && !isSelected && hero.faction !== firstSelectedHero.faction;
                
                return (
                <div 
                key={hero.id} 
                className={`wiki-card ${isSelected ? 'selected' : ''}`}
                onClick={() => !isUnselectable && handleDraftSelect(hero.id)}
                style={{ 
                    cursor: isUnselectable ? 'not-allowed' : 'pointer', 
                    width: '260px',
                    height: '364px',
                    display: 'flex',
                    flexDirection: 'column',
                    border: isSelected ? '4px solid var(--color-gold)' : `3px solid ${hero.faction === 'Lạc' ? '#10b981' : hero.faction === 'Sơn' ? '#b45309' : hero.faction === 'Hà' ? '#3b82f6' : '#ef4444'}`,
                    backgroundColor: 'transparent',
                    boxShadow: isSelected ? '0 0 20px rgba(212, 168, 67, 0.6)' : 'var(--shadow-card)',
                    transform: isSelected ? 'translateY(-10px) scale(1.05)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    position: 'relative',
                    borderRadius: '12px',
                    opacity: isUnselectable ? 0.3 : 1,
                    filter: isUnselectable ? 'grayscale(1)' : 'none'
                }}
                >
                {draftSelection.includes(hero.id) && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '2rem', zIndex: 2, background: 'rgba(0,0,0,0.5)', borderRadius: '50%' }}>✅</div>
                )}
                {hero.image ? (
                    <img src={`/images/heroes/${hero.image}`} alt={hero.name} style={{ width: '100%', height: '100%', objectFit: 'fill', borderRadius: '8px' }} />
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-card)', padding: '20px' }}>
                        <div style={{ fontSize: '5rem' }}>{hero.emoji || '❓'}</div>
                        <h3>{hero.name}</h3>
                    </div>
                )}
                
                {/* Info Button with Tooltip */}
                <div className="hero-tooltip-container" style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 3 }}>
                    <div style={{ fontSize: '1.2rem', background: 'rgba(0,0,0,0.8)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-gold)' }}>ℹ️</div>
                    <div className="hero-tooltip-content">
                    <h4 style={{ margin: '0 0 5px 0', color: 'var(--color-gold)' }}>{hero.name} ({hero.faction})</h4>
                    <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>{hero.maxHp} HP | {hero.gender}</div>
                    {hero.skills && hero.skills.map((skill, idx) => (
                        <div key={idx} style={{ marginBottom: '6px', fontSize: '0.8rem', lineHeight: '1.3' }}>
                        <strong style={{ color: 'var(--color-gold-light)' }}>{skill.name}:</strong> {skill.desc}
                        </div>
                    ))}
                    </div>
                </div>
                </div>
            )}) : (
                <div style={{ gridColumn: '1 / -1', padding: '50px', color: 'var(--color-text-muted)' }}>
                Đang chờ các người chơi khác chọn tướng...
                </div>
            )}
            
            {/* Hiển thị tướng VIP đã chọn (nếu có và không nằm trong draftHeroes gốc) */}
            {!me.hasDrafted && draftSelection.map(id => {
                if (me.draftHeroes.some(h => h.id === id)) return null;
                const vipHero = HEROES.find(h => h.id === id);
                if (!vipHero) return null;
                return (
                    <div 
                        key={id}
                        className="wiki-card selected"
                        style={{ 
                        cursor: 'pointer', 
                        width: '260px',
                        height: '364px',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '4px solid var(--color-gold)',
                        backgroundColor: 'transparent',
                        boxShadow: '0 0 20px rgba(212, 168, 67, 0.6)',
                        transform: 'translateY(-10px) scale(1.05)',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        position: 'relative',
                        borderRadius: '12px'
                        }}
                        onClick={() => handleDraftSelect(id)}
                    >
                        <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '2rem', zIndex: 2, background: 'rgba(0,0,0,0.5)', borderRadius: '50%' }}>✅</div>
                        {vipHero.image ? (
                        <img src={`/images/heroes/${vipHero.image}`} alt={vipHero.name} style={{ width: '100%', height: '100%', objectFit: 'fill', borderRadius: '8px' }} />
                        ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-card)', padding: '20px' }}>
                            <div style={{ fontSize: '5rem' }}>{vipHero.emoji || '❓'}</div>
                            <h3>{vipHero.name}</h3>
                        </div>
                        )}
                    </div>
                );
            })}
            </div>
            
            {/* Nút bật VIP Selector */}
            {me.isVip && draftSelection.length < 2 && !me.hasDrafted && (
                <div style={{ marginTop: '20px' }}>
                <button 
                    className="btn-action"
                    style={{ background: 'linear-gradient(to right, #fbbf24, #d97706)', color: 'white', padding: '10px 20px', fontSize: '1.1rem', borderRadius: '8px', border: '2px solid #fef3c7' }}
                    onClick={() => setShowVipModal(true)}
                >
                    ⭐ Tự Chọn Tướng Bất Kỳ (Test Mode)
                </button>
                </div>
            )}

            {!me.hasDrafted && (
            <button 
                className="btn-action primary" 
                onClick={handleDraftConfirm}
                disabled={draftSelection.length !== 2}
                style={{ marginTop: '30px', padding: '10px 30px', fontSize: '1.2rem', flex: 'none' }}
            >
                Chốt Danh Sách
            </button>
            )}

            {/* Modal chọn tướng VIP */}
            {showVipModal && (
                <VipHeroSelectorModal 
                draftSelection={draftSelection}
                me={me}
                onSelect={handleVipSelect}
                onClose={() => setShowVipModal(false)}
                />
            )}
        </div>
    );
}
