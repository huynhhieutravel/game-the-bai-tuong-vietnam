// @ts-check
import React, { useState, useEffect } from 'react';
import { VipHeroSelectorModal } from '../modals/VipHeroSelectorModal';
import { HEROES } from 'shared/data/gameData';
import { normalizeSkillType } from 'shared/utils/translationHelper';
import { ChatWidget } from './ChatWidget';

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
    const [inspectedHero, setInspectedHero] = useState(null);

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
        <div className="draft-board">
            <h2 className="draft-title">⏳ Chọn 2 Tướng Cùng Phe ({draftTimer}s)</h2>
            <p className="draft-subtitle">Chế độ Quốc Chiến: Chạm thẻ để chọn hoặc bấm nút Soi để xem kỹ năng</p>
            
            <div className="draft-heroes-container">
            {!me.hasDrafted ? me.draftHeroes.map(hero => {
                const isSelected = draftSelection.includes(hero.id);
                const firstSelectedHero = draftSelection.length > 0 ? (me.draftHeroes.find(h => h.id === draftSelection[0]) || HEROES[draftSelection[0]]) : null;
                const isUnselectable = firstSelectedHero && !isSelected && hero.faction !== firstSelectedHero.faction;
                const factionColor = hero.faction === 'Lạc' ? '#10b981' : hero.faction === 'Sơn' ? '#b45309' : hero.faction === 'Hà' ? '#3b82f6' : '#ef4444';
                
                return (
                <div 
                    key={hero.id} 
                    className={`draft-hero-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => !isUnselectable && handleDraftSelect(hero.id)}
                    style={{ 
                        cursor: isUnselectable ? 'not-allowed' : 'pointer', 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: isUnselectable ? 0.35 : 1,
                        filter: isUnselectable ? 'grayscale(1)' : 'none',
                        transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        transform: isSelected ? 'translateY(-6px) scale(1.03)' : 'none',
                        position: 'relative'
                    }}
                >
                    {/* 1. HÀNG TRÊN NGOÀI KHUNG: Huy hiệu Phe & Nút Soi */}
                    <div 
                        className="draft-hero-card-header"
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            width: '100%',
                            padding: '0 2px'
                        }}
                    >
                        {/* Huy hiệu phe ngoài khung */}
                        <span 
                            style={{ 
                                background: factionColor, 
                                color: '#ffffff', 
                                padding: '2px 8px', 
                                borderRadius: '5px', 
                                fontSize: '0.74rem', 
                                fontWeight: 800,
                                letterSpacing: '0.5px',
                                boxShadow: `0 2px 6px ${factionColor}66`,
                                textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                            }}
                        >
                            {hero.faction}
                        </span>

                        {/* Nút soi ngoài khung */}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setInspectedHero(hero);
                            }}
                            style={{ 
                                background: 'rgba(15, 23, 42, 0.9)', 
                                border: '1.5px solid var(--color-gold)', 
                                color: 'var(--color-gold-light)', 
                                borderRadius: '10px', 
                                padding: '2px 8px', 
                                fontSize: '0.70rem', 
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(4px)'
                            }}
                            title="Xem chi tiết kỹ năng"
                        >
                            🔍 Soi
                        </button>
                    </div>

                    {/* 2. KHUNG MÀU CHỨA FULL ẢNH TƯỚNG (Không che lấp, hiển thị trọn vẹn toàn bộ thẻ) */}
                    <div 
                        className={`draft-hero-card-frame ${isSelected ? 'selected' : ''}`}
                        style={{
                            border: isSelected ? '3.5px solid var(--color-gold)' : `2.5px solid ${factionColor}`,
                            borderRadius: '10px',
                            overflow: 'hidden',
                            backgroundColor: '#0a0f1d',
                            boxShadow: isSelected ? '0 0 22px rgba(212, 168, 67, 0.85)' : '0 6px 18px rgba(0,0,0,0.6)',
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '1086 / 1448',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {/* Biểu tượng đã chọn ở góc */}
                        {isSelected && (
                            <div style={{ 
                                position: 'absolute', 
                                top: '6px', 
                                right: '6px', 
                                fontSize: '0.85rem', 
                                zIndex: 10, 
                                background: '#10b981', 
                                color: 'white',
                                borderRadius: '50%', 
                                width: '22px',
                                height: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '900',
                                boxShadow: '0 0 10px rgba(16, 185, 129, 0.9)',
                                border: '1.5px solid #ffffff'
                            }}>
                                ✓
                            </div>
                        )}

                        {hero.image ? (
                            <img 
                                src={`/images/heroes/${hero.image}`} 
                                alt={hero.name} 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    display: 'block' 
                                }} 
                            />
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-card)', padding: '10px' }}>
                                <div style={{ fontSize: '3rem' }}>{hero.emoji || '❓'}</div>
                                <h3>{hero.name}</h3>
                            </div>
                        )}
                    </div>

                    {/* 3. TÊN TƯỚNG NGOÀI KHUNG (Nằm trực tiếp phía dưới khung thẻ) */}
                    <div 
                        className="draft-hero-name-badge"
                        style={{ 
                            background: 'rgba(15, 23, 42, 0.92)',
                            border: `1.5px solid ${isSelected ? 'var(--color-gold)' : 'rgba(212, 168, 67, 0.45)'}`,
                            borderRadius: '12px',
                            padding: '3px 10px',
                            textAlign: 'center',
                            maxWidth: '100%',
                            boxShadow: '0 3px 8px rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(4px)',
                            width: 'max-content'
                        }}
                    >
                        <span style={{ 
                            color: isSelected ? 'var(--color-gold-light)' : '#f8fafc', 
                            fontSize: (hero.name || '').length > 12 ? '0.72rem' : '0.80rem', 
                            fontWeight: 'bold', 
                            display: 'block',
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            textShadow: '0 1px 3px rgba(0,0,0,0.9)'
                        }}>
                            {hero.name || `Tướng ${hero.id}`}
                        </span>
                    </div>
                </div>
                );
            }) : (
                <div style={{ gridColumn: '1 / -1', padding: '50px', color: 'var(--color-text-muted)' }}>
                Đang chờ các người chơi khác chọn tướng...
                </div>
            )}
            
            {/* Hiển thị tướng VIP đã chọn (nếu có và không nằm trong draftHeroes gốc) */}
            {!me.hasDrafted && draftSelection.map(id => {
                if (me.draftHeroes.some(h => h.id === id)) return null;
                const vipHero = HEROES.find(h => h.id === id);
                if (!vipHero) return null;
                const factionColor = vipHero.faction === 'Lạc' ? '#10b981' : vipHero.faction === 'Sơn' ? '#b45309' : vipHero.faction === 'Hà' ? '#3b82f6' : '#ef4444';
                return (
                    <div 
                        key={id}
                        className="draft-hero-card selected"
                        style={{ 
                            cursor: 'pointer', 
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            transform: 'translateY(-6px) scale(1.03)',
                            position: 'relative'
                        }}
                        onClick={() => handleDraftSelect(id)}
                    >
                        {/* Hàng trên ngoài khung */}
                        <div 
                            className="draft-hero-card-header"
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                width: '100%',
                                padding: '0 2px'
                            }}
                        >
                            <span 
                                style={{ 
                                    background: factionColor, 
                                    color: '#ffffff', 
                                    padding: '2px 8px', 
                                    borderRadius: '5px', 
                                    fontSize: '0.74rem', 
                                    fontWeight: 800,
                                    letterSpacing: '0.5px'
                                }}
                            >
                                {vipHero.faction}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-gold)', fontWeight: 'bold' }}>VIP ⭐</span>
                        </div>

                        {/* Khung màu full ảnh */}
                        <div 
                            className="draft-hero-card-frame selected"
                            style={{
                                border: '3.5px solid var(--color-gold)',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                backgroundColor: '#0a0f1d',
                                boxShadow: '0 0 22px rgba(212, 168, 67, 0.85)',
                                position: 'relative',
                                width: '100%',
                                aspectRatio: '1086 / 1448',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <div style={{ 
                                position: 'absolute', 
                                top: '6px', 
                                right: '6px', 
                                fontSize: '0.85rem', 
                                zIndex: 10, 
                                background: '#10b981', 
                                color: 'white',
                                borderRadius: '50%', 
                                width: '22px',
                                height: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '900',
                                border: '1.5px solid #ffffff'
                            }}>
                                ✓
                            </div>
                            {vipHero.image ? (
                                <img src={`/images/heroes/${vipHero.image}`} alt={vipHero.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-card)', padding: '20px' }}>
                                    <div style={{ fontSize: '5rem' }}>{vipHero.emoji || '❓'}</div>
                                    <h3>{vipHero.name}</h3>
                                </div>
                            )}
                        </div>

                        {/* Tên tướng ngoài khung */}
                        <div 
                            className="draft-hero-name-badge"
                            style={{ 
                                background: 'rgba(15, 23, 42, 0.92)',
                                border: '1.5px solid var(--color-gold)',
                                borderRadius: '12px',
                                padding: '3px 10px',
                                textAlign: 'center',
                                maxWidth: '100%',
                                boxShadow: '0 3px 8px rgba(0,0,0,0.7)',
                                width: 'max-content'
                            }}
                        >
                            <span style={{ 
                                color: 'var(--color-gold-light)', 
                                fontSize: '0.80rem', 
                                fontWeight: 'bold', 
                                display: 'block',
                                whiteSpace: 'nowrap'
                            }}>
                                {vipHero.name}
                            </span>
                        </div>
                    </div>
                );
            })}
            </div>
            
            {/* THANH NÚT ĐÁY DÀN ĐỀU CÂN XỨNG */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginTop: '12px' }}>
                {me.isVip && draftSelection.length < 2 && !me.hasDrafted && (
                    <button 
                        className="btn-action"
                        style={{ 
                            background: 'linear-gradient(to right, #fbbf24, #d97706)', 
                            color: 'white', 
                            padding: '8px 18px', 
                            fontSize: '0.95rem', 
                            borderRadius: '10px', 
                            border: '1px solid #fef3c7',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)'
                        }}
                        onClick={() => setShowVipModal(true)}
                    >
                        ⭐ Tự Chọn Tướng (Test Mode)
                    </button>
                )}

                {!me.hasDrafted && (
                    <button 
                        className="btn-action primary draft-confirm-btn" 
                        onClick={handleDraftConfirm}
                        disabled={draftSelection.length !== 2}
                        style={{ 
                            margin: 0,
                            padding: '8px 24px', 
                            fontSize: '0.95rem', 
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            background: draftSelection.length === 2 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
                            border: draftSelection.length === 2 ? '1px solid #6ee7b7' : undefined,
                            boxShadow: draftSelection.length === 2 ? '0 0 15px rgba(16, 185, 129, 0.5)' : undefined,
                            cursor: draftSelection.length === 2 ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {draftSelection.length === 2 ? '⚔️ Chốt 2 Tướng Đã Chọn' : `Chốt Danh Sách (${draftSelection.length}/2)`}
                    </button>
                )}
            </div>

            {/* HERO INSPECTOR MODAL — SOI CHI TIẾT TƯỚNG FULL SIZE CHỮ TO RÕ */}
            {inspectedHero && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 99999,
                        background: 'rgba(2, 6, 23, 0.88)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                    onClick={() => setInspectedHero(null)}
                >
                    <div 
                        style={{
                            background: 'rgba(15, 23, 42, 0.98)',
                            border: `2px solid ${inspectedHero.faction === 'Lạc' ? '#10b981' : inspectedHero.faction === 'Sơn' ? '#b45309' : inspectedHero.faction === 'Hà' ? '#3b82f6' : '#ef4444'}`,
                            borderRadius: '16px',
                            maxWidth: '740px',
                            width: '94vw',
                            maxHeight: '94vh',
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '16px',
                            padding: '12px 16px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
                            position: 'relative'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ẢNH TƯỚNG LỚN */}
                        <div style={{ flex: '0 0 32%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            {inspectedHero.image ? (
                                <img 
                                    src={`/images/heroes/${inspectedHero.image}`} 
                                    alt={inspectedHero.name} 
                                    style={{ width: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)' }} 
                                />
                            ) : (
                                <div style={{ fontSize: '4rem', padding: '20px' }}>{inspectedHero.emoji || '❓'}</div>
                            )}
                            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                                <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', background: inspectedHero.faction === 'Lạc' ? '#10b981' : inspectedHero.faction === 'Sơn' ? '#b45309' : inspectedHero.faction === 'Hà' ? '#3b82f6' : '#ef4444', color: 'white' }}>
                                    Phe {inspectedHero.faction}
                                </span>
                                <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.25)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' }}>
                                    ❤️ {inspectedHero.maxHp} HP
                                </span>
                            </div>
                        </div>

                        {/* CHI TIẾT KỸ NĂNG VĂN BẢN LỚN */}
                        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '12px' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--color-gold)', fontFamily: 'var(--font-display, serif)' }}>
                                        {inspectedHero.name}
                                    </h2>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                        Giới tính: {inspectedHero.gender || 'Nam'}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setInspectedHero(null)}
                                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', fontSize: '1.2rem', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                {inspectedHero.skills && inspectedHero.skills.filter((s, idx, arr) => arr.findIndex(o => (o.id && o.id === s.id) || (o.name && o.name === s.name)) === idx).map((skill, idx) => (
                                    <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(212, 168, 67, 0.3)', borderRadius: '10px', padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '1.05rem' }}>
                                                {skill.name}
                                            </span>
                                            {skill.type && (() => {
                                                const norm = normalizeSkillType(skill.type);
                                                return (
                                                    <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: norm.badgeColor, color: '#ffffff', borderRadius: '4px', fontWeight: 'bold' }}>
                                                        {norm.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.45' }}>
                                            {skill.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* NÚT CHỌN NHANH TRONG MODAL */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <button 
                                    className="btn-action primary"
                                    style={{ flex: 1, padding: '10px', fontSize: '0.95rem', borderRadius: '10px', fontWeight: 'bold' }}
                                    onClick={() => {
                                        handleDraftSelect(inspectedHero.id);
                                        setInspectedHero(null);
                                    }}
                                >
                                    {draftSelection.includes(inspectedHero.id) ? 'Bỏ Chọn Tướng Này' : '✅ Chọn Tướng Này'}
                                </button>
                                <button 
                                    className="btn-action secondary"
                                    style={{ padding: '10px 18px', fontSize: '0.95rem', borderRadius: '10px' }}
                                    onClick={() => setInspectedHero(null)}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
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

            <ChatWidget style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 100 }} />
        </div>
    );
}
