import { describe, it, expect, beforeEach } from 'vitest';
import { createTestState, createTestDispatcher, createCard, resetCardCounter } from './testHelper';
import { Dispatcher } from '../core/Dispatcher';
import { getDistance } from '../rangeSystem';

describe('Heroes Hệ Lạc - Thánh Gióng', () => {
  beforeEach(() => {
    resetCardCounter();
  });

  describe('Thiết Mã (Thụ động)', () => {
    it('Giảm khoảng cách tính toán từ Thánh Gióng tới người khác đi 1', () => {
      // Setup 3 người chơi
      const state = createTestState({ playerCount: 3, mainHeroId: 'thanh-giong' });
      
      // Thánh Gióng ở vị trí 0, người khác ở 1 và 2.
      // Khoảng cách vật lý từ 0 đến 2 là 1 (vì xoay vòng 3 người). Khoảng cách từ 0 đến 1 là 1.
      // Tuy nhiên nếu có 4 người, từ 0 đến 2 là 2.
      const state4 = createTestState({ playerCount: 4, mainHeroId: 'thanh-giong' });
      const tg = state4.players[0];
      const p2 = state4.players[2]; // Khoảng cách vật lý = 2
      // p2 không phải là Thánh Gióng
      p2.mainHeroId = 'son-tinh';
      p2.subHeroId = 'son-tinh';
      
      const range = getDistance(state4, tg.id, p2.id);
      // Phạm vi = khoảng cách - 1 (do Thiết Mã)
      // Khoảng cách từ 0 đến 2 là 2. Có Thiết Mã thì range tính = 2 - 1 = 1. 
      // Hàm getPlayerRange trả về khoảng cách ĐÃ TÍNH TOÁN.
      expect(range).toBe(1);
      
      // Người khác nhìn Thánh Gióng vẫn bình thường
      const rangeBack = getDistance(state4, p2.id, tg.id);
      expect(rangeBack).toBe(2);
    });
  });

  describe('Tre Ngà (Kích hoạt)', () => {
    it('Phán xét khi đánh Chém, khóa kỹ năng và cấm Né nếu không bỏ bài', () => {
      const p0Hand = [createCard('Chém', 'Cơ bản', 'spade', '7', 'black')];
      const p1Hand = [createCard('Né', 'Cơ bản', 'diamond', '8', 'red')];
      
      const dispatcher = createTestDispatcher({ mainHeroId: 'thanh-giong', p0Hand, p1Hand });
      
      // Đặt 1 lá bài Phán Xét lên đầu deck
      dispatcher.state.deck = [
         createCard('Phán Xét', 'Cơ bản', 'heart', '2', 'red') // Chất Cơ
      ];
      
      // Thánh Gióng (0) đánh Chém mục tiêu (1)
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: {
           playerId: 0,
           cardId: p0Hand[0].id,
           targets: [1]
        }
      });
      
      // Tre Ngà kích hoạt, yêu cầu mục tiêu bỏ bài cùng chất
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_tre_nga_discard');
      expect(dispatcher.state.waitingForResponse.judgeSuit).toBe('heart');
      
      // Mục tiêu (1) bị khóa kỹ năng
      expect(dispatcher.state.players[1].isSkillsSuppressed).toBe(true);
      
      // Mục tiêu (1) chọn KHÔNG bỏ bài
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
           playerId: 1,
           responseType: 'skip'
        }
      });
      
      // Bị trúng Chém do Tre Ngà cấm Né
      expect(dispatcher.state.players[1].hp).toBe(3);
    });

    it('Mục tiêu có thể bỏ bài cùng chất phán xét để dùng Né', () => {
      const p0Hand = [createCard('Chém', 'Cơ bản', 'spade', '7', 'black')];
      // Mục tiêu có Né (Diamond) và 1 lá bài Cơ (Heart) để bỏ
      const p1Hand = [
         createCard('Né', 'Cơ bản', 'diamond', '8', 'red'),
         createCard('Chém', 'Cơ bản', 'heart', '9', 'red')
      ];
      
      const dispatcher = createTestDispatcher({ mainHeroId: 'thanh-giong', p0Hand, p1Hand });
      
      // Đặt 1 lá bài Phán Xét lên đầu deck (Chất Cơ)
      dispatcher.state.deck = [
         createCard('Phán Xét', 'Cơ bản', 'heart', '2', 'red') // Chất Cơ
      ];
      
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: {
           playerId: 0,
           cardId: p0Hand[0].id,
           targets: [1]
        }
      });
      
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_tre_nga_discard');
      
      // Mục tiêu (1) chọn BỎ BÀI (Chất Cơ)
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
           playerId: 1,
           responseType: 'play',
           data: {
              cardId: p1Hand[1].id, // Bỏ lá Chém Cơ
              doDiscard: true
           }
        }
      });
      
      // Đã bỏ bài thành công -> Chuyển sang yêu cầu Né
      console.log("WAITING TYPE:", dispatcher.state.waitingForResponse?.type);
      expect(dispatcher.state.waitingForResponse.type).toBe('ask_dodge');
      
      // Mục tiêu (1) dùng Né
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
           playerId: 1,
           responseType: 'play',
           data: {
              cardId: p1Hand[0].id // Đánh Né
           }
        }
      });
      
      // Không mất máu
      expect(dispatcher.state.players[1].hp).toBe(4);
    });
  });
});
