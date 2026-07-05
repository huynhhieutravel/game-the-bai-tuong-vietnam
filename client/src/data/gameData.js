// ============================================
// Game Data — Danh sách Tướng & Thẻ Bài (Đã cập nhật chuẩn Tam Quốc Sát)
// ============================================

export const HEROES = [
  // LẠC
  {
    id: 'lac-long-quan', name: 'Lạc Long Quân', maxHp: 4, faction: 'Lạc', gender: 'Nam', image: 'lac_lac-long-quan.png',
    skills: [
      { name: 'Thủy Tổ', desc: 'Trong giai đoạn Hành động, mỗi người chơi mỗi lượt một lần, bạn có thể giao cho họ tùy ý số lá bài trên tay. Lần đầu tiên trong lượt bạn giao tổng cộng từ 2 lá bài trở lên, bạn có thể xem như sử dụng hoặc đánh ra một lá Bài Cơ Bản. "Trăm họ cùng một cội, muôn dân chung một nguồn."' },
      { name: 'Bọc Trăm Trứng', desc: 'Khi bạn cần sử dụng hoặc đánh ra một lá [Chém], một tướng thuộc hệ 🟢 LẠC có thể thay bạn sử dụng hoặc đánh ra lá bài đó.' },
    ], bio: 'Đồng bào một bọc, đồng lòng một chí.',
  },
  {
    id: 'thanh-giong', name: 'Thánh Gióng', maxHp: 4, faction: 'Lạc', gender: 'Nam', image: 'lac_thanh-giong.png',
    skills: [
      { name: 'Thiết Mã (Tỏa Định Kỹ)', desc: 'Khoảng cách từ bạn đến các tướng khác luôn được tính là -1.' },
      { name: 'Tre Ngà', desc: 'Sau khi bạn sử dụng [Chém] và chỉ định mục tiêu, bạn có thể khiến toàn bộ kỹ năng không phải Tỏa Định Kỹ của mục tiêu mất hiệu lực đến hết lượt này. Sau đó tiến hành phán xét; trừ khi mục tiêu bỏ 1 lá bài cùng chất với kết quả phán xét, nếu không họ không thể sử dụng [Né].' },
    ], bio: '',
  },
  {
    id: 'son-tinh', name: 'Sơn Tinh', maxHp: 4, faction: 'Lạc', gender: 'Nam', image: 'lac_son-tinh.png',
    skills: [
      { name: 'Dời Núi', desc: 'Bạn có thể sử dụng hoặc đánh ra một lá [Chém] như [Né], hoặc một lá [Né] như [Chém].' },
    ], bio: '',
  },
  {
    id: 'chu-dong-tu', name: 'Chử Đồng Tử', maxHp: 3, faction: 'Lạc', gender: 'Nam', image: 'lac_chu-dong-tu.png',
    skills: [
      { name: 'Tiên Duyên', desc: 'Bạn có thể sử dụng hoặc trọng chú một lá bài ♣ trên tay như [Xiềng Xích].' },
      { name: 'Hóa Tiên', desc: 'Khi bạn rơi vào trạng thái Hấp hối, bạn có thể bỏ toàn bộ bài trên tay, bài Trang bị và bài Phán xét; sau đó đưa tướng về trạng thái ban đầu, rút 3 lá bài và hồi phục Sinh lực đến 3.' },
    ], bio: '',
  },
  {
    id: 'tien-dung', name: 'Tiên Dung', maxHp: 3, faction: 'Lạc', gender: 'Nữ', image: 'lac_tien-dung.png',
    skills: [
      { name: 'Duyên Tiên', desc: 'Mỗi khi bạn sử dụng một lá Cẩm Nang Thường, bạn có thể rút 1 lá bài.' },
      { name: 'Tiên Duyên (Tỏa Định Kỹ)', desc: 'Bạn sử dụng các lá Cẩm Nang không bị giới hạn khoảng cách.' },
    ], bio: '',
  },
  {
    id: 'cao-lo', name: 'Cao Lỗ', maxHp: 4, faction: 'Lạc', gender: 'Nam', image: 'lac_cao-lo.png',
    skills: [
      { name: 'Nỏ Thần (Tỏa Định Kỹ)', desc: 'Phạm vi công kích của [Chém] bạn sử dụng bằng đúng điểm số của lá bài đó. Sau khi [Chém] chỉ định mục tiêu, thực hiện các hiệu ứng sau nếu thỏa điều kiện: Nếu số bài trên tay của bạn không ít hơn mục tiêu, họ không thể sử dụng [Né]. Nếu Sinh lực của bạn không nhiều hơn mục tiêu, [Chém] đó gây thêm 1 điểm sát thương.' },
    ], bio: '',
  },
  {
    id: 'lang-lieu', name: 'Lang Liêu', maxHp: 3, faction: 'Lạc', gender: 'Nam', image: 'lac_lang-lieu.png',
    skills: [
      { name: 'Bánh Chưng', desc: 'Trong giai đoạn Chuẩn bị, bạn có thể xem X lá bài trên cùng của chồng bài rút (X bằng số người chơi còn sống, tối đa 5), sau đó đặt chúng theo thứ tự tùy ý lên đầu hoặc xuống cuối chồng bài rút.' },
      { name: 'Đạm Bạc (Tỏa Định Kỹ)', desc: 'Nếu bạn không có bài trên tay, bạn không thể trở thành mục tiêu của [Chém] hoặc [Quyết Đấu].' },
    ], bio: '',
  },
  {
    id: 'than-tru-troi', name: 'Thần Trụ Trời', maxHp: 4, faction: 'Lạc', gender: 'Nam', image: 'lac_than-tru-troi.png',
    skills: [
      { name: 'Khai Thiên', desc: 'Bạn có thể sử dụng hoặc đánh ra một lá bài Đỏ như một lá [Chém].' },
    ], bio: '',
  },
  {
    id: 'rua-vang', name: 'Rùa Vàng', maxHp: 3, faction: 'Lạc', gender: 'Không', image: 'lac_rua-vang.png',
    skills: [
      { name: 'Thần Giáp (Tỏa Định Kỹ)', desc: 'Nếu khu Trang bị của bạn không có Giáp, bạn được xem như đã trang bị [Bát Quái Trận].' },
      { name: 'Thần Hỏa', desc: 'Bạn có thể sử dụng một lá bài Đỏ trên tay như [Hỏa Công].' },
      { name: 'Linh Giám', desc: 'Bạn có thể sử dụng một lá bài Đen trên tay như [Hóa Giải].' },
    ], bio: '',
  },
  // VIỆT
  {
    id: 'trieu-quang-phuc', name: 'Triệu Quang Phục', maxHp: 4, faction: 'Việt', gender: 'Nam', image: 'viet_trieu-quang-phuc.png',
    skills: [
      { name: 'Dạ Trạch', desc: 'Trong giai đoạn Rút bài, bạn có thể thay vào đó thu lấy ngẫu nhiên 1 lá bài trên tay của tối đa 2 tướng khác.' },
    ], bio: '',
  },
  {
    id: 'phung-hung', name: 'Phùng Hưng', maxHp: 4, faction: 'Việt', gender: 'Nam', image: 'viet_phung-hung.png',
    skills: [
      { name: 'Khởi Nghĩa', desc: 'Trong giai đoạn Rút bài, bạn có thể rút ít hơn 1 lá bài. Nếu làm vậy, trong lượt này, [Chém] và [Quyết Đấu] do bạn sử dụng gây thêm 1 điểm sát thương.' },
    ], bio: '',
  },
  {
    id: 'khuc-thua-du', name: 'Khúc Thừa Dụ', maxHp: 3, faction: 'Việt', gender: 'Nam', image: 'viet_khuc-thua-du.png',
    skills: [
      { name: 'Tự Chủ', desc: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể đấu điểm với một tướng có Sinh lực cao hơn bạn. Nếu bạn thắng, chọn một tướng trong phạm vi công kích của họ; họ gây 1 điểm sát thương lên tướng đó. Nếu bạn không thắng, họ gây 1 điểm sát thương lên bạn.' },
      { name: 'Khoan Dân', desc: 'Sau khi bạn nhận sát thương, bạn có thể chọn một tướng. Người đó rút bài cho đến khi số bài trên tay bằng X (X bằng giới hạn Sinh lực của họ, tối đa 5).' },
    ], bio: '',
  },
  {
    id: 'duong-dinh-nghe', name: 'Dương Đình Nghệ', maxHp: 4, faction: 'Việt', gender: 'Nam', image: 'viet_duong-dinh-nghe.png',
    skills: [
      { name: 'Dưỡng Quân', desc: 'Bạn có thể thực hiện một hoặc nhiều lựa chọn sau: Bỏ qua giai đoạn Phán xét và giai đoạn Rút bài. Bỏ qua giai đoạn Hành động và bỏ 1 lá bài Trang bị. Bỏ qua giai đoạn Bỏ bài và lật mặt tướng. Mỗi lựa chọn được thực hiện, xem như bạn sử dụng một lá [Chém] không hạn chế cự ly.' },
    ], bio: '',
  },
  {
    id: 'ly-thuong-kiet', name: 'Lý Thường Kiệt', maxHp: 4, faction: 'Việt', gender: 'Nam', image: 'viet_ly-thuong-kiet.png',
    skills: [
      { name: 'Nam Quốc Sơn Hà', desc: 'Sau khi bạn nhận sát thương, bạn có thể rút 1 lá bài, rồi thu lấy lá bài gây ra sát thương đó.' },
      { name: 'Tiên Phát', desc: 'Khi bạn cần sử dụng hoặc đánh ra một lá [Né], một tướng thuộc hệ 🔴 VIỆT có thể thay bạn sử dụng hoặc đánh ra lá bài đó.' },
    ], bio: '',
  },
  {
    id: 'tran-quang-khai', name: 'Trần Quang Khải', maxHp: 4, faction: 'Việt', gender: 'Nam', image: 'viet_tran-quang-khai.png',
    skills: [
      { name: 'Đoạt Sáo', desc: 'Trong giai đoạn Kết thúc, bạn có thể lật mặt tướng và rút 4 lá bài. Sau đó, bỏ 1 lá bài trên tay; nếu lá bài bị bỏ là Trang bị, bạn được thay vào đó sử dụng lá bài ấy.' },
      { name: 'Chương Dương', desc: 'Bạn có thể sử dụng lá bài trong khu Trang bị như [Hóa Giải]. Khi bạn lật mặt tướng từ mặt sau lên mặt trước, bạn có thể bỏ 1 lá bài, sau đó di chuyển 1 lá bài trên bàn chơi.' },
    ], bio: '',
  },
  {
    id: 'nguyen-lu', name: 'Nguyễn Lữ', maxHp: 4, faction: 'Việt', gender: 'Nam', image: 'viet_nguyen-lu.png',
    skills: [
      { name: 'Tiên Phong', desc: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể chọn một: Mất 1 điểm Sinh lực; hoặc Bỏ 1 lá bài Vũ khí. Nếu làm vậy, gây 1 điểm sát thương lên một tướng khác trong phạm vi công kích của bạn.' },
    ], bio: '',
  },
  // HÀ
  {
    id: 'ngo-quyen', name: 'Ngô Quyền', maxHp: 4, faction: 'Hà', gender: 'Nam', image: 'ha_ngo-quyen.png',
    skills: [
      { name: 'Bạch Đằng', desc: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể bỏ tùy ý số lá bài, sau đó rút số lá bài tương ứng. Nếu bằng cách này bạn bỏ toàn bộ bài trên tay, hãy rút thêm 1 lá bài.' },
      { name: 'Hậu Viện', desc: 'Khi một tướng thuộc hệ 🔵 HÀ sử dụng [Đào] lên bản thân, nếu sinh lực của họ lớn hơn bạn, họ có thể để bạn hồi phục 1 điểm sinh lực thay cho mình. Nếu làm vậy, họ rút 1 lá bài.' },
    ], bio: '',
  },
  {
    id: 'da-tuong', name: 'Dã Tượng', maxHp: 4, faction: 'Hà', gender: 'Nam', image: 'ha_da-tuong.png',
    skills: [
      { name: 'Kỳ Tập', desc: 'Bạn có thể sử dụng một lá bài Đen như một lá [Tước Bài].' },
    ], bio: '',
  },
  {
    id: 'yet-kieu', name: 'Yết Kiêu', maxHp: 4, faction: 'Hà', gender: 'Nam', image: 'ha_yet-kieu.png',
    skills: [
      { name: 'Lặn Sâu', desc: 'Trong giai đoạn Hành động, bạn có thể mất 1 điểm Sinh lực, sau đó rút 2 lá bài.' },
    ], bio: '',
  },
  {
    id: 'nguyen-trai', name: 'Nguyễn Trãi', maxHp: 3, faction: 'Hà', gender: 'Nam', image: 'ha_nguyen-trai.png',
    skills: [
      { name: 'Bình Ngô', desc: 'Trong giai đoạn Rút bài, bạn có thể rút thêm 1 lá bài.' },
      { name: 'Tâm Công', desc: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể chỉ định một tướng khác chọn một chất bài. Sau đó, họ thu lấy ngẫu nhiên 1 lá bài trên tay bạn và mở ra. Nếu chất của lá bài đó khác với chất họ đã chọn, bạn gây 1 điểm sát thương lên họ.' },
    ], bio: '',
  },
  {
    id: 'nguyen-chich', name: 'Nguyễn Chích', maxHp: 4, faction: 'Hà', gender: 'Nam', image: 'ha_nguyen-chich.png',
    skills: [
      { name: 'Nghệ An Kế (Tỏa Định Kỹ)', desc: 'Bạn không thể trở thành mục tiêu của [Cướp Bài] và [Hỗn Loạn].' },
    ], bio: '',
  },
  {
    id: 'to-hien-thanh', name: 'Tô Hiến Thành', maxHp: 3, faction: 'Hà', gender: 'Nam', image: 'ha_to-hien-thanh.png',
    skills: [
      { name: 'Nhiếp Chính', desc: 'Nếu trong giai đoạn Hành động bạn không sử dụng hoặc đánh ra [Chém], thì bạn có thể bỏ qua giai đoạn Bỏ bài.' },
    ], bio: '',
  },
  {
    id: 'nguyen-phi-y-lan', name: 'Nguyên Phi Ỷ Lan', maxHp: 3, faction: 'Hà', gender: 'Nữ', image: 'ha_nguyen-phi-y-lan.png',
    skills: [
      { name: 'Thính Chính', desc: 'Bạn có thể sử dụng hoặc đánh ra một lá bài Đen trên tay như [Né].' },
      { name: 'Phật Tâm', desc: 'Trong giai đoạn Chuẩn bị, bạn có thể tiến hành phán xét. Nếu kết quả là bài Đen, bạn có thể lặp lại quá trình này. Sau đó, thu lấy tất cả các lá bài phán xét màu Đen.' },
    ], bio: '',
  },
  {
    id: 'tran-nhat-duat', name: 'Trần Nhật Duật', maxHp: 3, faction: 'Hà', gender: 'Nam', image: 'ha_tran-nhat-duat.png',
    skills: [
      { name: 'Thông Ngôn', desc: 'Sau khi lá bài phán xét của bạn có hiệu lực, bạn có thể thu lấy lá bài đó.' },
      { name: 'Hòa Nghị', desc: 'Sau khi bạn nhận 1 điểm sát thương, bạn có thể xem 2 lá bài trên cùng của chồng bài rút, sau đó phân phối những lá bài đó cho các tướng tùy ý.' },
    ], bio: '',
  },
  {
    id: 'tran-khanh-du', name: 'Trần Khánh Dư', maxHp: 4, faction: 'Hà', gender: 'Nam', image: 'ha_tran-khanh-du.png',
    skills: [
      { name: 'Vân Đồn', desc: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể đấu điểm với một tướng khác. Nếu thắng, trong lượt này bạn được sử dụng thêm 1 lá [Chém], [Chém] không giới hạn cự ly và có thể chỉ định thêm 1 mục tiêu. Nếu không thắng, bạn không thể sử dụng [Chém] trong lượt này.' },
    ], bio: '',
  },
  {
    id: 'mac-dinh-chi', name: 'Mạc Đĩnh Chi', maxHp: 3, faction: 'Hà', gender: 'Nam', image: 'ha_mac-dinh-chi.png',
    skills: [
      { name: 'Đối Sứ', desc: 'Sau khi bạn nhận sát thương, bạn có thể thu lấy 1 lá bài từ nguồn sát thương.' },
      { name: 'Ứng Biến', desc: 'Trước khi lá bài phán xét của một người chơi có hiệu lực, bạn có thể đánh ra 1 lá bài trên tay để thay thế lá bài phán xét đó.' },
    ], bio: '',
  },
  {
    id: 'chu-van-an', name: 'Chu Văn An', maxHp: 3, faction: 'Hà', gender: 'Nam', image: 'ha_chu-van-an.png',
    skills: [
      { name: 'Thất Trảm Sớ', desc: 'Sau khi bạn nhận sát thương, bạn có thể tiến hành phán xét. Nếu kết quả không phải chất ♥, nguồn sát thương phải chọn một: Bỏ 2 lá bài trên tay; hoặc Nhận 1 điểm sát thương do bạn gây ra.' },
    ], bio: '',
  },
  {
    id: 'ho-xuan-huong', name: 'Hồ Xuân Hương', maxHp: 3, faction: 'Hà', gender: 'Nữ', image: 'ha_ho-xuan-huong.png',
    skills: [
      { name: 'Duyên Thơ', desc: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể bỏ 2 lá bài trên tay. Sau đó, bạn và một tướng Nam đã bị thương mỗi người hồi phục 1 điểm Sinh lực.' },
      { name: 'Xuân Hương', desc: 'Sau khi bạn mất 1 lá bài ở khu Trang bị, bạn có thể rút 2 lá bài.' },
    ], bio: '',
  },
  {
    id: 'nguyen-dia-lo', name: 'Nguyễn Địa Lô', maxHp: 4, faction: 'Hà', gender: 'Nam', image: 'ha_nguyen-dia-lo.png',
    skills: [
      { name: 'Hộ Chủ (Tỏa Định Kỹ)', desc: 'Khi bạn rơi vào trạng thái Hấp hối, lật lá bài trên cùng của chồng bài rút và đặt lên tướng của bạn, gọi là "Trung". Nếu điểm số của lá bài này khác với tất cả các lá "Trung" đã có, bạn hồi phục đến 1 điểm Sinh lực. Nếu trùng điểm số, bỏ lá bài đó vào chồng bài bỏ. Khi trên tướng của bạn có "Trung", giới hạn trữ bài bằng số lá "Trung".' },
      { name: 'Can Gián', desc: 'Khi một tướng bị bỏ hoặc bị thu lấy bài trên tay, bạn có thể mất 1 điểm Sinh lực. Nếu làm vậy, tướng đó rút 2 lá bài.' },
    ], bio: '',
  },
  {
    id: 'ngoc-han-cong-chua', name: 'Ngọc Hân Công Chúa', maxHp: 3, faction: 'Hà', gender: 'Nữ', image: 'ha_ngoc-han-cong-chua.png',
    skills: [
      { name: 'Hiền Hậu', desc: 'Khi bạn nhận sát thương, bạn có thể bỏ 1 lá bài ♥ trên tay để ngăn chặn sát thương đó, rồi chọn 1 tướng khác và chọn một: Tướng đó nhận 1 điểm sát thương, sau đó rút X lá bài (X là số Sinh lực đã mất của họ, tối đa 5). Tướng đó mất 1 điểm Sinh lực, sau đó thu lấy lá bài bạn vừa bỏ.' },
      { name: 'Quốc Sắc (Tỏa Định Kỹ)', desc: 'Mọi lá bài ♠ của bạn được xem như ♥.' },
    ], bio: '',
  },
  {
    id: 'cong-chua-an-tu', name: 'Công chúa An Tư', maxHp: 3, faction: 'Hà', gender: 'Nữ', image: 'ha_cong-chua-an-tu.png',
    skills: [
      { name: 'Hòa Thân', desc: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể bỏ 1 lá bài và chọn 2 tướng Nam khác. Sau đó, một trong hai tướng được xem như sử dụng một lá [Quyết Đấu] lên người còn lại.' },
      { name: 'Xả Thân', desc: 'Khi bạn trở thành mục tiêu của [Chém], bạn có thể bỏ 1 lá bài để chuyển lá [Chém] đó sang một tướng khác trong phạm vi công kích của bạn.' },
    ], bio: '',
  },
  // SƠN
  {
    id: 'tue-tinh', name: 'Tuệ Tĩnh', maxHp: 3, faction: 'Sơn', gender: 'Nam', image: 'son_tue-tinh.png',
    skills: [
      { name: 'Nam Dược', desc: 'Ngoài lượt của bạn, bạn có thể sử dụng một lá bài Đỏ như [Đào].' },
      { name: 'Diệu Dược', desc: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể bỏ 1 lá bài trên tay để một tướng hồi phục 1 điểm Sinh lực.' },
    ], bio: '',
  },
  {
    id: 'dinh-bo-linh', name: 'Đinh Bộ Lĩnh', maxHp: 6, faction: 'Sơn', gender: 'Nam', image: 'son_dinh-bo-linh.png',
    skills: [
      { name: 'Uy Chấn (Tỏa Định Kỹ)', desc: 'Khi một người chơi khác sử dụng [Chém] màu Đỏ gây sát thương cho bạn, người đó phải chọn một: Hồi phục 1 điểm Sinh lực; hoặc Rút 1 lá bài.' },
    ], bio: '',
  },
  {
    id: 'nguyen-bac', name: 'Nguyễn Bặc', maxHp: 4, faction: 'Sơn', gender: 'Nam', image: 'son_nguyen-bac.png',
    skills: [
      { name: 'Bình Loạn', desc: 'Bạn có thể sử dụng 2 lá bài cùng Chất trên tay như một lá [Loạn Tiễn].' },
      { name: 'Khai Quốc', desc: 'Giới hạn số lá bài trên tay của bạn +X (X bằng 2 lần số tướng thuộc hệ 🟤 SƠN).' },
    ], bio: '',
  },
  {
    id: 'huyen-tran-cong-chua', name: 'Huyền Trân Công Chúa', maxHp: 3, faction: 'Sơn', gender: 'Nữ', image: 'son_huyen-tran-cong-chua.png',
    skills: [
      { name: 'Hòa Thân', desc: 'Trong giai đoạn Hành động, mỗi lượt một lần, bạn có thể bỏ 1 lá bài và chọn 2 tướng Nam khác. Sau đó, một trong hai tướng được xem như sử dụng một lá [Quyết Đấu] lên người còn lại.' },
      { name: 'An Bang', desc: 'Trong giai đoạn Kết thúc, bạn có thể rút 1 lá bài.' },
    ], bio: '',
  },
  {
    id: 'dinh-dien', name: 'Đinh Điền', maxHp: 3, faction: 'Sơn', gender: 'Nam', image: 'son_dinh-dien.png',
    skills: [
      { name: 'Phạt Tội', desc: 'Khi bạn sử dụng hoặc đánh ra [Né], bạn có thể chọn một người chơi khác tiến hành phán xét. Nếu kết quả là: ♠: Bạn gây 2 điểm sát thương Lôi lên họ. ♣: Bạn hồi phục 1 điểm Sinh lực, sau đó gây 1 điểm sát thương Lôi lên họ.' },
      { name: 'Quân Cơ', desc: 'Trước khi lá bài phán xét của một người chơi có hiệu lực, bạn có thể đánh ra một lá bài Đen để thay thế lá bài phán xét đó.' },
      { name: 'Định Quốc', desc: 'Trong giai đoạn Hành động, mỗi tướng thuộc hệ 🟤 SƠN có thể một lần giao cho bạn một lá [Né] hoặc [Sấm Sét].' },
    ], bio: '',
  },
  {
    id: 'nguyen-xi', name: 'Nguyễn Xí', maxHp: 5, faction: 'Sơn', gender: 'Nam', image: 'son_nguyen-xi.png',
    skills: [
      { name: 'Phá Quân (Tỏa Định Kỹ)', desc: 'Sau mỗi khi bạn sử dụng [Chém] chỉ định mục tiêu, họ phải sử dụng 2 lá [Né] mới có thể triệt tiêu. Sau mỗi khi bạn sử dụng [Quyết Đấu] chỉ định mục tiêu, hoặc trở thành mục tiêu của [Quyết Đấu], đối phương phải đánh ra 2 lá [Chém] cho mỗi lần hưởng ứng.' },
    ], bio: '',
  },
  {
    id: 'do-doc-bao', name: 'Đô đốc Bảo', maxHp: 4, faction: 'Sơn', gender: 'Nam', image: 'son_do-doc-bao.png',
    skills: [
      { name: 'Phá Thành', desc: 'Trong giai đoạn Rút bài, bạn có thể thay vào đó tiến hành phán xét. Thu lấy lá bài phán xét đã có hiệu lực. Trong lượt này, bạn có thể sử dụng một lá bài trên tay khác màu với kết quả phán xét như [Quyết Đấu].' },
    ], bio: '',
  },
  {
    id: 'le-ngan', name: 'Lê Ngân', maxHp: 3, faction: 'Sơn', gender: 'Nam', image: 'son_le-ngan.png',
    skills: [
      { name: 'Trung Dũng', desc: 'Lượt của mỗi người chơi, mỗi lượt một lần, bạn có thể úp 1 lá bài trên tay và sử dụng hoặc đánh ra như bất kỳ lá bài nào. Người chơi khác có thể nghi ngờ và công khai lá bài đó: Nếu là giả, lá bài này vô hiệu. Nếu là thật, người nghi ngờ nhận kỹ năng "Hộ Giá".' },
      { name: 'Hộ Giá (Tỏa Định Kỹ)', desc: 'Bạn không thể nghi ngờ kỹ năng Trung Dũng. Khi Sinh lực của bạn chỉ còn 1, các kỹ năng khác của bạn bị vô hiệu.' },
    ], bio: '',
  },
];

export const CARD_TYPES = {
  BASIC: 'basic',
  TRICK: 'trick',
  EQUIP: 'equip'
};

export const CARD_SUBTYPES = {
  // Cẩm nang
  TRICK_NORMAL: 'Cẩm nang thường',
  TRICK_DELAYED: 'Cẩm nang trì hoãn',
  // Trang bị
  EQUIP_WEAPON: 'Vũ khí',
  EQUIP_ARMOR: 'Phòng cụ',
  EQUIP_MOUNT_ATK: 'Ngựa tấn công (-1)',
  EQUIP_MOUNT_DEF: 'Ngựa phòng thủ (+1)',
};

// Hàm kiểm tra bài có phải bài gây sát thương không
export const isDamageCard = (cardName) => {
  return ['Chém', 'Quyết Đấu', 'Dã Man', 'Loạn Tiễn', 'Sấm Sét'].includes(cardName);
};

// Hàm xác định Subtype cho bài
/**
 * Lấy Subtype của một lá bài
 * @param {Object} card Object lá bài hoàn chỉnh
 * @returns {string|null}
 */
export const getCardSubType = (card) => {
  if (!card || typeof card !== 'object' || card.name === undefined) {
    throw new Error(`[Type Error] getCardSubType expects a card object, got: ${typeof card} (value: ${card})`);
  }
  if (card.type === CARD_TYPES.TRICK) {
    if (['Sấm Sét', 'Hỗn Loạn'].includes(card.name)) return CARD_SUBTYPES.TRICK_DELAYED;
    return CARD_SUBTYPES.TRICK_NORMAL;
  }
  if (card.type === CARD_TYPES.EQUIP) {
    if (card.name.includes('-1')) return CARD_SUBTYPES.EQUIP_MOUNT_ATK;
    if (card.name.includes('+1')) return CARD_SUBTYPES.EQUIP_MOUNT_DEF;
    if (['Bát Quái', 'Hắc Thuẫn'].includes(card.name)) return CARD_SUBTYPES.EQUIP_ARMOR;
    return CARD_SUBTYPES.EQUIP_WEAPON;
  }
  return null;
};

const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Hàm tạo lá bài
const createCards = (name, type, emoji, desc, count) => {
  return Array(count).fill(null).map((_, i) => {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const color = (suit === '♥' || suit === '♦') ? 'red' : 'black';
    return {
      id: `${name.toLowerCase().replace(/ /g, '-')}-${i}-${Date.now()}`,
      name, type, emoji, desc,
      suit, rank, color
    };
  });
};

export const CARDS = [
  // --- BÀI CƠ BẢN ---
  ...createCards('Chém', CARD_TYPES.BASIC, '⚔️', 'Gây 1 sát thương cho 1 mục tiêu trong tầm đánh.', 30),
  ...createCards('Né', CARD_TYPES.BASIC, '💨', 'Tránh 1 lá Chém.', 15),
  ...createCards('Đào', CARD_TYPES.BASIC, '🍑', 'Hồi 1 HP hoặc cứu người hấp hối.', 8),
  ...createCards('Rượu', CARD_TYPES.BASIC, '🍶', '+1 sát thương cho Chém tiếp theo, hoặc tự cứu khi hấp hối.', 5),

  // --- CẨM NANG ---
  ...createCards('Quyết Đấu', CARD_TYPES.TRICK, '⚡', 'Thách đấu 1v1, hai bên thay phiên ra Chém, ai không có mất 1 HP.', 3),
  ...createCards('Cướp Bài', CARD_TYPES.TRICK, '🤏', 'Lấy 1 lá của người khác (khoảng cách 1).', 5),
  ...createCards('Tước Bài', CARD_TYPES.TRICK, '💥', 'Loại bỏ 1 lá của người khác (bất kỳ khoảng cách).', 5),
  ...createCards('Mượn Đao', CARD_TYPES.TRICK, '🗡️', 'Giai đoạn hành động, bạn sử dụng lá bài này lên 1 người chơi khác có bài Vũ khí trong khu vực Trang bị và có chứa ít nhất 1 người chơi trong phạm vi công kích của họ.\nBạn chọn 1 người chơi nằm trong phạm vi công kích của mục tiêu, sau đó mục tiêu chọn 1 hạng mục:\nHọ sử dụng 1 lá [Chém] lên người chơi mà bạn chỉ định.\nHọ giao cho bạn bài Vũ khí trong khu vực Trang bị của họ.', 2),
  ...createCards('Loạn Tiễn', CARD_TYPES.TRICK, '🏹', 'Tất cả phải ra Né, không ra mất 1 HP.', 1),
  ...createCards('Dã Man', CARD_TYPES.TRICK, '🔥', 'Tất cả phải ra Chém, không ra mất 1 HP.', 3),
  ...createCards('Hồi Xuân', CARD_TYPES.TRICK, '🌸', 'Tất cả người chơi hồi 1 HP.', 1),
  ...createCards('Hóa Giải', CARD_TYPES.TRICK, '🛡️', 'Vô hiệu hóa BẤT KỲ lá cẩm nang nào.', 4),
  ...createCards('Sấm Sét', CARD_TYPES.TRICK, '🌩️', 'Bài trì hoãn. Rút phán xét Bích 2-9 nổ mất 3 HP.', 2),
  ...createCards('Hỗn Loạn', CARD_TYPES.TRICK, '🌀', 'Bài trì hoãn. Rút phán xét không phải Cơ -> mất Giai đoạn Ra bài.', 3),
  ...createCards('Xiềng Xích', CARD_TYPES.TRICK, '⛓️', 'Chọn 1-2 tướng để Xích lại (hoặc Tháo Xích). Nếu không chọn ai, bạn có thể Rèn Lại (bỏ lá này rút 1 lá mới).', 6),

  // --- TRANG BỊ ---
  ...createCards('Liên Nỏ', CARD_TYPES.EQUIP, '🏹', 'Vũ khí (Tầm 1): Không giới hạn số lượng Chém/lượt.', 2),
  ...createCards('Thanh Long Đao', CARD_TYPES.EQUIP, '🐉', 'Vũ khí (Tầm 3): Chém bị Né -> Được Chém tiếp.', 1),
  ...createCards('Rìu Đá', CARD_TYPES.EQUIP, '🪓', 'Vũ khí (Tầm 3): Chém bị Né -> Bỏ 2 bài để xuyên giáp.', 1),
  ...createCards('Bát Quái', CARD_TYPES.EQUIP, '☯️', 'Giáp: Cần Né -> Phán xét Đỏ = Tự động Né.', 2),
  ...createCards('Hắc Thuẫn', CARD_TYPES.EQUIP, '🛡️', 'Giáp: Miễn nhiễm Chém màu Đen.', 1),
  ...createCards('Ngựa Chiến (-1)', CARD_TYPES.EQUIP, '🐎', 'Ngựa tấn công: Giảm khoảng cách từ mình đến người khác đi 1.', 3),
  ...createCards('Ngựa Thần (+1)', CARD_TYPES.EQUIP, '🐴', 'Ngựa phòng thủ: Tăng khoảng cách từ người khác đến mình thêm 1.', 3),
];

// Danh sách các Cẩm nang để render trong Wiki
export const TRICK_CARDS_INFO = [
  { name: 'Quyết Đấu', emoji: '⚡', desc: 'Thách đấu 1v1, hai bên thay phiên ra Chém, ai không có mất 1 HP.' },
  { name: 'Cướp Bài', emoji: '🤏', desc: 'Lấy 1 lá của người khác (khoảng cách 1).' },
  { name: 'Tước Bài', emoji: '💥', desc: 'Loại bỏ 1 lá của người khác (bất kỳ khoảng cách).' },
  { name: 'Mượn Đao', emoji: '🗡️', desc: 'Giai đoạn hành động, bạn sử dụng lá bài này lên 1 người chơi khác có bài Vũ khí trong khu vực Trang bị và có chứa ít nhất 1 người chơi trong phạm vi công kích của họ.\nBạn chọn 1 người chơi nằm trong phạm vi công kích của mục tiêu, sau đó mục tiêu chọn 1 hạng mục:\nHọ sử dụng 1 lá [Chém] lên người chơi mà bạn chỉ định.\nHọ giao cho bạn bài Vũ khí trong khu vực Trang bị của họ.' },
  { name: 'Loạn Tiễn', emoji: '🏹', desc: 'Tất cả phải ra Né, không ra mất 1 HP.' },
  { name: 'Dã Man', emoji: '🔥', desc: 'Tất cả phải ra Chém, không ra mất 1 HP.' },
  { name: 'Hồi Xuân', emoji: '🌸', desc: 'Tất cả người chơi hồi 1 HP.' },
  { name: 'Hóa Giải', emoji: '🛡️', desc: 'Vô hiệu hóa BẤT KỲ lá cẩm nang nào. Có thể chặn Hóa Giải.' },
  { name: 'Sấm Sét', emoji: '🌩️', desc: 'Bài trì hoãn. Rút phán xét Bích 2-9 nổ mất 3 HP.' },
  { name: 'Hỗn Loạn', emoji: '🌀', desc: 'Bài trì hoãn. Rút phán xét không phải Cơ -> mất Giai đoạn Ra bài.' },
  { name: 'Xiềng Xích', emoji: '⛓️', desc: 'Chọn 1-2 tướng để Xích lại (hoặc Tháo Xích). Nếu không chọn ai, bạn có thể Rèn Lại (bỏ lá này rút 1 lá mới).' },
];

export const EQUIP_CARDS_INFO = [
  { name: 'Liên Nỏ', type: 'Vũ khí', range: 1, emoji: '🏹', desc: 'Không giới hạn số lượng Chém/lượt.' },
  { name: 'Thanh Long Đao', type: 'Vũ khí', range: 3, emoji: '🐉', desc: 'Chém bị Né -> Được Chém tiếp.' },
  { name: 'Rìu Đá', type: 'Vũ khí', range: 3, emoji: '🪓', desc: 'Chém bị Né -> Bỏ 2 bài để xuyên giáp bắt buộc trúng.' },
  { name: 'Bát Quái', type: 'Giáp', range: '-', emoji: '☯️', desc: 'Khi cần Né -> Phán xét Đỏ = Tự động Né miễn phí.' },
  { name: 'Hắc Thuẫn', type: 'Giáp', range: '-', emoji: '🛡️', desc: 'Miễn nhiễm mọi lá Chém màu Đen.' },
  { name: 'Ngựa Chiến (-1)', type: 'Ngựa', range: '-1', emoji: '🐎', desc: 'Giảm khoảng cách từ mình đến người khác đi 1.' },
  { name: 'Ngựa Thần (+1)', type: 'Ngựa', range: '+1', emoji: '🐴', desc: 'Tăng khoảng cách từ người khác đến mình thêm 1.' },
];

export const PHASES = {
  DRAFT: 'draft',
  BEGIN: 'begin',
  JUDGE: 'judge',
  DRAW: 'draw',
  ACTION: 'action',
  DISCARD: 'discard',
  END: 'end',
};

export const PHASE_LABELS = {
  [PHASES.DRAFT]: '⏳ Chọn Tướng',
  [PHASES.BEGIN]: '① Bắt Đầu',
  [PHASES.JUDGE]: '② Phán Xét',
  [PHASES.DRAW]: '③ Rút Bài',
  [PHASES.ACTION]: '④ Hành Động',
  [PHASES.DISCARD]: '⑤ Bỏ Bài',
  [PHASES.END]: '⑥ Kết Thúc',
};
