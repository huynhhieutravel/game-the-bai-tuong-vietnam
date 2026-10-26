import React, { useState } from 'react';
import { HEROES } from 'shared/data/gameData';
import { SkillDescriptions } from 'shared/data/SkillDescriptions';

// Cấu hình màu sắc & biểu tượng đặc trưng 4 Phe
const FACTION_CONFIG = {
  'Lạc': {
    name: 'Lạc',
    icon: '🟢',
    badgeBg: 'rgba(6, 95, 70, 0.9)',
    badgeBorder: '#10b981',
    badgeColor: '#34d399',
    glowColor: 'rgba(16, 185, 129, 0.4)'
  },
  'Việt': {
    name: 'Việt',
    icon: '🔴',
    badgeBg: 'rgba(127, 29, 29, 0.9)',
    badgeBorder: '#ef4444',
    badgeColor: '#f87171',
    glowColor: 'rgba(239, 68, 68, 0.4)'
  },
  'Hà': {
    name: 'Hà',
    icon: '🔵',
    badgeBg: 'rgba(22, 78, 99, 0.9)',
    badgeBorder: '#06b6d4',
    badgeColor: '#38bdf8',
    glowColor: 'rgba(6, 182, 212, 0.4)'
  },
  'Sơn': {
    name: 'Sơn',
    icon: '🟤',
    badgeBg: 'rgba(120, 53, 15, 0.9)',
    badgeBorder: '#f59e0b',
    badgeColor: '#fbbf24',
    glowColor: 'rgba(245, 158, 11, 0.4)'
  }
};

export function VipHeroSelectorModal({ draftSelection = [], me, onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState('All'); // 'All', 'Lạc', 'Việt', 'Hà', 'Sơn'
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectedHero, setInspectedHero] = useState(null); // Tướng được click để xem thông tin chi tiết

  let availableHeroes = [...HEROES];

  // Lọc theo Tab Phe
  if (activeTab !== 'All') {
    availableHeroes = availableHeroes.filter(h => h.faction === activeTab);
  }

  // Lọc theo Từ khóa tìm kiếm (tên tướng hoặc tên kỹ năng)
  if (searchTerm.trim() !== '') {
    const term = searchTerm.toLowerCase();
    availableHeroes = availableHeroes.filter(h => 
      h.name.toLowerCase().includes(term) ||
      (h.skills && h.skills.some(s => s.name?.toLowerCase().includes(term)))
    );
  }

  // Sắp xếp thứ tự theo Phe để hiển thị liền mạch
  availableHeroes.sort((a, b) => a.faction.localeCompare(b.faction));

  // Kiểm tra tướng đã được chọn trong draftSelection chưa
  const isSelected = (heroId) => draftSelection.includes(heroId);

  // Lấy tướng đầu tiên đã chọn để kiểm tra tính hợp lệ phe
  const firstSelectedHero = draftSelection.length > 0
    ? (HEROES.find(h => h.id === draftSelection[0]) || me?.draftHeroes?.find(h => h.id === draftSelection[0]))
    : null;

  // Helper lấy mô tả kỹ năng chuẩn
  const getSkillDesc = (skill) => {
    if (!skill) return '';
    return SkillDescriptions[skill.name] || SkillDescriptions[skill.id] || skill.desc || 'Chưa có thông tin mô tả chi tiết.';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(2, 6, 23, 0.92)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px'
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #0b132b 0%, #172554 40%, #0a0f1d 100%)',
        padding: '12px 16px',
        borderRadius: '16px',
        border: '2px solid #fbbf24',
        boxShadow: '0 0 35px rgba(245, 158, 11, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.95)',
        width: '98%',
        maxWidth: '1000px',
        height: '94vh',
        maxHeight: '430px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        color: '#f8fafc',
        boxSizing: 'border-box'
      }}>
        {/* HEADER VIP COMPACT */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          paddingBottom: '6px',
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>👑</span>
            <span style={{
              fontSize: '1.15rem',
              fontWeight: '900',
              letterSpacing: '0.5px',
              background: 'linear-gradient(90deg, #f59e0b, #fef08a, #f59e0b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textTransform: 'uppercase'
            }}>
              VIP: ĐẶC QUYỀN CHỌN TƯỚNG
            </span>
            <span style={{
              fontSize: '0.78rem',
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid #fbbf24',
              color: '#fef08a',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 'bold'
            }}>
              {draftSelection.length}/2
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Bấm [Chọn ✓] hoặc chạm thẻ để tuyển nhanh • Bấm [Soi 🔍] để xem kỹ năng
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              transition: 'all 0.15s ease'
            }}
            title="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        {/* BỘ LỌC TABS & Ô TÌM KIẾM */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '8px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '4px 8px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0
        }}>
          {/* Tabs Phe */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
            {[
              { id: 'All', label: '⭐ Tất Cả' },
              { id: 'Lạc', label: '🟢 Lạc' },
              { id: 'Việt', label: '🔴 Việt' },
              { id: 'Hà', label: '🔵 Hà' },
              { id: 'Sơn', label: '🟤 Sơn' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: isActive ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: isActive ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : '#1e293b',
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    fontWeight: isActive ? 'bold' : '500',
                    fontSize: '0.78rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Ô Tìm Kiếm */}
          <div style={{ position: 'relative', width: '220px', flexShrink: 0 }}>
            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Tìm danh tướng, kỹ năng..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px 4px 26px',
                borderRadius: '6px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                background: '#090d16',
                color: '#ffffff',
                fontSize: '0.78rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* DANH SÁCH 3 CỘT — CỐ ĐỊNH MIN-HEIGHT ĐẢM BẢO KHÔNG SỤP LAYOUT */}
        <div style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          padding: '4px 2px'
        }}>
          {availableHeroes.length > 0 ? (
            availableHeroes.map(hero => {
              const selected = isSelected(hero.id);
              const isUnselectable = firstSelectedHero && !selected && hero.faction !== firstSelectedHero.faction;
              const isFull = !selected && draftSelection.length >= 2;
              const factionCfg = FACTION_CONFIG[hero.faction] || FACTION_CONFIG['Lạc'];

              return (
                <div
                  key={hero.id}
                  onClick={() => {
                    if (!isUnselectable && (!isFull || selected)) {
                      onSelect(hero.id);
                    }
                  }}
                  title={
                    selected
                      ? `${hero.name} (Đã chọn) - Bấm để hủy chọn`
                      : isUnselectable
                      ? `${hero.name} (Khác phe với ${firstSelectedHero.name})`
                      : isFull
                      ? `${hero.name} (Đã đủ 2 tướng)`
                      : `${hero.name} - Bấm thẻ để tuyển mộ nhanh`
                  }
                  style={{
                    minHeight: '230px',
                    height: '230px',
                    position: 'relative',
                    cursor: isUnselectable ? 'not-allowed' : (isFull && !selected ? 'not-allowed' : 'pointer'),
                    opacity: isUnselectable ? 0.38 : (isFull && !selected ? 0.6 : 1),
                    filter: isUnselectable ? 'grayscale(0.65)' : 'none',
                    background: 'linear-gradient(180deg, #162038 0%, #0c1222 100%)',
                    border: selected ? '2.5px solid #10b981' : `1.5px solid ${factionCfg.badgeBorder}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: selected
                      ? '0 0 16px rgba(16, 185, 129, 0.65)'
                      : '0 4px 12px rgba(0, 0, 0, 0.5)',
                    transition: 'all 0.18s ease',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={e => {
                    if (!isUnselectable) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = selected ? '#10b981' : '#fbbf24';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = selected ? '#10b981' : factionCfg.badgeBorder;
                  }}
                >
                  {/* Badge Phe & Máu */}
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: factionCfg.badgeBg,
                    border: `1px solid ${factionCfg.badgeBorder}`,
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '5px',
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.6)'
                  }}>
                    <span>{factionCfg.icon}</span>
                    <span>{hero.faction}</span>
                  </div>

                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(239, 68, 68, 0.6)',
                    color: '#f87171',
                    padding: '2px 6px',
                    borderRadius: '5px',
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    zIndex: 2,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.6)'
                  }}>
                    ❤️ {hero.maxHp}
                  </div>

                  {/* Ảnh Thẻ Tướng */}
                  <div style={{
                    flex: '1 1 auto',
                    minHeight: '160px',
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#070b16'
                  }}>
                    {hero.image ? (
                      <img
                        src={`/images/heroes/${hero.image}`}
                        alt={hero.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'top center',
                          display: 'block'
                        }}
                      />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <span style={{ fontSize: '2.5rem' }}>⚔️</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '6px' }}>{hero.name}</span>
                      </div>
                    )}

                    {/* Gradient chân ảnh */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '35px',
                      background: 'linear-gradient(to top, #090d16 10%, transparent 100%)'
                    }} />

                    {/* Dấu Tích Đã Chọn */}
                    {selected && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3
                      }}>
                        <span style={{
                          background: '#10b981',
                          color: '#ffffff',
                          padding: '5px 14px',
                          borderRadius: '20px',
                          fontWeight: '900',
                          fontSize: '0.82rem',
                          boxShadow: '0 0 14px rgba(16, 185, 129, 0.9)',
                          border: '1.5px solid #ffffff'
                        }}>
                          ✓ ĐÃ CHỌN
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Chân Thẻ: Tên Tướng & Cụm Nút Soi / Chọn Nhanh */}
                  <div style={{
                    height: '54px',
                    flexShrink: 0,
                    padding: '4px 8px',
                    background: '#090d16',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
                      <div style={{
                        fontWeight: '800',
                        fontSize: '0.88rem',
                        color: selected ? '#34d399' : '#f8fafc',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {hero.name}
                      </div>
                      <div style={{
                        fontSize: '0.68rem',
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {hero.skills?.map(s => s.name).join(' • ') || 'Kỹ năng đặc biệt'}
                      </div>
                    </div>

                    {/* Cụm Nút Tác Vụ: Soi Chi Tiết & Chọn Nhanh */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedHero(hero);
                        }}
                        title="Xem chi tiết kỹ năng"
                        style={{
                          fontSize: '0.72rem',
                          padding: '4px 7px',
                          borderRadius: '5px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.45)',
                          color: '#fbbf24',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)'}
                      >
                        Soi 🔍
                      </button>

                      <button
                        type="button"
                        disabled={isUnselectable || (isFull && !selected)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isUnselectable && (!isFull || selected)) {
                            onSelect(hero.id);
                          }
                        }}
                        title={
                          selected
                            ? 'Bỏ chọn tướng này'
                            : isUnselectable
                            ? `Phải chọn cùng phe với ${firstSelectedHero.name}`
                            : isFull
                            ? 'Đã chọn đủ 2 tướng'
                            : 'Chọn nhanh tướng này'
                        }
                        style={{
                          fontSize: '0.72rem',
                          padding: '4px 8px',
                          borderRadius: '5px',
                          fontWeight: '800',
                          cursor: isUnselectable || (isFull && !selected) ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                          ...(selected
                            ? {
                                background: 'rgba(239, 68, 68, 0.25)',
                                border: '1px solid #ef4444',
                                color: '#fca5a5'
                              }
                            : isUnselectable
                            ? {
                                background: 'rgba(100, 116, 139, 0.15)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                color: '#64748b'
                              }
                            : isFull
                            ? {
                                background: 'rgba(100, 116, 139, 0.15)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                color: '#64748b'
                              }
                            : {
                                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                border: '1px solid #34d399',
                                color: '#ffffff',
                                boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
                              })
                        }}
                      >
                        {selected ? 'Bỏ ✕' : isUnselectable ? 'Khác phe' : isFull ? 'Đủ 2' : 'Chọn ✓'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', color: '#94a3b8', padding: '30px 0' }}>
              Không tìm thấy danh tướng nào phù hợp với bộ lọc hiện tại.
            </div>
          )}
        </div>

        {/* FOOTER ĐÓNG MODAL */}
        <div style={{
          textAlign: 'center',
          marginTop: '8px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0
        }}>
          <button
            className="btn-action secondary"
            onClick={onClose}
            style={{
              padding: '6px 20px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.85rem'
            }}
          >
            Đóng Lại
          </button>
        </div>

        {/* MODAL / PANEL XEM CHI TIẾT DANH TƯỚNG (HERO INSPECTION DOSSIER) */}
        {inspectedHero && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px'
          }}>
            <div style={{
              background: 'linear-gradient(145deg, #162038 0%, #0a0f1d 100%)',
              border: '2px solid #fbbf24',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '94%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 0 35px rgba(245, 158, 11, 0.4)',
              overflow: 'hidden'
            }}>
              {/* Header Hồ Sơ */}
              <div style={{
                padding: '10px 16px',
                background: 'rgba(15, 23, 42, 0.9)',
                borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>👑</span>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fbbf24' }}>
                      {inspectedHero.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>Phe: <strong style={{ color: FACTION_CONFIG[inspectedHero.faction]?.badgeColor || '#fff' }}>{inspectedHero.faction}</strong></span>
                      <span>•</span>
                      <span>Máu: <strong style={{ color: '#ef4444' }}>{inspectedHero.maxHp} HP</strong></span>
                      <span>•</span>
                      <span>Giới tính: {inspectedHero.gender || 'Nam'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setInspectedHero(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: '#cbd5e1',
                    fontSize: '1.1rem',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Nội Dung Chi Tiết Kỹ Năng & Minh Họa */}
              <div style={{ display: 'flex', padding: '14px', gap: '14px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                {/* Ảnh Danh Tướng Lớn */}
                <div style={{
                  width: '150px',
                  flexShrink: 0,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '2px solid rgba(245, 158, 11, 0.5)',
                  background: '#070b16',
                  height: '200px'
                }}>
                  {inspectedHero.image ? (
                    <img
                      src={`/images/heroes/${inspectedHero.image}`}
                      alt={inspectedHero.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontSize: '3rem' }}>⚔️</span>
                      <span style={{ color: '#fff', marginTop: '10px' }}>{inspectedHero.name}</span>
                    </div>
                  )}
                </div>

                {/* Danh Sách Kỹ Năng Đầy Đủ */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📜 BẢNG KỸ NĂNG CHI TIẾT:
                  </div>

                  {inspectedHero.skills && inspectedHero.skills.length > 0 ? (
                    inspectedHero.skills.map((skill, idx) => (
                      <div
                        key={skill.id || idx}
                        style={{
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: '8px',
                          padding: '8px 10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.92rem' }}>
                            ⚡ {skill.name}
                          </span>
                        </div>
                        <div style={{ color: '#e2e8f0', fontSize: '0.82rem', lineHeight: '1.4' }}>
                          {getSkillDesc(skill)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.82rem' }}>
                      Danh tướng này không có kỹ năng bổ trợ đặc biệt.
                    </div>
                  )}

                  {inspectedHero.bio && (
                    <div style={{
                      marginTop: 'auto',
                      padding: '6px 8px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: '6px',
                      borderLeft: '3px solid #fbbf24',
                      fontSize: '0.75rem',
                      fontStyle: 'italic',
                      color: '#94a3b8'
                    }}>
                      "{inspectedHero.bio}"
                    </div>
                  )}
                </div>
              </div>

              {/* Nút Hành Động Chọn Tướng */}
              <div style={{
                padding: '10px 16px',
                background: 'rgba(15, 23, 42, 0.9)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                gap: '10px',
                flexShrink: 0
              }}>
                <button
                  className="btn-action secondary"
                  style={{ flex: '1', padding: '8px', fontSize: '0.85rem', borderRadius: '8px' }}
                  onClick={() => setInspectedHero(null)}
                >
                  ✕ Xem Tướng Khác
                </button>
                {(() => {
                  const isInspectedSelected = isSelected(inspectedHero.id);
                  const isInspectedUnselectable = firstSelectedHero && !isInspectedSelected && inspectedHero.faction !== firstSelectedHero.faction;
                  const isInspectedFull = !isInspectedSelected && draftSelection.length >= 2;

                  return (
                    <button
                      className={`btn-action ${isInspectedSelected ? 'danger' : 'success'}`}
                      disabled={isInspectedUnselectable || isInspectedFull}
                      style={{
                        flex: '2',
                        padding: '8px',
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        boxShadow: isInspectedSelected ? 'none' : '0 0 15px rgba(16, 185, 129, 0.4)',
                        opacity: (isInspectedUnselectable || isInspectedFull) ? 0.5 : 1,
                        cursor: (isInspectedUnselectable || isInspectedFull) ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => {
                        if (!isInspectedUnselectable && (!isInspectedFull || isInspectedSelected)) {
                          onSelect(inspectedHero.id);
                          setInspectedHero(null);
                        }
                      }}
                    >
                      {isInspectedSelected
                        ? '🚫 Bỏ Chọn Tướng Này'
                        : isInspectedUnselectable
                        ? `⚠️ Cần Cùng Phe (${firstSelectedHero.faction})`
                        : isInspectedFull
                        ? '⚠️ Đã Chọn Đủ 2 Tướng'
                        : '👑 Tuyển Mộ Tướng Này'}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

