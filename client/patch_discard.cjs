const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state
const stateAnchor = `  const [showVipModal, setShowVipModal] = useState(false);`;
content = content.replace(stateAnchor, stateAnchor + `\n  const [selectedDiscards, setSelectedDiscards] = useState([]);`);

// 2. Replace handleDiscard
const handleDiscardRegex = /const handleDiscard = useCallback\(\(cardIndex\) => \{[\s\S]*?\}, \[gameState\]\);/m;
const newHandleDiscard = `const handleDiscardToggle = useCallback((cardIndex) => {
    setSelectedDiscards(prev => {
        if (prev.includes(cardIndex)) return prev.filter(i => i !== cardIndex);
        return [...prev, cardIndex];
    });
  }, []);

  const confirmDiscard = useCallback(() => {
    if (!gameState) return;
    const player = gameState.players[0];
    const discardCount = player.hand.length - player.hp;
    if (selectedDiscards.length !== discardCount) return;

    const dispatcher = new Dispatcher(gameState);
    const cardIds = selectedDiscards.map(idx => player.hand[idx].id);
    dispatcher.dispatchAction({ type: 'ACTION_DISCARD', payload: { playerId: 0, cardIds } });
    
    setSelectedDiscards([]);
    setGameState(adaptStateToUI(dispatcher.getState()));
  }, [gameState, selectedDiscards]);`;
content = content.replace(handleDiscardRegex, newHandleDiscard);

// 3. Replace card rendering class & onClick
const classAnchor = "className={`card ${card.type} ${(typeof selectedCard === 'object' && selectedCard !== null ? selectedCard.index === i : selectedCard === i) ? 'selected' : ''}`}";
const newClass = "className={`card ${card.type} ${(typeof selectedCard === 'object' && selectedCard !== null ? selectedCard.index === i : selectedCard === i) ? 'selected' : ''} ${selectedDiscards.includes(i) ? 'selected' : ''}`}";
content = content.replace(classAnchor, newClass);

const onClickAnchor = `                if (needsDiscard) {
                  handleDiscard(i);
                } else if (isMyTurn && gameState.phase === PHASES.ACTION) {`;
const newOnClick = `                if (needsDiscard) {
                  handleDiscardToggle(i);
                } else if (isMyTurn && gameState.phase === PHASES.ACTION) {`;
content = content.replace(onClickAnchor, newOnClick);

// 4. Replace needsDiscard UI
const uiAnchor = `          ) : needsDiscard ? (
            <span style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 'bold', animation: 'blinkText 1.5s infinite', background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '4px' }}>
              ⚠️ BẠN CẦN BỎ {me.hand.length - me.hp} LÁ BÀI! (Bấm vào bài trên tay)
            </span>
          ) : selectingTarget ? (`;
const newUI = `          ) : needsDiscard ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '4px' }}>
                  ⚠️ BẠN CẦN BỎ {me.hand.length - me.hp} LÁ BÀI! (Đã chọn {selectedDiscards.length})
                </span>
                {selectedDiscards.length === me.hand.length - me.hp && (
                    <button className="btn-action" style={{ background: '#ef4444', color: 'white', border: '1px solid white' }} onClick={confirmDiscard}>
                        🗑️ Xác nhận Vứt
                    </button>
                )}
            </div>
          ) : selectingTarget ? (`;
content = content.replace(uiAnchor, newUI);

fs.writeFileSync(file, content);
