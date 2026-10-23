import { describe, it, expect } from 'vitest';
import { PriorityStack, PriorityFrame } from '../../core/PriorityStack.js';
import { SkillContract } from '../../heroes/base/SkillContract.js';

describe('PriorityStack Engine v4', () => {
  it('quản lý chính xác thứ tự LIFO của Reaction Frames', () => {
    const stack = new PriorityStack();
    expect(stack.isEmpty()).toBe(true);

    // Frame 1: Chém hỏi Né
    stack.push({
      type: 'ASK_DODGE',
      sourceId: 0,
      targetId: 1,
      priorityQueue: [1]
    });

    expect(stack.size()).toBe(1);
    expect(stack.getActiveActorId()).toBe(1);
    expect(stack.getActiveRequestType()).toBe('ASK_DODGE');

    // Frame 2: Kỹ năng phản ứng lồng vào (VD: Bát Quái yêu cầu phán xét đỏ)
    stack.push({
      type: 'ASK_JUDGE',
      sourceId: 1,
      targetId: 1,
      priorityQueue: [1]
    });

    expect(stack.size()).toBe(2);
    expect(stack.getActiveRequestType()).toBe('ASK_JUDGE');

    // Giải quyết Frame 2 (Pop) -> Phải tự động lộ ra Frame 1 (ASK_DODGE)
    const resolvedFrame = stack.pop();
    expect(resolvedFrame.type).toBe('ASK_JUDGE');
    expect(stack.size()).toBe(1);
    expect(stack.getActiveRequestType()).toBe('ASK_DODGE');
    expect(stack.getActiveActorId()).toBe(1);

    // Giải quyết Frame 1
    stack.pop();
    expect(stack.isEmpty()).toBe(true);
    expect(stack.getActiveActorId()).toBe(null);
  });

  it('luân chuyển Priority Queue theo vòng kim đồng hồ (VD: Vòng hỏi Hóa Giải / Đào cứu)', () => {
    const stack = new PriorityStack();

    // Vòng hỏi Hóa Giải 4 người chơi: [1, 2, 3, 0]
    stack.push({
      type: 'ASK_NEGATE',
      sourceId: 0,
      targetId: 1,
      priorityQueue: [1, 2, 3, 0]
    });

    const frame = stack.peek();
    expect(frame.currentActorId).toBe(1);

    // Người 1 bỏ qua (Pass)
    expect(frame.nextActor()).toBe(2);
    expect(stack.getActiveActorId()).toBe(2);

    // Người 2 bỏ qua
    expect(frame.nextActor()).toBe(3);
    expect(stack.getActiveActorId()).toBe(3);

    // Người 3 bỏ qua
    expect(frame.nextActor()).toBe(0);
    expect(stack.getActiveActorId()).toBe(0);

    // Người 0 bỏ qua -> Hết vòng
    expect(frame.nextActor()).toBe(null);
    expect(frame.hasMoreActors()).toBe(false);
  });
});

describe('SkillContract v4', () => {
  it('chặn đứng lỗi "nhảy ké" sự kiện thông qua matchesTrigger', () => {
    const skill = new SkillContract({
      id: 'pha_quan',
      name: 'Phá Quân',
      type: 'lock',
      trigger: 'ON_SLASH_TARGET',
      filter: (ctx) => ctx.ownerId === ctx.actorId // Chỉ kích hoạt khi chính mình là người Chém
    });

    // Trường hợp 1: Người chơi 0 Chém -> Kích hoạt đúng
    const contextRight = { ownerId: 0, actorId: 0, targetId: 1 };
    expect(skill.matchesTrigger({ type: 'ON_SLASH_TARGET' }, contextRight)).toBe(true);

    // Trường hợp 2: Người chơi 2 Chém người chơi 3 -> Tướng của người 0 KHÔNG ĐƯỢC nhảy ké
    const contextWrong = { ownerId: 0, actorId: 2, targetId: 3 };
    expect(skill.matchesTrigger({ type: 'ON_SLASH_TARGET' }, contextWrong)).toBe(false);
  });

  it('tự động đánh dấu cờ khi cancel để tránh loop vô tận cho Bot AI', () => {
    const owner = { id: 1, skillUsage: {} };
    const skill = new SkillContract({
      id: 'tien_phong',
      name: 'Tiên Phong',
      frequency: 'turn'
    });

    expect(skill.canUse({}, { owner })).toBe(true);

    // Khi người chơi hoặc bot cancel với cờ markUsedOnCancel:
    skill.onCancel({}, { owner, markUsedOnCancel: true });

    // Không còn được phép gọi lại trong cùng lượt
    expect(skill.canUse({}, { owner })).toBe(false);
  });

  it('kích hoạt Universal AI Fallback an toàn khi bot chưa có logic riêng', () => {
    const skill = new SkillContract({
      id: 'skill_la',
      name: 'Kỹ Năng Lạ'
      // Không truyền _ai
    });

    const fallback = skill.decideAI({}, {});
    expect(fallback).toEqual({
      type: 'ACTION_REACT',
      skillId: 'skill_la',
      canceled: true,
      reason: 'AI_FALLBACK_PASS'
    });
  });
});
