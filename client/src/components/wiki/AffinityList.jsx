import React from 'react';
import '../WikiPage.css';

export default function AffinityList() {
  const affinities = [
    {
      name: 'LẠC',
      emoji: '🟢',
      color: '#10b981',
      tag: 'lạc',
      philosophy: 'Sức mạnh đến từ thần thoại và những điều vượt ngoài quy luật.',
      desc: 'Các tướng thuộc hệ này không chiến thắng bằng sức mạnh thuần túy mà bằng khả năng thay đổi quy luật của trận đấu. Họ có thể biến đổi lá bài, thay đổi kết quả phán xét, hồi phục kỳ diệu hoặc tạo ra những hiệu ứng mà các hệ khác không thể làm được.',
      style: 'Phán xét, Chuyển hóa bài, Hồi phục, Hiệu ứng đặc biệt, Phép thuật, Triệu hồi, Biến đổi luật chơi',
      strengths: ['Khó đoán', 'Có nhiều combo', 'Khả năng lật ngược thế trận rất cao', 'Mạnh về cuối trận'],
      weaknesses: ['Sát thương trực diện không cao', 'Phụ thuộc kỹ năng', 'Đòi hỏi tính toán'],
      examples: ['Biến lá Đỏ thành Chém', 'Biến lá Đen thành Cẩm nang', 'Đổi kết quả phán xét', 'Hồi sinh'],
      role: 'Combo / Spell',
      difficulty: '⭐⭐⭐⭐⭐'
    },
    {
      name: 'SƠN',
      emoji: '🟤',
      color: '#b45309',
      tag: 'sơn',
      philosophy: 'Đứng vững như núi, càng bị công kích càng nguy hiểm.',
      desc: 'Các tướng thuộc hệ này không cần ra đòn quá nhiều nhưng rất khó bị đánh bại. Họ hấp thụ sát thương, phản kích đối phương và càng bị dồn ép thì càng mạnh. Đây là hệ dành cho người thích chơi chắc chắn.',
      style: 'HP cao, Giảm sát thương, Phản đòn, Phòng thủ, Càng ít máu càng mạnh',
      strengths: ['Khó bị hạ gục', 'Rất mạnh trong giao tranh kéo dài', 'Khắc chế Aggro'],
      weaknesses: ['Thiếu cơ động', 'Thiếu khả năng rút bài', 'Khó kết thúc trận đấu nhanh'],
      examples: ['Giảm sát thương nhận vào', 'Sau khi mất HP được đánh lại', 'Không bị lật trang bị', 'Không bị thay đổi khoảng cách', 'Có thêm Giáp khi mất máu'],
      role: 'Tank / Bruiser',
      difficulty: '⭐⭐☆☆☆'
    },
    {
      name: 'HÀ',
      emoji: '🔵',
      color: '#3b82f6',
      tag: 'hà',
      philosophy: 'Như nước, không đối đầu trực diện nhưng luôn tìm được đường thắng.',
      desc: 'Các tướng của hệ này sử dụng trí tuệ, tốc độ và sự linh hoạt để điều khiển nhịp độ trận đấu. Họ thường không gây sát thương lớn, nhưng khiến đối thủ luôn ở thế bất lợi. Đây là hệ có nhiều kỹ năng thao túng bài nhất.',
      style: 'Rút bài, Đổi bài, Cướp bài, Điều khiển khoảng cách, Né tránh, Khống chế, Combo',
      strengths: ['Luôn có nhiều tài nguyên', 'Làm chậm đối thủ', 'Khống chế rất tốt', 'Tạo combo liên tục'],
      weaknesses: ['Máu thấp', 'Phụ thuộc lượng bài', 'Thiếu sát thương bùng nổ'],
      examples: ['Xem bài trên đầu bộ bài', 'Lấy bài của người khác', 'Đổi bài với đối phương', 'Sau khi dùng Chém được di chuyển', 'Không giới hạn khoảng cách', 'Ép đối phương bỏ bài'],
      role: 'Control / Rogue',
      difficulty: '⭐⭐⭐⭐☆'
    },
    {
      name: 'VIỆT',
      emoji: '🔴',
      color: '#ef4444',
      tag: 'việt',
      philosophy: 'Chiến thắng bằng ý chí, tinh thần và sức mạnh của cả đội.',
      desc: 'Hệ cân bằng nhất. Đây là nơi quy tụ các vị vua, lãnh tụ và danh tướng có khả năng chỉ huy chiến trường. Thay vì quá thiên về phòng thủ hay mưu mẹo, hệ VIỆT mạnh nhờ khả năng phối hợp với đồng đội, gia tăng sức tấn công và duy trì áp lực liên tục.',
      style: 'Buff đồng minh, Tăng sát thương, Liên kích, Chỉ huy, Công kích, Phối hợp',
      strengths: ['Công thủ toàn diện', 'Có khả năng hỗ trợ đồng đội', 'Dễ tạo chuỗi combo', 'Mạnh ở mọi giai đoạn trận đấu'],
      weaknesses: ['Không vượt trội ở một mặt nào', 'Cần đồng đội hoặc nhịp chơi phù hợp để phát huy tối đa'],
      examples: ['Đồng minh được đánh thêm Chém', 'Đồng minh rút thêm bài', 'Tăng sát thương cho cả đội', 'Chia sẻ trang bị', 'Sau khi đồng minh gây sát thương, được rút bài', 'Khi tiêu diệt mục tiêu, cả đội nhận lợi ích'],
      role: 'Fighter / Commander',
      difficulty: '⭐⭐⭐☆☆'
    }
  ];

  return (
    <div className="wiki-page">
      <h1 style={{ color: 'var(--color-gold)', marginBottom: '10px' }}>☯️ 4 Hệ Bản Sắc (Affinities)</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px', lineHeight: '1.6' }}>
        Khác với Tam Quốc Sát, các Hệ trong Việt Sát không đại diện cho triều đại, mà đại diện cho phong cách chiến đấu.<br/>
        Mỗi tướng chỉ thuộc một Hệ, và bộ kỹ năng của tướng phải phản ánh triết lý của Hệ đó.<br/>
        Điều này giúp việc thiết kế hàng trăm tướng trong tương lai luôn nhất quán, đồng thời tạo nên nhiều phong cách chơi khác nhau.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {affinities.map(aff => (
          <div key={aff.name} style={{ background: 'var(--color-bg-card)', border: `1px solid ${aff.color}`, borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
              <div style={{ fontSize: '2.5rem' }}>{aff.emoji}</div>
              <div>
                <h2 style={{ margin: 0, color: aff.color }}>{aff.name}</h2>
                <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '5px' }}>
                  "{aff.philosophy}"
                </div>
              </div>
            </div>

            <p style={{ lineHeight: '1.6', marginBottom: '20px' }}>{aff.desc}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div>
                <h4 style={{ color: aff.color, marginBottom: '10px' }}>🎯 Thông tin cơ bản</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li><strong>Vai trò:</strong> {aff.role}</li>
                  <li><strong>Độ khó:</strong> {aff.difficulty}</li>
                  <li><strong>Phong cách:</strong> {aff.style}</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: '#4ade80', marginBottom: '10px' }}>💪 Điểm mạnh</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                  {aff.strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                </ul>
              </div>

              <div>
                <h4 style={{ color: '#f87171', marginBottom: '10px' }}>⚠️ Điểm yếu</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                  {aff.weaknesses.map((wk, idx) => <li key={idx}>{wk}</li>)}
                </ul>
              </div>

              <div>
                <h4 style={{ color: 'var(--color-gold)', marginBottom: '10px' }}>✨ Ví dụ Kỹ năng</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                  {aff.examples.map((ex, idx) => <li key={idx}>{ex}</li>)}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(212, 168, 67, 0.1)', border: '1px dashed var(--color-gold)', borderRadius: '8px' }}>
        <h3 style={{ color: 'var(--color-gold)', marginTop: 0 }}>Quy tắc vàng khi thiết kế tướng</h3>
        <p style={{ margin: 0, lineHeight: '1.6' }}>
          Thay vì hỏi "Nhân vật này thuộc triều đại nào?", hãy hỏi:<br/>
          <strong>"Nếu bỏ tên nhân vật đi, nhìn vào bộ kỹ năng, người chơi có đoán đúng Hệ không?"</strong><br/><br/>
          Nếu tuân thủ quy tắc này, Việt Sát sẽ có bản sắc gameplay rất rõ. Người chơi chỉ cần nhìn màu phe là có thể hình dung ngay lối đánh của tướng.
        </p>
      </div>
    </div>
  );
}
