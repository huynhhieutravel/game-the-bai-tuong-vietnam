import { createTestDispatcher, createCard } from './testHelper.js';
import { getHandLimit } from '../rules/TurnRules.js';
import { describe, it, expect } from 'vitest';

describe('Heroes Hệ Việt QA', () => {

  describe('Dương Đình Nghệ (Dưỡng Quân)', () => {
    it('Dưỡng Quân: Bỏ qua giai đoạn phán xét và rút bài để ra 1 Chém', () => {
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'duong-dinh-nghe',
          playerCount: 2,
          p0Hand: [],
          p1Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[1].hp = 3;
      
      // Bắt đầu lượt
      dispatcher.state.actionQueue.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
      dispatcher.tick();
      
      const askDuongQuan = dispatcher.state.waitingForResponse;
      expect(askDuongQuan).toBeDefined();
      expect(askDuongQuan.type).toBe('ask_duong_quan');
      
      // Chọn option 1: Bỏ qua Phán xét & Rút bài -> Chém
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
           playerId: 0,
           responseType: 'skill_response',
           data: {
               doUse: true,
               choices: [{ type: 'opt1', targetId: 1 }]
           }
        }
      });
      
      // Player 1 bị sát thương từ Chém ảo
      const askDodge = dispatcher.state.waitingForResponse;
      expect(askDodge).toBeDefined();
      expect(askDodge.type).toBe('ask_dodge');
      
      // Player 1 không có Né
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'cancel' }
      });
      
      expect(dispatcher.state.players[1].hp).toBe(2);
      expect(dispatcher.state.waitingForResponse?.type).toBe('play_phase');
      expect(dispatcher.state.currentPhase).toBe('action');
    });
  });

  describe('Phùng Hưng (Khởi Nghĩa)', () => {
    it('Khởi Nghĩa: Rút ít hơn 1 lá bài, tăng 1 sát thương cho Chém', () => {
      const chemCard = createCard('Chém');
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'phung-hung',
          playerCount: 2,
          p0Hand: [chemCard],
          p1Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[1].hp = 3;
      
      // Bắt đầu lượt
      dispatcher.state.actionQueue.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
      dispatcher.tick();
      
      const askKhoiNghia = dispatcher.state.waitingForResponse;
      expect(askKhoiNghia).toBeDefined();
      expect(askKhoiNghia.type).toBe('ask_khoi_nghia');
      
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
           playerId: 0,
           responseType: 'skill_response',
           data: { doUse: true }
        }
      });
      
      expect(dispatcher.state.players[0].khoiNghiaActive).toBe(true);
      
      dispatcher.dispatchAction({
        type: 'ACTION_PLAY_CARD',
        payload: { 
            playerId: 0, 
            cardId: chemCard.id, 
            targets: [1] 
        }
      });
      
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 1, responseType: 'cancel' }
      });
      
      // Target mất 2 HP (1 + 1 Khởi Nghĩa)
      expect(dispatcher.state.players[1].hp).toBe(1);
    });
  });

});
