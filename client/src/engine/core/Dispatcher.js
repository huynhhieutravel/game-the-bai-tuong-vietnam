// @ts-check
/**
 * @typedef {import('../types/GameState').GameState} GameState
 * @typedef {import('../types/PlayerState').PlayerState} PlayerState
 * @typedef {import('../types/Action').ClientAction} ClientAction
 * @typedef {import('../types/Event').EngineEvent} EngineEvent
 * @typedef {import('../types/Card').CardDefinition} CardDefinition
 * @typedef {import('../types/Hero').Hero} Hero
 */
// ==========================================
// Dispatcher (Event Resolver) - Trái tim của State Machine
// Phân giải luồng Action -> Event (Stack/Queue) -> Effect
// ==========================================
import { reduce } from './Reducer';
import { canPlayCard, mapVietnameseToSlug } from '../rules/CardRules';
import { canUseSkill } from '../rules/SkillRules';
import * as Effects from './Effects';
import { CardRegistry } from '../registries/CardRegistry';
import { SkillRegistry } from '../registries/SkillRegistry';
import { EquipRegistry } from '../registries/EquipRegistry';
import { HeroRegistry } from '../registries/HeroRegistry';
import { getValidCardTargets } from '../rules/CardRules';
import { validateTargetPayload } from '../rules/TargetResolver';
import { getCardSubType } from '../../data/gameData';
import { ALL_NATIVE_TYPES, resolveSkillId } from '../constants/SKILL_CONSTANTS';
import { handlePhaseEvent } from './handlers/PhaseHandler';
import { handleCombatEvent } from './handlers/CombatHandler';
import { handleTrickEvent } from './handlers/TrickHandler';
import { getFactionCount, getPlayerFaction } from '../gameState';

export class Dispatcher {
  constructor(initialState) {
    this.state = initialState;
    this._tickDepth = 0; // Anti-recursion guard: đếm độ sâu tick() lồng nhau
    this._maxTickDepth = 0; // Tracking: ghi nhận độ sâu lồng tối đa (để debug)
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }
  
  getState() {
    return this.state;
  }

  // Hàm Helper để tính thứ tự vòng quay (Từ người chơi hiện tại, quay vòng tròn)
  getOrderedTargets(sourceId, targets) {
    const sourceIndex = this.state.players.findIndex(p => p.id === sourceId);
    const total = this.state.players.length;
    
    // Tính khoảng cách từ source đến từng target
    const ordered = targets.map(tId => {
      const tIndex = this.state.players.findIndex(p => p.id === tId);
      let distance = tIndex - sourceIndex;
      if (distance < 0) distance += total;
      return { id: tId, distance };
    });

    // Sắp xếp tăng dần theo khoảng cách
    ordered.sort((a, b) => a.distance - b.distance);
    
    return ordered.map(t => t.id);
  }

  getHeroName(player) {
      if (!player) return "Ai đó";
      
      let baseName = "";
      const playerIdStr = String(player.id);
      if (playerIdStr === '0') {
          baseName = 'Bạn';
      } else {
          baseName = playerIdStr.startsWith('bot') ? `Bot ${playerIdStr.replace('bot', '')}` : `Người chơi ${parseInt(playerIdStr) + 1}`;
      }

      const p1 = this.state?.players?.[0];
      if (p1 && player.id !== 0 && player.isRevealed) {
          const p1Faction = p1.isDaTam ? 'DaTam' : getPlayerFaction(p1);
          const pFaction = player.isDaTam ? 'DaTam' : getPlayerFaction(player);
          
          if (p1.isDaTam || player.isDaTam) {
              baseName += ' (Kẻ Thù)';
          } else if (p1Faction === pFaction && p1Faction) {
              baseName += ' (Đồng Minh)';
          } else if (p1Faction && pFaction) {
              baseName += ' (Kẻ Thù)';
          }
      }

      return baseName;
  }

  // TẦNG 1: Nhận Action từ người chơi, kiểm tra và Đẩy Event vào Hàng Đợi (Hoặc Ngăn Xếp)
  dispatchAction(action) {
    if (this.state.waitingForResponse) {
       // Nếu đang chờ phản hồi (ví dụ: Chờ Né), thì Action phải là Reaction (Phản hồi)
       // Push thẳng vào reactionStack để ưu tiên xử lý trước (LIFO)
       this.state.reactionStack.push({ type: `EVENT_${action.type}`, payload: action.payload });
    } else {
       // Nếu đang ở trạng thái rảnh (Main Phase), Action là hành động thường
       // Push vào actionQueue (FIFO)
       this.state.actionQueue.push({ type: `EVENT_${action.type}`, payload: action.payload });
    }
    
    // Kích hoạt Vòng lặp State Machine
    this.tick();
    
    // Notify listeners that state has changed
    this.notifyListeners();
  }

  // [REMOVED] resumeDispatcher() — Hàm rỗng, đã xóa bỏ. Tất cả lời gọi trong SkillRegistry cũng đã xóa.

  // VÒNG LẶP STATE MACHINE
  tick() {
    // Phase 2: Chặn nested tick() hoàn toàn.
    // Khi skill gọi tick() từ trong resolveEvent(), vòng lặp ngoài sẽ tự xử lý tiếp.
    // Nested tick() là NO-OP.
    this._tickDepth++;
    if (this._tickDepth > 1) {
      this._tickDepth--;
      return; // NO-OP: vòng lặp ngoài sẽ tiếp tục
    }

    try {
    let loopCount = 0; // Chống lặp vô hạn (Infinite Loop Protection)
    
    while (loopCount < 1000) {
       // 1. Ưu tiên ReactionStack (Xử lý chuỗi Chen ngang - Chain Resolution)
           if (this.state.reactionStack.length > 0) {
               const event = this.state.reactionStack.pop();
           
           // Nếu đang ở play_phase mà có Event mới đẩy vào Stack (do User đánh bài),
           // Xóa tạm thời trạng thái chờ để Game Loop phân giải chuỗi Event này!
           if (this.state.waitingForResponse && this.state.waitingForResponse.type === 'play_phase' && event.type !== 'EVENT_ACTION_END_PHASE') {
               this.state.waitingForResponse = null;
           }
           
           this.resolveEvent(event);
           loopCount++;
           if (this.state.waitingForResponse) {
                const req = this.state.waitingForResponse;
                if (req.type === 'ask_negate' && !req.isCanGianAsked) {
                     const isSingleTarget = ['hoacong', 'steal', 'dismantle'].includes(req.trickType) && !req.aoeTargets; 
                     if (isSingleTarget) {
                         const targetPlayer = this.state.players.find(p => p.id === req.targetId);
                         const isHa = targetPlayer && [HeroRegistry[targetPlayer.mainHeroId], HeroRegistry[targetPlayer.subHeroId]].some((h, i) => h && targetPlayer.revealedHeroes[i] && h.faction === 'Hà');
                         if (isHa) {
                              const canGianPlayers = this.state.players.filter(p => p.id !== req.targetId && p.isAlive && p.hand.length > 0 && [HeroRegistry[p.mainHeroId], HeroRegistry[p.subHeroId]].some((h, i) => h && p.revealedHeroes[i] && h.skills?.some(s => s.id === 'can-gian')));
                              if (canGianPlayers.length > 0) {
                                  req.isCanGianAsked = true; 
                                  this.state.waitingForResponse = {
                                      type: 'ask_can_gian',
                                      responderId: canGianPlayers[0].id,
                                      originalReq: req,
                                      askQueue: canGianPlayers.map(p => p.id),
                                      targetId: req.targetId,
                                      sourceId: canGianPlayers[0].id
                                  };
                              }
                         }
                     }
                }
                 // Safety net: Luôn sync responderId từ askQueue nếu có (vì shift() thay đổi queue)
                 const _req = this.state.waitingForResponse;
                 if (_req) {
                    if (_req.askQueue && _req.askQueue.length > 0) {
                       _req.responderId = _req.askQueue[0]; // Luôn sync với đầu queue
                    } else if (_req.responderId === undefined || _req.responderId === null) {
                       _req.responderId = _req.targetId ?? _req.sourceId;
                    }
                 }
                break;
           }
           continue; 
       }
       
       // 2. Nếu ReactionStack rỗng, xử lý ActionQueue (Hành động chính)
       if (this.state.actionQueue.length > 0) {
           const event = this.state.actionQueue.shift();
           // Đưa hành động chính vào Stack để bắt đầu chuỗi phân giải mới
           this.state.reactionStack.push(event);
           loopCount++;
           continue;
       }
       
       // 3. Cả Stack và Queue đều rỗng
       // Nếu đang ở Phase Hành Động (play_phase), mở lại trạng thái chờ để User có thể đánh bài tiếp
       if (this.state.currentPhase === 'action' && !this.state.waitingForResponse) {
           this.state.waitingForResponse = { type: 'play_phase', responderId: this.state.currentPlayerIndex, targetId: this.state.currentPlayerIndex };
       }
       
       // Cả Stack và Queue đều rỗng, kết thúc xử lý
       break;
    }
    
    if (loopCount >= 1000) {
       console.error("CRITICAL ERROR: Infinite Loop detected in Engine Tick!");
    }
    } finally {
      this._tickDepth--;
    }
  }

  // TẦNG 1.5: Ghi Log
  addLog(text, type = 'normal') {
      this.state.history.push({ text, type, timestamp: Date.now() });
      if (this.state.history.length > 50) {
          this.state.history.shift(); // Giữ tối đa 50 dòng log
      }
  }

  // TẦNG 2: Xử lý Event trên Ngăn Xếp
  resolveEvent(event) {
      console.log(`[Dispatcher] Bắt đầu xử lý Event: ${event.type}`);

      // 1. Kích hoạt Hook TRƯỚC khi xử lý Event
      this.triggerHooks('before_' + event.type, event.payload);

      // 2. Nếu Event đã bị hủy bởi Hook, thì bỏ qua
      if (event.payload && event.payload.isCancelled) {
         console.log(`[Dispatcher] Event ${event.type} đã bị hủy bởi Hook!`);
         return;
      }

      // 3. Xử lý Event chính — Ưu tiên delegate cho các Handler module
      if (handlePhaseEvent(this, event)) return;
      if (handleCombatEvent(this, event)) return;
      if (handleTrickEvent(this, event)) return;

      // 4. Fallback: Command events (ACTION_*) — vẫn nằm trong Dispatcher
      switch (event.type) {
         case 'EVENT_ASK_NEGATE': {
            const { sourceId, targetId, trickType, sourceCardId } = event.payload;
            
            // Hỏi vòng tròn tất cả người chơi sống xem có ai muốn hóa giải không
            // Người đầu tiên được quyền Hóa Giải là người BỊ HỎI (targetId)
            const aliveIds = this.state.players.filter(p => p.isAlive).map(p => p.id);
            const orderedIds = this.getOrderedTargets(targetId, aliveIds);
            
            this.state.waitingForResponse = {
                type: 'ask_negate',
                responderId: orderedIds[0],
                sourceId,
                targetId,
                trickType,
                sourceCardId,
                isNegated: false, // Bắt đầu chưa bị hóa giải
                askQueue: orderedIds // Mảng lưu những người sẽ được hỏi lần lượt
            };
            return; // Trả về để Game Loop ngắt quãng, chờ UI hoặc Bot
         }

         case 'EVENT_ACTION_DRAW_CARDS': {
            const { skipDraw, drawExtra, khaiQuoc } = event.payload;
            const playerId = event.payload.playerId ?? event.payload.targetId;
            if (this.state.waitingForResponse && this.state.waitingForResponse.type === 'draw_phase' && this.state.waitingForResponse.targetId === playerId) {
               this.state.waitingForResponse = null;
               
               if (skipDraw) {
                   const p = this.state.players.find(p => p.id === playerId);
                   if (p) p.usedNhiepChinh = true;
                   this.addLog(`👑 ${this.getHeroName(p)} dùng [Nhiếp Chính]: Bỏ qua rút bài, Tầm đánh vô hạn và Chém vô hạn trong lượt này!`, 'important');
                   this.state.reactionStack.push({ type: 'EVENT_APPLY_DRAW', payload: { targetId: playerId, isCancelled: true } });
               } else if (khaiQuoc) {
                   this.addLog(`🛡️ ${this.getHeroName(this.state.players.find(p => p.id === playerId))} dùng [Khai Quốc]: Rút thêm 2 lá bài!`, 'important');
                   // Push EVENT_TRIGGER_SKILL_ASK first, so it executes AFTER EVENT_APPLY_DRAW (because reactionStack is LIFO)
                   this.state.reactionStack.push({ type: 'EVENT_TRIGGER_SKILL_ASK', payload: { request: { type: 'ask_khai_quoc', sourceId: playerId } } });
                   this.state.reactionStack.push({ type: 'EVENT_APPLY_DRAW', payload: { targetId: playerId, drawnCards: 4 } });
               } else {
                   if (drawExtra) {
                       this.addLog(`🛡️ ${this.getHeroName(this.state.players.find(p => p.id === playerId))} dùng [Bình Ngô]: Rút thêm 1 lá bài!`, 'important');
                   }
                   this.state.reactionStack.push({ type: 'EVENT_APPLY_DRAW', payload: { targetId: playerId, drawnCards: drawExtra ? 3 : 2 } });
               }
            }
            break;
         }

         case 'EVENT_ACTION_PLAY_CARD': {
            const payload = event.payload;
            const playerId = payload.playerId ?? payload.sourceId;
            const cardId = payload.cardId;
            const targets = payload.targets || payload.targetIds || (payload.targetId !== undefined ? [payload.targetId] : []);
            const virtualCardName = payload.virtualCardName || payload.cardName;
            
            const player = this.state.players.find(p => p.id === playerId);
            
            // 1. Tìm lá bài vật lý (có thể ở tay hoặc trang bị)
            let card = null;
            if (player) {
               card = player.hand.find(c => c.id === cardId) || player.equipment.find(c => c.id === cardId);
            }
            if (!card && !virtualCardName) {
               console.error(`Thẻ bài ${cardId} không tồn tại trên tay người chơi ${playerId}`);
               return;
            }

            const cardNameDisplay = virtualCardName || (card ? card.name : 'bài');
            let targetNames = '';
            if (targets && targets.length > 0) {
                targetNames = targets.map(tid => {
                    const t = this.state.players.find(p => p.id === tid);
                    return t ? this.getHeroName(t) : tid;
                }).join(', ');
            }

            // 2. Xác định configName chính xác
            const configName = mapVietnameseToSlug(virtualCardName || (card ? card.name : null)) || (cardId ? cardId.replace(/-[0-9]+-[0-9]+$/, '') : null);

            // Xử lý mặc định cho bài Trang Bị (không cần Registry)
            if (card && card.type === 'equip') {
               // Log trang bị
               this.addLog(`🛡️ ${this.getHeroName(player)} trang bị [${cardNameDisplay}].`);
               
               // Tìm loại trang bị (Vũ khí, Phòng cụ, Ngựa công, Ngựa thủ)
               const newSubType = getCardSubType(card);
               const existingIndex = player.equipment.findIndex(c => getCardSubType(c) === newSubType);
               if (existingIndex !== -1) {
                   const oldCard = player.equipment[existingIndex];
                   this.applyEffect(Effects.MoveCardEffect(oldCard.id, 'equipment', 'discardPile', playerId));
               }

               // Chuyển bài từ hand sang equipment
               this.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'equipment', playerId, playerId));
               // TODO: Có thể áp dụng các hiệu ứng mặc định nếu trang bị cũ bị đè
               return;
            }

            // 3. Kiểm tra xem bài có trong Registry không
            if (!CardRegistry[configName]) {
               console.error(`Chưa hỗ trợ xử lý lá bài: ${configName}`);
               return;
            }
            
            const validation = canPlayCard(this.state, playerId, payload.virtualCardName || payload.cardId, payload.cardId);
             if (!validation.valid && !payload.activeSkill) {
                 this.addLog(`❌ Không thể sử dụng: ${validation.reason}`, 'error');
                 console.error(`Invalid PlayCard: ${validation.reason}`);
                 break;
             }

            // Ghi Log HỢP LỆ (sau khi qua validation)
            if (targetNames) {
                this.addLog(`⚔️ ${this.getHeroName(player)} đánh [${cardNameDisplay}] lên ${targetNames}.`);
            } else {
                this.addLog(`⚔️ ${this.getHeroName(player)} sử dụng [${cardNameDisplay}].`);
            }

            // 5. Validate Mục tiêu bằng TargetResolver
            let finalTargets = targets;
            
            // Bỏ qua validate nếu là bài trang bị vì nó luôn tự target bản thân
            // Bỏ qua validate nếu bài đến từ kỹ năng (activeSkill) — kỹ năng đã xác nhận action
            if (!payload.activeSkill && (!card || card.type !== 'equip')) {
                const targetValidation = validateTargetPayload(this.state, playerId, configName, payload.cardId, targets);

                if (!targetValidation.valid) {
                     this.addLog(`❌ Lỗi chọn mục tiêu: ${targetValidation.reason}`, 'error');
                     console.error(`Invalid Target Payload: ${targetValidation.reason}`);
                     return;
                }

                if (targetValidation.requiresAutoCast && targets.length === 0) {
                     finalTargets = [targetValidation.autoTarget];
                } else if (!targetValidation.requiresAutoCast && targets.length === 0) {
                     // Nếu bài AoE/None và không có payload mục tiêu, 
                     // fallback về behavior cũ là đưa toàn bộ mảng ID hoặc để trống cho onPlay tự giải quyết.
                     if (['da-man', 'loan-tien', 'hoi-xuan', 'dao-vien', 'ngu-coc', 'vo-trung'].includes(configName)) {
                         const validTargets = getValidCardTargets(this.state, playerId, configName);
                         finalTargets = validTargets.map(t => t.id);
                     }
                }
            }

            // 6. Gọi logic từ CardRegistry
            const cardConfig = CardRegistry[configName];
            if (cardConfig && cardConfig.onPlay) {
               console.log('[DEBUG] Executing onPlay for', configName, 'targets:', finalTargets);
               cardConfig.onPlay(this, this.state, playerId, finalTargets, cardId);
            } else {
               console.log('[DEBUG] No onPlay found for', configName);
            }
            
            // 7. Kích hoạt Hook ON_USE_CARD (dùng cho Duyên Tiên v.v)
            if (cardConfig) {
               this.triggerHooks('ON_USE_CARD', { sourceId: playerId, cardId: cardId, configName: configName, cardType: cardConfig.type, isDelayed: cardConfig.isDelayed, isReforge: payload.isReforge });
            }
            
            break;
         }
         
         case 'EVENT_ACTION_USE_SKILL': {
            const { playerId, skillId, targets, options } = event.payload;
            const validation = canUseSkill(this.state, playerId, skillId);
            if (!validation.valid) {
               console.error(`Invalid UseSkill: ${validation.reason}`);
               return;
            }
            const skillConfig = SkillRegistry[skillId];
            if (skillConfig && skillConfig.onUse) {
               skillConfig.onUse(this, this.state, playerId, targets, options);
            }
            break;
         }

         case 'EVENT_ACTION_SKILL_RESPONSE': {
            const req = event.payload.req;
            if (!req) return;
            
            // Set tạm lại req để các hàm SkillRegistry có thể đọc được qua this.state.waitingForResponse
            this.state.waitingForResponse = req;

            // Hỗ trợ Bọc Trăm Trứng gọi bị động từ App.jsx Phase 4
            if (event.payload.callBocTramTrung) {
               // Đổi trạng thái sang ask_boc_tram_trung_slash
               const sourceId = req.targetId ?? event.payload.askerId ?? this.state.currentPlayerIndex; // Thường là mình (target của aoe/duel)
               const lacAllies = this.state.players.filter(p => p.id !== sourceId && p.isAlive && p.faction === 'Lạc');
               
               this.state.waitingForResponse = {
                  type: 'ask_boc_tram_trung_slash',
                  responderId: lacAllies[0]?.id,
                  sourceId: sourceId,
                  targetId: req.sourceId, // Người gây sát thương
                  isDefensive: true,
                  askQueue: lacAllies.map(p => p.id),
                  originalReq: req // Lưu lại request gốc để phục hồi nếu không ai giúp
               };
               return; // Dừng tại đây
            }
            
            // Hỗ trợ Tiên Phát (Lê Lợi) gọi bị động từ App.jsx
            if (event.payload.doTienPhat && (req.type === 'dodge' || req.type === 'aoe_trick')) {
               const sourceId = req.targetId; // Lĩnh sát thương
               const vietAllies = this.state.players.filter(p => p.id !== sourceId && p.isAlive && [HeroRegistry[p.mainHeroId], HeroRegistry[p.subHeroId]].some((h, i) => h && p.revealedHeroes[i] && h.faction === 'Việt'));
               
               if (vietAllies.length > 0) {
                   this.state.waitingForResponse = {
                       type: 'ask_tien_phat',
                       responderId: vietAllies[0].id,
                       targetId: vietAllies[0].id,
                       sourceId: sourceId, // Lord
                       originalReq: req,
                       askQueue: vietAllies.map(p => p.id)
                   };
                   this.addLog(`👑 [Tiên Phát] kích hoạt! Đợi đồng minh Phe Việt đánh [Né] giúp Chủ Công!`, 'important');
                   return; // Dừng tại đây
               } else {
                   this.addLog(`❌ Không có tướng Việt nào để gọi Tiên Phát!`, 'normal');
                   // Resume processing the dodge failure
               }
            }
            
            // Hỗ trợ khôi phục từ Bọc Trăm Trứng thất bại (Đã chuyển sang SkillRegistry xử lý)
            
            // Resolve skill name từ SKILL_CONSTANTS (Single Source of Truth)
            const skillName = resolveSkillId(req.type, req);
            console.log("RESOLVED SKILL NAME:", skillName);
            const skillConfig = SkillRegistry[skillName];
            
            if (skillConfig && skillConfig.onReact) {
               skillConfig.onReact(this, this.state, event.payload);
            } else {
               if (event.payload.doBagua) {
                   const player = this.state.players[0]; // TODO: Lấy từ payload.playerId
                   if (this.state.deck.length === 0) {
                      this.state.deck = [...this.state.discardPile].reverse();
                      this.state.discardPile = [];
                   }
                   const judgeCard = this.state.deck.pop();
                   this.state.discardPile.push(judgeCard);
                   const isRed = judgeCard.color === 'red';
                   
                   const hasThanGiap = [HeroRegistry[player.mainHeroId], HeroRegistry[player.subHeroId]].some((h, i) => h && player.revealedHeroes[i] && h.skills?.some(s => s.id === 'than-giap'));
                   const sourceName = hasThanGiap && !player.equipment.some(e => e.name === 'Bát Quái' || e.name === 'Hắc Thuẫn') ? 'Thần Giáp' : 'Bát Quái';
                   
                   this.addLog(`☯️ Phán xét [${sourceName}]: Rút được ${judgeCard.suit} ${judgeCard.rank} ${isRed ? '[Thành công]' : '[Thất bại]'}`);
                   
                   if (isRed) {
                       // Phán xét thành công, tạo giả ReactAction đánh Né
                       this.state.waitingForResponse = null;
                       this.state.reactionStack.unshift({
                          type: 'EVENT_ACTION_REACT',
                          payload: { 
                             playerId: player.id, 
                             responseType: 'play', 
                             data: { cardId: null, virtualCardName: 'Né' } 
                          }
                       });
                   } else {
                       // Phán xét thất bại, đòi Né tiếp nhưng không cho dùng Bát Quái nữa
                       if (this.state.waitingForResponse) {
                           this.state.waitingForResponse.baguaAvailable = false;
                       }
                   }
                   // Dù thành công hay thất bại, không cần return ở đây nữa vì đã đồng bộ
                   // Nếu isRed, tick() tiếp theo (vì vòng lặp outside) sẽ xử lý EVENT_ACTION_REACT.
                   // Nếu !isRed, waitingForResponse vẫn còn (chỉ baguaAvailable = false), nên resolveEvent xong, tick() sẽ dừng lại chờ tiếp.
               }
               
               if (event.payload.doReact !== undefined || event.payload.doNegate !== undefined || event.payload.doSave !== undefined || event.payload.doUse !== undefined || event.payload.doProvide !== undefined || event.payload.doDiscard !== undefined || event.payload.doReveal !== undefined) {
                   // Map doReact sang ACTION_REACT
                   const player = this.state.players.find(p => p.id === req.targetId) || this.state.players[0]; // TODO: lấy từ payload nếu có
                   const isPlay = event.payload.doReact || event.payload.doNegate || event.payload.doSave || event.payload.doUse || event.payload.doProvide || event.payload.doDiscard || event.payload.doReveal;
                   const actionStr = isPlay ? 'play' : 'skip';
                   
                   let cardIdx = event.payload.cardIndexSelected;
                   if (cardIdx === undefined) cardIdx = event.payload.negateCardIndex;
                   
                   let cIds = [];
                   if (event.payload.cardIndexesSelected) {
                       cIds = event.payload.cardIndexesSelected.map(idx => player.hand[idx]?.id);
                   } else if (cardIdx !== undefined) {
                       const cid = player.hand[cardIdx]?.id;
                       if (cid) cIds.push(cid);
                   }
                   
                   // Hỗ trợ đánh trang bị từ Chương Dương
                   let equipId = null;
                   if (event.payload.negateEquipIndex !== undefined) {
                       equipId = player.equipment[event.payload.negateEquipIndex]?.id;
                       if (equipId) cIds.push(equipId);
                   }
                   
                   // Hỗ trợ cardIdxs cho một số case chọn nhiều lá
                   this.state.reactionStack.unshift({
                      type: 'EVENT_ACTION_REACT',
                      payload: { 
                         playerId: player.id, 
                         responseType: actionStr, 
                         data: { 
                             cardId: cIds[0], // Hỗ trợ backward tương thích 
                             cardIds: cIds, 
                             virtualCardName: event.payload.virtualCardName || (event.payload.doNegate ? 'Hóa Giải' : null) 
                         } 
                      }
                   });
               } else {
                   console.warn(`Không tìm thấy onReact cho skill ${skillName}`);
               }
            }
            break;
         }

         
         case 'EVENT_ACTION_END_PHASE': {
            const playerId = event.payload.playerId ?? event.payload.targetId;
            // Chỉ cho phép End Phase nếu đang trong Play Phase và đúng lượt của người đó
            if (this.state.waitingForResponse && this.state.waitingForResponse.type === 'play_phase' && this.state.waitingForResponse.targetId === playerId) {
               this.state.waitingForResponse = null; // Xóa trạng thái chờ để tick() đi tiếp
               const player = this.state.players.find(p => p.id === playerId);
               if (player) {
                   this.addLog(`⏱️ ${this.getHeroName(player)} đã kết thúc lượt.`, 'info');
               }
               
               // Khi người chơi chủ động End Phase, ta mới đẩy Discard và End vào Queue
               const p = this.state.players.find(x => x.id === playerId);
               this.addLog(`🛑 ${this.getHeroName(p)} đã kết thúc lượt Hành Động.`);
               
               const hasNhiepChinh = [HeroRegistry[p.mainHeroId], HeroRegistry[p.subHeroId]].some((h, i) => h && p.revealedHeroes && p.revealedHeroes[i] && h.skills?.some(s => s.id === 'nhiep-chinh'));
               if (hasNhiepChinh && !p.hasAttackedThisTurn && !p.hasPlayedSlashThisTurn) {
                   this.addLog(`✨ ${this.getHeroName(p)} phát động [Nhiếp Chính], tự động bỏ qua Giai đoạn Bỏ Bài!`, 'success');
                   this.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId: playerId } });
               } else {
                   this.state.actionQueue.push({ type: 'EVENT_PHASE_DISCARD', payload: { targetId: playerId } });
                   this.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId: playerId } });
               }
            }
            break;
         }

         case 'EVENT_ACTION_DISCARD': {
            const playerId = event.payload.playerId ?? event.payload.targetId;
            const cardIds = event.payload.cardIds;
            if (this.state.waitingForResponse && this.state.waitingForResponse.type === 'discard_phase' && this.state.waitingForResponse.targetId === playerId) {
               const discardCount = this.state.waitingForResponse.amount;
               if (cardIds.length === discardCount) {
                  // Vứt bài
                  cardIds.forEach(cardId => {
                     this.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
                  });
                  this.state.waitingForResponse = null; // Hoàn thành vứt bài, tiếp tục loop
               } else {
                  console.error(`Cần vứt đúng ${discardCount} lá bài!`);
               }
            }
            break;
         }

         case 'EVENT_ACTION_REACT': {
            const { playerId, responseType, data } = event.payload;
            
            const req = this.state.waitingForResponse;
            if (!req) return;
            
            // Hỗ trợ Bát Quái (judge)
            if (responseType === 'judge' || (data && data.doJudge)) {
               this.state.waitingForResponse = null;
               this.state.reactionStack.unshift({
                   type: 'EVENT_SKILL_RESPONSE',
                   payload: { req, doBagua: true, playerId }
               });
               return;
            }
            
            let expectedPlayerId = req.responderId ?? req.targetId;
            
            if (req.askQueue && req.askQueue.length > 0) {
                expectedPlayerId = req.askQueue[0];
            } else if (req.type === 'ask_snatch' || req.type === 'ask_dismantle') {
                expectedPlayerId = req.sourceId;
            } else if (expectedPlayerId === undefined && req.sourceId !== undefined) {
                 expectedPlayerId = req.sourceId;
             }
             console.log(`[TRACE] expectedPlayerId: ${expectedPlayerId}, playerId: ${playerId}, req.type: ${req.type}, req.askQueue:`, req.askQueue);
             if (expectedPlayerId !== playerId) {
               console.warn(`ReactAction phớt lờ do sai đối tượng. Mong đợi: ${expectedPlayerId}, Nhận: ${playerId}`);
               return;
            }

            const waitingType = req.type;
            console.log("[TRACE] EVENT_ACTION_REACT running for type:", waitingType, "with playerId:", playerId);
            // Giải phóng vòng lặp
            this.state.waitingForResponse = null; 

            // ============== CHUYỂN TIẾP ĐẾN SKILL RESPONSE ==============
            // Nếu waitingType không thuộc các loại cơ bản, chuyển qua cho SKILL_RESPONSE xử lý!
            if (!ALL_NATIVE_TYPES.includes(waitingType)) {
                 const isCanceled = responseType === 'skip' || responseType === 'cancel';
                 const skillPayload = data ? { playerId, ...data, doProvide: !isCanceled, canceled: isCanceled, req: req } : { playerId, doProvide: false, canceled: true, req: req };
                 
                 this.state.waitingForResponse = null; // Cần null để tick() loop tiếp tục chạy và lấy EVENT_ACTION_SKILL_RESPONSE ra xử lý!
                 this.state.reactionStack.push({
                     type: 'EVENT_ACTION_SKILL_RESPONSE',
                     payload: skillPayload
                 });
                 return;
            }

            // ============== EARLY BYPASS CHO DISMANTLE / SNATCH ==============
            // Vì các event này chọn bài từ mục tiêu (target) chứ không phải đánh bài từ trên tay mình
            if (waitingType === 'ask_dismantle' || waitingType === 'ask_snatch') {
                console.log(`[DEBUG_SNATCH] EVENT_ACTION_REACT for ${waitingType}`, data);
                if (data && data.cardId) {
                    if (waitingType === 'ask_dismantle') {
                        this.applyEffect(Effects.MoveCardEffect(data.cardId, data.zone === 'equip' ? 'equipment' : (data.zone === 'judge' ? 'judgementArea' : 'hand'), 'discardPile', req.targetId));
                        this.addLog(`🔥 ${this.getHeroName(this.state.players.find(p => p.id === playerId))} đã phá hủy 1 lá bài của ${this.getHeroName(this.state.players.find(p => p.id === req.targetId))}!`);
                    } else {
                        console.log(`[DEBUG_SNATCH] Moving card ${data.cardId} from ${req.targetId} to ${playerId}`);
                        this.applyEffect(Effects.MoveCardEffect(data.cardId, data.zone === 'equip' ? 'equipment' : (data.zone === 'judge' ? 'judgementArea' : 'hand'), 'hand', req.targetId, playerId));
                        this.addLog(`🖐️ ${this.getHeroName(this.state.players.find(p => p.id === playerId))} đã cướp 1 lá bài của ${this.getHeroName(this.state.players.find(p => p.id === req.targetId))}!`);
                    }
                }
                this.state.waitingForResponse = null;
                return;
            }

            // Nếu người chơi Bỏ qua (Không chọn bài)
            const isSkip = responseType === 'skip' || !data || (!data.cardId && !data.virtualCardName);
            if (isSkip && !['ask_negate', 'ask_peach', 'save'].includes(waitingType)) {
               if ((waitingType === 'ask_slash' || waitingType === 'borrow_sword') && req.isMuonDao) {
                   const borrower = this.state.players.find(p => p.id === req.borrowerId);
                   const targetA = this.state.players.find(p => p.id === playerId);
                   const weaponIdx = targetA?.equipment.findIndex(e => !e.name.includes('Ngựa') && e.name !== 'Bát Quái' && e.name !== 'Hắc Thuẫn');
                   if (weaponIdx >= 0 && borrower) {
                       const weapon = targetA.equipment[weaponIdx];
                       this.applyEffect(Effects.MoveCardEffect(weapon.id, 'equipment', 'hand', targetA.id, borrower.id));
                   }
               }
               return; // Vòng lặp chạy tiếp, ăn đòn
            }

            // Nếu có đánh bài (ví dụ đánh Né, Đào)
            const card = isSkip ? null : this.state.players.find(p => p.id === playerId)?.hand.find(c => c.id === data.cardId);
            if (!card && data && data.cardId) return; // cardId có thể null nếu đánh chay (như Bát Quái thành công)

            const configName = mapVietnameseToSlug((data && data.virtualCardName) || (card ? card.name : null)) || (data && data.cardId ? data.cardId.replace(/-[0-9]+-[0-9]+$/, '') : null);
            
            // Xóa bài khỏi tay (nếu có đánh lá bài thực)
            if (data && data.cardId) {
                this.applyEffect(Effects.MoveCardEffect(data.cardId, 'hand', 'discardPile', playerId));
            }
            
            if (!isSkip) {
                const playedName = card ? `[${card.name} - ${card.suit}${card.rank}]` : (data && data.virtualCardName ? `[${data.virtualCardName}] (Kỹ năng)` : `[Trang bị]`);
                this.addLog(`🛡️ ${this.getHeroName(this.state.players.find(p => p.id === playerId))} dùng ${playedName} để phản ứng!`);
            }

            // Logic giải quyết Dựa theo trạng thái chờ
            if ((waitingType === 'ask_dodge' || waitingType === 'dodge' || (waitingType === 'aoe_trick' && req.trickType === 'arrows')) && configName === 'ne') {
               if (req.reqDodges > 1) {
                  req.reqDodges -= 1;
                  this.addLog(`🛡️ ${this.getHeroName(this.state.players.find(p => p.id === playerId))} đã dùng 1 [Né], còn cần thêm ${req.reqDodges} [Né]!`, 'info');
                  this.state.waitingForResponse = req;
                  return; // Đợi tiếp tục
               }
               // Triệt tiêu sát thương: Quét Stack tìm EVENT_DAMAGE chĩa vào playerId và cắm cờ isCancelled
               console.log('[DEBUG_DODGE] Searching for EVENT_DAMAGE for playerId', playerId);
                   console.log('[DEBUG_DODGE] Stack contains:', this.state.reactionStack.map(e => e.type + ' (target=' + e.payload.targetId + ')'));
                   const dmgEvent = this.state.reactionStack.findLast(e => e.type === 'EVENT_DAMAGE' && e.payload.targetId === playerId);
                   if (dmgEvent) console.log('[DEBUG_DODGE] Found EVENT_DAMAGE to cancel!'); else console.log('[DEBUG_DODGE] NOT FOUND!');
               if (dmgEvent) dmgEvent.payload.isCancelled = true;
               
               // Kích hoạt hook ON_DODGE
               this.triggerHooks('ON_DODGE', { sourceId: playerId, attackerId: req.sourceId });
            }
            else if ((waitingType === 'ask_slash' || waitingType === 'duel_slash' || waitingType === 'borrow_sword' || (waitingType === 'aoe_trick' && req.trickType === 'barbarian')) && configName === 'chem') {
               if (req.reqSlashes > 1) {
                  req.reqSlashes -= 1;
                  this.addLog(`⚔️ ${this.getHeroName(this.state.players.find(p => p.id === playerId))} đã dùng 1 [Chém], còn cần thêm ${req.reqSlashes} [Chém]!`, 'info');
                  this.state.waitingForResponse = req;
                  return; // Đợi tiếp tục
               }
               // Triệt tiêu sát thương (từ Nam Man)
               console.log('[DEBUG_DODGE] Searching for EVENT_DAMAGE for playerId', playerId);
                   console.log('[DEBUG_DODGE] Stack contains:', this.state.reactionStack.map(e => e.type + ' (target=' + e.payload.targetId + ')'));
                   const dmgEvent = this.state.reactionStack.findLast(e => e.type === 'EVENT_DAMAGE' && e.payload.targetId === playerId);
                   if (dmgEvent) console.log('[DEBUG_DODGE] Found EVENT_DAMAGE to cancel!'); else console.log('[DEBUG_DODGE] NOT FOUND!');
               if (dmgEvent) dmgEvent.payload.isCancelled = true;

               // Báo cho Event Duel biết là đã chém
               const duelEvent = this.state.reactionStack.findLast(e => e.type === 'EVENT_DUEL_RESOLVE');
               if (duelEvent) duelEvent.payload.slashReacted = true;
               
               // Logic Mượn Đao đánh tiếp (Push Damage và Ask Dodge cho nạn nhân)
               if (req.isMuonDao) {
                   let damageAmount = 1;
                   const borrower = this.state.players.find(p => p.id === playerId);
                   if (borrower && borrower.drankWine) {
                       damageAmount++;
                       borrower.drankWine = false;
                   }
                   
                   this.state.reactionStack.push({
                      type: 'EVENT_DAMAGE',
                      payload: { sourceId: playerId, targetId: req.targetId, amount: damageAmount, damageType: 'normal', sourceCardId: data.cardId }
                   });
                   this.state.reactionStack.push({
                      type: 'EVENT_ASK_DODGE',
                      payload: { sourceId: playerId, targetId: req.targetId, cardPlayedId: data.cardId }
                   });
               }
            }
            else if (waitingType === 'discard_phase') {
               if (data && data.cardIds && Array.isArray(data.cardIds)) {
                  data.cardIds.forEach(cardId => {
                     this.applyEffect(Effects.MoveCardEffect(cardId, 'hand', 'discardPile', playerId));
                  });
               }
            }
            
            // ============== LOGIC ASK PEACH ==============
            if (waitingType === 'ask_peach' || waitingType === 'save') {
                if (configName === 'dao' || configName === 'ruou') {
                    // Cứu thành công 1 máu
                    this.applyEffect(Effects.RecoverEffect(req.dyingId, 1));
                    this.triggerHooks('ON_PEACH', { sourceId: playerId, targetId: req.dyingId });
                    
                    const updatedDyingPlayer = this.state.players.find(p => p.id === req.dyingId);
                    if (updatedDyingPlayer && updatedDyingPlayer.hp <= 0) {
                        // Vẫn còn chết, hỏi lại từ đầu (để người vừa ném Đào có thể ném tiếp)
                        const aliveIds = this.state.players.filter(p => p.isAlive).map(p => p.id);
                        req.askQueue = this.getOrderedTargets(req.dyingId, aliveIds);
                        this.state.waitingForResponse = req;
                        this.state.waitingForResponse.targetId = req.askQueue[0];
                        return; // Tiếp tục hỏi
                    }
                    // Nếu HP > 0, thoát khỏi trạng thái Dying
                    // Xóa EVENT_DEATH dưới đáy stack
                    const deathIdx = this.state.reactionStack.findIndex(e => e.type === 'EVENT_DEATH' && e.payload.targetId === req.dyingId);
                    if (deathIdx >= 0) this.state.reactionStack.splice(deathIdx, 1);
                    this.state.waitingForResponse = null;
                    return; // Sống sót, tiếp tục game
                } else {
                    // Người này bỏ qua, chuyển sang người tiếp theo trong hàng đợi
                    if (req.askQueue.length > 0 && req.askQueue[0] === playerId) {
                        req.askQueue.shift();
                    }
                    if (req.askQueue.length > 0) {
                        this.state.waitingForResponse = req;
                        this.state.waitingForResponse.targetId = req.askQueue[0];
                        return; // Đợi người tiếp theo
                    } else {
                        // Người đó đã CHẾT!
                        this.state.waitingForResponse = null;
                        this.state.reactionStack.push({ type: 'EVENT_DEATH', payload: { targetId: req.dyingId, sourceId: req.sourceId } });
                        return; // Đợi người tiếp theo
                    }
                    // Nếu đã hỏi hết mà không ai cứu, Game Loop sẽ tự bốc EVENT_DEATH ra để xử
                }
            }
            
            // ============== LOGIC ASK NEGATE ==============
            if (waitingType === 'ask_negate') {
                if (configName === 'hoa-giai') {
                    req.isNegated = !req.isNegated;
                    req.lastNegaterId = playerId;
                    // Reset vòng hỏi bắt đầu từ người vừa đánh Hóa Giải
                    const aliveIds = this.state.players.filter(p => p.isAlive).map(p => p.id);
                    req.askQueue = this.getOrderedTargets(playerId, aliveIds);
                    
                    this.addLog(`🛑 ${this.getHeroName(this.state.players.find(p => p.id === playerId))} đã dùng [Hóa Giải]!`, 'important');
                    this.triggerHooks('after_NEGATE', { sourceId: playerId, targetId: req.targetId, isNegated: req.isNegated, sourceCardId: req.sourceCardId });
                    
                    this.state.waitingForResponse = req;
                    return; // Tiếp tục chờ vòng mới, không xóa req
                } else {
                    // Người này bỏ qua (không đánh hóa giải)
                    if (req.askQueue.length > 0 && req.askQueue[0] === playerId) {
                        req.askQueue.shift();
                    }
                    
                    if (req.askQueue.length > 0) {
                        this.state.waitingForResponse = req;
                        return; // Vẫn còn người để hỏi
                    }
                    
                    // Nếu askQueue đã rỗng -> Kết thúc quá trình Ask Negate
                    const isNegatedFinal = req.isNegated;
                    const targetId = req.targetId;
                    const sourceCardId = req.sourceCardId;
                    this.state.waitingForResponse = null;
                    
                    if (isNegatedFinal) {
                        const targetPlayerName = this.getHeroName(this.state.players.find(p => p.id === targetId));
                        this.addLog(`✨ Tác dụng của lá bài lên ${targetPlayerName} đã bị vô hiệu hóa!`, 'success');
                        
                        // Triệt tiêu tất cả Event (Damage, AskSlash, Dismantle, Snatch, Duel) của lá Cẩm nang này lên mục tiêu này
                        this.state.reactionStack.forEach(e => {
                            const isMatchTarget = e.payload.targetId === targetId;
                            const isMatchBorrower = e.payload.isMuonDao && e.payload.sourceId === targetId;
                            
                            if (e.payload && e.payload.sourceCardId === sourceCardId && (isMatchTarget || isMatchBorrower)) {
                                e.payload.isCancelled = true;
                            }
                        });
                    }
                    
                    // Nếu xử lý xong Ask Negate, phải break để vòng lặp tick() tiếp tục lấy event ra chạy
                    break;
                }
            }

            
            // ============== LOGIC ASK HOA CONG ==============
            if (waitingType === 'ask_hoacong_reveal') {
                if (data && data.cardId) {
                    const revealedCard = this.state.players.find(p => p.id === req.targetId)?.hand.find(c => c.id === data.cardId);
                    if (revealedCard) {
                        this.addLog(`🔥 ${this.getHeroName(this.state.players.find(p => p.id === req.targetId))} phô bày 1 lá bài chất ${revealedCard.suit}!`);
                        this.state.waitingForResponse = { type: 'ask_hoacong_discard', responderId: req.sourceId, sourceId: req.sourceId, targetId: req.targetId, suit: revealedCard.suit, sourceCardId: req.sourceCardId };
                        return; // Chờ sourceId bỏ bài
                    }
                }
            }
            if (waitingType === 'ask_hoacong_discard') {
                if (data && data.cardId) {
                    const discardedCard = this.state.players.find(p => p.id === req.sourceId)?.hand.find(c => c.id === data.cardId);
                    if (discardedCard && discardedCard.suit === req.suit) {
                        this.applyEffect(Effects.MoveCardEffect(data.cardId, 'hand', 'discardPile', req.sourceId));
                        this.addLog(`🔥 ${this.getHeroName(this.state.players.find(p => p.id === req.sourceId))} bỏ 1 lá bài chất ${req.suit} để kích hoạt Hỏa Công!`);
                        
                        this.state.reactionStack.push({
                            type: 'EVENT_DAMAGE',
                            payload: { sourceId: req.sourceId, targetId: req.targetId, amount: 1, damageType: 'fire', sourceCardId: req.sourceCardId }
                        });
                    }
                }
            }
            
            // ============== LOGIC ASK PHAT TOI ==============
            if (waitingType === 'ask_phat_toi') {
                if (data && data.targetId !== undefined && data.targetId !== null) {
                    const target = this.state.players.find(p => p.id === data.targetId);
                    const player = this.state.players.find(p => p.id === req.sourceId);
                    this.addLog(`✨ ${this.getHeroName(player)} phát động [Phạt Tội] lên ${this.getHeroName(target)}!`, 'important');
                    
                    if (this.state.deck.length === 0) {
                        this.state.deck = [...this.state.discardPile].reverse();
                        this.state.discardPile = [];
                    }
                    const judgeCard = this.state.deck.pop();
                    this.state.discardPile.push(judgeCard);
                    this.addLog(`⚖️ [Phạt Tội] phán xét: ${judgeCard.suit} ${judgeCard.rank} (${judgeCard.color})!`, 'important');
                    
                    if (judgeCard.suit === '♠') {
                        this.addLog(`⚡ ${this.getHeroName(target)} nhận 2 sát thương Lôi vì [Phạt Tội]!`, 'damage');
                        this.state.reactionStack.push({
                            type: 'EVENT_DAMAGE',
                            payload: { sourceId: player.id, targetId: target.id, amount: 2, damageType: 'lightning' }
                        });
                    } else if (judgeCard.suit === '♣') {
                        this.applyEffect(Effects.RecoverEffect(player.id, 1));
                        this.addLog(`💖 ${this.getHeroName(player)} hồi 1 HP và gây 1 sát thương Lôi cho ${this.getHeroName(target)}!`, 'heal');
                        this.state.reactionStack.push({
                            type: 'EVENT_DAMAGE',
                            payload: { sourceId: player.id, targetId: target.id, amount: 1, damageType: 'lightning' }
                        });
                    } else {
                        this.addLog(`💨 [Phạt Tội] không có tác dụng!`, 'normal');
                    }
                }
                this.state.waitingForResponse = null;
                break;
            }
            
            // ============== LOGIC ASK TRE NGA DISCARD ==============
            if (waitingType === 'ask_tre_nga_discard') {
                if (data && data.cardId) {
                    this.applyEffect(Effects.MoveCardEffect(data.cardId, 'hand', 'discardPile', req.targetId));
                    this.addLog(`🎋 ${this.getHeroName(this.state.players.find(p => p.id === req.targetId))} đã bỏ 1 lá bài Né để tránh [Thánh Gióng]!`);
                    
                    // Người chơi đã bỏ 1 Né, nên Event Damage bị Hủy!
                    const damageEvent = this.state.reactionStack.find(e => e.type === 'EVENT_APPLY_DAMAGE' && e.payload.targetId === req.targetId);
                    if (damageEvent) damageEvent.payload.isCancelled = true;
                    
                    this.state.waitingForResponse = null;
                } else {
                    // Chịu sát thương (không làm gì cả, cứ để cho damage event phía dưới giải quyết)
                    this.addLog(`💥 ${this.getHeroName(this.state.players.find(p => p.id === req.targetId))} không thể tránh [Thánh Gióng] và chịu đòn!`);
                    this.state.waitingForResponse = null;
                }
                 break;
            }
            
            // Xóa waitingForResponse nếu không return sớm (đã giải quyết xong response)
            this.state.waitingForResponse = null;
            break;
         }

         // [EXTRACTED] EVENT_DAMAGE, EVENT_APPLY_DAMAGE → CombatHandler.js
         // [EXTRACTED] EVENT_ASK_DODGE, EVENT_DO_ASK_DODGE, EVENT_ASK_SLASH → CombatHandler.js
         // [EXTRACTED] EVENT_DYING, EVENT_DO_DYING, EVENT_DEATH → CombatHandler.js
         // [EXTRACTED] EVENT_TRIGGER_SKILL_ASK → TrickHandler.js
         // [EXTRACTED] EVENT_DISMANTLE, EVENT_SNATCH, EVENT_HOA_CONG → TrickHandler.js
         // [EXTRACTED] EVENT_DRAW_CARDS, EVENT_CHAIN, EVENT_ASK_TRE_NGA_DISCARD → TrickHandler.js
         // [EXTRACTED] EVENT_JUDGE → TrickHandler.js
         // [EXTRACTED] EVENT_TURN_START → PhaseHandler.js
         // [EXTRACTED] EVENT_PHASE_* → PhaseHandler.js
         // [EXTRACTED] EVENT_NEXT_TURN → PhaseHandler.js
         // [EXTRACTED] EVENT_DUEL, EVENT_DUEL_RESOLVE → CombatHandler.js
         case 'EVENT_ACTION_REVEAL_HERO': {
            const { playerId, heroIndex } = event.payload;
            const player = this.state.players.find(p => p.id === playerId);
            if (player && !player.revealedHeroes[heroIndex]) {
               const isFirstReveal = !player.isRevealed;
               
               // QUY TẮC QUỐC CHIẾN: Tướng đầu tiên mở sẽ LÀ Tướng Chính (index 0).
               // Nếu lật tướng ở vị trí 1 đầu tiên, hoán đổi chúng để vị trí 0 luôn là Tướng Chính.
               let actualRevealedIndex = heroIndex;
               if (isFirstReveal && heroIndex === 1) {
                  const tempId = player.mainHeroId;
                  player.mainHeroId = player.subHeroId;
                  player.subHeroId = tempId;
                  
                  // Swapping means we are now revealing index 0
                  actualRevealedIndex = 0;
               }

               player.revealedHeroes[actualRevealedIndex] = true;
               player.isRevealed = true;
               
               // Dã Tâm logic
               if (isFirstReveal) {
                  const totalPlayers = this.state.players.length;
                  const hero = HeroRegistry[player.mainHeroId]; // Luôn là mainHeroId vì đã hoán đổi nếu cần

                  if (hero) {
                     // Lấy chính xác phe gốc của Tướng đang được lật
                     const factionToCount = hero.faction;
                     
                     // Gán phe gốc và giới tính cho người chơi (phòng hờ cho Server Logic)
                     player.faction = factionToCount;
                     player.gender = hero.gender || 'Không';
                     
                     // Sử dụng Single Source of Truth
                     const sameFactionRevealed = getFactionCount(factionToCount, this.state.players);
                     
                     // Bàn 4 người -> max 2 người 1 phe. Vượt quá (tức >= 2) thì bị Dã Tâm.
                     const threshold = Math.floor(totalPlayers / 2);
                     
                     if (sameFactionRevealed > threshold) {
                        player.isDaTam = true;
                        this.addLog(`🐺 THAM VỌNG! ${this.getHeroName(player)} lật tướng là phe ${factionToCount.toUpperCase()} nhưng do phe này đã đạt giới hạn (${threshold} người), ${this.getHeroName(player)} trở thành DÃ TÂM!`, 'important');
                     }
                  }
               }
               
               this.addLog(`👁️ ${this.getHeroName(player)} đã lật tướng!`, 'important');
               
               // Tiên phong cắm cờ (First Blood Bonus)
               if (!this.state.hasFirstRevealHappened) {
                 this.state.hasFirstRevealHappened = true;
                 this.addLog(`🎁 Tiên phong lật tướng! ${this.getHeroName(player)} được rút 2 lá bài!`, 'important');
                 this.applyEffect(Effects.DrawCardEffect(playerId, 2));
               }
               
               // Rule: If total max HP of both heroes has 0.5 remainder (odd sum), draw 1 card upon revealing BOTH heroes.
               if (player.revealedHeroes[0] && player.revealedHeroes[1]) {
                 if (!player.hasReceivedHalfHpBonus) {
                    const hero1 = HeroRegistry[player.mainHeroId];
                    const hero2 = HeroRegistry[player.subHeroId];
                    if (hero1 && hero2 && (hero1.maxHp + hero2.maxHp) % 2 !== 0) {
                       player.hasReceivedHalfHpBonus = true;
                       this.applyEffect(Effects.DrawCardEffect(playerId, 1));
                       this.addLog(`🎁 Âm Dương giao hòa! ${this.getHeroName(player)} lật cả 2 tướng và nhận 1 lá bài!`, 'success');
                    }
                 }
               }
            }
            
            // Khởi động lại hook của phase hiện tại nếu người chơi vừa lật tướng có skill thuộc phase đó
            // Điều này giải quyết lỗi: "Lật tướng xong mất giai đoạn rút bài (mất cơ hội dùng Khởi Nghĩa/Dạ Trạch)"
            const req = this.state.waitingForResponse;
            if (req && req.type === 'draw_phase') {
               this.triggerHooks('DRAW_PHASE', { targetId: req.targetId });
            }
            break;
         }

         default:
            console.warn(`Unknown event type: ${event.type}`);
      }

      // 4. Kích hoạt Hook SAU khi xử lý Event
      this.triggerHooks('after_' + event.type, event.payload);
   }

  // TẦNG 3: Áp dụng Effect (Thay đổi State thực sự thông qua Reducer)
  applyEffect(effect) {
    this.state = reduce(this.state, effect);
  }

  triggerHooks(hookName, payload) {
    // Quét tất cả người chơi để tìm Kỹ năng hoặc Trang bị có đăng ký Hook này
    this.state.players.forEach(player => {
       if (!player.isAlive) return;

       // 1. Quét Kỹ năng (SkillRegistry)
       const heroes = [HeroRegistry[player.mainHeroId], HeroRegistry[player.subHeroId]];
       heroes.forEach((hero, index) => {
           if (hero && hero.skillIds) {
               hero.skillIds.forEach(skillId => {
                   const skillConfig = SkillRegistry[skillId];
                   if (skillConfig && skillConfig.hooks && skillConfig.hooks[hookName]) {
                       if (player.revealedHeroes && (player.revealedHeroes[index] || skillConfig.canTriggerUnrevealed)) {
                           skillConfig.hooks[hookName](this, this.state, player.id, payload);
                       }
                   }
               });
           }
       });

       // 2. Quét Trang bị (EquipRegistry)
       if (player.equipment) {
          player.equipment.forEach(equipCard => {
             const equipSlug = mapVietnameseToSlug(equipCard.name) || (equipCard.id ? equipCard.id.replace(/-[0-9]+-[0-9]+$/, '') : null);
             const equipConfig = EquipRegistry[equipSlug];
             if (equipConfig && equipConfig.hooks && equipConfig.hooks[hookName]) {
                equipConfig.hooks[hookName](this, this.state, player.id, payload);
             }
          });
       }
    });
  }
}
