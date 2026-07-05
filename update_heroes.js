const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/data/gameData.js');
let content = fs.readFileSync(filePath, 'utf8');

const newHeroes = `export const HEROES = [
  // LẠC (Thần / Cổ Đại)
  {
    id: 'thanh-giong', name: 'Thánh Gióng', maxHp: 4, faction: 'Lạc', gender: 'Nam', emoji: '🐎',
    skills: [
      { name: 'Thiết Mã', desc: 'Luôn được tính là đang trang bị một lá [Ngựa Chiến -1].' },
      { name: 'Tre Ngà', desc: 'Mỗi khi mất hoặc bỏ Vũ Khí, có thể lấy lá đó trên tay làm lá [Chém].' }
    ], bio: 'Phù Đổng Thiên Vương, nhổ tre ngà đánh giặc.',
  },
  {
    id: 'son-tinh', name: 'Sơn Tinh', maxHp: 4, faction: 'Lạc', gender: 'Nam', emoji: '⛰️',
    skills: [
      { name: 'Dời Núi', desc: 'Trong Giai đoạn Ra bài, bỏ 1 lá Đỏ để đổi chỗ 2 người chơi bất kỳ trên bàn (thay đổi khoảng cách).' },
      { name: 'Phòng Thủ Thép', desc: 'Khi cần [Né], lật phán xét: Nếu Đen (♠️/♣️) -> Né thành công.' }
    ], bio: 'Tản Viên Sơn Thánh, chúa tể non cao.',
  },
  {
    id: 'thuy-tinh', name: 'Thủy Tinh', maxHp: 4, faction: 'Lạc', gender: 'Nam', emoji: '🌊',
    skills: [
      { name: 'Hồng Thủy', desc: 'Có thể dùng lá Đen trên tay như cẩm nang [Loạn Tiễn] (Giới hạn 1 lần/lượt).' },
      { name: 'Cuồng Phong', desc: 'Khi bị mất HP, lập tức rút 1 lá bài cho mỗi điểm HP bị mất.' }
    ], bio: 'Chúa tể vực sâu, gọi gió hô mưa.',
  },
  {
    id: 'lac-long-quan', name: 'Lạc Long Quân', maxHp: 4, faction: 'Lạc', gender: 'Nam', emoji: '🐉',
    skills: [
      { name: 'Thủy Tổ', desc: 'Khi dùng cẩm nang, nếu bỏ thêm 1 lá bài Đen, cẩm nang đó không thể bị [Hóa Giải].' },
      { name: 'Bảo Bọc', desc: 'Khi người khác hấp hối, có thể đưa họ 2 lá bài trên tay thay cho 1 lá [Đào].' }
    ], bio: 'Thủy Tổ dân tộc Việt, nòi giống Rồng Tiên.',
  },
  {
    id: 'au-co', name: 'Âu Cơ', maxHp: 3, faction: 'Lạc', gender: 'Nữ', emoji: '🪺',
    skills: [
      { name: 'Trăm Trứng', desc: 'Vào cuối lượt, nếu số bài trên tay nhỏ hơn HP, được rút bài cho bằng với HP hiện tại.' },
      { name: 'Mẫu Nghi', desc: 'Khi chịu sát thương, có thể chuyển 1 sát thương cho một Nam tướng (họ có quyền từ chối bằng cách cho bạn 2 lá bài).' }
    ], bio: 'Mẹ của các dân tộc Việt, nòi giống Rồng Tiên.',
  },

  // TIỀN (Tiền Triều)
  {
    id: 'hai-ba-trung', name: 'Hai Bà Trưng', maxHp: 3, faction: 'Tiền', gender: 'Nữ', emoji: '🐘',
    skills: [
      { name: 'Khởi Nghĩa', desc: 'Khi chịu sát thương, chỉ định 1 tướng Nam. Tướng đó phải đưa cho bạn 1 lá bài trên tay.' },
      { name: 'Song Kiếm', desc: 'Mỗi khi dùng [Chém] lên Tướng Nam, ép đối phương: Bỏ 1 lá bài HOẶC cho bạn rút 1 lá.' }
    ], bio: 'Trưng Trắc, Trưng Nhị cưỡi voi đánh đuổi Tô Định.',
  },
  {
    id: 'ly-thuong-kiet', name: 'Lý Thường Kiệt', maxHp: 3, faction: 'Tiền', gender: 'Nam', emoji: '📜',
    skills: [
      { name: 'Nam Quốc Sơn Hà', desc: 'Miễn nhiễm mọi sát thương từ các lá cẩm nang AOE (Loạn Tiễn, Dã Man).' },
      { name: 'Tiên Phát', desc: 'Đầu lượt, xem 1 lá ngẫu nhiên của 1 người khác. Nếu là Cẩm nang/Trang bị, có quyền lấy nó.' }
    ], bio: 'Đại tướng quân nhà Lý, tác giả Nam Quốc Sơn Hà.',
  },
  {
    id: 'dinh-bo-linh', name: 'Đinh Bộ Lĩnh', maxHp: 4, faction: 'Tiền', gender: 'Nam', emoji: '🌾',
    skills: [
      { name: 'Cờ Lau', desc: 'Bỏ 2 lá bài cùng chất để xem như 1 lá [Chém] (không giới hạn khoảng cách và số lượng/lượt).' },
      { name: 'Đại Thắng', desc: 'Khi tiêu diệt một người chơi, được rút 3 lá bài (cộng dồn với phần thưởng hệ thống).' }
    ], bio: 'Đinh Tiên Hoàng, dẹp loạn 12 sứ quân.',
  },
  {
    id: 'ngo-quyen', name: 'Ngô Quyền', maxHp: 4, faction: 'Tiền', gender: 'Nam', emoji: '🪵',
    skills: [
      { name: 'Cọc Ngầm', desc: 'Mỗi khi bị [Chém], có thể yêu cầu phán xét. Nếu Đen (♠️/♣️), [Chém] bị dội ngược lại kẻ tấn công.' }
    ], bio: 'Đại thắng Bạch Đằng, mở ra kỷ nguyên độc lập.',
  },
  {
    id: 'y-lan', name: 'Nguyên Phi Ỷ Lan', maxHp: 3, faction: 'Tiền', gender: 'Nữ', emoji: '🌸',
    skills: [
      { name: 'Nhiếp Chính', desc: 'Một lần trong lượt, có thể xem tay 1 Tướng Nam và đổi 1 lá bài của bạn lấy 1 lá bài của họ.' },
      { name: 'Quan Âm', desc: 'Các lá [Chém] màu Đỏ không gây sát thương lên bạn.' }
    ], bio: 'Bà chúa nhiếp chính triều Lý.',
  },

  // TRẦN (Đông A)
  {
    id: 'tran-hung-dao', name: 'Trần Hưng Đạo', maxHp: 4, faction: 'Trần', gender: 'Nam', emoji: '⚓',
    skills: [
      { name: 'Hịch Tướng Sĩ', desc: 'Bỏ 1 lá bài, chọn 1 tướng Trần khác. Tướng đó +1 sát thương cho lá [Chém] tiếp theo.' },
      { name: 'Bạch Đằng', desc: 'Ở Giai đoạn Phán xét của bất kỳ ai, đánh ra 1 lá Đen (♠️/♣️) để thay thế kết quả.' }
    ], bio: 'Quốc công Tiết chế, ba lần đại phá Mông-Nguyên.',
  },
  {
    id: 'pham-ngu-lao', name: 'Phạm Ngũ Lão', maxHp: 4, faction: 'Trần', gender: 'Nam', emoji: '🧺',
    skills: [
      { name: 'Đan Sọt', desc: 'Bạn không bị giới hạn số lượng bài trên tay ở Giai đoạn Bỏ bài.' },
      { name: 'Vạn Kiếp', desc: 'Giai đoạn rút bài, bỏ rút bài để lấy toàn bộ bài trong Khu Vực Phán Xét của mọi người về tay mình.' }
    ], bio: 'Ngồi đan sọt bị giáo đâm xuyên đùi không biết.',
  },
  {
    id: 'tran-quoc-toan', name: 'Trần Quốc Toản', maxHp: 3, faction: 'Trần', gender: 'Nam', emoji: '🍊',
    skills: [
      { name: 'Quả Cam', desc: 'Mỗi khi mất 1 HP, lập tức ra 1 lá [Chém] miễn phí vào mục tiêu trong tầm.' },
      { name: 'Tuổi Trẻ', desc: 'Luôn được ưu tiên đánh trước nếu có Quyết Đấu.' }
    ], bio: 'Hoài Văn Hầu, bóp nát quả cam vì hận không được dự hội nghị Diên Hồng.',
  },
  {
    id: 'yet-kieu', name: 'Yết Kiêu', maxHp: 4, faction: 'Trần', gender: 'Nam', emoji: '🏊',
    skills: [
      { name: 'Độn Thủy', desc: 'Không thể bị chọn làm mục tiêu của lá [Chém] nếu người tấn công không có Trang bị Vũ khí.' }
    ], bio: 'Thần tướng thủy chiến nhà Trần, đục thuyền giặc.',
  },
  {
    id: 'da-tuong', name: 'Dã Tượng', maxHp: 4, faction: 'Trần', gender: 'Nam', emoji: '🐘',
    skills: [
      { name: 'Voi Chiến', desc: 'Tầm đánh tay không mặc định là 2.' },
      { name: 'Chà Đạp', desc: 'Lá [Chém] của bạn không thể bị [Né] bởi những tướng có số lượng bài trên tay ít hơn bạn.' }
    ], bio: 'Thần tướng tượng binh nhà Trần.',
  },

  // LÊ (Lam Sơn)
  {
    id: 'le-loi', name: 'Lê Lợi', maxHp: 4, faction: 'Lê', gender: 'Nam', emoji: '👑',
    skills: [
      { name: 'Thuận Thiên', desc: 'Luôn được coi là có Vũ khí Tầm 2. Khi dùng [Chém], có thể lật phán xét, nếu Đỏ, sát thương +1.' },
      { name: 'Bình Ngô', desc: '(Chủ Công) Tướng Lê khi cần [Né] có thể yêu cầu Lê Lợi ra [Né] thay, và ngược lại.' }
    ], bio: 'Lê Thái Tổ, khởi nghĩa Lam Sơn.',
  },
  {
    id: 'nguyen-trai', name: 'Nguyễn Trãi', maxHp: 3, faction: 'Lê', gender: 'Nam', emoji: '📜',
    skills: [
      { name: 'Đại Cáo', desc: 'Có thể dùng 1 lá bài Đen trên tay làm cẩm nang [Tước Bài].' },
      { name: 'Tâm Công', desc: 'Mỗi lượt 1 lần: Đoán Chất bài tay mục tiêu. Đúng -> mục tiêu mất 1 HP. Sai -> bạn phải đưa họ 1 lá.' }
    ], bio: 'Danh nhân văn hóa, tác giả Bình Ngô Đại Cáo.',
  },
  {
    id: 'le-lai', name: 'Lê Lai', maxHp: 4, faction: 'Lê', gender: 'Nam', emoji: '🛡️',
    skills: [
      { name: 'Cứu Chúa', desc: 'Khi một tướng khác phe Lê sắp nhận sát thương, bạn có thể nhận thay. Nếu vậy, bạn được rút 2 lá.' }
    ], bio: 'Lê Lai liều mình cứu chúa.',
  },
  {
    id: 'nguyen-chich', name: 'Nguyễn Chích', maxHp: 4, faction: 'Lê', gender: 'Nam', emoji: '🗺️',
    skills: [
      { name: 'Kế Sách', desc: 'Đầu Giai đoạn Hành động, nhìn 3 lá trên cùng bộ bài, giữ 1 lá và bỏ 2 lá còn lại xuống đáy.' }
    ], bio: 'Đại tướng quân, người hiến kế tiến chiếm Nghệ An.',
  },
  {
    id: 'nguyen-thi-lo', name: 'Nguyễn Thị Lộ', maxHp: 3, faction: 'Lê', gender: 'Nữ', emoji: '🐍',
    skills: [
      { name: 'Lệ Chi Viên', desc: 'Khi dùng cẩm nang [Sấm Sét] hoặc [Hỗn Loạn], được ép mục tiêu bỏ 1 lá trên tay.' },
      { name: 'Hồng Nhan', desc: 'Tất cả bài bốc lên phán xét của bạn đều được tính là bài Đỏ.' }
    ], bio: 'Bà lễ nghi học sĩ trong vụ án Lệ Chi Viên.',
  }
];`;

const startIdx = content.indexOf('export const HEROES = [');
const endIdx = content.indexOf('export const CARD_TYPES = {');

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + newHeroes + '\n\n' + content.substring(endIdx);
  fs.writeFileSync(filePath, content);
  console.log('Successfully replaced 20 HEROES');
} else {
  console.log('Could not find markers');
}
