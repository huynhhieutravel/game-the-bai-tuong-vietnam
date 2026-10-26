import React, { useEffect, useRef } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from 'shared/utils/playerHelpers';

import { CardSelector } from './CardSelector';
import { hasSkill, hasSkillEvenIfHidden, getEffectiveColor } from 'shared/engine_v4/application/index.js';
import { isEquip } from 'shared/utils/translationHelper.js';

export function DodgeModal({ req, gameState, onConfirm }) {
  const me = gameState.players.find(p => p.id === (req.responderId ?? req.targetId ?? (typeof window !== 'undefined' ? window.playerId : 0))) || gameState.players[0];
  const source = gameState.players.find(p => p.id === req.sourceId);
  
  const equips = Array.isArray(me.equipment) ? me.equipment : Object.values(me.equipment || {}).filter(Boolean);
  const hasPassiveBagua = hasSkill(me, 'than-giap') && !equips.some(c => c.name === 'Bát Quái' || c.name === 'Hắc Thuẫn' || isEquip(c, 'bat_quai') || isEquip(c, 'hac_thuan'));
  const hasBagua = hasPassiveBagua || equips.some(e => e.name === 'Bát Quái' || isEquip(e, 'bat_quai'));
  const canBagua = hasBagua && req.baguaAvailable !== false;

  // Tự động kích hoạt Bát Quái khi có thể dùng (không hỏi người chơi vì Bát Quái hoàn toàn miễn phí)
  const autoBaguaAttemptKeyRef = useRef(null);
  const reqKey = `${req.id || ''}_${req.type || ''}_${req.sourceId}_${req.targetId}_${req.reason || ''}`;

  useEffect(() => {
    if (canBagua && autoBaguaAttemptKeyRef.current !== reqKey) {
      autoBaguaAttemptKeyRef.current = reqKey;
      onConfirm({ doBagua: true });
    }
  }, [canBagua, reqKey, onConfirm]);

  const hasDoiNui = !me.isSkillsSuppressed && hasSkillEvenIfHidden(me, 'doi-nui');
  const hasThinhChinh = !me.isSkillsSuppressed && hasSkillEvenIfHidden(me, 'thinh-chinh');


  const hasTienPhat = !me.isSkillsSuppressed && (hasSkillEvenIfHidden(me, 'tien-phat') || hasSkillEvenIfHidden(me, 'tien_phat') || me.heroes?.some(h => h.id === 'ly-thuong-kiet'));
  const canTienPhat = hasTienPhat && gameState.players.some(p => p.id !== me.id && p.isAlive && !p.isDaTam && (p.revealedHeroes ? p.revealedHeroes.some(Boolean) : p.isRevealed !== false) && (getPlayerFaction(p) === 'Việt' || p.faction === 'Việt' || p.faction === 'viet'));
  
  const validCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => {
     if (c.name === 'Né') return true;
     if (hasDoiNui && c.name === 'Chém') return true;
     if (hasThinhChinh && getEffectiveColor(me, c) === 'black') return true;
     return false;
  }).map(c => ({
     ...c,
     virtualReason: c.name === 'Chém' && hasDoiNui ? 'Dời Núi' : (c.name !== 'Né' && hasThinhChinh && getEffectiveColor(me, c) === 'black' ? 'Thính Chính' : null)
  }));

  // Đang trong tiến trình tự động phán xét Bát Quái
  if (canBagua) {
    return (
      <div style={{ textAlign: 'center', minWidth: '350px', padding: '16px' }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-red-light)' }}>
          ⚔️ Bạn bị {getFullPlayerName(source, me.id)} tấn công!
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(0,0,0,0.35)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
          <div style={{ fontSize: '2.5rem' }}>☯️</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#c084fc' }}>
            Đang tự động phán xét [Bát Quái Trận]...
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Rút bài phán xét: <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Đỏ = Né thành công</span>, <span style={{ color: '#e2e8f0' }}>Đen = Thất bại (cần dùng Né)</span>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-red-light)' }}>
        ⚔️ Bạn bị {getFullPlayerName(source, me.id)} tấn công!
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        {req.baguaAvailable === false && hasBagua ? (
            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>❌ Bát Quái phán xét ĐEN (Thất bại)! Bạn bắt buộc phải dùng [Né] hoặc kỹ năng.</span>
        ) : (
            req.reqDodges > 1 ? <span style={{ color: '#ef4444' }}>[Phá Quân] Yêu cầu: Bạn cần đánh ra {req.reqDodges} lá [Né] để tránh đòn.</span> : "Chọn 1 lá [Né] trên tay để tránh đòn."
        )}
      </div>

      <CardSelector 
        validCards={validCards}
        confirmText="💨 Đánh Né"
        cancelText="😤 Chịu đấm"
        onSelect={(idx) => {
           const c = me.hand[idx];
            if (c.name === 'Chém' && hasDoiNui) {
              onConfirm({ doReact: true, virtualCardName: 'Né', activeSkill: 'doi-nui', cardIndexSelected: idx, cardId: c.id });
            } else if (c.name !== 'Né' && getEffectiveColor(me, c) === 'black' && hasThinhChinh) {
              onConfirm({ doReact: true, virtualCardName: 'Né', activeSkill: 'thinh-chinh', cardIndexSelected: idx, cardId: c.id });
            } else {
              onConfirm({ doReact: true, cardIndexSelected: idx, cardId: c.id });
           }
        }}
        onCancel={() => onConfirm({ doReact: false })}
        extraButtons={
          <>
            {canTienPhat && (
              <button className="btn-action" style={{ backgroundColor: '#ec4899', color: '#fff', flex: '1 1 100%' }} onClick={() => onConfirm({ doTienPhat: true })}>
                👑 Kích Hoạt Tiên Phát
              </button>
            )}
            {hasSkill(me, 'ho-gia') && me.isLord && (
              <button className="btn-action" style={{ backgroundColor: '#f59e0b', color: '#fff', flex: '1 1 100%' }} onClick={() => onConfirm({ doHoGia: true })}>
                👑 Kích Hoạt Hộ Giá
              </button>
            )}
          </>
        }
      />
    </div>
  );
}
