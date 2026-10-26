# ADR 0075: Hệ Thống Chuẩn Hóa & Đồng Bộ Ngôn Ngữ Toàn Diện (Comprehensive Language & Translation Synchronization System)

## Bối Cảnh (Context)
Trong quá trình kiểm thử chất lượng (QA) hệ thống Tướng và cơ chế Quốc Chiến, phát hiện hiện tượng "đứt gãy do bất đồng bộ ngôn ngữ" (Language & Translation Desynchronization) giữa tầng Dữ Liệu / Engine (chuỗi tiếng Anh snake_case/uppercase: `ACTIVE`, `PASSIVE`, `ha`, `son`, `heart`, `diamond`, `ky_tap`) và tầng Giao Diện / ViewModel (chuỗi tiếng Việt có dấu / không dấu / icon: `CHỦ ĐỘNG`, `BỊ ĐỘNG`, `Hà`, `Sơn`, `Cơ`, `Rô`, `♥`, `♦`, `Kỳ Tập`, `Đoạt Sáo`).

### Các Lỗi Nghiêm Trọng Được Khám Phá:
1. **Lỗi Kiểu Kỹ Năng (Skill Type Desync):** `GameViewMapperV4.js` map nhãn tiếng Việt `skill.type = 'CHỦ ĐỘNG'`, nhưng `ActionBar.jsx` trước đó chỉ lọc chuỗi tiếng Anh `s.type === 'ACTIVE' || s.type === 'ACTIVE_DEFENSIVE'`. Kết quả là các nút kỹ năng chủ động (như *Hòa Thân*, *Tự Chủ*, *Diệu Dược*) bị biến mất khỏi thanh hành động.
2. **Lỗi Phe Phái & Đồng Minh (Faction Desync):** `p.faction` trong `gameData.js` là tiếng Việt có dấu `'Lạc'`, `'Việt'`, `'Hà'`, `'Sơn'`, nhưng trong `HeroRegistry.js` và logic Engine lại là `'lac'`, `'viet'`, `'ha'`, `'son'`. Các phép so sánh thô `p1.faction === p2.faction` dẫn đến:
   - Hệ thống ngộ nhận đồng minh cùng phe là kẻ thù trong `BotBrain.js` và `CombatRules.applyDeathRewards` (xử phạt ngộ sát nhầm thành thưởng diệt địch).
   - `CombatRules.checkGameOver` không nhận diện được chiến thắng vì `'ha' !== 'Hà'`.
   - `PlayerBoard.jsx` hiển thị icon kiếm chiến `⚔️` thay vì bắt tay đồng minh `🤝`.
3. **Lỗi Tên / ID Kỹ Năng (Skill Name & Typo Desync):** `ActionBar.jsx` gửi tên tiếng Việt `s.name` (`'Kỳ Tập'`, `'Can Gián'`), nhưng `DispatcherV4._handleSkill` lại so sánh cứng `normSkillId === 'ky_tap'`. Ngoài ra có lỗi typo tiếng Việt: `'Đoạt Sao'` thay vì `'Đoạt Sáo'`.
4. **Lỗi Chất & Màu Sắc Lá Bài (Suit & Color Desync):** So sánh chất cứng `card.suit === 'diamond' || card.suit === '♦'` làm trượt khi dữ liệu mang tiếng Việt `'rô'` hoặc `'cơ'`, ảnh hưởng đến việc kích hoạt kỹ năng chuyển hóa bài (*Khai Thiên*, *An Tư Hòa Thân*, *Dã Tượng Kỳ Tập*, *Bát Quái*, *Thông Ngôn*).

## Quyết Định Thiết Kế (Decision)
Triển khai một module trung tâm chuyên trách việc chuẩn hóa và chuyển đổi ngôn ngữ hai chiều:
[shared/utils/translationHelper.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/utils/translationHelper.js)

### 5 Trụ Cột Chuẩn Hóa Cốt Lõi:
1. **Kiểu Kỹ Năng (`normalizeSkillType`):**
   - Chuyển đổi mọi biến thể (`CHỦ ĐỘNG`, `chu dong`, `ACTIVE`, `ACTIVE_DEFENSIVE`, `BỊ ĐỘNG`, `PASSIVE`, `TỎA ĐỊNH`, `LOCK`, `HẠN ĐỊNH`, `LIMITED`) thành cấu trúc chuẩn:
     ```javascript
     {
       code: 'active' | 'passive' | 'lock' | 'limited',
       label: 'CHỦ ĐỘNG' | 'BỊ ĐỘNG' | 'TỎA ĐỊNH' | 'HẠN ĐỊNH',
       badgeColor: '#3b82f6' | '#10b981' | '#ef4444' | '#8b5cf6',
       isActive: boolean,
       isPassive: boolean,
       isLock: boolean,
       isLimited: boolean
     }
     ```
2. **Phe Phái (`getCanonicalFaction`, `getFactionLabel`, `getFactionColor`, `isSameFaction`):**
   - Luôn quy đổi về canonical code: `'lac' | 'viet' | 'ha' | 'son' | 'da_tam' | 'none'`.
   - Hàm `isSameFaction(p1, p2)` trích xuất thông minh phe phái từ Object Player hoặc chuỗi thô, triệt tiêu hoàn toàn bất đồng bộ giữa `'ha'` và `'Hà'`.
3. **Chất & Màu Sắc Lá Bài (`normalizeSuit`, `getSuitColor`, `isSameSuit`):**
   - Quy đổi tất cả tên tiếng Anh (`heart`, `diamond`, `spade`, `club`), tiếng Việt (`cơ`, `rô`, `bích`, `chuồn`, `nhép`) và ký hiệu Emoji (`♥`, `♦`, `♠`, `♣`) về mã chuẩn và màu sắc `red`/`black`.
4. **Tên / ID Kỹ Năng (`normalizeSkillId`):**
   - Tự động bóc tách dấu tiếng Việt (`removeVietnameseAccents`) và tra cứu bảng ánh xạ canonical 50+ kỹ năng, nhận diện chính xác cả tên có dấu, không dấu, kebab-case (`hoa-than`) và snake_case (`hoa_than`).
5. **Giới Tính Nhân Vật (`normalizeGender`, `getPlayerGender`, `getPlayerGenderLabel`):**
   - Trả về `'male' | 'female' | 'none'` và nhãn `'Nam' | 'Nữ'` chuẩn xác. Tướng đang úp luôn trả về `'none'` để bảo vệ tính ẩn danh của luật chơi Quốc Chiến.

## Phạm Vi Áp Dụng (Scope of Changes)
- **Tầng Shared / Engine:**
  - [shared/utils/translationHelper.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/utils/translationHelper.js): Tạo mới module chuẩn hóa trung tâm.
  - [shared/constants/cardTypes.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/constants/cardTypes.js): Tích hợp suit helpers.
  - [shared/data/SkillDescriptions.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/data/SkillDescriptions.js): Bổ sung 11 skill IDs còn thiếu và xuất `normalizeSkillId`.
  - [shared/engine_v4/application/GameViewMapperV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/GameViewMapperV4.js): Cung cấp đồng thời `type`, `typeLabel`, `typeCode`, `isActive`, `canonicalFaction`, `getFactionLabel`.
  - [shared/engine_v4/rules/CombatRules.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/CombatRules.js): Áp dụng `isSameFaction` trong thưởng/phạt tử trận và kiểm tra thắng trận `checkGameOver`; áp dụng `getSuitColor` trong Bát Quái và Chém.
  - [shared/engine_v4/rules/TrickRules.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/TrickRules.js): Áp dụng `normalizeSuit` và `isSameSuit` trong Sấm Sét, Hỗn Loạn, Binh Lương, Hỏa Công.
  - [shared/engine_v4/rules/TargetResolverV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/rules/TargetResolverV4.js): Áp dụng `normalizeSuit` cho biến đổi bài (Xiềng Xích, Hỗn Loạn, Tước Bài, Quyết Đấu).
  - [shared/engine_v4/application/DispatcherV4.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/application/DispatcherV4.js): Sử dụng `normalizeSkillId` cho toàn bộ các case kỹ năng và `isSameSuit` trong Tre Ngà.
  - [shared/engine_v4/ai/BotBrain.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/shared/engine_v4/ai/BotBrain.js): Dùng `isSameFaction` để Bot nhận diện đúng đồng minh và kẻ địch.
- **Tầng Client / UI:**
  - [client/src/components/game/ActionBar.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/ActionBar.jsx): Sử dụng `normalizeSkillType` và `normalizeSkillId` để lọc kỹ năng chủ động; dùng `getCanonicalFaction` cho trợ chiến Định Quốc.
  - [client/src/components/game/hooks/useSkillInteraction.js](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/hooks/useSkillInteraction.js): Dùng `normalizeSkillId` và `normalizeGender` thay thế bảng tra cứu thủ công.
  - [client/src/components/game/PlayerBoard.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/PlayerBoard.jsx): Sử dụng `getFactionColor` và `isSameFaction` để hiển thị màu và icon đồng minh 🤝.
  - [client/src/components/game/DraftScreen.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/DraftScreen.jsx) & [client/src/components/wiki/HeroDetail.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/wiki/HeroDetail.jsx): Hiển thị badge kỹ năng chuẩn màu sắc và nhãn tiếng Việt.
  - [client/src/components/game/GameView.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/game/GameView.jsx): Dùng `normalizeSkillType` cho popup chi tiết Tướng và `getPhaseLabel` cho tùy chọn trận đấu.

## Kiểm Thử & Xác Nhận (Verification)
1. **Unit & Integration Test:** Tạo mới [client/src/components/__tests__/LanguageAndTranslationSyncQA.test.jsx](file:///Users/huynhtronghieu/Documents/game/game-vietnam-the-bai/client/src/components/__tests__/LanguageAndTranslationSyncQA.test.jsx) với 21 kịch bản kiểm thử độc lập bao quát cả 5 trụ cột -> **21/21 tests passed (100%)**.
2. **Regression Testing:** Chạy toàn bộ test suite dự án qua `npm test` -> **82 test files passed, 704 tests passed, 0 failures**.
3. **Application Layer Stress Test:** Chạy `npm run sim:app` 1.000 trận giả lập bot liên tục -> **1000/1000 trận hoàn thành, 0 unhandled exception, 0 deadlock** (74.309 actions, 91.318 responses, 40.666 tricks).
4. **Production Build:** Chạy `npm run cap:build` -> Vite build hoàn tất trong 421ms, Capacitor sync Android/iOS/Web thành công 100%.
