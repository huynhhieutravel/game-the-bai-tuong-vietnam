import { createTestDispatcher, createCard } from './testHelper.js';
import { getHandLimit } from '../rules/TurnRules.js';
import { describe, it, expect } from 'vitest';

describe('Heroes Hệ Việt QA', () => {

  describe('Triệu Quang Phục (Dạ Trạch)', () => {
    it('Dạ Trạch: Bỏ qua rút bài, cướp 1 bài của nhiều người chơi', () => {
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'trieu-quang-phuc',
          playerCount: 3,
          p0Hand: [],
          p1Hand: [createCard('Chém')],
          p2Hand: [createCard('Đào')]
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[0].hp = 2; // Mất 2 máu
      
      dispatcher.state.actionQueue.push({ type: 'EVENT_TURN_START', payload: { playerId: 0 } });
      dispatcher.tick();
      
      const askDaTrach = dispatcher.state.waitingForResponse;
      expect(askDaTrach).toBeDefined();
      expect(askDaTrach.type).toBe('ask_da_trach');
      
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: {
           playerId: 0,
           responseType: 'skill_response',
           data: {
               doUse: true,
               targets: [1, 2] // Cướp của P1, P2
           }
        }
      });
      
      expect(dispatcher.state.players[1].hand.length).toBe(0);
      expect(dispatcher.state.players[2].hand.length).toBe(0);
      expect(dispatcher.state.players[0].hand.length).toBe(2);
      expect(dispatcher.state.phase).toBe('action'); // Bỏ qua draw_phase
    });
  });

  describe('Khúc Thừa Dụ (Tự Chủ, Khoan Dân)', () => {
    it('Tự Chủ: Đấu điểm thắng thì bắt đối thủ tự gây sát thương, thua thì mất 1 máu', () => {
      const p0CardWin = createCard('Chém', 'Cơ bản', 'spade', 'K'); // Rank K
      const p1CardLose = createCard('Đào', 'Cơ bản', 'heart', '2'); // Rank 2
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'khuc-thua-du',
          playerCount: 3,
          p0Hand: [p0CardWin],
          p1Hand: [p1CardLose],
          p2Hand: []
      });
      dispatcher.state.players[0].revealedHeroes = [true, false];
      dispatcher.state.players[0].hp = 2; // P0 máu < P1
      dispatcher.state.players[1].hp = 3;
      dispatcher.state.players[2].hp = 3;
      
      // Use skill
      dispatcher.dispatchAction({
         type: 'ACTION_USE_SKILL',
         payload: { playerId: 0, skillId: 'tu-chu', targets: [1] }
      });
      
      const askTuChu = dispatcher.state.waitingForResponse;
      expect(askTuChu).toBeDefined();
      expect(askTuChu.type).toBe('ask_tu_chu');
      
      // Chọn đấu
      console.log('Tự Chủ: Chọn đấu', dispatcher.state.players[0].hand, dispatcher.state.players[1].hand);
      dispatcher.dispatchAction({
         type: 'ACTION_REACT',
         payload: { playerId: 0, responseType: 'skill_response', data: { doUse: true, targetId: 1, cardIdx: 0 } }
      });
      console.log('Tự Chủ: Sau khi đấu, waitingForResponse =', dispatcher.state.waitingForResponse);
      
      // Khúc Thừa Dụ thắng -> ask_tu_chu_target (ép đối thủ gây sát thương cho người khác)
      const askTuChuTarget = dispatcher.state.waitingForResponse;
      expect(askTuChuTarget.type).toBe('ask_tu_chu_target');
      expect(askTuChuTarget.duelTargetId).toBe(1);
      
      // Chọn P2 làm mục tiêu nhận sát thương
      dispatcher.dispatchAction({
         type: 'ACTION_REACT',
         payload: { playerId: 0, responseType: 'skill_response', data: { targetId: 2 } }
      });
      
      expect(dispatcher.state.players[2].hp).toBe(2); // P2 mất 1 máu
    });

    it('Khoan Dân: Cho mục tiêu rút bài đến khi bằng Max HP', () => {
       const dispatcher = createTestDispatcher({ 
          mainHeroId: 'khuc-thua-du',
          playerCount: 2,
          p0Hand: [],
          p1Hand: []
       });
       dispatcher.state.players[0].revealedHeroes = [true, false];
       dispatcher.state.players[1].maxHp = 4;
       
       dispatcher.state.reactionStack.push({
           type: 'EVENT_DAMAGE',
           payload: { sourceId: 1, targetId: 0, amount: 1, damageType: 'normal' }
       });
       dispatcher.tick();
       
       const askKhoanDan = dispatcher.state.waitingForResponse;
       expect(askKhoanDan.type).toBe('ask_khoan_dan');
       
       // Cho P1 rút
       dispatcher.dispatchAction({
          type: 'ACTION_REACT',
          payload: { playerId: 0, responseType: 'skill_response', data: { doUse: true, targetId: 1 } }
       });
       
       expect(dispatcher.state.players[1].hand.length).toBe(4); // P1 rút 4 lá
    });
  });

  describe('Lý Thường Kiệt (Nam Quốc Sơn Hà, Tiên Phát)', () => {
    it('Nam Quốc Sơn Hà: Lấy lá bài gây sát thương và rút 1 bài', () => {
       const chemCard = createCard('Chém');
       const dispatcher = createTestDispatcher({ 
          mainHeroId: 'ly-thuong-kiet',
          playerCount: 2,
          p0Hand: [],
          p1Hand: [chemCard]
       });
       dispatcher.state.players[0].revealedHeroes = [true, false];
       dispatcher.state.players[1].hp = 3;
       
       // P1 dùng Chém lên P0
       dispatcher.dispatchAction({
           type: 'ACTION_PLAY_CARD',
           payload: { playerId: 1, cardId: chemCard.id, targets: [0] }
       });
       
       // P0 không Né
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'cancel' }
       });
       
       expect(dispatcher.state.players[0].hp).toBe(3); // Mất 1 máu
       
       // Nam Quốc Sơn Hà kích hoạt
       const askNqsh = dispatcher.state.waitingForResponse;
       expect(askNqsh).toBeDefined();
       expect(askNqsh.type).toBe('ask_nam_quoc_son_ha');
       
       // Dùng skill
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 0, responseType: 'skill_response', data: { doUse: true } }
       });
       
       // P0 rút 1 bài + lấy lá Chém
       expect(dispatcher.state.players[0].hand.length).toBe(2);
       expect(dispatcher.state.players[0].hand.some(c => c.id === chemCard.id)).toBe(true);
    });

    it('Tiên Phát: Đồng minh đánh Né hộ', () => {
       const neCard = createCard('Né');
       const dispatcher = createTestDispatcher({ 
          mainHeroId: 'ly-thuong-kiet',
          playerCount: 3,
          p0Hand: [], // LTK không có Né
          p1Hand: [createCard('Chém')], // Địch
          p2Hand: [neCard] // Đồng minh hệ Việt
       });
       dispatcher.state.players[0].revealedHeroes = [true, false]; // Việt
       dispatcher.state.players[2].revealedHeroes = [true, false]; // Việt (cùng hệ)
       dispatcher.state.players[2].faction = 'Việt';
       
       // P1 dùng Chém lên P0
       dispatcher.dispatchAction({
           type: 'ACTION_PLAY_CARD',
           payload: { playerId: 1, cardId: dispatcher.state.players[1].hand[0].id, targets: [0] }
       });
       
       // Tiên Phát kích hoạt hỏi P2
       const askTienPhat = dispatcher.state.waitingForResponse;
       expect(askTienPhat).toBeDefined();
       expect(askTienPhat.type).toBe('ask_tien_phat');
       expect(askTienPhat.targetId).toBe(2);
       
       // P2 đồng ý dùng Né hộ
       dispatcher.dispatchAction({
           type: 'ACTION_REACT',
           payload: { playerId: 2, responseType: 'skill_response', data: { doReact: true, cardId: neCard.id } }
       });
       
       // P0 không mất máu
       expect(dispatcher.state.players[0].hp).toBe(4);
       expect(dispatcher.state.players[2].hand.length).toBe(0); // P2 mất Né
    });
  });

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

  describe('Trần Quang Khải (Đoạt Sáo, Chương Dương)', () => {
    it('Đoạt Sáo: Lật mặt, rút 4 bài và bỏ 1 bài vào cuối lượt', () => {
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'tran-quang-khai',
          playerCount: 2
      });
      const p0 = dispatcher.state.players[0];
      p0.revealedHeroes = [true, false];
      p0.skills = ['doat-sao'];
      p0.hand = [];
      
      // Kích hoạt END_PHASE
      dispatcher.state.actionQueue.push({ type: 'EVENT_PHASE_END', payload: { targetId: 0 } });
      dispatcher.tick();
      
      const askDoatSao = dispatcher.state.waitingForResponse;
      expect(askDoatSao).toBeDefined();
      expect(askDoatSao.type).toBe('ask_doat_sao');
      
      // Đồng ý dùng Đoạt Sáo
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'skill_response', data: { doUse: true } }
      });
      
      // Bỏ 1 bài
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'skill_response', data: { cardIndexSelected: 0 } }
      });
      
      expect(dispatcher.state.players[0].isFlipped).toBe(true);
      expect(dispatcher.state.players[0].hand.length).toBe(3);
    });
  });

  describe('Nguyễn Lữ (Tiên Phong)', () => {
    it('Tiên Phong: Tự mất 1 máu để gây 1 sát thương', () => {
      const dispatcher = createTestDispatcher({ 
          mainHeroId: 'nguyen-lu',
          playerCount: 2
      });
      const p0 = dispatcher.state.players[0];
      p0.revealedHeroes = [true, false];
      p0.skills = ['tien-phong'];
      p0.hp = 3;
      
      const p1 = dispatcher.state.players[1];
      p1.hp = 3;
      
      // Phát động Tiên Phong
      dispatcher.dispatchAction({
        type: 'ACTION_USE_SKILL',
        payload: { playerId: 0, skillId: 'tien-phong', targets: [1] }
      });
      
      const askTienPhong = dispatcher.state.waitingForResponse;
      expect(askTienPhong).toBeDefined();
      expect(askTienPhong.type).toBe('ask_tien_phong');
      
      // Chọn trả giá bằng máu
      dispatcher.dispatchAction({
        type: 'ACTION_REACT',
        payload: { playerId: 0, responseType: 'skill_response', data: { doUse: true, targetId: 1, costType: 'hp' } }
      });
      
      expect(dispatcher.state.players[0].hp).toBe(2);
      expect(dispatcher.state.players[1].hp).toBe(2);
    });
  });

});
