        // để không bị chạy tiếp xuống advancePhase, gây ra vòng lặp vô tận (Maximum update depth exceeded)
        return; 
      }

      if (gameState.chainedDamageQueue && gameState.chainedDamageQueue.length > 0) {
        import('../../engine/cardEffects.js').then(({ processChainedDamageQueue }) => {
            // setGameState(processChainedDamageQueue(gameState));
        });
        return;
      }


    }
  }, [gameState]);

  // Auto Bagua for human player
  useEffect(() => {
    if (!gameState || !gameState.waitingForResponse) return;
    const req = gameState.waitingForResponse;
    const me = gameState.players[0];

    if ((req.type === 'dodge' && req.targetId === 0 && !req.unavoidable && req.baguaAvailable !== false) || 
        (req.type === 'ask_dodge' && req.targetId === 0 && req.baguaAvailable !== false)) {
        
        const hasPassiveBagua = me.heroes?.some((h, i) => h.skills?.some(s => s.id === 'than-giap')) && !me.equipment.some(c => c.name === 'Bát Quái' || c.name === 'Hắc Thuẫn');
        const hasBagua = hasPassiveBagua || me.equipment.some(e => e.name === 'Bát Quái');
        
        if (hasBagua) {
            handleResponseAction({ doBagua: true });
        }
    }
  }, [gameState?.waitingForResponse]);

  // Show phase banner
  const showPhaseBanner = (text) => {
    setPhaseBanner(text);
    setTimeout(() => setPhaseBanner(null), 2000);
  };

  // Handle Draw Phase
  const handleDraw = useCallback((skipDraw = false, drawExtra = false, khaiQuoc = false) => {
    if (!gameAPI) return;
    gameAPI.drawPhase(0, skipDraw, drawExtra, khaiQuoc);
  }, [gameAPI]);

  const cancelTargeting = useCallback(() => {
    setTargetSession(null);
    setActiveSkill(null);
    if (isActionPending.current) isActionPending.current = false;
  }, []);

  // Handle Active Skill Selection
  const handleExecuteSkill = useCallback((skillId) => {
    if (!gameState || gameState.phase !== PHASES.ACTION || !gameAPI) return;
    if (gameState.currentPlayerIndex !== 0) return;

    if (isActionPending.current) return;

    const skillIdMap = {
        'Thủy Tổ': 'thuy-to',
        'Tự Chủ': 'tu-chu',
        'Tiên Phong': 'tien-phong',
        'Diệu Dược': 'dieu-duoc',
        'Hòa Thân': 'hoa-than',
        'Bình Loạn': 'binh-loan',
        'Trung Dũng': 'trung-dung',
        'Bạch Đằng': 'bach-dang',
        'Lặn Sâu': 'lan-sau',
        'Tâm Công': 'tam-cong',
        'Vân Đồn': 'van-don',
        'Đoạt Sao': 'doat-sao',
        'Duyên Thơ': 'duyen-tho'
    };

    if (skillId === 'Bọc Trăm Trứng' || skillId === 'Bọc Trăm Trứng (Chủ Công Kỹ)') {
       if (activeSkill === skillId) {
          cancelTargeting();
       } else {
          setActiveSkill(skillId);
          setTargetSession({
             card: null,
             virtualCardName: null,
             targetingDef: { type: 'single', filter: (state, player) => state.players.filter(p => p.id !== player.id && p.isAlive && getDistance(state, player.id, p.id) <= getAttackRange(state, player.id)) },
             step: 0,
             selectedTargets: [],
             validTargets: gameState.players.filter(p => p.id !== gameState.players[0].id && p.isAlive && getDistance(gameState, 0, p.id) <= getAttackRange(gameState, 0)).map(p => p.id),
             message: '🎯 Đã kích hoạt Bọc Trăm Trứng! Hãy nhấp chọn 1 KẺ ĐỊCH để đồng minh Lạc chém giúp bạn!'
          });
       }
       return;
    }

    if (skillId === 'Tiên Duyên') {
       if (activeSkill === skillId) {
           cancelTargeting();
       } else {
           setActiveSkill(skillId);
           setTargetSession({
               card: null,
               virtualCardName: null,
               targetingDef: { type: 'single', filter: (state, player) => [], optional: true },
               step: 0,
               selectedTargets: [],
               validTargets: [],
               message: '✨ Hãy nhấp chọn 1 lá bài ♣ trên tay.'
           });
       }
       return;
    }

    if (skillId === 'Định Quốc') {
       if (activeSkill === skillId) {
           cancelTargeting();
       } else {
           setActiveSkill(skillId);
           setTargetSession({
               card: null,
               virtualCardName: null,
               targetingDef: { type: 'single', filter: (state, player) => [], optional: true },
               step: 0,
               selectedTargets: [],
               validTargets: [],
               message: '🎯 Hãy nhấp chọn 1 lá bài trên tay để truyền cho tướng Định Quốc.'
           });
       }
       return;
    }

    const mappedId = skillIdMap[skillId];
    if (mappedId) {
       isActionPending.current = true;
       gameAPI.useSkill(0, mappedId);
       cancelTargeting();
    } else {
       // Toggle active skill selection
       setActiveSkill(prev => prev === skillId ? null : skillId);
       cancelTargeting();
    }
  }, [gameState, gameAPI, activeSkill, cancelTargeting]);

  

  const handleResponseAction = useCallback((payload) => {
    if (!gameState?.waitingForResponse || !gameAPI) return;
    gameAPI.respond(payload);
  }, [gameState, gameAPI]);

  const handleEndTurn = useCallback(() => {
    if (!gameAPI) return;
    gameAPI.endPhase(0);
  }, [gameAPI]);

  const handleRevealClick = useCallback((heroIndex) => {
    if (!gameAPI) return;
    gameAPI.revealHero(0, heroIndex);
  }, [gameAPI]);

  const handleTargetClick = useCallback((targetId) => {
    if (!gameAPI || !gameState || !targetSession) return;
    
    // Check if targetId is valid
    if (!targetSession.validTargets.includes(targetId)) return;

    if (isActionPending.current) return;

    const { card, virtualCardName, targetingDef, step, selectedTargets } = targetSession;
    
    if (targetingDef.type === 'multiple') {
       // Toggle selection (like Xiềng Xích)
       let newSelected = [...selectedTargets];
       if (newSelected.includes(targetId)) {
           newSelected = newSelected.filter(id => id !== targetId);
       } else {
           if (newSelected.length < targetingDef.max) {
               newSelected.push(targetId);
           }
       }
       setTargetSession(prev => ({
           ...prev,
           selectedTargets: newSelected
       }));
       return;
    }

    const newSelectedTargets = [...selectedTargets, targetId];

    if (targetingDef.type === 'single') {
       isActionPending.current = true;
       if (activeSkill === 'Định Quốc') {
           gameAPI.dispatcher.dispatchAction({
               type: 'ACTION_USE_SKILL',
               payload: { playerId: 0, skillId: 'dinh-quoc', targets: newSelectedTargets, options: { cardIdx: targetSession.cardIndex } }
           });
       } else if (card) {
           gameAPI.playCard(0, card.id, newSelectedTargets, virtualCardName ? { virtualCardName } : {});
       } else if (activeSkill === 'Bọc Trăm Trứng' || activeSkill === 'Bọc Trăm Trứng (Chủ Công Kỹ)') {
           gameAPI.dispatcher.dispatchAction({
               type: 'ACTION_USE_SKILL',
               payload: { playerId: 0, skillId: 'boc-tram-trung', targets: newSelectedTargets }
           });
       }
       cancelTargeting();
    }  
    else if (targetingDef.type === 'sequence') {
       if (step + 1 >= targetingDef.steps.length) {
           isActionPending.current = true;
           gameAPI.playCard(0, card.id, newSelectedTargets, virtualCardName ? { virtualCardName } : {});
           cancelTargeting();
       } else {
           // Move to next step
           setTargetSession(prev => ({
               ...prev,
               step: step + 1,
               selectedTargets: newSelectedTargets,
               validTargets: getAvailableTargets(gameState, 0, virtualCardName || card.name, card.id, newSelectedTargets)
           }));
       }
    }
  }, [gameAPI, gameState, targetSession, cancelTargeting]);

  const handleCardClick = useCallback((cardIndex) => {
    if (!gameState || !gameAPI) return;
    if (gameState.waitingForResponse && gameState.waitingForResponse.type !== 'play_phase') return;
    const card = gameState.players[0].hand[cardIndex];
    if (!card) return;
    
    // If an active skill is selected, handle card conversion
    let virtualName = null;
    if (activeSkill) {
      if (activeSkill === 'Tiên Duyên') {
          if (card.suit !== '♣') {
              alert('Tiên Duyên chỉ dùng được với bài ♣!');
              return;
          }
          setTargetSession({
              card: card,
              cardIndex: cardIndex,
              virtualCardName: 'Xiềng Xích',
              targetingDef: { type: 'multiple', max: 2, filter: (state, player) => state.players.filter(p => p.isAlive), optional: true },
              step: 0,
              selectedTargets: [],
              validTargets: gameState.players.filter(p => p.isAlive).map(p => p.id),
              message: '✨ Chọn 0 mục tiêu để Rút 1 bài, hoặc 1-2 mục tiêu để gán Xiềng Xích.'
          });
          return;
      }
      if (activeSkill === 'Định Quốc') {
          setTargetSession({
              card: card,
              cardIndex: cardIndex,
              virtualCardName: null,