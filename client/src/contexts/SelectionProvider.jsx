import React, { createContext, useContext, useState, useCallback } from 'react';

const SelectionContext = createContext(null);

export function SelectionProvider({ children }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectingTarget, setSelectingTarget] = useState(false);
  const [activeSkill, setActiveSkill] = useState(null);
  const [selectedTargets, setSelectedTargets] = useState([]);
  
  // Selection helpers
  const clearSelection = useCallback(() => {
    setSelectedCard(null);
    setSelectingTarget(false);
    setActiveSkill(null);
    setSelectedTargets([]);
  }, []);

  const toggleTarget = useCallback((targetId, maxTargets = 1) => {
    setSelectedTargets(prev => {
        if (prev.includes(targetId)) {
            return prev.filter(id => id !== targetId);
        }
        if (prev.length < maxTargets) {
            return [...prev, targetId];
        }
        // Thay thế cái cũ nhất (hoặc tùy logic) nếu đã đầy
        if (maxTargets === 1) {
            return [targetId];
        }
        return prev;
    });
  }, []);

  const value = {
    selectedCard, setSelectedCard,
    selectingTarget, setSelectingTarget,
    activeSkill, setActiveSkill,
    selectedTargets, setSelectedTargets,
    toggleTarget,
    clearSelection
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (ctx === undefined) throw new Error('useSelection must be used within a SelectionProvider');
  return ctx;
}
