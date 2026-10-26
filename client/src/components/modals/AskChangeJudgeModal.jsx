// @ts-nocheck
import React from 'react';
import { getFullPlayerName } from 'shared/utils/playerHelpers';
import { CardSelector } from './CardSelector';

import { getSuitEmoji } from 'shared/constants/cardTypes';
import { hasSkillEvenIfHidden, getEffectiveColor } from 'shared/engine_v4/application/index.js';

export function AskChangeJudgeModal({ req, gameState, onConfirm }) {
  const me = gameState.players.find(p => p.id === (req.responderId ?? req.currentActorId ?? (typeof window !== 'undefined' ? window.playerId : 0))) || gameState.players[0];
  const target = gameState.players.find(p => p.id === req.targetId) || me;
  
  const skillId = req.skills && req.skills.length > 0 ? req.skills[0] : (hasSkillEvenIfHidden(me, 'ung-bien') || hasSkillEvenIfHidden(me, 'ung_bien') ? 'ung-bien' : 'quan-co');
  const skillName = skillId === 'quan-co' || skillId === 'quan_co' ? 'Quân Cơ' : 'Ứng Biến';
  const reasonName = req.reason === 'phat-toi' || req.reason === 'phat_toi' ? 'Phạt Tội' : (req.reason === 'sam-set' || req.reason === 'sam_set' ? 'Sấm Sét' : (req.reason === 'binh-bat-yem-khi' || req.reason === 'binh_bat_yem_khi' ? 'Binh Bất Yếm Khí' : (req.reason || 'Phán xét')));

  const currentCard = req.judgeCard;
  const currentCardStr = currentCard ? `[${currentCard.name || 'Bài'} ${getSuitEmoji(currentCard.suit)}${currentCard.rank || ''}]` : '';

  const validCards = (me.hand || []).map((c, idx) => ({ ...c, idx })).filter(c => {
     if (skillId === 'ung-bien' || skillId === 'ung_bien') return true;
     return getEffectiveColor(me, c) === 'black'; // Quân Cơ requires effective black card
  });

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#9333ea', fontWeight: 'bold' }}>
        ☯️ {skillName.toUpperCase()}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        Phán xét <strong>[{reasonName}]</strong> của <strong>{getFullPlayerName(target, me.id)}</strong> đang diễn ra! <br/>
        {currentCardStr && (
          <div style={{ marginTop: '6px', color: currentCard.color === 'red' ? '#ef4444' : '#9ca3af', fontWeight: 'bold' }}>
            Lá phán xét hiện tại: {currentCardStr}
          </div>
        )}
        <div style={{ marginTop: '6px' }}>
          Bạn có muốn dùng bài trên tay để đổi lá phán xét không?
        </div>
      </div>

      <CardSelector 
        validCards={validCards}
        confirmText="Đổi phán xét"
        cancelText="⏭️ Bỏ qua"
        onSelect={(idx) => onConfirm({ doReact: true, skillId: skillId, cardId: me.hand[idx].id, card: me.hand[idx] })}
        onCancel={() => onConfirm({ doReact: false })}
      />
    </div>
  );
}
