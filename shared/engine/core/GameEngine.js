// ==========================================
// GameEngine - Vòng lặp chính của Game (Facade)
// Tầng Giao tiếp giữa UI và Core Logic
// ==========================================
import { createInitialState } from './State';
import { Dispatcher } from './Dispatcher';

export class GameEngine {
  constructor(playerConfigs, seed) {
    const initialState = createInitialState(playerConfigs, seed);
    this.dispatcher = new Dispatcher(initialState);
    this.subscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    callback(this.getState());
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  getState() {
    return this.dispatcher.getState();
  }

  // Nhận lệnh từ UI (người chơi bấm nút) hoặc Bot AI
  // Đẩy vào Dispatcher để xử lý State Machine, sau đó báo UI cập nhật
  dispatch(action) {
    this.dispatcher.dispatchAction(action);
    this.notifySubscribers();
  }

  notifySubscribers() {
    const currentState = this.getState();
    this.subscribers.forEach(cb => cb(currentState));
  }
}
