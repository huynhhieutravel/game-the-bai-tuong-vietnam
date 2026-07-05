# SOP: Thêm Tướng Mới vào Việt Sát

> Tài liệu này là checklist BẮT BUỘC khi thêm bất kỳ tướng/skill mới nào.
> Tuân thủ để tránh phát sinh lỗi Engine.

## Quy ước đặt tên

| Loại | Quy ước | Ví dụ |
|------|---------|-------|
| Hero ID | `kebab-case` tiếng Việt không dấu | `lac-long-quan` |
| Skill ID | `kebab-case` tiếng Việt không dấu | `boc-tram-trung` |
| Skill Ask Type | `ask_` + skill ID (thay `-` thành `_`) | `ask_boc_tram_trung_slash` |
| SkillRegistry Key | = Skill ID | `'boc-tram-trung'` |

## Checklist thêm Tướng mới

### 1. `SKILL_CONSTANTS.js` (LUÔN LÀM TRƯỚC)
- [ ] Thêm constant vào `SKILL_ASK_TYPES` (nếu skill có modal hỏi người chơi)
- [ ] Nếu tên ask_type KHÔNG khớp quy ước `ask_{skill-id}`, thêm vào `ASK_TYPE_TO_SKILL_ID`

### 2. `HeroRegistry.js`
- [ ] Thêm entry với: `id`, `name`, `maxHp`, `faction`, `gender`, `image`, `skillIds`
- [ ] `skillIds` trùng khớp với key trong SkillRegistry

### 3. `SkillRegistry.js`
- [ ] Thêm skill entry với key = skill ID
- [ ] Cấu trúc BẮT BUỘC:
  ```js
  'ten-skill': {
    id: 'ten-skill',
    name: 'Tên Skill',
    type: SKILL_TYPES.ACTIVE, // hoặc PASSIVE/LOCK/LIMITED/TRANSFORM
    
    // ACTIVE: Khi người chơi bấm dùng
    onUse: (dispatcher, state, playerId, targets) => {
      // ✅ ĐÚNG: Dùng EVENT_TRIGGER_SKILL_ASK (auto-inject responderId)
      dispatcher.state.reactionStack.push({
        type: 'EVENT_TRIGGER_SKILL_ASK',
        payload: { request: { type: 'ask_ten_skill', sourceId: playerId } }
      });
      dispatcher.tick();
    },
    
    // Khi người chơi trả lời modal
    onReact: (dispatcher, state, payload) => {
      const req = state.waitingForResponse;
      if (!req || req.type !== 'ask_ten_skill') return;
      
      if (payload.canceled) {
        // ✅ ĐÚNG: Clear state rồi tick()
        dispatcher.state.waitingForResponse = null;
        dispatcher.tick();
        return;
      }
      
      // Logic skill ở đây...
      
      // ✅ ĐÚNG: Khi xong, clear và tick
      dispatcher.state.waitingForResponse = null;
      dispatcher.tick();
    },
    
    // PASSIVE: Hook vào event
    hooks: {
      TURN_BEGIN: (dispatcher, state, playerId, payload) => {
        // Push EVENT_TRIGGER_SKILL_ASK
      }
    },
    
    turnResetFlags: ['tenSkillUsed'], // Reset mỗi lượt
    aiConfig: { priority: 7, condition: (state, bot) => false }
  }
  ```

### 4. `App.jsx`
- [ ] ❌ KHÔNG CẦN sửa `activeActorId` (đã dùng responderId)
- [ ] ❌ KHÔNG CẦN sửa Bot targetId (đã dùng responderId)
- [ ] ✅ Tạo Modal component NẾU skill cần UI đặc biệt
- [ ] ✅ Thêm case render Modal dựa trên `req.type`

### 5. `botAI.js`
- [ ] Thêm case xử lý cho Bot AI

## ⚠️ CÁC LỖI HAY GẶP (TRÁNH TUYỆT ĐỐI)

| Lỗi | Hậu quả | Cách phòng |
|-----|---------|------------|
| Gán trực tiếp `waitingForResponse` mà KHÔNG qua `EVENT_TRIGGER_SKILL_ASK` | responderId bị thiếu → sai Modal | Dùng `EVENT_TRIGGER_SKILL_ASK` |
| Gọi `dispatcher.dispatchAction()` trong onReact | Recursive tick() gây infinite loop | Dùng `reactionStack.push()` trực tiếp |
| Quên thêm vào `ASK_TYPE_TO_SKILL_ID` khi tên type bất thường | Dispatcher không tìm được skill | Dùng đúng quy ước `ask_{skill-id}` |
| Skill key trùng (duplicate) trong SkillRegistry | Bản sau ghi đè bản trước | Ctrl+F check trước khi thêm |
| Thêm vào `nativeTypes` trong Dispatcher | Skill bị xử lý inline thay vì qua SkillRegistry | KHÔNG BAO GIỜ thêm skill vào nativeTypes |
