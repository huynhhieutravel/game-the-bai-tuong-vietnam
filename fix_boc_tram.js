const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

const replacement = `                 dispatcher.applyEffect(Effects.RecoverEffect(target.id, 1));
                 
                 dispatcher.applyEffect(Effects.SetWaitingEffect(null));
             }
          
       }
    },
    turnResetFlags: ['duyenThoUsedThisTurn'],
    aiConfig: { priority: 9, condition: (state, bot, targets) => false }
  },

  'boc-tram-trung': {
    id: 'boc-tram-trung',
    name: 'Bọc Trăm Trứng',
    type: SKILL_TYPES.ACTIVE,
    canUse: (state, player) => {
       const hasLacAllies = state.players.some(p => p.id !== player.id && p.isAlive && getPlayerFaction(p) === 'Lạc');
       return hasLacAllies;
    },
    getValidTargets: (state, player) => {
       return state.players.filter(p => p.id !== player.id && p.isAlive);
    },
    onUse: (dispatcher, state, playerId, targets) => {
       const req = state.waitingForResponse;
       if (!req || (req.type !== 'ask_slash' && req.type !== 'ask_dodge')) return;
       const lacAllies = state.players.filter(p => p.id !== playerId && p.isAlive && getPlayerFaction(p) === 'Lạc');
       dispatcher.state.reactionStack.unshift({
          type: 'EVENT_TRIGGER_SKILL_ASK',
          payload: { 
             request: { 
                type: req.type === 'ask_slash' ? 'ask_boc_tram_trung_slash' : 'ask_boc_tram_trung_dodge', 
                skillId: 'boc-tram-trung',
                sourceId: playerId, 
                targetId: targets[0] || req.sourceId, 
                isDefensive: req.type === 'ask_slash' || req.type === 'ask_dodge', 
                askQueue: lacAllies.map(p => p.id),
                originalReq: req
             } 
          }
       });
       state.waitingForResponse = null;
    },
    onReact: (dispatcher, state, payload) => {
       const req = state.waitingForResponse;
       if (!req || (req.type !== 'ask_boc_tram_trung_slash' && req.type !== 'ask_boc_tram_trung_dodge')) return;

       const responderId = req.askQueue[0];
       const responder = state.players.find(p => p.id === responderId);
       const llq = state.players.find(p => p.id === req.sourceId);

       if (payload.responseType === 'play' && payload.data && payload.data.cardId) {
           const cardIndex = responder.hand.findIndex(c => c.id === payload.data.cardId);
           if (cardIndex >= 0) {
              const playedCard = responder.hand.splice(cardIndex, 1)[0];
              dispatcher.applyEffect(Effects.MoveCardEffect(playedCard.id, 'hand', 'playedCards', responder.id, null));
              
              const isSlash = req.type === 'ask_boc_tram_trung_slash';
              dispatcher.addLog(\`🛡️ \${responder.name} đã đánh ra [\${isSlash ? 'Chém' : 'Né'}] giùm \${llq.name}!\`, 'important');
              
              if (req.isDefensive) {
                  state.waitingForResponse = req.originalReq;
                  dispatcher.state.reactionStack.unshift({
                      type: 'EVENT_ACTION_REACT',
                      payload: { playerId: req.originalReq.responderId || llq.id, responseType: 'play', data: { virtualCardName: isSlash ? 'Chém' : 'Né', activeSkill: 'boc-tram-trung' } }
                  });
              } else {
                  dispatcher.state.actionQueue.unshift({
                      type: 'EVENT_ACTION_PLAY_CARD',
                      payload: {
                          sourceId: llq.id,
                          targetId: req.targetId,
                          cardId: null,
                          virtualCardName: isSlash ? 'Chém' : 'Né',
                          isVirtual: true,
                          activeSkill: 'boc-tram-trung'
                      }
                  });
                  state.waitingForResponse = null;
              }
           }
       } else {
           // Từ chối, chuyển người tiếp theo`;

// Line 1991 is `dispatcher.applyEffect(Effects.RecoverEffect(player.id, 1));`
// Line 2080 is `// Từ chối, chuyển người tiếp theo` (actually 2080 is just before it, let's find it)
const textToFindStart = "                 dispatcher.applyEffect(Effects.RecoverEffect(player.id, 1));\n                 dispatcher.applyEffect(Effect    onReact";
const idxStart = code.indexOf(textToFindStart);
if (idxStart !== -1) {
   const idxEnd = code.indexOf("// Từ chối, chuyển người tiếp theo", idxStart);
   if (idxEnd !== -1) {
      code = code.substring(0, idxStart) + replacement + '\n' + code.substring(idxEnd);
      fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
      console.log("Fixed!");
   }
}
