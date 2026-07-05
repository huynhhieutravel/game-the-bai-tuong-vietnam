import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css'; // Assume index.css has some utility classes

export default function MainMenu() {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(4);

  return (
    <div className="main-menu-container" style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)' }}>
      <h1 style={{ fontSize: '5rem', color: 'var(--color-gold)', textShadow: '0 0 20px rgba(212, 168, 67, 0.5)', margin: '0 0 10px 0', fontFamily: 'var(--font-display)' }}>
        VIỆT SÁT
      </h1>
      <p style={{ fontSize: '1.5rem', color: 'var(--color-text-muted)', marginBottom: '50px', letterSpacing: '2px' }}>
        GAME THẺ BÀI QUỐC CHIẾN
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '300px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '15px', borderRadius: '15px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <label style={{ display: 'block', color: 'var(--color-text-secondary)', marginBottom: '10px', fontSize: '0.9rem' }}>
            SỐ LƯỢNG NGƯỜI CHƠI (Bao gồm bạn)
          </label>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
            <button className="btn-action secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={() => setPlayerCount(Math.max(3, playerCount - 1))}>-</button>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-gold)', width: '30px' }}>{playerCount}</span>
            <button className="btn-action secondary" style={{ width: '40px', height: '40px', padding: 0 }} onClick={() => setPlayerCount(Math.min(8, playerCount + 1))}>+</button>
          </div>
        </div>

        <button 
          className="btn-action primary" 
          style={{ fontSize: '1.5rem', padding: '20px', borderRadius: '15px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}
          onClick={() => navigate(`/game?players=${playerCount}`)}
        >
          ▶️ VÀO TRẬN
        </button>
        <button 
          className="btn-action secondary" 
          style={{ fontSize: '1.2rem', padding: '15px', borderRadius: '15px', textTransform: 'uppercase' }}
          onClick={() => navigate('/wiki/rules')}
        >
          📚 TỪ ĐIỂN & LUẬT CHƠI
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: '20px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
        Version 0.1.0 (Quốc Chiến)
      </div>
    </div>
  );
}
