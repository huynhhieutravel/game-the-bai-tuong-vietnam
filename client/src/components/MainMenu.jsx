import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css'; // Assume index.css has some utility classes

export default function MainMenu() {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(4);

  return (
    <div 
      className="main-menu-container" 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'row', 
        justifyContent: 'space-evenly', 
        alignItems: 'center', 
        background: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)',
        padding: 'env(safe-area-inset-top, 16px) env(safe-area-inset-right, 24px) env(safe-area-inset-bottom, 16px) env(safe-area-inset-left, 24px)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* CỘT TRÁI: LOGO & THƯƠNG HIỆU VIỆT SÁT */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', maxWidth: '42%' }}>
        <img 
          src="/icon-512.png" 
          alt="Việt Sát Emblem" 
          style={{ 
            width: 'clamp(72px, 16vh, 120px)', 
            height: 'clamp(72px, 16vh, 120px)', 
            borderRadius: '20px', 
            border: '2px solid rgba(212, 168, 67, 0.7)', 
            boxShadow: '0 0 25px rgba(212, 168, 67, 0.45)',
            marginBottom: '10px',
            objectFit: 'cover'
          }} 
        />
        <h1 style={{ 
          fontSize: 'clamp(2rem, 5.5vh, 3.2rem)', 
          background: 'linear-gradient(135deg, #fef08a 0%, #d4a843 50%, #92400e 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0, 
          fontFamily: 'var(--font-display, serif)',
          fontWeight: 900,
          letterSpacing: '3px',
          textShadow: '0 2px 10px rgba(0,0,0,0.8)'
        }}>
          VIỆT SÁT
        </h1>
        <p style={{ 
          fontSize: 'clamp(0.75rem, 2vh, 0.95rem)', 
          color: '#cbd5e1', 
          margin: '4px 0 12px 0', 
          letterSpacing: '2px',
          textTransform: 'uppercase',
          fontWeight: 600
        }}>
          Thẻ Bài Chiến Thuật Quốc Chiến
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '12px', color: '#93c5fd' }}>
            ⚔️ 4 Đại Phe Phái
          </span>
          <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', color: '#6ee7b7' }}>
            🛡️ Cặp Tướng Song Đấu
          </span>
        </div>
      </div>

      {/* CỘT PHẢI: BẢNG ĐIỀU KHIỂN & NÚT VÀO TRẬN */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '10px', 
        width: 'clamp(270px, 42vw, 360px)',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        padding: '16px 20px',
        borderRadius: '18px',
        border: '1px solid rgba(212, 168, 67, 0.35)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
      }}>
        {/* CHỌN SỐ NGƯỜI CHƠI */}
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.7)', 
          padding: '8px 12px', 
          borderRadius: '12px', 
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
            👥 SỐ NGƯỜI CHƠI:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className="btn-action secondary" 
              style={{ width: '32px', height: '32px', padding: 0, fontSize: '1.1rem', borderRadius: '8px' }} 
              onClick={() => setPlayerCount(Math.max(3, playerCount - 1))}
            >
              -
            </button>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-gold)', minWidth: '20px', textAlign: 'center' }}>
              {playerCount}
            </span>
            <button 
              className="btn-action secondary" 
              style={{ width: '32px', height: '32px', padding: 0, fontSize: '1.1rem', borderRadius: '8px' }} 
              onClick={() => setPlayerCount(Math.min(8, playerCount + 1))}
            >
              +
            </button>
          </div>
        </div>

        {/* NÚT CHÍNH: ĐẤU MÁY OFFLINE */}
        <button 
          className="btn-action primary" 
          style={{ 
            fontSize: 'clamp(1rem, 2.5vh, 1.25rem)', 
            padding: '12px 16px', 
            borderRadius: '12px', 
            textTransform: 'uppercase', 
            fontWeight: 'bold', 
            letterSpacing: '1px',
            background: 'linear-gradient(135deg, #d4a843 0%, #b45309 100%)',
            border: '1px solid #fef08a',
            boxShadow: '0 4px 15px rgba(212, 168, 67, 0.4)',
            cursor: 'pointer'
          }}
          onClick={() => navigate(`/game?players=${playerCount}`)}
        >
          ▶️ ĐẤU MÁY (OFFLINE)
        </button>

        {/* CÁC NÚT PHỤ: ONLINE & LUẬT CHƠI */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-action" 
            style={{ 
              flex: 1,
              fontSize: '0.85rem', 
              padding: '10px 8px', 
              borderRadius: '10px', 
              fontWeight: 600, 
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer'
            }}
            onClick={() => {
              const name = prompt("Nhập tên của bạn:");
              if (name) navigate(`/online?name=${encodeURIComponent(name)}`);
            }}
          >
            🌐 Chơi Online
          </button>
          <button 
            className="btn-action" 
            style={{ 
              flex: 1,
              fontSize: '0.85rem', 
              padding: '10px 8px', 
              borderRadius: '10px', 
              fontWeight: 600, 
              background: 'rgba(30, 41, 59, 0.9)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/wiki/rules')}
          >
            📚 Luật Chơi
          </button>
        </div>
      </div>

      {/* VERSION THOÁNG ĐÃNG Ở GÓC DƯỚI */}
      <div style={{ position: 'absolute', bottom: '8px', right: '16px', color: 'rgba(148, 163, 184, 0.6)', fontSize: '0.7rem' }}>
        v0.1.0 (Quốc Chiến)
      </div>
    </div>
  );
}
