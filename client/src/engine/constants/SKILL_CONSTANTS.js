// ==========================================
// SKILL_CONSTANTS.js — Nguồn Duy Nhất cho tất cả tên Type
// Khi thêm tướng mới: THÊM VÀO ĐÂY TRƯỚC
// ==========================================

// === NATIVE TYPES: Dispatcher xử lý inline (KHÔNG qua SkillRegistry) ===
export const NATIVE_ASK_TYPES = {
  DODGE:           'ask_dodge',
  SLASH:           'ask_slash',
  PEACH:           'ask_peach',
  NEGATE:          'ask_negate',
  DISMANTLE:       'ask_dismantle',
  SNATCH:          'ask_snatch',
  HOACONG_REVEAL:  'ask_hoacong_reveal',
  HOACONG_DISCARD: 'ask_hoacong_discard',
  TRE_NGA_DISCARD: 'ask_tre_nga_discard',
};

export const NATIVE_PHASE_TYPES = {
  DODGE:          'dodge',
  AOE_TRICK:      'aoe_trick',
  DUEL_SLASH:     'duel_slash',
  BORROW_SWORD:   'borrow_sword',
  SAVE:           'save',
  DISCARD_PHASE:  'discard_phase',
  PLAY_PHASE:     'play_phase',
  DRAW_PHASE:     'draw_phase',
};

// === SKILL ASK TYPES: SkillRegistry xử lý qua onReact ===
// QUY ƯỚC: ask_{skill-id với dấu - thành _}
export const SKILL_ASK_TYPES = {
  // --- Lạc Long Quân ---
  THUY_TO:              'ask_thuy_to',
  THUY_TO_BONUS:        'ask_thuy_to_bonus',
  BOC_TRAM_TRUNG:       'ask_boc_tram_trung_slash',
  KHAI_QUOC:            'ask_khai_quoc',

  // --- Thánh Gióng ---
  // tre-nga: native (ask_tre_nga_discard)

  // --- Chử Đồng Tử ---
  HOA_TIEN:             'ask_hoa_tien',

  // --- Trưng Trắc ---
  TAM_CONG:             'ask_suit',   // Legacy name

  // --- Sơn Tinh ---
  // doi-nui: passive, no ask

  // --- Triệu Quang Phục ---
  UY_CHAN:               'ask_uy_chan',

  // --- Huyền Trân ---
  AN_BANG:              'ask_an_bang',

  // --- Dương Đình Nghệ ---
  DUONG_QUAN:           'ask_duong_quan',

  // --- Tuệ Tĩnh ---
  DIEU_DUOC:            'ask_dieu_duoc',

  // --- Trần Hưng Đạo ---
  PHAT_TAM:             'ask_phat_tam',

  // --- Ngô Quyền ---
  BACH_DANG:            'ask_bach_dang',

  // --- Lý Thường Kiệt ---
  NAM_QUOC_SON_HA:      'ask_nam_quoc_son_ha',
  PHA_THANH:            'ask_pha_thanh',

  // --- Trần Quốc Toản ---
  DOAT_SAO:             'ask_doat_sao',

  // --- Phạm Ngũ Lão ---
  XA_THAN:              'ask_xa_than',

  // --- Lê Thánh Tông ---
  KHOAN_DAN:            'ask_khoan_dan',

  // --- Lưu Cơ ---
  HIEN_HAU:             'ask_hien_hau',

  // --- Trịnh Kiểm ---
  DOI_SU:               'ask_doi_su',

  // --- Hồ Quý Ly ---
  HOA_NGHI:             'ask_hoa_nghi',

  // --- Mạc Đĩnh Chi ---
  // ung-bien, doi-su: passive hooks

  // --- Lý Chiêu Hoàng ---
  HO_CHU:               'ask_ho_chu',

  // --- Trần Thủ Độ ---
  TU_CHU:               'ask_tu_chu',

  // --- Nguyễn Lữ ---
  TIEN_PHONG:           'ask_tien_phong',

  // --- Lê Lợi ---
  TIEN_PHAT:            'ask_tien_phat',

  // --- Vua Hùng ---
  BANH_CHUNG:           'ask_banh_chung',

  // --- Trần Nhật Duật ---
  CHUONG_DUONG:         'ask_chuong_duong_move',
  CHUONG_DUONG_DISCARD: 'ask_chuong_duong_discard',

  // --- Hồ Xuân Hương ---
  XUAN_HUONG:           'ask_xuan_huong',

  // --- Hai Bà Trưng ---
  KHOI_NGHIA:           'ask_khoi_nghia',

  // --- Đinh Bộ Lĩnh ---
  DA_TRACH:             'ask_da_trach',

  // --- Công Chúa An Tư ---
  HOA_THAN:             'ask_hoa_than',

  // --- Nguyễn Huệ ---
  BINH_LOAN:            'ask_binh_loan',

  // --- Trương Định ---
  TRUNG_DUNG:           'ask_trung_dung',
  NGHI_NGO:             'ask_nghi_ngo',

  // --- Trần Quang Khải ---
  LAN_SAU:              'ask_lan_sau',

  // --- Trần Khánh Dư ---
  VAN_DON:              'ask_van_don',

  // --- Ngọc Hân ---
  DUYEN_THO:            'ask_duyen_tho',

  // --- Tôn Thất Thuyết ---
  THONG_NGON:           'ask_thong_ngon',

  // --- Đinh Điền ---
  PHAT_TOI:             'ask_phat_toi',

  // --- Nguyễn Xí ---
  QUAN_CO:              'ask_quan_co',
  QUAN_CO_DRAW:         'ask_quan_co_draw',

  // --- Cần Gián (Tôn Thọ Tường) ---
  CAN_GIAN:             'ask_can_gian',

  // --- Nguyễn Trãi ---
  HAU_VIEN:             'ask_hau_vien',

  // --- Thất Trảm Sớ ---
  THAT_TRAM_SO:         'ask_that_tram_so',
  THAT_TRAM_SO_PUNISH:  'ask_that_tram_so_punish',

  // --- Weapon Skills ---
  WEAPON_SKILL:         'ask_weapon_skill',
  PERFECT_PAIR:         'ask_perfect_pair',

  // --- Misc ---
  REVEAL_FOR_SKILL:     'ask_reveal_for_skill',
  SLASH_OR_DODGE:       'ask_slash_or_dodge',
  DOAT_SAO_DISCARD:     'ask_doat_sao_discard',
};

// Mảng nativeTypes dùng trong Dispatcher.js (thay thế mảng hardcode)
export const ALL_NATIVE_TYPES = [
  ...Object.values(NATIVE_ASK_TYPES),
  ...Object.values(NATIVE_PHASE_TYPES),
];

// Helper: Chuyển ask_type -> skillId cho SkillRegistry lookup
// VD: 'ask_thuy_to' -> 'thuy-to', 'ask_boc_tram_trung_slash' -> 'boc-tram-trung'
export const ASK_TYPE_TO_SKILL_ID = {
  'ask_boc_tram_trung_slash': 'boc-tram-trung',
  'ask_tre_nga_discard':      'tre-nga',
  'ask_suit':                 'tam-cong',
  'ask_chuong_duong_move':    'chuong-duong',
  'ask_chuong_duong_discard': 'chuong-duong',
  'ask_nghi_ngo':             'trung-dung',
  'ask_quan_co_draw':         'quan-co',
  'ask_that_tram_so_punish':  'that-tram-so',
  'ask_thuy_to_bonus':        'thuy-to',
  'ask_doat_sao_discard':     'doat-sao',
  'ask_weapon_skill':         'weapon-skill',
};

// Hàm chuyển đổi ask_type -> skillId
export function resolveSkillId(askType, req) {
  // 1. Nếu request đã có skillId sẵn, dùng luôn
  if (req && req.skillId) return req.skillId;
  
  // 2. Tra bảng đặc biệt
  if (ASK_TYPE_TO_SKILL_ID[askType]) return ASK_TYPE_TO_SKILL_ID[askType];
  
  // 3. Quy ước mặc định: ask_xxx_yyy -> xxx-yyy
  return askType
    .replace('ask_', '')
    .replace(/_bonus/, '')
    .replace(/_/g, '-');
}
