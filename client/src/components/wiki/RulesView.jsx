import React from 'react';

export default function RulesView() {
  return (
    <div className="wiki-hero-detail" style={{ maxWidth: '100%', margin: '0', textAlign: 'left', lineHeight: '1.6' }}>
      <h2>📜 Luật Chơi Cơ Bản & Chế Độ Quốc Chiến</h2>
      
      <div className="wiki-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <h3 style={{ color: 'var(--color-gold)' }}>1. Chế Độ Quốc Chiến (National War)</h3>
        <ul>
          <li><strong>Phe phái:</strong> Không được định sẵn. Phe của bạn dựa vào Thế lực của 2 vị Tướng bạn chọn (Lạc, Âu, Hà, Sơn).</li>
          <li><strong>Chọn Tướng (Draft):</strong> Mỗi người chơi sẽ được chia ngẫu nhiên 5 lá võ tướng. Bạn phải chọn <strong>2 võ tướng cùng Thế lực</strong>. Tướng đặt bên trái là Chủ tướng, tướng đặt bên phải là Phó tướng.</li>
          <li><strong>Sinh lực (HP):</strong> Giới hạn sinh lực bằng tổng sinh lực (số âm dương ngư) của 2 võ tướng.
            <br/><span style={{ color: 'var(--color-text-muted)' }}>- <strong style={{ color: 'var(--color-gold)' }}>Quy tắc Âm Dương Giao Hoà:</strong> Nếu tổng sinh lực của 2 tướng gốc là số lẻ, thì <strong>khi lật mặt cả 2 võ tướng</strong>, bạn sẽ được thưởng rút 1 lá bài ngay lập tức (chỉ được 1 lần/ván).</span>
          </li>
          <li><strong>Tướng Ẩn:</strong> Đầu trận, toàn bộ người chơi đều bị úp Tướng (Tướng Ẩn). Bạn không biết phe của đối phương và giới tính của bạn được tính là <strong>Không</strong>. Các Tỏa Định Kỹ (Kỹ năng bị động) sẽ <strong>vô hiệu hóa</strong> khi tướng bị úp.</li>
          <li><strong>Lật Tướng:</strong> Bạn có thể lật một hoặc cả hai tướng (độc lập) vào Giai đoạn Bắt đầu của mình, hoặc khi bạn cần phát động kỹ năng/sử dụng bài. Giới tính của bạn sẽ thay đổi tùy vào việc bạn lật Tướng nào.</li>
          <li><strong>Tiên Phong Cắm Cờ:</strong> Trong ván từ 6 người trở lên, người chơi lật tướng ĐẦU TIÊN của ván đấu sẽ được thưởng ngay lập tức <strong>+2 lá bài</strong>.</li>
          <li><strong>Chiến Thắng:</strong> Trò chơi kết thúc khi trên bàn chỉ còn những người sống sót thuộc cùng một Phe (hoặc Dã Tâm chiến thắng đơn độc).</li>
        </ul>
      </div>

      <div className="wiki-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <h3 style={{ color: 'var(--color-gold)' }}>2. Cơ Chế Dã Tâm (Careerist)</h3>
        <p>Đây là luật để cân bằng game, đề phòng trường hợp một phe có quá đông thành viên.</p>
        <ul>
          <li>Ngay tại khoảnh khắc bạn <strong>lật tướng đầu tiên</strong> của mình, hệ thống sẽ kiểm tra: tính cả bạn, nếu số lượng người chơi <strong>ĐÃ LỘ DIỆN</strong> của phe đó vượt quá <strong>N/2</strong> (Một nửa tổng số người chơi ban đầu).</li>
          <li>Bạn sẽ lập tức bị thoái hóa thành <strong>🐺 Dã Tâm</strong>. <em>(Ví dụ: Game 4 người, 2 người phe Lạc đã lật. Người thứ 3 phe Lạc lật lên sẽ thành Dã Tâm)</em>. Phe Dã Tâm sẽ hiển thị màu Xám.</li>
          <li><strong>Luật Thắng Dã Tâm:</strong> Người chơi Dã Tâm được xem như một phe Độc lập và chỉ chiến thắng khi <strong>tự tay tiêu diệt toàn bộ người chơi khác trên bàn</strong> (kể cả những Dã tâm khác).</li>
        </ul>
      </div>
      
      <div className="wiki-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <h3 style={{ color: 'var(--color-gold)' }}>3. Hệ Thống Tầm Đánh (Range System)</h3>
        <ul>
          <li><strong>Khoảng cách</strong> = số người ngồi giữa 2 người (chọn đường ngắn nhất) + 1.</li>
          <li><strong>Tầm đánh tay không</strong> = 1 (chỉ có thể đánh người ngồi ngay cạnh trái/phải).</li>
          <li>Nếu muốn dùng lá CHÉM với người ở khoảng cách xa hơn, bạn BẮT BUỘC phải có Vũ khí Tầm tương ứng, hoặc có Ngựa Trừ.</li>
        </ul>
      </div>
      
      <div className="wiki-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <h3 style={{ color: 'var(--color-gold)' }}>4. Cơ Chế Hấp Hối & Cứu Mạng</h3>
        <ul>
          <li>Khi HP bị trừ xuống 0 hoặc âm, người chơi rơi vào trạng thái <strong>Hấp Hối</strong>.</li>
          <li>Bắt đầu từ người đó vòng theo chiều kim đồng hồ, tất cả mọi người có thể dùng lá <strong>ĐÀO</strong> để cứu.</li>
          <li>Nếu HP được cứu lên lớn hơn 0, người chơi tiếp tục sống. Ngược lại, họ Tử trận.</li>
        </ul>
      </div>
    <div className="wiki-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <h3 style={{ color: 'var(--color-gold)' }}>5. Phân biệt: SỬ DỤNG (Dùng) và ĐÁNH RA (Đả Xuất)</h3>
        
        <h4 style={{ color: '#10b981', marginTop: '15px' }}>A. Sử Dụng (Dùng)</h4>
        <p>Sử dụng được chia làm 2 loại: Sử dụng Cơ bản/Cẩm nang, và sử dụng Trang bị.</p>
        <ul style={{ marginBottom: '15px' }}>
          <li><strong>Cơ bản & Cẩm nang:</strong> Áp dụng hiệu ứng vốn có được mô tả trên lá bài. Có thể là chủ động (Sử dụng <em>Chém</em> để tấn công) hoặc bị động (Sử dụng <em>Né</em> để triệt tiêu Chém).
            <br/><span style={{ color: 'var(--color-text-muted)' }}>- Bài Cơ bản/Cẩm nang thường dùng xong sẽ vào <strong>chồng bài bỏ</strong>.</span>
            <br/><span style={{ color: 'var(--color-text-muted)' }}>- Cẩm nang trì hoãn dùng xong sẽ đi vào <strong>khu phán xét</strong>.</span>
          </li>
          <li><strong>Trang bị:</strong> Sử dụng trang bị không phải là áp dụng hiệu ứng, mà là <strong>đưa nó vào Khu Trang Bị</strong> của mình.
            <br/><span style={{ color: 'var(--color-text-muted)' }}>- Việc xài hiệu ứng mô tả trên trang bị được gọi là <strong>Kích hoạt công dụng</strong> chứ không gọi là sử dụng.</span>
            <br/><span style={{ color: 'var(--color-text-muted)' }}>- Sử dụng trang bị có thể làm bất cứ lúc nào ở lượt của bạn. Nó sẽ đẩy trang bị cùng loại đang đeo trước đó vào chồng bài bỏ.</span>
          </li>
        </ul>

        <h4 style={{ color: '#3b82f6' }}>B. Đánh Ra (Đả Xuất)</h4>
        <ul>
          <li>Không tận dụng hiệu ứng vốn có được mô tả trên lá bài. Đả xuất hoàn toàn không quan tâm gì đến mô tả hiệu ứng, mà sử dụng các thuộc tính phụ của lá bài như: tên, chất bài, số điểm, màu sắc...</li>
          <li>Là hành động <strong>hoàn toàn bị động</strong>, chỉ có thể thực hiện khi có yêu cầu từ một sự kiện nào đó như: hưởng ứng một lá bài, sự kiện phán xét, hoặc yêu cầu từ một kỹ năng Tướng.</li>
          <li>Bài đả xuất <strong>luôn đi vào chồng bài bỏ</strong> chứ không đi vào bất kỳ khu vực nào khác.</li>
        </ul>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '10px' }}>
          <em>* Lưu ý: Các khái niệm như Đấu điểm, Bỏ bài, Đặt bài cũng tương đương với khái niệm "Đánh ra".</em>
        </p>
      </div>

      <div className="wiki-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <h3 style={{ color: 'var(--color-gold)' }}>6. Phân biệt: NHẬN SÁT THƯƠNG và MẤT SINH LỰC</h3>
        <p style={{ marginBottom: '15px' }}>
          Phân biệt rõ ràng giữa nhận sát thương, mất máu và giảm máu rất quan trọng vì nó ảnh hưởng đến nhiều tương tác và kỹ năng. Ví dụ: Một số kỹ năng chỉ kích hoạt khi bạn <em>nhận sát thương</em> (ví dụ: Quách Gia), trong khi những kỹ năng khác lại kích hoạt khi bạn <em>mất sinh lực</em>.
        </p>

        <h4 style={{ color: '#ef4444', marginTop: '15px' }}>A. Nhận Sát Thương</h4>
        <ul style={{ marginBottom: '15px' }}>
          <li>Là hiện tượng người chơi bị giảm HP bởi bài sát thương (Chém, Loạn Tiễn,...) hoặc kỹ năng Tướng.</li>
          <li>Sát thương thường <strong>có nguồn gốc rõ ràng</strong> (ai gây ra sát thương). (Lưu ý: vẫn có sát thương vô nguồn như Sấm Sét).</li>
          <li>Được chia thành <strong>Sát thương vật lý (phi thuộc tính)</strong> và <strong>Sát thương thuộc tính (Lôi / Hỏa)</strong>.
            <br/><span style={{ color: 'var(--color-text-muted)' }}>- Nếu bài hoặc kỹ năng không ghi rõ Lôi/Hỏa, thì mặc định là sát thương vật lý.</span>
          </li>
          <li><strong style={{ color: '#ef4444' }}>Quan trọng:</strong> Sát thương có thể bị chặn bởi Giáp hoặc Né, và SẼ kích hoạt các kỹ năng dạng "Khi nhận sát thương".</li>
        </ul>

        <h4 style={{ color: '#8b5cf6' }}>B. Mất Sinh Lực (Mất máu)</h4>
        <ul style={{ marginBottom: '15px' }}>
          <li>Là sự sụt giảm HP do nội sinh, <strong>không có nguồn gốc</strong> (không ai gây ra).</li>
          <li><strong>KHÔNG kích hoạt</strong> bất kỳ sự kiện kết toán nào liên quan đến sát thương (không thể dùng Giáp chặn, không kích hoạt kỹ năng phản đòn).</li>
          <li>Thuộc về hiệu ứng tiêu cực tự phát của Tướng hoặc do trả giá để dùng kỹ năng (VD: Hoàng Cái tự mất 1 máu để bốc bài).</li>
        </ul>

        <h4 style={{ color: '#f59e0b' }}>C. Giảm Máu</h4>
        <ul>
          <li>Là một khái niệm bao hàm. Bao gồm CẢ HAI hiệu ứng trên, miễn là HP bị giảm đều được coi là giảm máu.</li>
        </ul>
      </div>

      <div className="wiki-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <h3 style={{ color: 'var(--color-gold)' }}>7. TRÌNH TỰ KẾT TOÁN SÁT THƯƠNG VÀ SỬ DỤNG BÀI</h3>
        <p style={{ marginBottom: '15px' }}>
          Đây là chuỗi logic cốt lõi của game, phân định rõ ràng thời điểm nào kỹ năng của Tướng được phép kích hoạt.
        </p>

        <h4 style={{ color: '#10b981', marginTop: '15px' }}>A. Quá Trình Kết Toán Sát Thương</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '15px', color: 'var(--color-gold-light)', fontSize: '0.9rem', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>
          <span>Khi gây ST</span> ➔ <span>Khi nhận ST</span> ➔ <span>Sau khi gây ST</span> ➔ <span>Sau khi nhận ST</span>
        </div>
        <ul style={{ marginBottom: '15px' }}>
          <li><strong>Thứ tự ưu tiên:</strong> Hiệu ứng tăng/giảm sát thương của người gây sẽ được kích hoạt trước, sau đó mới là hiệu ứng ngăn chặn sát thương. Tương tự đối với người phòng thủ.</li>
          <li><strong style={{ color: '#ef4444' }}>Xử lý Hấp Hối:</strong> Nếu sát thương khiến người chơi rơi vào trạng thái Hấp hối (HP ≤ 0), việc xử lý cứu mạng phải được giải quyết NGAY LẬP TỨC trước khi thực hiện các bước "Sau khi gây/nhận".</li>
          <li>Nếu người chơi tử trận, chỉ có thể kích hoạt hiệu ứng <em>"Sau khi gây ST"</em>, còn hiệu ứng <em>"Sau khi nhận ST"</em> của người chết sẽ bị hủy bỏ (vì họ không còn trên bàn).</li>
        </ul>

        <h4 style={{ color: '#3b82f6' }}>B. Quá Trình Kết Toán Sử Dụng Bài</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '15px', color: 'var(--color-gold-light)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>
          <span>Cần dùng bài</span> ➔ <span>Tuyên bố dùng</span> ➔ <span>Sau tuyên bố</span> ➔ <span>Khi chọn mục tiêu</span> ➔ <span>Khi chỉ định mục tiêu</span> ➔ <span>Khi trở thành mục tiêu</span> ➔ <span>Sau khi chỉ định</span> ➔ <span>Sau khi trở thành</span>
        </div>
        <ul>
          <li>Việc phân chia cực kỳ chi tiết này giúp giải quyết các pha "đụng độ" kỹ năng. Kỹ năng nào có timing (thời điểm) xảy ra trước sẽ được ưu tiên chạy trước.</li>
          <li><strong>Ví dụ đụng độ Timing:</strong>
            <br/><span style={{ color: 'var(--color-text-muted)' }}>- Kỹ năng A kích hoạt <em>"Sau khi chỉ định mục tiêu"</em>.</span>
            <br/><span style={{ color: 'var(--color-text-muted)' }}>- Kỹ năng B kích hoạt <em>"Sau khi trở thành mục tiêu"</em>.</span>
            <br/><span style={{ color: 'var(--color-text-muted)' }}>- Kỹ năng C kích hoạt <em>"Khi trở thành mục tiêu"</em>.</span>
            <br/>➞ Vì "Khi trở thành" xảy ra trước "Sau khi chỉ định", kỹ năng C sẽ được phép ngắt ngang và kích hoạt trước để né đòn, khiến kỹ năng A và B có thể bị vô hiệu nếu mục tiêu thay đổi.
          </li>
        </ul>
      </div>

      <div className="wiki-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <h3 style={{ color: 'var(--color-gold)' }}>8. Khái Niệm VÒNG và LƯỢT</h3>
        
        <h4 style={{ color: '#10b981', marginTop: '15px' }}>A. Quy Trình Của Một Lượt (Turn)</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '15px', color: 'var(--color-gold-light)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>
          <span style={{ color: '#9ca3af' }}>[Bắt đầu lượt]</span> ➔ <span>Chuẩn bị</span> ➔ <span>Phán xét</span> ➔ <span>Rút bài</span> ➔ <span>Hành động</span> ➔ <span>Bỏ bài</span> ➔ <span>Kết thúc</span> ➔ <span style={{ color: '#9ca3af' }}>[Kết thúc lượt]</span>
        </div>
        <ul style={{ marginBottom: '15px' }}>
          <li>Các "Giai đoạn" luôn tồn tại trong mỗi lượt (dù bạn không có hành động gì trong giai đoạn đó). Ví dụ: Dù bạn không bị dán thẻ Sấm Sét, thì game vẫn ngầm đi qua Giai đoạn Phán xét chứ nó không hề biến mất.</li>
          <li><strong style={{ color: '#ef4444' }}>Lưu ý:</strong> <em>"Bắt đầu lượt"</em> và <em>"Kết thúc lượt"</em> KHÔNG được tính là một Giai đoạn. Chúng chỉ là hai cột mốc (timing) xác định sự vào/ra của một Lượt. Do đó, một số kỹ năng yêu cầu "Bỏ qua Giai đoạn" sẽ không bao giờ ảnh hưởng đến 2 cột mốc này.</li>
        </ul>

        <h4 style={{ color: '#3b82f6' }}>B. Vòng Chơi (Round)</h4>
        <ul>
          <li>Tính từ thời điểm bắt đầu lượt của người chơi Số 1 đến khi kết thúc lượt của người chơi cuối cùng trên bàn (nếu không ai bị mất lượt).</li>
          <li>Nếu có một người chơi được nhận "Lượt chơi thêm" (Extra turn), thì sau khi người đó chơi xong, game vẫn tiếp tục vòng quay thông thường cho tới khi tất cả chơi xong mới tính là hết 1 Vòng.</li>
          <li>Thời điểm bắt đầu Vòng chơi đầu tiên sẽ diễn ra NGAY TRƯỚC thời điểm Bắt đầu trò chơi.</li>
        </ul>
      </div>

      <div className="wiki-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <h3 style={{ color: 'var(--color-gold)' }}>9. Các KHU VỰC Trong Trò Chơi</h3>
        <p style={{ marginBottom: '15px' }}>Một người chơi sẽ quản lý 3 khu vực chính để chứa bài của mình:</p>
        
        <ul style={{ marginBottom: '15px' }}>
          <li><strong style={{ color: '#3b82f6' }}>Khu vực Bài Trên Tay:</strong> Chứa các lá bài bạn đang cầm. Chỉ bạn mới thấy được nội dung của chúng (trừ khi bị lộ).</li>
          <li><strong style={{ color: '#10b981' }}>Khu vực Trang Bị:</strong> Nơi đặt bài trang bị đã được sử dụng. Bao gồm tối đa: 1 ô Vũ khí, 1 ô Phòng cụ, 1 ô Bảo vật, và 2 ô Tọa kỵ (Ngựa tấn công & Ngựa phòng thủ).</li>
          <li><strong style={{ color: '#8b5cf6' }}>Khu vực Phán Xét:</strong> Nơi người khác (hoặc chính bạn) đặt bài Cẩm nang trì hoãn (Sấm Sét, Hỗn Loạn) lên đầu bạn. 
            <br/><span style={{ color: 'var(--color-text-muted)' }}>- Mỗi loại cẩm nang cùng tên chỉ được phép tồn tại 1 lá.</span>
            <br/><span style={{ color: 'var(--color-text-muted)' }}>- Phán xét được giải quyết theo nguyên tắc <strong style={{ color: '#ef4444' }}>"Vào sau, Kết toán trước" (LIFO - Last In First Out)</strong>.</span>
          </li>
        </ul>

        <h4 style={{ color: 'var(--color-gold-light)', marginTop: '20px' }}>📌 Các Khái Niệm Phân Loại Khu Vực (Rất dễ nhầm lẫn)</h4>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
            <li><strong style={{ color: 'var(--color-text-primary)' }}>Bài CỦA người chơi:</strong> Là bài nằm trong <strong>Trang Bị</strong> và <strong>Trên Tay</strong>. (Khi kỹ năng yêu cầu "tước bài của người chơi", bạn KHÔNG được tước bài trong khu phán xét).</li>
            <li><strong style={{ color: 'var(--color-text-primary)' }}>Bài TRÊN BÀN chơi:</strong> Là bài nằm trong <strong>Phán Xét</strong> và <strong>Trang Bị</strong>. (Tức là những lá bài mà mọi người đều nhìn thấy công khai).</li>
            <li><strong style={{ color: 'var(--color-text-primary)' }}>Bài TRONG KHU VỰC chơi:</strong> Là tổng hợp bài của <strong>cả 3 khu vực trên</strong> (Trên tay + Trang bị + Phán xét). Khái niệm này bao trọn mọi lá bài đang gắn liền với vị Tướng đó.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
