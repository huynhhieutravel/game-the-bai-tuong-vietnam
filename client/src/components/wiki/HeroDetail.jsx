import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { HEROES } from '../../data/gameData';
import '../WikiPage.css'; // Reuse CSS

export default function HeroDetail() {
  const { heroId } = useParams();
  const hero = HEROES.find(h => h.id === heroId);

  if (!hero) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h3>Không tìm thấy Tướng!</h3>
        <Link to="/wiki/heroes" className="btn-action primary" style={{ textDecoration: 'none' }}>Quay lại danh sách</Link>
      </div>
    );
  }

  return (
    <div className="hero-detail-container" style={{ maxWidth: '100%', margin: '0', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '30px', backdropFilter: 'blur(8px)' }}>
      <div style={{ display: 'flex', gap: '30px', flexDirection: 'row', flexWrap: 'wrap' }}>
        
        {/* Left Column: Full Image */}
        <div style={{ flex: '0 0 auto', width: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', height: '532px', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--color-border)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}>
            {hero.image ? (
              <img src={`/images/heroes/${hero.image}`} alt={hero.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '8rem' }}>{hero.emoji || '❓'}</span>
            )}
          </div>
        </div>

        {/* Right Column: Hero Info */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
            <h2 style={{ color: 'var(--color-gold)', margin: '0 0 15px 0', fontSize: '2.5rem' }}>{hero.name}</h2>
            <div className="hero-tags" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span className={`tag faction-${hero.faction.toLowerCase()}`} style={{ fontSize: '1rem', padding: '6px 14px' }}>{hero.faction}</span>
              <span className="tag hp" style={{ fontSize: '1rem', padding: '6px 14px' }}>❤️ {hero.maxHp} HP</span>
              <span className="tag gender" style={{ fontSize: '1rem', padding: '6px 14px' }}>{hero.gender}</span>
            </div>
          </div>

          {hero.bio && hero.bio.trim() !== '' && (
            <p className="hero-bio" style={{ fontSize: '1.1rem', marginBottom: '30px', borderLeft: '4px solid var(--color-gold)', paddingLeft: '15px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
              "{hero.bio}"
            </p>
          )}

          <h3 style={{ color: 'var(--color-text)', marginBottom: '20px', borderBottom: '1px dashed var(--color-border)', paddingBottom: '10px' }}>Kỹ năng</h3>
          
          <div className="hero-skills-detail" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {hero.skills.map((skill, idx) => (
              <div key={idx} className="skill-block" style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', borderLeft: '3px solid var(--color-blue)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <h4 style={{ color: 'var(--color-gold-light)', margin: 0, fontSize: '1.2rem' }}>{skill.name}</h4>
                  {skill.type && (
                    <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px', fontStyle: 'italic', color: '#94a3b8' }}>
                      {skill.type}
                    </span>
                  )}
                </div>
                
                <p style={{ lineHeight: '1.6', margin: 0, color: 'var(--color-text-secondary)' }}>
                  {skill.desc}
                </p>

                {skill.subSkills && skill.subSkills.length > 0 && (
                  <div style={{ marginTop: '15px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {skill.subSkills.map((sub, sIdx) => (
                      <div key={sIdx} style={{ background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '6px', borderLeft: '2px dashed var(--color-gold-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <span style={{ color: 'var(--color-text)', fontWeight: 'bold' }}>☆ {sub.name}</span>
                          {sub.type && (
                            <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontStyle: 'italic' }}>
                              [{sub.type}]
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>
                          {sub.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
        </div>
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <Link to="/wiki/heroes" className="btn-action secondary" style={{ textDecoration: 'none', padding: '10px 20px' }}>
          🔙 Danh sách Tướng
        </Link>
      </div>
    </div>
  );
}
