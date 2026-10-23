---
name: QA Hero Việt Sát
description: Hướng dẫn quy trình 6 bước bắt buộc để tạo mới, sửa lỗi hoặc kiểm thử (QA) một Tướng (Hero) trong dự án game bài Việt Sát (game-vietnam-the-bai). Kích hoạt kỹ năng này bất cứ khi nào người dùng yêu cầu làm việc với hệ thống Tướng.
---

# Tiêu Chuẩn QA Toàn Diện Tướng (Hero QA SOP)

Khi lập trình hoặc kiểm thử (QA) bất kỳ một Tướng nào mới trong game Việt Sát, BẮT BUỘC phải tuân thủ nghiêm ngặt 6 khu vực rà soát sau đây để đảm bảo không xảy ra lỗi "đứt gãy" giữa các hệ thống.

## 1. Khu vực Cấu hình & Dữ liệu (Registry Data)
Đảm bảo tướng được khai báo chuẩn xác.
- **HeroRegistry.js:** Tướng đã có đúng tên, faction, số máu (HP/MaxHP), giới tính chưa?
- **Danh sách kỹ năng (Skills):** Mảng skills khai báo trong tướng có khớp chính xác với ID của skill không?
- **SkillDescriptions.js:** Đã có text mô tả kỹ năng hiển thị cho người chơi đọc chưa?

## 2. Khu vực Logic Kỹ Năng Cốt Lõi (Skill Handlers)
Đảm bảo code xử lý của từng skill hoạt động đúng (`combat.js`, `system.js`, `reaction.js`).
- **Điều kiện kích hoạt (`canUse`):** Kỹ năng có sáng lên đúng lúc không? 
- **Tiêu hao (Cost):** Khi dùng kỹ năng, game có trừ đúng số lá bài, máu, hoặc lật thẻ tướng không?
- **Hiệu ứng (`onUse` / `onReact`):** Kỹ năng gây sát thương, hồi máu, rút bài hay cướp bài có đúng logic của `applyEffect` không?

## 3. Khu vực Luồng Sự Kiện (Dispatcher & Event Hooks)
- **Phase triggers / Interrupts:** Kỹ năng kích hoạt ở đúng thời điểm không (Đầu lượt, Chịu sát thương, Hấp hối)?
- **Giải phóng Queue:** Khi kỹ năng xử lý xong, nó có trả lại `state.waitingForResponse = null` để game chạy tiếp không?

## 4. Khu vực UI / Client (Frontend & Modals) - QUAN TRỌNG NHẤT ĐỂ TRÁNH BUG GIAO DIỆN
- **Hook UI (`useSkillInteraction.js`, `useTargeting.js`):** Nếu là kỹ năng chủ động (Active), UI đã được map Dispatch Action chưa? Cú click chuột có gửi đúng lệnh xuống Server không?
- **Modals đặc biệt (`ModalContainer.jsx`):** Kỹ năng yêu cầu chọn nhiều bài, đoán chất bài có được code Modal hoàn chỉnh chưa? Đã gửi đúng `payload` (`targetId`, `suit`, `cardIndex`) về Server chưa?
> [!CAUTION]
> **INTEGRATION CHECK BẮT BUỘC:** Tuyệt đối không chỉ tin tưởng Unit Test của Engine. Bắt buộc phải mở file `ModalContainer.jsx` (hoặc file UI tương ứng) để soi tận mắt hàm `handleResponseAction({...})`. 
> So sánh đối chiếu TỪNG TÊN BIẾN (key) trong payload gửi đi của UI (ví dụ: `doUse`, `cardIdx`) so với payload mà Server đang chờ đọc tại hàm `onReact` trong `reaction.js`/`active.js` (ví dụ: `doProvide`, `cardId`). 
> Chỉ lệch 1 ký tự tên biến, Server sẽ âm thầm vứt gói tin và chặn họng kỹ năng của người chơi!
- **Targeting (Chọn mục tiêu):** Hàm filter mục tiêu có chính xác, chặn việc chọn mục tiêu sai không?
  *Lưu ý:* Việc dùng `player.heroes?.some` để check skill ở UI là lỗi thời. Bắt buộc dùng helper `hasSkill(player, 'skill-id')` để quét kỹ năng.

## 5. Khu vực Trí Tuệ Nhân Tạo (AI / `botLogic.js`)
- Bot có code logic để tự động kích hoạt kỹ năng không?
- Khi bị yêu cầu (VD: Đưa bài, Đoán chất), Bot có trả về `ACTION_REACT` đúng định dạng không?

## 6. Khu vực Edge Cases & Unit Test
Viết Unit Test bọc lót (`src/engine/__tests__/`).
- Kỹ năng "Mỗi lượt 1 lần" có cờ (flag) chặn lạm dụng không?
- Có bị Hóa Giải chặn lại hoàn toàn không?
- Quyết Đấu/Mượn Đao, Tự sát/Giết đồng minh có kích hoạt đúng logic thưởng/phạt không?
