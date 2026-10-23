// @ts-nocheck
import React from 'react';
import { getFullPlayerName } from 'shared/utils/playerHelpers';
import { CardSelector } from './CardSelector';

export function AskChangeJudgeModal({ req, gameState, onConfirm }) {
  const me = gameState.players.find(p => p.id === req.responderId);
  const target = gameState.players.find(p => p.id === req.targetId);
  
  const skillId = req.skills && req.skills.length > 0 ? req.skills[0] : 'quan-co';
  const skillName = skillId === 'quan-co' ? 'Quân Cơ' : 'Ứng Biến';
  const reasonName = req.reason === 'phat-toi' ? 'Phạt Tội' : (req.reason === 'sam-set' ? 'Sấm Sét' : (req.reason === 'binh-bat-yem-khi' ? 'Binh Bất Yếm Khí' : req.reason));

  const validCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => {
     if (skillId === 'ung-bien') return true;
     return c.color === 'black'; // Quân Cơ requires black card
  });

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#9333ea', fontWeight: 'bold' }}>
        ☯️ {skillName.toUpperCase()}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Phán xét <strong>[{reasonName}]</strong> của <strong>{getFullPlayerName(target, me.id)}</strong> đang diễn ra! <br/>
        Bạn có muốn dùng bài trên tay để đổi lá phán xét không?
      </div>

      <CardSelector 
        validCards={validCards}
        confirmText="Đổi phán xét"
        cancelText="⏭️ Bỏ qua"
        onSelect={(idx) => onConfirm({ doReact: true, skillId: skillId, cardId: me.hand[idx].id })}
        onCancel={() => onConfirm({ doReact: false })}
      />
    </div>
  );
}
