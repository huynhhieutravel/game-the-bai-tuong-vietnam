const fs = require('fs');
const file = 'src/engine/core/Dispatcher.js';
let content = fs.readFileSync(file, 'utf8');

const targetLogic = `           if (this.state.waitingForResponse) break; // Dừng vòng lặp để chờ User Input`;
const injection = `           if (this.state.waitingForResponse) {
                const req = this.state.waitingForResponse;
                if (req.type === 'ask_negate' && !req.isCanGianAsked) {
                     const isSingleTarget = ['hoacong', 'steal', 'dismantle'].includes(req.trickType) && !req.aoeTargets; 
                     if (isSingleTarget) {
                         const targetPlayer = this.state.players.find(p => p.id === req.targetId);
                         const { getPlayerFaction } = require('../../gameState.js');
                         if (targetPlayer && getPlayerFaction(targetPlayer) === 'Hà') {
                              const canGianPlayers = this.state.players.filter(p => p.id !== req.targetId && p.isAlive && p.hand.length > 0 && p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.name === 'Can Gián')));
                              if (canGianPlayers.length > 0) {
                                  req.isCanGianAsked = true; 
                                  this.state.waitingForResponse = {
                                      type: 'ask_can_gian',
                                      originalReq: req,
                                      askQueue: canGianPlayers.map(p => p.id),
                                      targetId: req.targetId,
                                      sourceId: canGianPlayers[0].id
                                  };
                              }
                         }
                     }
                }
                break;
           }`;

content = content.replace(targetLogic, injection);
fs.writeFileSync(file, content);
