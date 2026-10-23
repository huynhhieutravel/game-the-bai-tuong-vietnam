import React from 'react';

/**
 * Bộ Icon Vector Game Cổ Trang chuẩn hóa cho Việt Sát
 * Tối ưu UI/UX: Rõ ràng, dễ nhận biết từ xa, độ tương phản cao, phong cách thẻ bài chiến thuật.
 */

// 1. Icon Ô Trang Bị: Vũ Khí (Song Kiếm Chéo Bạc Sáng - Chuôi Vàng Kim)
export function WeaponIcon({ size = 28, className = '', ...props }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`game-icon weapon-icon ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="swordBladeSteel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="swordHiltGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
      </defs>
      {/* Kiếm 1 (Xoay 45 độ) */}
      <g transform="rotate(45 16 16)">
        <path d="M16 2 L19 8 L18 20 L16 22 L14 20 L13 8 Z" fill="url(#swordBladeSteel)" stroke="#0f172a" strokeWidth="0.9" />
        <line x1="16" y1="3" x2="16" y2="21" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
        <rect x="9.5" y="20.5" width="13" height="3" rx="1.5" fill="url(#swordHiltGold)" stroke="#78350f" strokeWidth="0.8" />
        <rect x="14.5" y="23.5" width="3" height="5.5" rx="0.5" fill="#451a03" />
        <circle cx="16" cy="30" r="2" fill="url(#swordHiltGold)" stroke="#78350f" strokeWidth="0.8" />
      </g>
      {/* Kiếm 2 (Xoay -45 độ) */}
      <g transform="rotate(-45 16 16)">
        <path d="M16 2 L19 8 L18 20 L16 22 L14 20 L13 8 Z" fill="url(#swordBladeSteel)" stroke="#0f172a" strokeWidth="0.9" />
        <line x1="16" y1="3" x2="16" y2="21" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
        <rect x="9.5" y="20.5" width="13" height="3" rx="1.5" fill="url(#swordHiltGold)" stroke="#78350f" strokeWidth="0.8" />
        <rect x="14.5" y="23.5" width="3" height="5.5" rx="0.5" fill="#451a03" />
        <circle cx="16" cy="30" r="2" fill="url(#swordHiltGold)" stroke="#78350f" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

// 2. Icon Ô Trang Bị: Phòng Cụ (Khiên Hộ Thân Kim Tuyến Lõi Lam Ngọc)
export function ArmorIcon({ size = 28, className = '', ...props }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`game-icon armor-icon ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="shieldGoldRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <linearGradient id="shieldBlueCore" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      {/* Vành khiên hoàng kim */}
      <path 
        d="M16 2 C24 2 28 5 28 13 C28 22 21 27.5 16 30 C11 27.5 4 22 4 13 C4 5 8 2 16 2 Z" 
        fill="url(#shieldGoldRim)" 
        stroke="#451a03" 
        strokeWidth="1.2" 
      />
      {/* Lõi khiên ngọc bích hoàng gia */}
      <path 
        d="M16 4.5 C22 4.5 25.5 7 25.5 13 C25.5 20.5 19.5 25 16 27.5 C12.5 25 6.5 20.5 6.5 13 C6.5 7 10 4.5 16 4.5 Z" 
        fill="url(#shieldBlueCore)" 
        stroke="#1e3a8a" 
        strokeWidth="0.8" 
      />
      {/* Biểu tượng chữ thập vàng hộ thân */}
      <path d="M16 7 L16 21 M10 14 L22 14" stroke="url(#shieldGoldRim)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="14" r="5" stroke="url(#shieldGoldRim)" strokeWidth="1.8" fill="none" />
      <circle cx="16" cy="14" r="2.2" fill="#fef08a" />
    </svg>
  );
}

// 3. Icon Ô Trang Bị: Ngựa Công (-1) (Chiến Mã Đỏ Tiến Công - Dễ nhận biết 100%)
export function MountAtkIcon({ size = 28, className = '', ...props }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`game-icon mount-atk-icon ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="horseAtkBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="45%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="horseGoldMane" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Thân & Đầu Ngựa Chiến (Hình dáng đầu ngựa hướng sang phải rõ nét) */}
      <path
        d="M 6 29 C 6 23, 8 16, 12 11 L 13 5 L 16.5 1 L 18.5 6 C 20 8.5, 23 11.5, 26 13.5 C 27 14.5, 27 16, 25.5 17 C 24 18, 22.5 17.5, 21.5 16.5 C 19.5 17.5, 17.5 20, 17 29 Z"
        fill="url(#horseAtkBody)"
        stroke="#450a0a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Tai trong của ngựa */}
      <polygon points="14.5,5 16.5,2.5 17.5,6" fill="#fca5a5" />

      {/* Bờm ngựa chiến vàng rực lửa dọc sau gáy */}
      <path 
        d="M 12 11 Q 9 9, 8 13 Q 11 14, 10 17 Q 7 17, 6 21 Q 9 21, 6 27" 
        stroke="url(#horseGoldMane)" 
        strokeWidth="2.4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />

      {/* Mắt ngựa chiến tinh anh */}
      <circle cx="19" cy="9.5" r="1.5" fill="#fef08a" stroke="#7f1d1d" strokeWidth="0.5" />
      <circle cx="19.3" cy="9.3" r="0.6" fill="#000000" />

      {/* Lỗ mũi ngựa */}
      <ellipse cx="24.5" cy="15" rx="0.9" ry="1.2" fill="#7f1d1d" />

      {/* Dây cương chiến mã (Dấu hiệu đặc trưng không thể nhầm lẫn của ngựa cưỡi) */}
      <path d="M 17 6.5 L 20 15.5 L 24 14.5" stroke="#fef08a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="15.5" r="1.8" fill="#f59e0b" stroke="#78350f" strokeWidth="0.6" />

      {/* Huy hiệu Badge -1 to rõ, sắc nét, độ tương phản cao */}
      <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.85))">
        <rect x="14" y="18" width="17" height="12" rx="3.5" fill="#180404" stroke="#ef4444" strokeWidth="1.4" />
        <text x="22.5" y="27" textAnchor="middle" fill="#fef08a" fontSize="9.5" fontWeight="900" fontFamily="system-ui, sans-serif">-1</text>
      </g>
    </svg>
  );
}

// 4. Icon Ô Trang Bị: Ngựa Thủ (+1) (Chiến Mã Lam Phòng Thủ - Dễ nhận biết 100%)
export function MountDefIcon({ size = 28, className = '', ...props }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`game-icon mount-def-icon ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="horseDefBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="45%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="horseSilverMane" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
      </defs>

      {/* Thân & Đầu Ngựa Hộ Vệ (Hình dáng đầu ngựa hướng sang trái uy dũng) */}
      <path
        d="M 26 29 C 26 23, 24 16, 20 11 L 19 5 L 15.5 1 L 13.5 6 C 12 8.5, 9 11.5, 6 13.5 C 5 14.5, 5 16, 6.5 17 C 8 18, 9.5 17.5, 10.5 16.5 C 12.5 17.5, 14.5 20, 15 29 Z"
        fill="url(#horseDefBody)"
        stroke="#172554"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Tai trong của ngựa */}
      <polygon points="17.5,5 15.5,2.5 14.5,6" fill="#bfdbfe" />

      {/* Bờm ngựa chiến bạc sáng dọc sau gáy */}
      <path 
        d="M 20 11 Q 23 9, 24 13 Q 21 14, 22 17 Q 25 17, 26 21 Q 23 21, 26 27" 
        stroke="url(#horseSilverMane)" 
        strokeWidth="2.4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />

      {/* Mắt ngựa kiên định */}
      <circle cx="13" cy="9.5" r="1.5" fill="#ffffff" stroke="#1e3a8a" strokeWidth="0.5" />
      <circle cx="12.7" cy="9.3" r="0.6" fill="#000000" />

      {/* Lỗ mũi ngựa */}
      <ellipse cx="7.5" cy="15" rx="0.9" ry="1.2" fill="#1e3a8a" />

      {/* Dây cương chiến mã */}
      <path d="M 15 6.5 L 12 15.5 L 8 14.5" stroke="#bfdbfe" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.8" fill="#93c5fd" stroke="#1e3a8a" strokeWidth="0.6" />

      {/* Huy hiệu Badge +1 to rõ, sắc nét, độ tương phản cao */}
      <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.85))">
        <rect x="1" y="18" width="17" height="12" rx="3.5" fill="#030f2b" stroke="#3b82f6" strokeWidth="1.4" />
        <text x="9.5" y="27" textAnchor="middle" fill="#fef08a" fontSize="9.5" fontWeight="900" fontFamily="system-ui, sans-serif">+1</text>
      </g>
    </svg>
  );
}

// 5. Icon Trái Tim Máu Sinh Mệnh 3D Ruby (Ruby Heart)
export function HpHeartIcon({ size = 16, lost = false, className = '', ...props }) {
  if (lost) {
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`hp-heart lost ${className}`}
        style={{ opacity: 0.35, filter: 'grayscale(1)' }}
        {...props}
      >
        <path 
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
          fill="#1e293b" 
          stroke="#475569" 
          strokeWidth="1.5" 
        />
      </svg>
    );
  }

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`hp-heart active ${className}`}
      style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.75))' }}
      {...props}
    >
      <defs>
        <linearGradient id="rubyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="35%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>
      </defs>
      {/* Khối trái tim Ruby */}
      <path 
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
        fill="url(#rubyGrad)" 
        stroke="#ffe4e6" 
        strokeWidth="1" 
      />
      {/* Vết sáng phản chiếu 3D (Specular Highlight) */}
      <ellipse cx="7" cy="7" rx="2.5" ry="1.4" transform="rotate(-30 7 7)" fill="rgba(255, 255, 255, 0.75)" />
    </svg>
  );
}

// 6. Icon Chỉ Số: Số lá bài trên tay (2 Lá Bài Chiến Thuật Vàng Kim Sắc Nét)
export function HandCardsIcon({ size = 14, className = '', ...props }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 20 20" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`game-icon ${className}`}
      {...props}
    >
      <defs>
        <linearGradient id="cardGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
      {/* Lá bài nghiêng sau */}
      <rect x="2.5" y="4.5" width="9.5" height="13.5" rx="1.8" transform="rotate(-15 7.25 11.25)" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
      {/* Lá bài chính trước */}
      <rect x="6.5" y="3" width="10" height="14" rx="2" fill="#0f172a" stroke="url(#cardGoldGrad)" strokeWidth="1.3" />
      {/* Biểu tượng chất bài vàng ở giữa */}
      <polygon points="11.5,6.5 13.5,9.5 11.5,12.5 9.5,9.5" fill="url(#cardGoldGrad)" />
    </svg>
  );
}

// 7. Icon Chỉ Số: Tầm Đánh (Song Kiếm Chém Chéo Đỏ Sắc Nét)
export function RangeIcon({ size = 14, className = '', ...props }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 20 20" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`game-icon ${className}`}
      {...props}
    >
      {/* Kiếm chéo 1 */}
      <line x1="4" y1="16" x2="15" y2="5" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="15.5" cy="4.5" r="1.3" fill="#fef08a" />
      <line x1="3" y1="17" x2="6" y2="14" stroke="#fca5a5" strokeWidth="2.2" strokeLinecap="round" />
      {/* Kiếm chéo 2 */}
      <line x1="16" y1="16" x2="5" y2="5" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="4.5" cy="4.5" r="1.3" fill="#fef08a" />
      <line x1="17" y1="17" x2="14" y2="14" stroke="#fca5a5" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// 8. Icon Chỉ Số: Khoảng Cách Cự Ly (La Bàn Chiến Trận Tròn Trị)
export function DistanceIcon({ size = 14, className = '', ...props }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 20 20" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`game-icon ${className}`}
      {...props}
    >
      {/* Vòng la bàn */}
      <circle cx="10" cy="10" r="8" stroke="#38bdf8" strokeWidth="1.8" fill="#0f172a" />
      {/* Kim chỉ nam đỏ - xanh nhọn sắc nét */}
      <polygon points="10,3.5 12.5,9.5 10,8.5 7.5,9.5" fill="#ef4444" />
      <polygon points="10,16.5 12.5,10.5 10,11.5 7.5,10.5" fill="#60a5fa" />
      <circle cx="10" cy="10" r="1.5" fill="#ffffff" />
    </svg>
  );
}
