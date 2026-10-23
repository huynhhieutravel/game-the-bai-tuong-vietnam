import { describe, test, expect, beforeEach } from 'vitest';
import { Dispatcher } from '../core/Dispatcher';
import { PlayCardAction, ReactAction } from '../core/Actions';
import { createTestState, createCard, resetCardCounter } from './testHelper';

beforeEach(() => {
  resetCardCounter();
});

describe('Vũ Khí (Weapons)', () => {
  describe('1. Liên Nỏ', () => {
    test('Bắn vô hạn Chém trong lượt', () => {
      const lienNo = createCard('Liên Nỏ', 'Trang bị', 'spade', '1');
      const slash1 = createCard('Chém', 'Cơ bản', 'spade', '7');
      const slash2 = createCard('Chém', 'Cơ bản', 'spade', '8');
      const slash3 = createCard('Chém', 'Cơ bản', 'spade', '9');
      
      const state = createTestState({
        p0Hand: [lienNo, slash1, slash2, slash3],
        p1Hand: []
      });
      const dispatcher = new Dispatcher(state);
      
      // Equip Lien No
      dispatcher.dispatchAction(PlayCardAction(0, lienNo.id, []));
      expect(dispatcher.getState().players[0].equipment.length).toBe(1);
      expect(dispatcher.getState().players[0].equipment[0].name).toBe('Liên Nỏ');

      // Slash 1
      dispatcher.dispatchAction(PlayCardAction(0, slash1.id, [1]));
      dispatcher.dispatchAction(ReactAction(1, 'skip'));
      expect(dispatcher.getState().players[1].hp).toBe(3);

      // Slash 2 - Normally blocked, but Lien No allows it
      dispatcher.dispatchAction(PlayCardAction(0, slash2.id, [1]));
      dispatcher.dispatchAction(ReactAction(1, 'skip'));
      expect(dispatcher.getState().players[1].hp).toBe(2);

      // Slash 3
      dispatcher.dispatchAction(PlayCardAction(0, slash3.id, [1]));
      dispatcher.dispatchAction(ReactAction(1, 'skip'));
      expect(dispatcher.getState().players[1].hp).toBe(1);

      // Bây giờ p0 tháo Liên Nỏ
      const effect = {
          type: 'MOVE_CARD',
          cardId: lienNo.id,
          fromZone: 'equipment',
          toZone: 'discardPile',
          fromPlayerId: 0
      };
      dispatcher.applyEffect(effect);
      expect(dispatcher.getState().players[0].equipment.length).toBe(0);

      // Thử đánh Slash 4
      const slash4 = createCard('Chém', 'Cơ bản', 'spade', '10');
      dispatcher.getState().players[0].hand.push(slash4);
      dispatcher.dispatchAction(PlayCardAction(0, slash4.id, [1]));

      // Không thể đánh vì đã đánh 3 lần (limit giờ lại là 1)
      expect(dispatcher.getState().players[0].hand.length).toBe(1); // Lá bài không mất đi
      expect(dispatcher.getState().players[1].hp).toBe(1); // Hp giữ nguyên
    });
    });
  });


  describe('2. Thanh Long Đao', () => {
    test('Đánh Chém bị Né, được phép đánh tiếp Chém', () => {
      const thanhLongDao = createCard('Thanh Long Đao', 'Trang bị', 'spade', '1');
      const slash1 = createCard('Chém', 'Cơ bản', 'spade', '7');
      const slash2 = createCard('Chém', 'Cơ bản', 'spade', '8');
      const dodge = createCard('Né', 'Cơ bản', 'heart', '2');
      
      const state = createTestState({
        p0Hand: [thanhLongDao, slash1, slash2],
        p1Hand: [dodge]
      });
      const dispatcher = new Dispatcher(state);
      
      // Equip Thanh Long Dao
      dispatcher.dispatchAction(PlayCardAction(0, thanhLongDao.id, []));
      
      // Slash 1
      dispatcher.dispatchAction(PlayCardAction(0, slash1.id, [1]));
      
      // P1 Dodges
      dispatcher.dispatchAction(ReactAction(1, 'skill_response', { cardId: dodge.id }));
      
      // HP is untouched, and engine asks P0 to use Thanh Long Dao
      expect(dispatcher.getState().players[1].hp).toBe(4);
      const req = dispatcher.getState().waitingForResponse;
      expect(req).toBeDefined();
      expect(req.type).toBe('ask_weapon_skill');
      expect(req.weapon).toBe('Thanh Long Đao');
      
      // P0 uses Slash 2 via Thanh Long Dao
      dispatcher.dispatchAction(ReactAction(0, 'skill_response', { 
        doUse: true,
        cardId: slash2.id
      }));
      
      // P1 has no dodge and takes 1 damage
      dispatcher.dispatchAction(ReactAction(1, 'skip'));
      expect(dispatcher.getState().players[1].hp).toBe(3);
    });
  });

  describe('3. Rìu Đá', () => {
    test('Đánh Chém bị Né, bỏ 2 bài để bắt buộc trúng', () => {
      const riuDa = createCard('Rìu Đá', 'Trang bị', 'spade', '1');
      const slash = createCard('Chém', 'Cơ bản', 'spade', '7');
      const dump1 = createCard('Chém', 'Cơ bản', 'spade', '8');
      const dump2 = createCard('Chém', 'Cơ bản', 'spade', '9');
      const dodge = createCard('Né', 'Cơ bản', 'heart', '2');
      
      const state = createTestState({
        p0Hand: [riuDa, slash, dump1, dump2],
        p1Hand: [dodge]
      });
      const dispatcher = new Dispatcher(state);
      
      dispatcher.dispatchAction(PlayCardAction(0, riuDa.id, []));
      dispatcher.dispatchAction(PlayCardAction(0, slash.id, [1]));
      
      // P1 Dodges
      dispatcher.dispatchAction(ReactAction(1, 'skill_response', { cardId: dodge.id }));
      
      // Engine should ask P0 for Rìu Đá (bỏ 2 bài)
      const req = dispatcher.getState().waitingForResponse;
      expect(req).toBeDefined();
      expect(req.type).toBe('ask_weapon_skill');
      expect(req.weapon).toBe('Rìu Đá');
      
      // P0 uses Rìu Đá, discarding dump1 and dump2
      dispatcher.dispatchAction(ReactAction(0, 'skill_response', { 
        doUse: true,
        cardIds: [dump1.id, dump2.id]
      }));
      
      // The damage should go through because it was made unavoidable!
      expect(dispatcher.getState().players[1].hp).toBe(3);
    });
  });

  describe('4. Phương Thiên Kích', () => {
    test('Nếu Chém là lá bài cuối cùng trên tay, đánh được 3 mục tiêu', () => {
      const phuongThienKich = createCard('Phương Thiên Kích', 'Trang bị', 'spade', '1');
      const slash = createCard('Chém', 'Cơ bản', 'spade', '7');
      
      const state = createTestState({
        p0Hand: [slash],
        p1Hand: [],
        playerCount: 4
      });
      // P0 needs the equip
      state.players[0].equipment.push(phuongThienKich);
      
      const dispatcher = new Dispatcher(state);
      
      dispatcher.dispatchAction(PlayCardAction(0, slash.id, [1, 2, 3]));
      
      // LIFO order for asks: 3, 2, 1
      dispatcher.dispatchAction(ReactAction(3, 'skip'));
      dispatcher.dispatchAction(ReactAction(2, 'skip'));
      dispatcher.dispatchAction(ReactAction(1, 'skip'));
      
      expect(dispatcher.getState().players[1].hp).toBe(3);
      expect(dispatcher.getState().players[2].hp).toBe(3);
      expect(dispatcher.getState().players[3].hp).toBe(3);
    });
  });

  describe('5. Song Kiếm', () => {
    test('Đánh Chém mục tiêu khác giới tính, ép họ bỏ 1 bài hoặc mình rút 1 bài', () => {
      const songKiem = createCard('Song Kiếm', 'Trang bị', 'spade', '1');
      const slash = createCard('Chém', 'Cơ bản', 'spade', '7');
      const discardMe = createCard('Chém', 'Cơ bản', 'heart', '2');
      
      const state = createTestState({
        p0Hand: [songKiem, slash],
        p1Hand: [discardMe]
      });
      // Set genders
      state.players[0].gender = 'Nam';
      state.players[1].gender = 'Nữ';
      
      const dispatcher = new Dispatcher(state);
      
      dispatcher.dispatchAction(PlayCardAction(0, songKiem.id, []));
      dispatcher.dispatchAction(PlayCardAction(0, slash.id, [1]));
      
      // P1 should be asked to use weapon skill (discard 1 card or P0 draws)
      const req = dispatcher.getState().waitingForResponse;
      expect(req).toBeDefined();
      expect(req.type).toBe('ask_weapon_skill');
      expect(req.weapon).toBe('Song Kiếm');
      expect(req.responderId).toBe(1);
      
      // P1 decides to discard a card
      dispatcher.dispatchAction(ReactAction(1, 'skill_response', { 
        doUse: true,
        cardIds: [discardMe.id]
      }));
      
      expect(dispatcher.getState().players[1].hand.length).toBe(0);
    });
  });

  describe('6. Quạt Sắt', () => {
    test('Bỏ 2 bài để gây thêm 1 sát thương hỏa khi đánh trúng', () => {
      const quatSat = createCard('Quạt Sắt', 'Trang bị', 'spade', '1');
      const slash = createCard('Chém', 'Cơ bản', 'spade', '7');
      const dump1 = createCard('Chém', 'Cơ bản', 'spade', '8');
      const dump2 = createCard('Chém', 'Cơ bản', 'spade', '9');
      
      const state = createTestState({
        p0Hand: [quatSat, slash, dump1, dump2],
        p1Hand: []
      });
      
      const dispatcher = new Dispatcher(state);
      
      dispatcher.dispatchAction(PlayCardAction(0, quatSat.id, []));
      dispatcher.dispatchAction(PlayCardAction(0, slash.id, [1]));
      
      // P1 has no dodge
      dispatcher.dispatchAction(ReactAction(1, 'skip'));
      
      // P0 should be asked to use Quạt Sắt before damage is applied
      const req = dispatcher.getState().waitingForResponse;
      expect(req).toBeDefined();
      expect(req.type).toBe('ask_weapon_skill');
      expect(req.weapon).toBe('Quạt Sắt');
      
      // P0 uses Quạt Sắt, discarding dump1 and dump2
      dispatcher.dispatchAction(ReactAction(0, 'skill_response', { 
        doUse: true,
        cardIds: [dump1.id, dump2.id]
      }));
      
      // Base damage is 1. Quat Sat adds +1 fire damage. So total damage = 2.
      expect(dispatcher.getState().players[1].hp).toBe(2);
      // Wait for any dying resolution (if any), but in this test HP goes 4 -> 2 so no dying.
    });
  });

  describe('7. Bát Quái', () => {
    test('Phán xét ra Đỏ thì tự động Né', () => {
      const batQuai = createCard('Bát Quái', 'Trang bị', 'spade', '1');
      const slash = createCard('Chém', 'Cơ bản', 'spade', '7');
      const redJudgeCard = createCard('Đào', 'Cơ bản', 'heart', '2'); // Đỏ
      
      const state = createTestState({
        p0Hand: [slash],
        p1Hand: [batQuai],
        deck: [redJudgeCard] // Top of draw pile is red
      });
      const dispatcher = new Dispatcher(state);
      
      dispatcher.dispatchAction(PlayCardAction(1, batQuai.id, []));
      dispatcher.dispatchAction(PlayCardAction(0, slash.id, [1]));
      
      // Bát Quái triggers automatically (before_EVENT_ASK_DODGE)
      // and judges heart (Red). It should count as a dodge.
      
      expect(dispatcher.getState().players[1].hp).toBe(4);
      // Ensure no prompt to dodge is waiting because it succeeded
      const req = dispatcher.getState().waitingForResponse;
      expect(req.type).not.toBe('ask_dodge');
    });

    test('Phán xét ra Đen thì phải tự Né', () => {
      const batQuai = createCard('Bát Quái', 'Trang bị', 'spade', '1');
      const slash = createCard('Chém', 'Cơ bản', 'spade', '7');
      const blackJudgeCard = createCard('Chém', 'Cơ bản', 'spade', '2'); // Đen
      
      const state = createTestState({
        p0Hand: [slash],
        p1Hand: [batQuai],
        deck: [blackJudgeCard] // Top of draw pile is black
      });
      const dispatcher = new Dispatcher(state);
      
      dispatcher.dispatchAction(PlayCardAction(1, batQuai.id, []));
      dispatcher.dispatchAction(PlayCardAction(0, slash.id, [1]));
      
      // Bát Quái triggers, judges black. It should prompt P1 to dodge.
      const req = dispatcher.getState().waitingForResponse;
      expect(req).toBeDefined();
      expect(req.type).toBe('ask_dodge');
      
      // P1 has no dodge
      dispatcher.dispatchAction(ReactAction(1, 'skip'));
      expect(dispatcher.getState().players[1].hp).toBe(3);
    });
  });

  describe('8. Hắc Thuẫn', () => {
    test('Vô hiệu hóa Chém Đen', () => {
      const hacThuan = createCard('Hắc Thuẫn', 'Trang bị', 'spade', '1');
      const blackSlash = createCard('Chém', 'Cơ bản', 'spade', '7'); // Đen
      
      const state = createTestState({
        p0Hand: [blackSlash],
        p1Hand: [hacThuan]
      });
      const dispatcher = new Dispatcher(state);
      
      dispatcher.dispatchAction(PlayCardAction(1, hacThuan.id, []));
      dispatcher.dispatchAction(PlayCardAction(0, blackSlash.id, [1]));
      
      // Hắc Thuẫn cancels the black slash completely. No damage, no dodge ask.
      expect(dispatcher.getState().players[1].hp).toBe(4);
      expect(dispatcher.getState().waitingForResponse?.type).not.toBe('ask_dodge');
    });

    test('Không vô hiệu hóa Chém Đỏ', () => {
      const hacThuan = createCard('Hắc Thuẫn', 'Trang bị', 'spade', '1');
      const redSlash = createCard('Chém', 'Cơ bản', 'heart', '7', 'red'); // Đỏ
      
      const state = createTestState({
        p0Hand: [redSlash],
        p1Hand: [hacThuan]
      });
      const dispatcher = new Dispatcher(state);
      
      dispatcher.dispatchAction(PlayCardAction(1, hacThuan.id, []));
      dispatcher.dispatchAction(PlayCardAction(0, redSlash.id, [1]));
      
      // Hắc Thuẫn does not cancel red slash. Prompts P1 to dodge.
      const req = dispatcher.getState().waitingForResponse;
      expect(req).toBeDefined();
      expect(req.type).toBe('ask_dodge');
      
      // P1 has no dodge
      dispatcher.dispatchAction(ReactAction(1, 'skip'));
      expect(dispatcher.getState().players[1].hp).toBe(3);
    });
  });

  describe('9. Bạch Ngân', () => {
    test('Khóa sát thương tối đa là 1', () => {
      const bachNgan = createCard('Bạch Ngân', 'Trang bị', 'spade', '1');
      const slash = createCard('Chém', 'Cơ bản', 'spade', '7');
      const wine = createCard('Rượu', 'Cơ bản', 'spade', '2');
      
      const state = createTestState({
        p0Hand: [slash, wine],
        p1Hand: [bachNgan]
      });
      const dispatcher = new Dispatcher(state);
      
      dispatcher.dispatchAction(PlayCardAction(1, bachNgan.id, []));
      
      // P0 drinks wine then slashes
      dispatcher.dispatchAction(PlayCardAction(0, wine.id, []));
      dispatcher.dispatchAction(PlayCardAction(0, slash.id, [1]));
      
      // P1 takes hit
      dispatcher.dispatchAction(ReactAction(1, 'skip'));
      
      // Damage should be 2 but capped at 1 by Bạch Ngân
      expect(dispatcher.getState().players[1].hp).toBe(3);
    });

    test('Hồi 1 máu khi bị tháo xuống', () => {
      const bachNgan = createCard('Bạch Ngân', 'Trang bị', 'spade', '1');
      
      const state = createTestState({
        p0Hand: [],
        p1Hand: [bachNgan]
      });
      // Set P1 hp to 2
      state.players[1].hp = 2;
      const dispatcher = new Dispatcher(state);
      
      dispatcher.dispatchAction(PlayCardAction(1, bachNgan.id, []));
      
      // Remove Bach Ngan
      const effect = {
          type: 'MOVE_CARD',
          cardId: bachNgan.id,
          fromZone: 'equipment',
          toZone: 'discardPile',
          fromPlayerId: 1
      };
      dispatcher.applyEffect(effect);
      
      // P1 should heal 1 hp (from 2 to 3)
      expect(dispatcher.getState().players[1].hp).toBe(3);
    });
  });

