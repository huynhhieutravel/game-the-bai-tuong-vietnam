import { getSuitEmoji } from 'shared/constants/cardTypes';
import React, { useState } from 'react';
import { getFullPlayerName, getHeroNameStr, getPlayerFaction } from 'shared/utils/playerHelpers';
import { hasSkill, hasSkillEvenIfHidden } from 'shared/engine_v4/application/index.js';


export function AskWeaponSkillModal({ req, gameState, onConfirm }) {
  const [selectedCards, setSelectedCards] = useState([]);
  const [selectedEquips, setSelectedEquips] = useState([]);
  const me = gameState.players.find(p => p.id === (typeof window !== 'undefined' ? window.playerId : 0)) || gameState.players[0];
  const weaponName = req.weapon;
  const isTarget = weaponName === 'Song Kiếm'; // For Song Kiem, the actor is the target who must discard
  
  let title = '';
  let desc = '';
  let btnText = '';
  let requiredCount = 0;
  
  if (weaponName === 'Thanh Long Đao') {
     title = 'Thanh Long Đao';
     desc = 'Mục tiêu đã Né! Chọn 1 lá [Chém] để chém bồi thêm 1 phát.';
     btnText = 'Chém tiếp!';
     requiredCount = 1;
  } else if (weaponName === 'Rìu Đá') {
     title = 'Rìu Đá';
     desc = 'Mục tiêu đã Né! Chọn 2 lá bài (trên tay hoặc trang bị, trừ Rìu Đá) vứt đi để chém xuyên Né.';
     btnText = 'Xuyên Né!';
     requiredCount = 2;
  } else if (weaponName === 'Quạt Sắt') {
     title = 'Quạt Sắt';
     desc = 'Mục tiêu bị chém trúng! Chọn 2 lá bài (trên tay hoặc trang bị, trừ Quạt Sắt) vứt đi để tăng +1 sát thương.';
     btnText = 'Tăng sát thương!';
     requiredCount = 2;
  } else if (weaponName === 'Song Kiếm') {
     title = 'Kỹ năng Song Kiếm';
     desc = 'Kẻ địch dùng Song Kiếm! Bạn phải vứt 1 lá bài (trên tay hoặc trang bị), nếu không kẻ địch sẽ rút 1 lá!';
     btnText = 'Vứt lá này';
     requiredCount = 1;
  }
  
  const toggleCard = (idx) => {
     if (selectedCards.includes(idx)) setSelectedCards(selectedCards.filter(i => i !== idx));
     else if (selectedCards.length + selectedEquips.length < requiredCount) setSelectedCards([...selectedCards, idx]);
  };
  
  const toggleEquip = (idx) => {
     if (selectedEquips.includes(idx)) setSelectedEquips(selectedEquips.filter(i => i !== idx));
     else if (selectedCards.length + selectedEquips.length < requiredCount) setSelectedEquips([...selectedEquips, idx]);
  };

  const hasDoiNui = !me.isSkillsSuppressed && hasSkillEvenIfHidden(me, 'doi-nui');
  const hasKhaiThien = !me.isSkillsSuppressed && hasSkillEvenIfHidden(me, 'khai-thien');

  const validHandCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => {
     if (weaponName === 'Thanh Long Đao') {
         if (c.name === 'Chém') return true;
         if (hasDoiNui && c.name === 'Né') return true;
         if (hasKhaiThien && c.color === 'red') return true;
         return false;
     }
     return true;
  }).map(c => {
      if (weaponName === 'Thanh Long Đao' && c.name !== 'Chém') {
          return { ...c, virtualReason: hasDoiNui && c.name === 'Né' ? 'Dời Núi' : 'Khai Thiên', originalName: c.name, name: 'Chém' };
      }
      return c;
  });
  
  const validEquips = me.equipment.map((c, idx) => ({ ...c, idx })).filter(c => {
     if (weaponName === 'Thanh Long Đao') return false;
     if (c.name === weaponName) return false;
     return true;
  });

  return (
    <div style={{ textAlign: 'center', minWidth: '350px' }}>
      <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-gold)' }}>
        ⚔️ {title}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
        {desc}
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '10px' }}>
        {validHandCards.map(c => {
           const isSelected = selectedCards.includes(c.idx);
           return (
             <div 
               key={`hand-${c.idx}`} 
               onClick={() => toggleCard(c.idx)}
               style={{ 
                 padding: '6px', borderRadius: '4px', border: `2px solid ${isSelected ? '#10b981' : '#374151'}`, 
                 background: isSelected ? 'rgba(16, 185, 129, 0.2)' : '#1f2937', cursor: 'pointer',
                 opacity: (!isSelected && selectedCards.length + selectedEquips.length >= requiredCount) ? 0.5 : 1
               }}
             >
               <div style={{ fontSize: '0.7rem', color: c.color === 'red' ? '#ef4444' : 'white' }}>{getSuitEmoji(c.suit)} {c.rank}</div>
               <div style={{ fontSize: '0.85rem' }}>{c.name}</div>
             </div>
           );
        })}
        {validEquips.map(c => {
           const isSelected = selectedEquips.includes(c.idx);
           return (
             <div 
               key={`eq-${c.idx}`} 
               onClick={() => toggleEquip(c.idx)}
               style={{ 
                 padding: '6px', borderRadius: '4px', border: `2px solid ${isSelected ? '#10b981' : '#374151'}`, 
                 background: isSelected ? 'rgba(16, 185, 129, 0.2)' : '#1f2937', cursor: 'pointer',
                 opacity: (!isSelected && selectedCards.length + selectedEquips.length >= requiredCount) ? 0.5 : 1
               }}
             >
               <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Trang Bị</div>
               <div style={{ fontSize: '0.85rem' }}>{c.name}</div>
             </div>
           );
        })}
        {validHandCards.length === 0 && validEquips.length === 0 && <div style={{ fontSize: '0.8rem', color: 'gray' }}>Không có bài hợp lệ</div>}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
           className="btn-action primary" 
           style={{ flex: 1 }} 
           disabled={selectedCards.length + selectedEquips.length < requiredCount}
           onClick={() => {
              const card = validHandCards.find(c => c.idx === selectedCards[0]);
              if (card && card.originalName) {
                  const activeSkill = card.originalName === 'Né' && hasDoiNui ? 'doi-nui' : 'khai-thien';
                  onConfirm({ doUse: true, virtualCardName: 'Chém', activeSkill, cardIndexSelected: card.idx, cardId: card.id });
              } else {
                  const handCardIds = selectedCards.map(idx => validHandCards.find(c => c.idx === idx)?.id).filter(Boolean);
                  const eqIds = selectedEquips.map(idx => validEquips.find(c => c.idx === idx)?.id).filter(Boolean);
                  onConfirm({ doUse: true, cardIndexes: selectedCards, equipIndexes: selectedEquips, cardIds: handCardIds, equipIds: eqIds });
              }
           }}
        >
          {`✅ ${btnText}`}
        </button>
        <button 
           className="btn-action danger" 
           style={{ flex: 1 }} 
           onClick={() => {
              onConfirm({ doUse: false });
           }}
        >
          Bỏ qua
        </button>
      </div>
    </div>
  );
}
