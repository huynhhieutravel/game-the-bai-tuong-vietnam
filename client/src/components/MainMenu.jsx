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
        background: 'radial-gradient(ellipse at 50% 40%, #1e293b 0%, #0f172a 55%, #020617 100%)',
        backgroundImage: `
          radial-gradient(circle at 28% 45%, rgba(234, 179, 8, 0.12) 0%, transparent 50%),
          radial-gradient(circle at 72% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 40%, #1e293b 0%, #0f172a 55%, #020617 100%)
        `,
        padding: 'max(12px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left))',
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
            borderRadius: '22px', 
            border: '2.5px solid #eab308', 
            boxShadow: '0 0 30px rgba(234, 179, 8, 0.5), 0 10px 25px rgba(0, 0, 0, 0.85)',
            marginBottom: '10px',
            objectFit: 'cover'
          }} 
        />
        <h1 style={{ 
          fontSize: 'clamp(2rem, 5.5vh, 3.2rem)', 
          background: 'linear-gradient(180deg, #ffffff 0%, #fef08a 25%, #facc15 65%, #ca8a04 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0, 
          fontFamily: 'var(--font-display, serif)',
          fontWeight: 900,
          letterSpacing: '4px',
          textShadow: '0 0 25px rgba(250, 204, 21, 0.5), 0 4px 15px rgba(0,0,0,0.95)'
        }}>
          VIỆT SÁT
        </h1>
        <p style={{ 
          fontSize: 'clamp(0.75rem, 2vh, 0.95rem)', 
          color: '#fef08a', 
          margin: '4px 0 14px 0', 
          letterSpacing: '2.5px',
          textTransform: 'uppercase',
          fontWeight: 700,
          textShadow: '0 2px 6px rgba(0,0,0,0.95)'
        }}>
          Thẻ Bài Chiến Thuật Quốc Chiến
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ 
            fontSize: '0.78rem', 
            padding: '4px 12px', 
            background: 'rgba(30, 58, 138, 0.65)', 
            border: '1.5px solid #60a5fa', 
            borderRadius: '14px', 
            color: '#bfdbfe', 
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            ⚔️ 4 Đại Phe Phái
          </span>
          <span style={{ 
            fontSize: '0.78rem', 
            padding: '4px 12px', 
            background: 'rgba(6, 78, 59, 0.65)', 
            border: '1.5px solid #34d399', 
            borderRadius: '14px', 
            color: '#a7f3d0', 
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🛡️ Cặp Tướng Song Đấu
          </span>
        </div>
      </div>

      {/* CỘT PHẢI: BẢNG ĐIỀU KHIỂN & NÚT VÀO TRẬN */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px', 
        width: 'clamp(280px, 42vw, 360px)',
        background: 'linear-gradient(160deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        padding: '18px 22px',
        borderRadius: '20px',
        border: '1.5px solid rgba(234, 179, 8, 0.55)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 25px rgba(212, 168, 67, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
      }}>
        {/* CHỌN SỐ NGƯỜI CHƠI */}
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.85)', 
          padding: '10px 14px', 
          borderRadius: '14px', 
          border: '1.5px solid rgba(255, 255, 255, 0.15)', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)'
        }}>
          <span style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.5px' }}>
            👥 SỐ NGƯỜI CHƠI
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              style={{ 
                width: '36px', 
                height: '36px', 
                padding: 0, 
                fontSize: '1.3rem', 
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                border: '1.5px solid rgba(212, 168, 67, 0.6)',
                color: '#ffffff',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
              }} 
              onClick={() => setPlayerCount(Math.max(3, playerCount - 1))}
            >
              -
            </button>
            <span style={{ 
              fontSize: '1.45rem', 
              fontWeight: 900, 
              color: '#fde047', 
              textShadow: '0 0 12px rgba(250, 204, 21, 0.7)',
              minWidth: '24px', 
              textAlign: 'center' 
            }}>
              {playerCount}
            </span>
            <button 
              style={{ 
                width: '36px', 
                height: '36px', 
                padding: 0, 
                fontSize: '1.3rem', 
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                border: '1.5px solid rgba(212, 168, 67, 0.6)',
                color: '#ffffff',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
              }} 
              onClick={() => setPlayerCount(Math.min(8, playerCount + 1))}
            >
              +
            </button>
          </div>
        </div>

        {/* NÚT CHÍNH: ĐẤU MÁY OFFLINE — ĐỘ TƯƠNG PHẢN CAO VƯỢT TRỘI */}
        <button 
          style={{ 
            fontSize: 'clamp(1.05rem, 2.6vh, 1.25rem)', 
            padding: '14px 20px', 
            borderRadius: '14px', 
            textTransform: 'uppercase', 
            fontWeight: 900, 
            letterSpacing: '1.5px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 45%, #b45309 100%)',
            color: '#ffffff',
            border: '2px solid #fef08a',
            boxShadow: '0 8px 24px rgba(217, 119, 6, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.85), 0 0 8px rgba(0, 0, 0, 0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onClick={() => navigate(`/game?players=${playerCount}`)}
        >
          ▶ ĐẤU MÁY (OFFLINE)
        </button>

        {/* CÁC NÚT PHỤ: ONLINE & LUẬT CHƠI — SẮC NÉT RÕ RÀNG */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            style={{ 
              flex: 1,
              fontSize: '0.88rem', 
              padding: '11px 12px', 
              borderRadius: '12px', 
              fontWeight: 700, 
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: '#f8fafc',
              border: '1.5px solid rgba(212, 168, 67, 0.45)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={() => {
              const name = prompt("Nhập tên của bạn:");
              if (name) navigate(`/online?name=${encodeURIComponent(name)}`);
            }}
          >
            🌐 Chơi Online
          </button>
          <button 
            style={{ 
              flex: 1,
              fontSize: '0.88rem', 
              padding: '11px 12px', 
              borderRadius: '12px', 
              fontWeight: 700, 
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: '#f8fafc',
              border: '1.5px solid rgba(212, 168, 67, 0.45)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={() => navigate('/wiki/rules')}
          >
            📚 Luật Chơi
          </button>
        </div>
      </div>

      {/* VERSION THOÁNG ĐÃNG Ở GÓC DƯỚI */}
      <div style={{ position: 'absolute', bottom: '10px', right: '20px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
        v0.1.0 (Quốc Chiến)
      </div>
    </div>
  );
}
