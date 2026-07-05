import React from 'react';
import '../WikiPage.css';

export default function CardTypes() {
  return (
    <div className="wiki-page">
      <h1 style={{ color: 'var(--color-gold)', marginBottom: '10px' }}>PHẦN 1: LOẠI BÀI</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px', lineHeight: '1.6' }}>
        Hệ thống thẻ bài trong Việt Sát được chia làm 3 loại chính, đóng vai trò tạo nên nền tảng chiến thuật của trò chơi.
      </p>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#10b981', borderBottom: '1px solid #10b981', paddingBottom: '10px', marginBottom: '20px' }}>
          🃏 Bài Cơ Bản
        </h2>
        <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
          Gồm <strong>Chém (Sát)</strong>, <strong>Né (Thiểm)</strong>, <strong>Rượu (Tửu)</strong>, <strong>Đào (Đào)</strong>. 
        </p>
        <p style={{ lineHeight: '1.6', color: 'var(--color-text-muted)' }}>
          Thực ra Rượu là lá bài thuộc bộ mở rộng sau này (bản đầu tiên chỉ có 3 lá). Bốn lá bài này cấu thành hệ thống bài cơ bản nhất của trò chơi. Tương ứng với các cơ chế: tấn công, phòng thủ, hồi phục, cường hóa.
        </p>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#3b82f6', borderBottom: '1px solid #3b82f6', paddingBottom: '10px', marginBottom: '20px' }}>
          📜 Bài Cẩm Nang
        </h2>
        <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
          Chia làm <strong>Cẩm nang thường</strong> và <strong>Cẩm nang thời gian</strong> (bản dịch chuẩn là Cẩm nang trì hoãn).
        </p>
        <p style={{ lineHeight: '1.6', color: 'var(--color-text-muted)' }}>
          Ngoại trừ <em>Sấm Sét</em> và <em>Hỗn Loạn</em> thuộc loại Cẩm nang trì hoãn (đặt vào khu vực phán xét), thì các lá còn lại đều là Cẩm nang thường (dùng xong bỏ ngay).
        </p>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#b45309', borderBottom: '1px solid #b45309', paddingBottom: '10px', marginBottom: '20px' }}>
          🛡️ Bài Trang Bị
        </h2>
        <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
          Gồm bài <strong>Vũ khí</strong>, bài <strong>Phòng cụ (Giáp)</strong> và bài <strong>Tọa kỵ (Ngựa)</strong>.
        </p>
        <ul style={{ lineHeight: '1.8', color: 'var(--color-text-muted)', paddingLeft: '20px' }}>
          <li><strong>Bài Vũ khí:</strong> Có hiệu ứng tăng phạm vi tấn công và gia tăng hiệu quả đối với lá Chém.</li>
          <li><strong>Bài Phòng cụ:</strong> Chủ yếu cung cấp khả năng bảo vệ, giảm sát thương cho người chơi được trang bị.</li>
          <li><strong>Bài Tọa kỵ:</strong> Có thể được chia thành <em>Tọa kỵ tấn công (Ngựa -1)</em> và <em>Tọa kỵ phòng thủ (Ngựa +1)</em>, giúp điều chỉnh cự ly giữa các người chơi.</li>
        </ul>
        <p style={{ lineHeight: '1.6', color: 'var(--color-text-muted)', marginTop: '15px' }}>
          Về sau, khái niệm <strong>Bài Bảo Vật</strong> được bổ sung (ví dụ: Mộc Ngưu Lưu Mã), thường kết hợp hiệu ứng của một số kỹ năng võ tướng, tạo ra lợi thế về bài.
        </p>
      </div>

      <div style={{ marginBottom: '40px', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ color: 'var(--color-gold-light)', marginBottom: '15px' }}>Các Khái Niệm Phái Sinh Khác</h3>
        <p style={{ lineHeight: '1.6', marginBottom: '15px' }}>
          Ngoài ba loại bài chính được đề cập ở trên, còn có một số khái niệm phái sinh khác. Những khái niệm này không thuộc cùng một phạm vi phân loại với ba loại bài chính.
        </p>
        
        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ color: 'var(--color-text-primary)', marginBottom: '5px' }}>💥 Bài gây sát thương</h4>
          <p style={{ lineHeight: '1.6', color: 'var(--color-text-muted)' }}>
            Một số kỹ năng của võ tướng có thể đề cập đến "bài gây sát thương". Theo nghĩa đen, đây là tất cả các lá bài có thể gây sát thương, bao gồm bài cơ bản <strong>Chém</strong> và các bài Cẩm Nang như <strong>Quyết đấu, Hỏa công, Dã Man</strong>, và <strong>Loạn Tiễn</strong>.
          </p>
        </div>

        <div>
          <h4 style={{ color: 'var(--color-text-primary)', marginBottom: '5px' }}>🌌 Bài ngoài trò chơi</h4>
          <p style={{ lineHeight: '1.6', color: 'var(--color-text-muted)' }}>
            Đây là khái niệm về các lá bài mà một số võ tướng cụ thể có thể tạo ra trực tiếp từ bên ngoài bộ bài (không bốc từ Deck). Ví dụ: Mưu Chúc Dung trong phiên bản Đại Lục có kỹ năng Cự Tượng có thể rút thêm hai lá bài Dã Man từ bên ngoài trò chơi. Hay như Tuân Kham có lá bài Cẩm Nang độc quyền Binh lâm thành hạ không thuộc về bộ bài trong trò chơi.
          </p>
        </div>
      </div>
    </div>
  );
}
