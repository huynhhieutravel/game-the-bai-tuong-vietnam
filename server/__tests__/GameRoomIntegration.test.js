import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManager } from '../src/RoomManager.js';
import { GameRoom } from '../src/GameRoom.js';

describe('Server RoomManager & GameRoom Integration with Engine v4', () => {
  let mockIo;
  let roomEvents;

  beforeEach(() => {
    roomEvents = [];
    mockIo = {
      to: vi.fn().mockImplementation((target) => ({
        emit: vi.fn().mockImplementation((event, data) => {
          roomEvents.push({ target, event, data });
        })
      }))
    };
  });

  it('phải tạo phòng mới, lấy phòng và xóa phòng thành công qua RoomManager', () => {
    const manager = new RoomManager(mockIo);
    const room = manager.createRoom('socket_host_1');

    expect(room).toBeDefined();
    expect(room.roomId).toHaveLength(4);
    expect(manager.getRoom(room.roomId)).toBe(room);
    expect(manager.getRoom(room.roomId.toLowerCase())).toBe(room); // Case-insensitive

    manager.removeRoom(room.roomId);
    expect(manager.getRoom(room.roomId)).toBeUndefined();
  });

  it('phải xử lý luồng người chơi vào phòng, chuyển chủ phòng khi host rời', () => {
    const manager = new RoomManager(mockIo);
    const room = manager.createRoom('socket_host');

    // Host join
    const p1 = room.addPlayer('socket_1', 'Chủ Phòng', 'session_1');
    expect(p1.isHost).toBe(true);
    expect(p1.isReady).toBe(true);

    // Player 2 join
    const p2 = room.addPlayer('socket_2', 'Người Chơi 2', 'session_2');
    expect(p2.isHost).toBe(false);
    expect(p2.isReady).toBe(false);

    // Player 2 sẵn sàng
    room.setReady('socket_2', true);
    expect(p2.isReady).toBe(true);

    // Host rời phòng -> Player 2 tự động thành host
    room.removePlayer('socket_1');
    expect(room.players.length).toBe(1);
    expect(room.players[0].isHost).toBe(true);
    expect(room.players[0].name).toBe('Người Chơi 2');
  });

  it('phải hỗ trợ Reconnect mượt mà bằng sessionId', () => {
    const manager = new RoomManager(mockIo);
    const room = manager.createRoom('socket_host');

    room.addPlayer('socket_1', 'Người Chơi 1', 'sess_user_1');
    
    // Giả lập disconnect socket cũ và reconnect với socketId mới cùng sessionId
    const reconnected = room.addPlayer('socket_new_1', 'Người Chơi 1', 'sess_user_1');
    expect(reconnected.socketId).toBe('socket_new_1');
    expect(room.players.length).toBe(1);
  });

  it('phải từ chối bắt đầu game nếu chưa đủ 2 người hoặc chưa ai sẵn sàng', () => {
    const manager = new RoomManager(mockIo);
    const room = manager.createRoom('socket_host');

    room.addPlayer('socket_1', 'Host', 'sess_1');

    // Chỉ 1 người -> Báo lỗi
    expect(() => room.startGame('socket_1')).toThrow('Cần ít nhất 2 người chơi');

    // Thêm người 2 nhưng chưa ready
    room.addPlayer('socket_2', 'Player 2', 'sess_2');
    expect(() => room.startGame('socket_1')).toThrow('Tất cả người chơi phải sẵn sàng');

    // Người không phải host cố start game
    expect(() => room.startGame('socket_2')).toThrow('Chỉ chủ phòng mới có thể bắt đầu game');
  });

  it('phải khởi tạo Draft -> Chọn Tướng -> Khởi tạo DispatcherV4 và vận hành ván đấu hoàn chỉnh', () => {
    const manager = new RoomManager(mockIo);
    const room = manager.createRoom('socket_host');

    room.addPlayer('socket_1', 'Thần Tướng 1', 'sess_1');
    room.addPlayer('socket_2', 'Thần Tướng 2', 'sess_2');
    room.setReady('socket_2', true);

    // 1. Host bắt đầu game
    room.startGame('socket_1');
    expect(room.isPlaying).toBe(true);
    expect(room.gameState).toBeDefined();
    expect(room.gameState.phase).toBe('draft');
    expect(room.gameState.players.length).toBe(2);
    expect(room.gameState.players[0].isBot).toBe(false);
    expect(room.gameState.players[1].isBot).toBe(false);

    // 2. Người chơi 1 chọn tướng draft (chọn cặp tướng cùng phe không có trigger trong pha Bắt đầu / Rút bài để vào thẳng ACTION phase)
    const triggerHeroes = ['trieu_quang_phuc', 'phung_hung', 'do_doc_bao', 'lang_lieu', 'nguyen_phi_y_lan', 'ly_thuong_kiet'];
    const p1Draft = room.gameState.players[0].draftHeroes;
    const byFaction = {};
    for (const h of p1Draft) {
      if (!triggerHeroes.includes(h.id)) {
        byFaction[h.faction] = byFaction[h.faction] || [];
        byFaction[h.faction].push(h);
      }
    }
    const safeFaction = Object.keys(byFaction).find(f => byFaction[f].length >= 2);
    const hero1A = safeFaction ? byFaction[safeFaction][0] : p1Draft[0];
    const hero1B = safeFaction ? byFaction[safeFaction][1] : p1Draft[1];
    room.handleDraftSelect('socket_1', hero1A.id, hero1B.id);
    expect(room.gameState.phase).toBe('draft');
    expect(room.dispatcher).toBeNull(); // Chưa xong draft vì người 2 chưa chọn

    // 3. Người chơi 2 chọn tướng draft -> Hoàn tất draft -> Engine V4 khởi tạo
    const p2Draft = room.gameState.players[1].draftHeroes;
    room.handleDraftSelect('socket_2', p2Draft[0].id, p2Draft[1].id);

    expect(room.dispatcher).toBeDefined();
    expect(room.gameState.currentPhase).toBe('ACTION');
    // Player 0 bắt đầu lượt 1: 4 lá ban đầu + 2 lá rút trong Pha Rút bài = 6 lá
    expect(room.gameState.players[0].hand.length).toBe(6);
    expect(room.gameState.players[1].hand.length).toBe(4);

    // 4. Dispatch Action qua Engine V4
    // Thử kết thúc lượt người chơi 0
    room.handleAction('socket_1', {
      type: 'ACTION_END_PHASE',
      phase: 'ACTION',
      playerId: 0
    });

    // 5. Ngăn chặn người chơi mạo danh dispatch action của người khác
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    room.handleAction('socket_2', {
      type: 'ACTION_END_PHASE',
      playerId: 0 // socket_2 là player 1, không được gửi cho player 0
    });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();

    // 6. Chat trong phòng
    room.handleChat('socket_1', 'Xin chào cả phòng!');
    const chatBroadcast = roomEvents.find(e => e.event === 'room:chat_message');
    expect(chatBroadcast).toBeDefined();
    expect(chatBroadcast.data.message).toBe('Xin chào cả phòng!');
    expect(chatBroadcast.data.senderName).toBe('Thần Tướng 1');
  });
});
