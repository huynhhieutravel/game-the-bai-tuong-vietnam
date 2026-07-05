// @ts-check
import React, { useState } from 'react';

/**
 * @typedef {Object} CardSelectorProps
 * @property {Array<any>} validCards
 * @property {any} onSelect
 * @property {any} onCancel
 * @property {string} confirmText
 * @property {string} cancelText
 * @property {React.ReactNode} [extraButtons]
 * @property {boolean} [requireTarget]
 * @property {Array<any>} [validTargets]
 * 
 * @param {CardSelectorProps} props
 */
export function CardSelector(props) {
  const { validCards, onSelect, onCancel, confirmText, cancelText, extraButtons } = props;
  const [selectedIdx, setSelectedIdx] = useState(null);
  
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
        {validCards.map(c => {
           const isSelected = selectedIdx === c.idx;
           return (
              <div 
                 key={c.idx}
                 onClick={() => setSelectedIdx(isSelected ? null : c.idx)}
                 style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: `2px solid ${isSelected ? '#10b981' : '#374151'}`,
                    background: isSelected ? 'rgba(16, 185, 129, 0.2)' : '#1f2937',
                    cursor: 'pointer',
                 }}
              >
                 <div style={{ fontSize: '0.7rem', color: c.color === 'red' ? '#ef4444' : 'white' }}>{c.suit} {c.rank}</div>
                 <div style={{ fontSize: '0.85rem' }}>
                    {c.name}
                    {c.virtualReason && <span style={{fontSize: '0.6rem', color: 'gold'}}><br/>({c.virtualReason})</span>}
                 </div>
              </div>
           );
        })}
        {validCards.length === 0 && <div style={{ fontSize: '0.8rem', color: 'gray' }}>Không có bài hợp lệ</div>}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {extraButtons}
        <button 
           className="btn-action primary" 
           disabled={selectedIdx === null}
           onClick={() => onSelect(selectedIdx)}
        >
           {confirmText}
        </button>
        {cancelText && (
          <button className="btn-action secondary" onClick={onCancel}>
             {cancelText}
          </button>
        )}
      </div>
    </>
  );
}
