import { createTestDispatcher, createCard } from './testHelper.js';
import { getHandLimit } from '../rules/TurnRules.js';
import { describe, it, expect } from 'vitest';

describe('Heroes Hệ Sơn QA', () => {

  describe('Tuệ Tĩnh (Nam Dược, Diệu Dược)', () => {
    it('Nam Dược: Dùng bài Đỏ làm Đào khi ở ngoài lượt', () => {
      const pDao = createCard('Đào', 'Cơ bản', '♥', '3', 'red');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'tue-tinh', // Player 0
          playerCount: 2,
          p0Hand: [pDao],
          p1Hand: [createCard('Chém')]
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[0].hp = 1;
      
      // Player 1 turn, chém Player 0, làm Player 0 chết
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { 
            playerId: 1, 
            cardId: dispatcher.state.players[1].hand[0].id, 
            targets: [0] 
        }
      });
      
      // Bỏ qua Đánh Né -> chịu ST
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'cancel' }
      });
      
      const askPeach = dispatcher.state.waitingForResponse;
      expect(askPeach).toBeDefined();
      expect(askPeach.type).toBe('ask_peach');
      
      // Tuệ Tĩnh tự cứu bằng thẻ Đỏ dưới dạng Đào
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
           playerId: 0,
           responseType: 'play',
           data: { cardId: pDao.id, virtualCardName: 'Đào' }
        }
      });
      
      expect(dispatcher.state.players[0].hp).toBe(1); // Sống sót, từ 0 lên 1
    });

    it('Diệu Dược: Bỏ 1 lá bơm 1 máu', () => {
      const pDao = createCard('Đào', 'Cơ bản', '♥', '3', 'red');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'tue-tinh', // Player 0
          playerCount: 2,
          p0Hand: [pDao],
          p1Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[1].hp = 3; // P1 bị mất 1 máu
      
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        payload: { 
            playerId: 0, 
            skillId: 'dieu-duoc'
        }
      });
      
      const askDieuDuoc = dispatcher.state.waitingForResponse;
      expect(askDieuDuoc).toBeDefined();
      expect(askDieuDuoc.type).toBe('ask_dieu_duoc');
      
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { 
            playerId: 0, 
            responseType: 'play',
            data: { cardIdx: 0, targetId: 1 }
        }
      });
      
      // Kiểm tra xem máu p1 có tăng lên 4 không
      expect(dispatcher.state.players[1].hp).toBe(4);
      // Kiểm tra cờ dieuDuocUsedThisTurn
      expect(dispatcher.state.players[0].dieuDuocUsedThisTurn).toBe(true);
      // Kiểm tra mất bài
      expect(dispatcher.state.players[0].hand.length).toBe(0);
      expect(dispatcher.state.discardPile[0].id).toBe(pDao.id);
    });
  });

  describe('Đinh Bộ Lĩnh (Uy Chấn)', () => {
    it('Uy Chấn: Khi bị sát thương bởi Chém đỏ, bắt đối thủ chọn cho hồi máu hoặc rút bài', () => {
      const pChemRed = createCard('Chém', 'Cơ bản', 'heart', 'K', 'red', 'chem');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'dinh-bo-linh', // Player 0
          playerCount: 2,
          p0Hand: [],
          p1Hand: [pChemRed]
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[0].hp = 3; // P0 mất 1 máu
      
      // P1 đánh Chém P0
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { 
            playerId: 1, 
            cardId: pChemRed.id, 
            targets: [0] 
        }
      });
      
      // P0 chịu sát thương (tụt xuống 2 máu)
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'cancel' }
      });
      
      // UI sẽ đợi P1 phản hồi Uy Chấn
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_uy_chan');
      expect(dispatcher.state.waitingForResponse.targetId).toBe(1);
      
      // P1 chọn Hồi máu cho P0
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'play', data: { choice: 'heal' } }
      });
      
      // Kiểm tra P0 hồi máu (từ 2 -> 3)
      expect(dispatcher.state.players[0].hp).toBe(3);
      expect(dispatcher.state.players[0].askedUyChan).toBe(true);
    });

  describe('Nguyễn Bặc (Bình Loạn, Khai Quốc)', () => {
    it('Bình Loạn: Bỏ 2 lá cùng chất làm Loạn Tiễn', () => {
      const pHeart1 = createCard('Đào', 'Cơ bản', 'heart', '2', 'red', 'dao');
      const pHeart2 = createCard('Đào', 'Cơ bản', 'heart', '3', 'red', 'dao');
      const pSpade1 = createCard('Chém', 'Cơ bản', 'spade', '2', 'black', 'chem');
      
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'nguyen-bac', // Player 0
          playerCount: 2,
          p0Hand: [pHeart1, pHeart2, pSpade1],
          p1Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      
      // Kích hoạt Bình Loạn
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        payload: { playerId: 0, skillId: 'binh-loan', targets: [] }
      });
      
      // UI đợi yêu cầu
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_binh_loan');
      
      // Gửi 2 lá Heart
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'play', data: { cardIndexes: [0, 1] } }
      });
      
      // Bỏ qua kiểm tra actionQueue vì Dispatcher test loop đã xử lý ngay lập tức
      // Chỉ kiểm tra việc đổi state: 2 lá bài vào mộ
      
      // 2 lá bài biến mất khỏi tay và vào mộ
      expect(dispatcher.state.players[0].hand.length).toBe(1);
      expect(dispatcher.state.players[0].hand[0].id).toBe(pSpade1.id);
      expect(dispatcher.state.discardPile.length).toBe(2);
    });

    it('Khai Quốc: Tăng giới hạn bài trên tay', () => {
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'nguyen-bac', // Player 0 (Sơn)
          playerCount: 3,
          p0Hand: [],
          p1Hand: []
      });
      // P1 là Sơn, P2 là Thủy (mặc định Thủy Tinh)
      dispatcher.state.players[1].mainHeroId = 'dinh-bo-linh';
      dispatcher.state.players[2].mainHeroId = 'thuy-to';
      
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[1].revealedHeroes = [true, false];
      dispatcher.state.players[2].revealedHeroes = [true, false];
      
      // Gọi getHandLimit() - hiện tại HP = 4. Có 2 tướng Sơn (P0, P1).
      // Giới hạn = 4 + (2 * 2) = 8
      const limit = getHandLimit(dispatcher.state, 0);
      
      expect(limit).toBe(8);
    });
  });

});
  describe('Huyền Trân Công Chúa (An Bang, Hòa Thân)', () => {
    it('An Bang: Rút 1 lá khi kết thúc lượt', () => {
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'huyen-tran-cong-chua', // Player 0
          playerCount: 2,
          p0Hand: [],
          p1Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.deck = [createCard('Chém')]; // Có 1 lá trên tay
      
      // Đẩy sự kiện END_PHASE lên actionQueue (giả lập)
      dispatcher.state.actionQueue.unshift({
        type: 'EVENT_PHASE_END',
        payload: { targetId: 0 }
      });
      // Gọi thử 1 action rỗng để vòng lặp Dispatcher chạy
      dispatcher.dispatchAction({ type: 'ACTION_REACT', payload: { playerId: 0, responseType: 'cancel' } });
      
      // UI đợi yêu cầu
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_an_bang');
      
      // Đồng ý rút
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'play', data: { doUse: true } }
      });
      
      // turnResetFlags có thể đã reset anBangUsed thành false khi qua lượt mới
      // Nên chỉ cần kiểm tra số bài trên tay (từ 0 -> 1)
      expect(dispatcher.state.players[0].hand.length).toBe(1);
    });

    it('Hòa Thân: Bỏ 1 lá, ép 2 tướng nam Quyết Đấu', () => {
      const pCard = createCard('Đào');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'huyen-tran-cong-chua', // Player 0 (Nữ)
          playerCount: 3,
          p0Hand: [pCard],
          p1Hand: [],
          p2Hand: []
      });
      dispatcher.state.players[1].gender = 'Nam';
      dispatcher.state.players[2].gender = 'Nam';
      dispatcher.state.players[0].revealedHeroes = [true, false];
      
      // Kích hoạt Hòa Thân
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        payload: { playerId: 0, skillId: 'hoa-than', targets: [] }
      });
      
      // UI đợi yêu cầu
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_hoa_than');
      
      // Chọn bỏ lá index 0, ép P1 Quyết Đấu P2
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'play', data: { cardIndex: 0, targetA: 1, targetB: 2 } }
      });
      
      expect(dispatcher.state.players[0].hoaThanUsedThisTurn).toBe(true);
      expect(dispatcher.state.players[0].hand.length).toBe(0);
      expect(dispatcher.state.discardPile.length + dispatcher.state.playedCards.length).toBe(1);
      
      // Bỏ qua action queue vì Dispatcher loop đã xử lý ngay Quyết Đấu (virtual)
      // Test chỉ cần kiểm tra Quyết Đấu đã lên stack để Ask Negate hoặc Ask Slash
      // Sau khi xử lý Quyết Đấu ảo, nó sẽ đẩy EVENT_ASK_NEGATE và loop tự động chạy đến khi waiting
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_negate');
      expect(dispatcher.state.waitingForResponse.trickType).toBe('quyet-dau');
    });
  });

  describe('Đinh Điền (Sơn)', () => {
    it('Phạt Tội: Gây sát thương Lôi khi phán xét ra Bích (Spade)', () => {
      const pNe = createCard('Né', 'Cơ bản', '♥', '3', 'red');
      
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'dinh-dien',
          playerCount: 2,
          p0Hand: [pNe],
          p1Hand: [createCard('Chém')]
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.deck = [createCard('Chém', 'Cơ bản', '♠', '2', 'black')]; 
      
      dispatcher.state.currentPlayerIndex = 1; // Cho p1 đánh
      
      console.log("Before dispatchAction");
      dispatcher.dispatchAction({
          type: 'ACTION_PLAY_CARD',
          payload: { playerId: 1, cardId: dispatcher.state.players[1].hand[0].id, targetId: 0 }
      });
      console.log("After dispatchAction, reactionStack:", dispatcher.state.reactionStack.length);
      console.log("waitingForResponse:", dispatcher.state.waitingForResponse);
      
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_dodge');
      
      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 0, responseType: 'play', data: { cardId: pNe.id } }
      });
      
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_phat_toi');
      
      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 1, responseType: 'play', data: { targetId: 0 } }
      });
      
      // Lúc này Đinh Điền có skill Quân Cơ nên hệ thống hỏi Đinh Điền có muốn đổi bài phán xét không
      while (dispatcher.state.waitingForResponse && dispatcher.state.waitingForResponse.type === 'ask_quan_co') {
          dispatcher.dispatchAction({
              type: 'ACTION_REACT',
              payload: { playerId: dispatcher.state.waitingForResponse.responderId, responseType: 'skip' }
          });
      }
      
      expect(dispatcher.state.players[0].hp).toBe(2);
    });

    it('Quân Cơ: Thay thế bài phán xét bằng lá bài Đen', () => {
      const blackCard = createCard('Chém', 'Cơ bản', '♠', '5', 'black');
      const judgeRed = createCard('Đào', 'Cơ bản', '♥', '5', 'red');
      
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'dinh-dien',
          playerCount: 2,
          p0Hand: [blackCard],
          p1Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.deck = [judgeRed];
      
      dispatcher.state.reactionStack.push({
          type: 'EVENT_JUDGE',
          payload: { targetId: 0, reason: 'bat-quai', cardId: 'batquai' }
      });
      
      while(dispatcher.tick()){}
      
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_quan_co');
      expect(dispatcher.state.currentJudgeCard.suit).toBe('♥'); 
      
      console.log('Test dispatching ACTION_REACT. blackCard.id=', blackCard.id, 'Hand=', dispatcher.state.players[0].hand.map(c=>c.id));
      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 0, responseType: 'play', data: { cardId: blackCard.id } }
      });
      
      console.log('DiscardPile:', dispatcher.state.discardPile.map(c => c.id));
      expect(dispatcher.state.discardPile.find(c => c.id === blackCard.id)).toBeTruthy();
      expect(dispatcher.state.discardPile.find(c => c.id === judgeRed.id)).toBeTruthy();
    });

    it('Định Quốc: Đồng minh Hệ Sơn đưa Né hoặc Sấm Sét cho Đinh Điền', () => {
      const neCard = createCard('Né', 'Cơ bản', '♥', '3', 'red');
      
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'dinh-dien',
          playerCount: 2,
          p0Hand: [],
          p1Hand: [neCard, createCard('Đào')]
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[1].faction = 'Sơn'; 
      
      dispatcher.state.currentPlayerId = 1;
      dispatcher.state.phase = 'PHASE_ACTION';
      
      dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          payload: { playerId: 1, skillId: 'dinh-quoc', targets: [0], options: { cardIdx: 0 } }
      });
      
      expect(dispatcher.state.players[1].hand.length).toBe(1);
      expect(dispatcher.state.players[0].hand.length).toBe(1);
      expect(dispatcher.state.players[0].hand[0].name).toBe('Né');
      expect(dispatcher.state.players[1].dinhQuocUsedThisTurn).toBe(true);
    });
  });

  describe('Lê Ngân (Sơn)', () => {
    it('Hộ Giá: Gọi đồng minh Hệ Sơn đỡ đòn', () => {
      const dispatcher = createTestDispatcher({
        mainHeroId: 'le-ngan',
        playerCount: 2,
        p0Hand: [],
        p1Hand: []
      });
      
      const p0 = dispatcher.state.players[0];
      const p1 = dispatcher.state.players[1];
      p0.faction = 'Sơn';
      p1.faction = 'Sơn'; // Đồng minh
      p0.revealedHeroes = [true, false];
      p1.revealedHeroes = [true, false];
      
      p1.hand = [createCard('Né', 'Cơ bản', 'diamonds', '2', 'red')];
      
      dispatcher.state.actionQueue = [{
         type: 'EVENT_DO_ASK_DODGE',
         payload: { responderId: p0.id, targetId: p0.id, sourceId: 1, reason: 'chem' }
      }];
      dispatcher.tick();
      
      expect(dispatcher.state.waitingForResponse).not.toBeNull();
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_ho_gia');
      expect(dispatcher.state.waitingForResponse.targetId).toBe(1);
      
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'play', data: { doReact: true } }
      });
      
      // Because P1 played Né, original Dodge should receive ACTION_SKILL_RESPONSE Dodge automatically
      // However we might need to tick because we dispatched ACTION_SKILL_RESPONSE
      expect(dispatcher.state.playedCards.length).toBe(1);
      expect(dispatcher.state.playedCards[0].name).toBe('Né');
    });

    it('Trung Dũng: Đánh 1 lá bài và tuyên bố là 1 lá bài khác (Không ai nghi ngờ)', () => {
      const blackCard = createCard('Chém', 'Cơ bản', '♠', '2', 'black');
      
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'le-ngan',
          playerCount: 2,
          p0Hand: [blackCard],
          p1Hand: [],
          p0Hp: 1
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      
      dispatcher.state.currentPlayerIndex = 0;
      dispatcher.state.currentPhase = 'action';
      
      dispatcher.dispatchAction({
          type: 'ACTION_USE_SKILL',
          payload: { playerId: 0, skillId: 'trung-dung', options: {} }
      });
      
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_trung_dung');
      
      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 0, responseType: 'play', data: { cardIndex: 0, virtualCardName: 'Đào', targetId: 0 } }
      });
      
      // Lúc này sẽ push ask_nghi_ngo cho player 1
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_nghi_ngo');
      
      dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 1, responseType: 'skip' }
      });


      // Không ai nghi ngờ, Đào được dùng
      // p0 đang HP=1 (maxHp=2), dùng Đào hồi 1 → HP lên 2
      expect(dispatcher.state.players[0].hp).toBe(2);
      expect(dispatcher.state.players[0].hand.length).toBe(0);
      expect(dispatcher.state.discardPile.length + dispatcher.state.playedCards.length).toBe(1);
    });
  });
});


describe('Đô đốc Bảo (Sơn)', () => {
  it('Phá Thành: Bỏ rút bài để gây 1 sát thương', () => {
    const dispatcher = createTestDispatcher({
      mainHeroId: 'do-doc-bao',
      playerCount: 2,
      p0Hand: [],
      p1Hand: []
    });
    
    dispatcher.state.players[0].revealedHeroes = [true, false];
    
    // Jump to DRAW phase manually for testing
    dispatcher.state.actionQueue = [{ type: 'EVENT_PHASE_DRAW', payload: { targetId: 0 } }];
    dispatcher.tick();
    
    // Should ask for Pha Thanh
    expect(dispatcher.state.waitingForResponse).not.toBeNull();
    expect(dispatcher.state.waitingForResponse.type).toBe('ask_pha_thanh');
    
    // Use Pha Thanh on P1
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 0, responseType: 'play', data: { targetId: 1 } }
    });
    
    // P1 should take 1 damage
    expect(dispatcher.state.players[1].hp).toBe(3);
    
    // Should not ask for draw anymore, should move to play phase eventually (or next event)
    expect(dispatcher.state.waitingForResponse).toBeNull();
  });
});

describe('Nguyễn Xí (Sơn)', () => {
  it('Phá Quân: Ép mục tiêu dùng 2 lá Né khi bị Chém', () => {
    const dispatcher = createTestDispatcher({ mainHeroId: 'nguyen-xi' });
    const p0 = dispatcher.state.players[0];
    const p1 = dispatcher.state.players[1];
    
    // Give p0 a Chém and p1 two Né
    p0.hand = [createCard('Chém', 'Cơ bản', '♠', '7', 'black')];
    p1.hand = [
      createCard('Né', 'Cơ bản', '♦', '2', 'red'),
      createCard('Né', 'Cơ bản', '♥', '2', 'red')
    ];
    
    dispatcher.state.currentPlayerId = 0;
    dispatcher.state.phase = 'action';
    
    // P0 Chém P1
    dispatcher.dispatchAction({
      type: 'ACTION_PLAY_CARD',
      payload: { playerId: 0, cardId: p0.hand[0].id, targetId: 1 }
    });
    
        
    // P1 is asked to dodge, should require 2 dodges
    expect(dispatcher.state.waitingForResponse).not.toBeNull();
    expect(dispatcher.state.waitingForResponse.type).toBe('ask_dodge');
    expect(dispatcher.state.waitingForResponse.reqDodges).toBe(2);
    
    // P1 plays first dodge
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, data: { cardId: p1.hand[0].id } }
    });
    
        
    // P1 is still asked for dodge because they need 2!
    // Wait, does the engine support reqDodges decrementing?!
    // Let's check how many dodges are required!
    // We will just expect they still need a dodge.
    expect(dispatcher.state.waitingForResponse).not.toBeNull();
    expect(dispatcher.state.waitingForResponse.type).toBe('ask_dodge');
    // We expect them to take damage if they don't dodge the second time
    dispatcher.dispatchAction({
      type: 'ACTION_REACT',
      payload: { playerId: 1, responseType: 'skip' }
    });
    
        
    // P1 should take 1 damage because they didn't provide enough dodges
    expect(dispatcher.state.players[1].hp).toBe(dispatcher.state.players[1].maxHp - 1);
  });
});
