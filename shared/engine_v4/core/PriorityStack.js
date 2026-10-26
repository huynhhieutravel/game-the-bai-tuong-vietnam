/**
 * PriorityStack.js
 * Quản lý Ngăn xếp Phản ứng & Cửa sổ Ưu tiên (Priority Window) trong Việt Sát v4.
 * Giải quyết triệt để vấn đề ghi đè biến cờ waitingForResponse và kẹt vòng lặp.
 */

export class PriorityFrame {
  constructor({
    id,
    type,
    sourceId,
    targetId,
    priorityQueue = [],
    currentActorId,
    context = {},
    onResolve = null,
    onPass = null
  }) {
    this.id = id || `frame_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.type = type; // 'ASK_DODGE' | 'ASK_PEACH' | 'ASK_NEGATE' | 'ASK_SKILL' | 'ACTION_DECISION'
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.priorityQueue = [...priorityQueue]; // Mảng ID người chơi cần phản hồi theo chiều kim đồng hồ
    this.currentActorId = currentActorId !== undefined ? currentActorId : (this.priorityQueue.length > 0 ? this.priorityQueue[0] : targetId);
    this.context = context;
    this.onResolve = onResolve;
    this.onPass = onPass;
    this.createdAt = Date.now();
  }

  /**
   * Chuyển quyền ưu tiên cho người tiếp theo trong hàng đợi
   */
  nextActor() {
    this.priorityQueue.shift();
    if (this.priorityQueue.length > 0) {
      this.currentActorId = this.priorityQueue[0];
      return this.currentActorId;
    }
    this.currentActorId = null;
    return null;
  }

  hasMoreActors() {
    return this.priorityQueue.length > 0;
  }
}

export class PriorityStack {
  constructor() {
    this._stack = [];
  }

  /**
   * Đẩy một khung phản hồi mới lên đỉnh ngăn xếp
   */
  push(frameData) {
    const frame = frameData instanceof PriorityFrame ? frameData : new PriorityFrame(frameData);
    this._stack.push(frame);
    return frame;
  }

  /**
   * Rút khung phản hồi trên đỉnh ra khi đã giải quyết xong
   */
  pop() {
    return this._stack.pop();
  }

  /**
   * Xem khung phản hồi đang hoạt động ở đỉnh ngăn xếp
   */
  peek() {
    return this._stack.length > 0 ? this._stack[this._stack.length - 1] : null;
  }

  /**
   * Lấy ID của người chơi đang nắm giữ quyền ưu tiên phản hồi tại thời điểm này
   */
  getActiveActorId() {
    const current = this.peek();
    return current ? current.currentActorId : null;
  }

  /**
   * Lấy loại yêu cầu đang chờ xử lý
   */
  getActiveRequestType() {
    const current = this.peek();
    return current ? current.type : null;
  }

  get stack() {
    return this._stack;
  }

  isEmpty() {
    return this._stack.length === 0;
  }

  size() {
    return this._stack.length;
  }

  clear() {
    this._stack = [];
  }

  /**
   * Chuyển đổi trạng thái sang dạng Snapshot an toàn để gửi lên UI / Client
   */
  toClientView(playerId) {
    const current = this.peek();
    if (!current) return null;

    return {
      frameId: current.id,
      requestType: current.type,
      isMyTurnToReact: current.currentActorId === playerId,
      currentActorId: current.currentActorId,
      sourceId: current.sourceId,
      targetId: current.targetId,
      context: current.context
    };
  }
}
