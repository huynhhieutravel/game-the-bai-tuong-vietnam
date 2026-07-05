import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import '../WikiPage.css';

export default function WikiLayout() {
  const location = useLocation();

  return (
    <div className="wiki-container" style={{ width: '100vw', height: '100vh', display: 'flex', backgroundColor: 'var(--color-bg-base)', overflow: 'hidden', userSelect: 'text', WebkitUserSelect: 'text' }}>
      
      {/* Sidebar Navigation */}
      <div className="wiki-sidebar" style={{ width: '250px', background: 'var(--color-bg-panel)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
        <div className="wiki-sidebar-header" style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--color-gold)', margin: '0 0 10px 0' }}>📚 Bách Khoa Toàn Thư</h2>
          <Link to="/" className="btn-action primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', fontSize: '0.9rem', padding: '10px' }}>
            🔙 Về Main Menu
          </Link>
        </div>
        
        <div className="wiki-sidebar-nav" style={{ padding: '10px 0', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Link to="/wiki/rules" className={`wiki-nav-item ${location.pathname === '/wiki/rules' ? 'active' : ''}`} style={{ padding: '12px 20px', color: location.pathname === '/wiki/rules' ? 'var(--color-gold)' : 'var(--color-text-primary)', textDecoration: 'none', borderLeft: location.pathname === '/wiki/rules' ? '3px solid var(--color-gold)' : '3px solid transparent', background: location.pathname === '/wiki/rules' ? 'rgba(212, 168, 67, 0.1)' : 'transparent', fontWeight: location.pathname === '/wiki/rules' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📜 Luật Chơi
          </Link>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Link to="/wiki/heroes" className={`wiki-nav-item ${location.pathname === '/wiki/heroes' || location.pathname.startsWith('/wiki/heroes/') ? 'active' : ''}`} style={{ padding: '12px 20px', color: (location.pathname === '/wiki/heroes' || location.pathname.startsWith('/wiki/heroes/')) ? 'var(--color-gold)' : 'var(--color-text-primary)', textDecoration: 'none', borderLeft: (location.pathname === '/wiki/heroes' || location.pathname.startsWith('/wiki/heroes/')) ? '3px solid var(--color-gold)' : '3px solid transparent', background: (location.pathname === '/wiki/heroes' || location.pathname.startsWith('/wiki/heroes/')) ? 'rgba(212, 168, 67, 0.1)' : 'transparent', fontWeight: (location.pathname === '/wiki/heroes' || location.pathname.startsWith('/wiki/heroes/')) ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🦸 Danh sách Tướng
            </Link>
            <Link to="/wiki/affinities" className={`wiki-nav-item ${location.pathname === '/wiki/affinities' ? 'active' : ''}`} style={{ padding: '10px 20px 10px 40px', color: location.pathname === '/wiki/affinities' ? 'var(--color-gold)' : 'var(--color-text-secondary)', textDecoration: 'none', borderLeft: location.pathname === '/wiki/affinities' ? '3px solid var(--color-gold)' : '3px solid transparent', background: location.pathname === '/wiki/affinities' ? 'rgba(212, 168, 67, 0.1)' : 'transparent', fontWeight: location.pathname === '/wiki/affinities' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
              ☯️ 4 Hệ Bản Sắc
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Link to="/wiki/card-types" className={`wiki-nav-item ${location.pathname === '/wiki/card-types' ? 'active' : ''}`} style={{ padding: '12px 20px', color: location.pathname === '/wiki/card-types' ? 'var(--color-gold)' : 'var(--color-text-primary)', textDecoration: 'none', borderLeft: location.pathname === '/wiki/card-types' ? '3px solid var(--color-gold)' : '3px solid transparent', background: location.pathname === '/wiki/card-types' ? 'rgba(212, 168, 67, 0.1)' : 'transparent', fontWeight: location.pathname === '/wiki/card-types' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🎴 Loại Bài (Hệ Thống)
            </Link>
            <Link to="/wiki/cards" className={`wiki-nav-item ${location.pathname === '/wiki/cards' ? 'active' : ''}`} style={{ padding: '10px 20px 10px 40px', color: location.pathname === '/wiki/cards' ? 'var(--color-gold)' : 'var(--color-text-secondary)', textDecoration: 'none', borderLeft: location.pathname === '/wiki/cards' ? '3px solid var(--color-gold)' : '3px solid transparent', background: location.pathname === '/wiki/cards' ? 'rgba(212, 168, 67, 0.1)' : 'transparent', fontWeight: location.pathname === '/wiki/cards' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
              🃏 Bài Cơ Bản
            </Link>
            <Link to="/wiki/tricks" className={`wiki-nav-item ${location.pathname === '/wiki/tricks' ? 'active' : ''}`} style={{ padding: '10px 20px 10px 40px', color: location.pathname === '/wiki/tricks' ? 'var(--color-gold)' : 'var(--color-text-secondary)', textDecoration: 'none', borderLeft: location.pathname === '/wiki/tricks' ? '3px solid var(--color-gold)' : '3px solid transparent', background: location.pathname === '/wiki/tricks' ? 'rgba(212, 168, 67, 0.1)' : 'transparent', fontWeight: location.pathname === '/wiki/tricks' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
              📜 Cẩm Nang
            </Link>
            <Link to="/wiki/equips" className={`wiki-nav-item ${location.pathname === '/wiki/equips' ? 'active' : ''}`} style={{ padding: '10px 20px 10px 40px', color: location.pathname === '/wiki/equips' ? 'var(--color-gold)' : 'var(--color-text-secondary)', textDecoration: 'none', borderLeft: location.pathname === '/wiki/equips' ? '3px solid var(--color-gold)' : '3px solid transparent', background: location.pathname === '/wiki/equips' ? 'rgba(212, 168, 67, 0.1)' : 'transparent', fontWeight: location.pathname === '/wiki/equips' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
              🛡️ Trang Bị
            </Link>
          </div>
          <Link to="/wiki/bugs" className={`wiki-nav-item ${location.pathname === '/wiki/bugs' ? 'active' : ''}`} style={{ padding: '12px 20px', color: location.pathname === '/wiki/bugs' ? '#ef4444' : 'var(--color-text-primary)', textDecoration: 'none', borderLeft: location.pathname === '/wiki/bugs' ? '3px solid #ef4444' : '3px solid transparent', background: location.pathname === '/wiki/bugs' ? 'rgba(239, 68, 68, 0.1)' : 'transparent', fontWeight: location.pathname === '/wiki/bugs' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            🐛 Lịch Sử Lỗi
          </Link>
          <Link to="/wiki/fixed-heroes" className={`wiki-nav-item ${location.pathname === '/wiki/fixed-heroes' ? 'active' : ''}`} style={{ padding: '12px 20px', color: location.pathname === '/wiki/fixed-heroes' ? '#22c55e' : 'var(--color-text-primary)', textDecoration: 'none', borderLeft: location.pathname === '/wiki/fixed-heroes' ? '3px solid #22c55e' : '3px solid transparent', background: location.pathname === '/wiki/fixed-heroes' ? 'rgba(34, 197, 94, 0.1)' : 'transparent', fontWeight: location.pathname === '/wiki/fixed-heroes' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ✅ Tướng Đã Fix
          </Link>
          <Link to="/wiki/fixed-cards" className={`wiki-nav-item ${location.pathname === '/wiki/fixed-cards' ? 'active' : ''}`} style={{ padding: '12px 20px', color: location.pathname === '/wiki/fixed-cards' ? '#8b5cf6' : 'var(--color-text-primary)', textDecoration: 'none', borderLeft: location.pathname === '/wiki/fixed-cards' ? '3px solid #8b5cf6' : '3px solid transparent', background: location.pathname === '/wiki/fixed-cards' ? 'rgba(139, 92, 246, 0.1)' : 'transparent', fontWeight: location.pathname === '/wiki/fixed-cards' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🃏 Bài Đã Fix
          </Link>
          <Link to="/wiki/fixed-systems" className={`wiki-nav-item ${location.pathname === '/wiki/fixed-systems' ? 'active' : ''}`} style={{ padding: '12px 20px', color: location.pathname === '/wiki/fixed-systems' ? '#3b82f6' : 'var(--color-text-primary)', textDecoration: 'none', borderLeft: location.pathname === '/wiki/fixed-systems' ? '3px solid #3b82f6' : '3px solid transparent', background: location.pathname === '/wiki/fixed-systems' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', fontWeight: location.pathname === '/wiki/fixed-systems' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            ⚙️ Hệ Thống Đã Fix
          </Link>
          <Link to="/wiki/changelog" className={`wiki-nav-item ${location.pathname === '/wiki/changelog' ? 'active' : ''}`} style={{ padding: '12px 20px', color: location.pathname === '/wiki/changelog' ? '#f59e0b' : 'var(--color-text-primary)', textDecoration: 'none', borderLeft: location.pathname === '/wiki/changelog' ? '3px solid #f59e0b' : '3px solid transparent', background: location.pathname === '/wiki/changelog' ? 'rgba(245, 158, 11, 0.1)' : 'transparent', fontWeight: location.pathname === '/wiki/changelog' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            📋 Changelog
          </Link>
        </div>
      </div>

      {/* Content Area */}
      <div className="wiki-content" style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
