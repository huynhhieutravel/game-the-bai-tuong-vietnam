// @ts-check
/**
 * translationHelper.js
 * Hệ thống chuẩn hóa & đồng bộ ngôn ngữ toàn diện (Translation & Language Synchronization Layer)
 * Xóa bỏ hoàn toàn tình trạng đứt gãy giữa chuỗi tiếng Anh và tiếng Việt trong Game Việt Sát.
 */

// ============================================================================
// 1. CHUẨN HÓA KIỂU KỸ NĂNG (SKILL TYPE)
// ============================================================================

export const SKILL_TYPES = Object.freeze({
  ACTIVE: 'active',
  PASSIVE: 'passive',
  LOCK: 'lock',
  LIMITED: 'limited'
});

export const SKILL_TYPE_LABELS = Object.freeze({
  [SKILL_TYPES.ACTIVE]: 'CHỦ ĐỘNG',
  [SKILL_TYPES.PASSIVE]: 'BỊ ĐỘNG',
  [SKILL_TYPES.LOCK]: 'TỎA ĐỊNH',
  [SKILL_TYPES.LIMITED]: 'HẠN ĐỊNH'
});

export const SKILL_TYPE_COLORS = Object.freeze({
  [SKILL_TYPES.ACTIVE]: '#3b82f6',   // Xanh dương
  [SKILL_TYPES.PASSIVE]: '#10b981',  // Xanh lục
  [SKILL_TYPES.LOCK]: '#ef4444',     // Đỏ
  [SKILL_TYPES.LIMITED]: '#8b5cf6'   // Tím
});

/**
 * Chuẩn hóa kiểu kỹ năng từ bất kỳ định dạng nào (Anh/Việt, hoa/thường, có/không dấu)
 * @param {string|any} rawType
 */
export function normalizeSkillType(rawType) {
  if (!rawType) {
    return {
      code: SKILL_TYPES.PASSIVE,
      label: SKILL_TYPE_LABELS[SKILL_TYPES.PASSIVE],
      badgeColor: SKILL_TYPE_COLORS[SKILL_TYPES.PASSIVE],
      isActive: false,
      isPassive: true,
      isLock: false,
      isLimited: false
    };
  }

  const str = String(rawType).trim().toLowerCase().replace(/[_-]/g, ' ');

  let code = SKILL_TYPES.PASSIVE;
  if (['active', 'active defensive', 'chu dong', 'chủ động', 'action'].includes(str)) {
    code = SKILL_TYPES.ACTIVE;
  } else if (['lock', 'locked', 'toa dinh', 'tỏa định', 'khoa', 'khóa'].includes(str)) {
    code = SKILL_TYPES.LOCK;
  } else if (['limited', 'han dinh', 'hạn định'].includes(str)) {
    code = SKILL_TYPES.LIMITED;
  } else if (['passive', 'reactive', 'bi dong', 'bị động', 'phan ung', 'phản ứng'].includes(str)) {
    code = SKILL_TYPES.PASSIVE;
  }

  return {
    code,
    label: SKILL_TYPE_LABELS[code],
    badgeColor: SKILL_TYPE_COLORS[code],
    isActive: code === SKILL_TYPES.ACTIVE,
    isPassive: code === SKILL_TYPES.PASSIVE,
    isLock: code === SKILL_TYPES.LOCK,
    isLimited: code === SKILL_TYPES.LIMITED
  };
}

// ============================================================================
// 2. CHUẨN HÓA PHE PHÁI (FACTION)
// ============================================================================

export const FACTIONS = Object.freeze({
  LAC: 'lac',
  VIET: 'viet',
  HA: 'ha',
  SON: 'son',
  DA_TAM: 'da_tam',
  NONE: 'none'
});

export const FACTION_LABELS = Object.freeze({
  [FACTIONS.LAC]: 'Lạc',
  [FACTIONS.VIET]: 'Việt',
  [FACTIONS.HA]: 'Hà',
  [FACTIONS.SON]: 'Sơn',
  [FACTIONS.DA_TAM]: 'Dã Tâm',
  [FACTIONS.NONE]: 'Chưa lộ diện'
});

export const FACTION_COLORS = Object.freeze({
  [FACTIONS.LAC]: '#10b981',    // Xanh lục
  [FACTIONS.VIET]: '#ef4444',   // Đỏ
  [FACTIONS.HA]: '#3b82f6',     // Xanh dương
  [FACTIONS.SON]: '#b45309',    // Nâu đồng
  [FACTIONS.DA_TAM]: '#eab308', // Vàng kim
  [FACTIONS.NONE]: 'rgba(255, 255, 255, 0.2)'
});

/**
 * Trả về mã Phe chuẩn dạng tiếng Anh thường ('lac', 'viet', 'ha', 'son', 'da_tam', 'none')
 * @param {string|any} rawFaction
 */
export function getCanonicalFaction(rawFaction) {
  if (!rawFaction) return FACTIONS.NONE;
  const f = String(rawFaction).trim().toLowerCase();
  if (['lac', 'lạc'].includes(f)) return FACTIONS.LAC;
  if (['viet', 'việt'].includes(f)) return FACTIONS.VIET;
  if (['ha', 'hà'].includes(f)) return FACTIONS.HA;
  if (['son', 'sơn'].includes(f)) return FACTIONS.SON;
  if (['da_tam', 'datam', 'dã tâm', 'dã_tâm'].includes(f)) return FACTIONS.DA_TAM;
  return FACTIONS.NONE;
}

/**
 * Lấy nhãn hiển thị tiếng Việt có dấu của Phe ('Lạc', 'Việt', 'Hà', 'Sơn', 'Dã Tâm')
 * @param {string|any} rawFaction
 */
export function getFactionLabel(rawFaction) {
  const code = getCanonicalFaction(rawFaction);
  return FACTION_LABELS[code] || 'Chưa lộ diện';
}

/**
 * Lấy mã màu CSS của Phe
 * @param {string|any} rawFaction
 * @param {boolean} [isDaTam]
 */
export function getFactionColor(rawFaction, isDaTam = false) {
  if (isDaTam) return FACTION_COLORS[FACTIONS.DA_TAM];
  const code = getCanonicalFaction(rawFaction);
  return FACTION_COLORS[code] || FACTION_COLORS[FACTIONS.NONE];
}

/**
 * Kiểm tra xem hai người chơi hoặc hai phe có cùng Phe đồng minh hay không
 * Xóa bỏ hoàn toàn lỗi so sánh cứng p1.faction === p2.faction khi một bên là 'ha' bên kia là 'Hà'.
 * @param {any} p1OrFaction1
 * @param {any} p2OrFaction2
 */
export function isSameFaction(p1OrFaction1, p2OrFaction2) {
  if (!p1OrFaction1 || !p2OrFaction2) return false;

  const extractFaction = (val) => {
    if (typeof val === 'object' && val !== null) {
      if (val.isDaTam) return FACTIONS.DA_TAM;
      return val.rawFaction || val.faction || val.canonicalFaction || (val.heroes?.[0]?.faction);
    }
    return val;
  };

  const c1 = getCanonicalFaction(extractFaction(p1OrFaction1));
  const c2 = getCanonicalFaction(extractFaction(p2OrFaction2));

  if (c1 === FACTIONS.NONE || c2 === FACTIONS.NONE) return false;
  if (c1 === FACTIONS.DA_TAM || c2 === FACTIONS.DA_TAM) return false;

  return c1 === c2;
}

// ============================================================================
// 3. CHUẨN HÓA GIỚI TÍNH (GENDER)
// ============================================================================

export const GENDERS = Object.freeze({
  MALE: 'male',
  FEMALE: 'female',
  NONE: 'none'
});

export const GENDER_LABELS = Object.freeze({
  [GENDERS.MALE]: 'Nam',
  [GENDERS.FEMALE]: 'Nữ',
  [GENDERS.NONE]: 'Không'
});

/**
 * Chuẩn hóa giá trị giới tính sang mã chuẩn ('male' | 'female' | 'none')
 * @param {string|any} rawGender
 */
export function normalizeGender(rawGender) {
  if (!rawGender) return GENDERS.MALE;
  const g = String(rawGender).trim().toLowerCase();
  if (['male', 'nam'].includes(g)) return GENDERS.MALE;
  if (['female', 'nữ', 'nu'].includes(g)) return GENDERS.FEMALE;
  if (['none', 'không', 'khong'].includes(g)) return GENDERS.NONE;
  return GENDERS.MALE;
}

/**
 * Lấy giới tính chuẩn ('male' | 'female' | 'none') của người chơi
 * Tuân thủ quy tắc: nếu chưa lộ diện tướng nào -> 'none'; nếu đã lộ diện -> theo Tướng Chính.
 * @param {any} player
 */
export function getPlayerGender(player) {
  if (!player) return GENDERS.NONE;
  const hasHeroes = Boolean(player.mainHeroId || player.subHeroId || (player.heroes && player.heroes.length > 0));
  if (hasHeroes && player.revealedHeroes && Array.isArray(player.revealedHeroes) && !player.revealedHeroes.some(Boolean)) {
    return GENDERS.NONE;
  }
  return normalizeGender(player.gender || player.heroes?.[0]?.gender);
}

/**
 * Lấy nhãn hiển thị tiếng Việt của giới tính ('Nam' | 'Nữ' | 'Không')
 * @param {any} player
 */
export function getPlayerGenderLabel(player) {
  const code = getPlayerGender(player);
  return GENDER_LABELS[code] || 'Nam';
}

// ============================================================================
// 4. CHUẨN HÓA CHẤT & MÀU SẮC LÁ BÀI (SUIT & COLOR)
// ============================================================================

export const CARD_SUITS = Object.freeze({
  SPADE: 'spade',
  HEART: 'heart',
  CLUB: 'club',
  DIAMOND: 'diamond'
});

export const SUIT_EMOJIS = Object.freeze({
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦'
});

export const SUIT_LABELS = Object.freeze({
  spade: 'Bích',
  heart: 'Cơ',
  club: 'Nhép',
  diamond: 'Rô'
});

/**
 * Chuẩn hóa chất lá bài từ bất kỳ định dạng nào (Anh, Việt, Emoji)
 * @param {string|any} rawSuit
 */
export function normalizeSuit(rawSuit) {
  if (!rawSuit) return { code: 'unknown', emoji: '', color: 'black', label: '' };
  const s = String(rawSuit).trim().toLowerCase();

  if (['spade', 'spades', '♠', 'bích', 'bich'].includes(s)) {
    return { code: CARD_SUITS.SPADE, emoji: '♠', color: 'black', label: 'Bích' };
  }
  if (['heart', 'hearts', '♥', 'cơ', 'co'].includes(s)) {
    return { code: CARD_SUITS.HEART, emoji: '♥', color: 'red', label: 'Cơ' };
  }
  if (['club', 'clubs', '♣', 'chuồn', 'chuon', 'nhép', 'nhep'].includes(s)) {
    return { code: CARD_SUITS.CLUB, emoji: '♣', color: 'black', label: 'Nhép' };
  }
  if (['diamond', 'diamonds', '♦', 'rô', 'ro'].includes(s)) {
    return { code: CARD_SUITS.DIAMOND, emoji: '♦', color: 'red', label: 'Rô' };
  }

  return { code: s, emoji: s, color: 'black', label: s };
}

/**
 * Lấy Emoji chất bài
 * @param {string|any} suit
 */
export function getSuitEmoji(suit) {
  return normalizeSuit(suit).emoji || suit || '';
}

/**
 * Lấy màu bài ('red' | 'black')
 * @param {string|any} suit
 */
export function getSuitColor(suit) {
  return normalizeSuit(suit).color;
}

/**
 * So sánh xem hai chất bài có trùng khớp nhau không (bất kể định dạng Anh/Việt/Emoji)
 * @param {any} suitA
 * @param {any} suitB
 */
export function isSameSuit(suitA, suitB) {
  const codeA = normalizeSuit(suitA).code;
  const codeB = normalizeSuit(suitB).code;
  if (!codeA || !codeB || codeA === 'unknown' || codeB === 'unknown') return false;
  return codeA === codeB;
}

// ============================================================================
// 5. CHUẨN HÓA GIAI ĐOẠN LƯỢT CHƠI (PHASES)
// ============================================================================

export const PHASES = Object.freeze({
  DRAFT: 'draft',
  START: 'start',
  JUDGEMENT: 'judgement',
  DRAW: 'draw',
  ACTION: 'action',
  DISCARD: 'discard',
  END: 'end'
});

export const PHASE_LABELS = Object.freeze({
  [PHASES.DRAFT]: '⏳ Chọn Tướng',
  [PHASES.START]: '① Bắt Đầu',
  [PHASES.JUDGEMENT]: '② Phán Xét',
  [PHASES.DRAW]: '③ Rút Bài',
  [PHASES.ACTION]: '④ Hành Động',
  [PHASES.DISCARD]: '⑤ Bỏ Bài',
  [PHASES.END]: '⑥ Kết Thúc'
});

/**
 * Chuẩn hóa tên Phase từ v4 (IN HOA) hoặc tiếng Việt sang constant UI chuẩn (thường)
 * @param {string|any} rawPhase
 */
export function normalizePhase(rawPhase) {
  if (!rawPhase) return PHASES.ACTION;
  const p = String(rawPhase).trim().toLowerCase();

  switch (p) {
    case 'begin':
    case 'start':
    case 'bắt đầu':
    case 'bat dau':
      return PHASES.START;

    case 'judge':
    case 'judgement':
    case 'phán xét':
    case 'phan xet':
      return PHASES.JUDGEMENT;

    case 'draw':
    case 'rút bài':
    case 'rut bai':
      return PHASES.DRAW;

    case 'action':
    case 'hành động':
    case 'hanh dong':
      return PHASES.ACTION;

    case 'discard':
    case 'bỏ bài':
    case 'bo bai':
      return PHASES.DISCARD;

    case 'end':
    case 'kết thúc':
    case 'ket thuc':
      return PHASES.END;

    case 'draft':
    case 'chọn tướng':
    case 'chon tuong':
      return PHASES.DRAFT;

    default:
      return p;
  }
}

export const PHASE_CLEAN_LABELS = Object.freeze({
  [PHASES.DRAFT]: 'Chọn Tướng',
  [PHASES.START]: 'Bắt Đầu',
  [PHASES.JUDGEMENT]: 'Phán Xét',
  [PHASES.DRAW]: 'Rút Bài',
  [PHASES.ACTION]: 'Hành Động',
  [PHASES.DISCARD]: 'Bỏ Bài',
  [PHASES.END]: 'Kết Thúc'
});

/**
 * Lấy nhãn hiển thị tiếng Việt của giai đoạn
 * @param {string|any} rawPhase
 */
export function getPhaseLabel(rawPhase) {
  const code = normalizePhase(rawPhase);
  return PHASE_CLEAN_LABELS[code] || PHASE_LABELS[code] || String(rawPhase || '');
}

/**
 * Kiểm tra xem có đang ở Pha Hành Động không
 * @param {string|any} phase
 */
export function isActionPhase(phase) {
  return normalizePhase(phase) === PHASES.ACTION;
}

/**
 * Kiểm tra xem có đang ở Pha Bỏ Bài không
 * @param {string|any} phase
 */
export function isDiscardPhase(phase) {
  return normalizePhase(phase) === PHASES.DISCARD;
}

// ============================================================================
// 6. CHUẨN HÓA TÊN & ID KỸ NĂNG (SKILL ID & NAME MAPPER)
// ============================================================================

const VIETNAMESE_ACCENT_MAP = {
  'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
  'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
  'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
  'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
  'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
  'đ': 'd'
};

export function removeVietnameseAccents(str) {
  return String(str || '')
    .toLowerCase()
    .split('')
    .map(char => VIETNAMESE_ACCENT_MAP[char] || char)
    .join('');
}

export const CANONICAL_SKILL_NAME_TO_ID = Object.freeze({
  'thuy to': 'thuy_to',
  'boc tram trung': 'boc_tram_trung',
  'thiet ma': 'thiet_ma',
  'tre nga': 'tre_nga',
  'doi nui': 'doi_nui',
  'hoa tien': 'hoa_tien',
  'duyen tien': 'duyen_tien',
  'no than': 'no_than',
  'banh chung': 'banh_chung',
  'dam bac': 'dam_bac',
  'khai thien': 'khai_thien',
  'than giap': 'than_giap',
  'than hoa': 'than_hoa',
  'linh giam': 'linh_giam',
  'da trach': 'da_trach',
  'khoi nghia': 'khoi_nghia',
  'tu chu': 'tu_chu',
  'khoan dan': 'khoan_dan',
  'duong quan': 'duong_quan',
  'nam quoc son ha': 'nam_quoc_son_ha',
  'tien phat': 'tien_phat',
  'doat sao': 'doat_sao',
  'chuong duong': 'chuong_duong',
  'tien phong': 'tien_phong',
  'bach dang': 'bach_dang',
  'hau vien': 'hau_vien',
  'ky tap': 'ky_tap',
  'lan sau': 'lan_sau',
  'binh ngo': 'binh_ngo',
  'tam cong': 'tam_cong',
  'nghe an ke': 'nghe_an_ke',
  'hien ke': 'hien_ke',
  'nhiep chinh': 'nhiep_chinh',
  'thiet ve': 'thiet_ve',
  'phat tam': 'phat_tam',
  'thong ngon': 'thong_ngon',
  'hoa nghi': 'hoa_nghi',
  'van don': 'van_don',
  'doi su': 'doi_su',
  'that tram so': 'that_tram_so',
  'duyen tho': 'duyen_tho',
  'ho chu': 'ho_chu',
  'hien hau': 'hien_hau',
  'quoc sac': 'quoc_sac',
  'hoa than': 'hoa_than',
  'hoa than an tu': 'hoa_than_an_tu',
  'nam duoc': 'nam_duoc',
  'uy chan': 'uy_chan',
  'binh loan': 'binh_loan',
  'khai quoc': 'khai_quoc',
  'phat toi': 'phat_toi',
  'quan co': 'quan_co',
  'dinh quoc': 'dinh_quoc',
  'ung bien': 'ung_bien',
  'can gian': 'can_gian',
  'tien duyen': 'tien_duyen',
  'tien duyen active': 'tien_duyen',
  'tien duyen chu dong tu': 'tien_duyen',
  'tien duyen passive': 'tien_duyen_khoang_cach',
  'tien duyen khoang cach': 'tien_duyen_khoang_cach',
  'pha quan': 'pha_quan',
  'pha quan nguyen xi': 'pha_quan',
  'pha thanh': 'pha_thanh',
  'trung dung': 'trung_dung',
  'ho gia': 'ho_gia',
  'gian hung': 'gian_hung',
  'an bang': 'an_bang',
  'xa than': 'xa_than',
  'dieu duoc': 'dieu_duoc',
  'xuan huong': 'xuan_huong',
  'thinh chinh': 'thinh_chinh',
  'no than cao lo': 'no_than',
  'tien phong nguyen lu': 'tien_phong',
  'hoa than huyen tran': 'hoa_than',
  'phat toi dinh dien': 'phat_toi',
  'nhiep chinh to hien thanh': 'nhiep_chinh'
});

/**
 * Chuẩn hóa bất kỳ tên kỹ năng tiếng Việt (có/không dấu) hoặc slug tiếng Anh (- hoặc _) sang ID chuẩn snake_case
 * @param {string|any} nameOrId
 */
export function normalizeSkillId(nameOrId) {
  if (!nameOrId) return '';
  const raw = String(nameOrId).trim().replace(/-/g, '_').toLowerCase();

  // 1. Kiểm tra nếu đã là ID chuẩn
  if (CANONICAL_SKILL_NAME_TO_ID[raw.replace(/_/g, ' ')]) {
    return CANONICAL_SKILL_NAME_TO_ID[raw.replace(/_/g, ' ')];
  }

  // 2. Chuyển đổi bỏ dấu tiếng Việt
  const unaccented = removeVietnameseAccents(nameOrId).trim().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
  if (CANONICAL_SKILL_NAME_TO_ID[unaccented]) {
    return CANONICAL_SKILL_NAME_TO_ID[unaccented];
  }

  return raw;
}

// ============================================================================
// 7. CHUẨN HÓA TRANG BỊ & VŨ KHÍ (EQUIPMENT & WEAPON IDENTIFIERS)
// ============================================================================

export const CANONICAL_EQUIP_KEYS = Object.freeze({
  WEAPON_LIEN_NO: 'lien_no',
  WEAPON_THANH_LONG_DAO: 'thanh_long_dao',
  WEAPON_RIU_DA: 'riu_da',
  WEAPON_SONG_KIEM: 'song_kiem',
  WEAPON_PHUONG_THIEN_KICH: 'phuong_thien_kich',
  WEAPON_QUAT_SAT: 'quat_sat',
  WEAPON_KY_LAN_CUNG: 'ky_lan_cung',

  ARMOR_BAT_QUAI: 'bat_quai',
  ARMOR_HAC_THUAN: 'hac_thuan',
  ARMOR_BACH_NGAN: 'bach_ngan',

  MOUNT_ATK: 'ngua_chien',
  MOUNT_DEF: 'ngua_than'
});

/**
 * Chuẩn hóa bất kỳ tên, ID hoặc đối tượng trang bị sang ID chuẩn snake_case
 * Khắc phục triệt để lỗi so khớp chuỗi do dấu tiếng Việt, gạch ngang, hay ID sinh ngẫu nhiên từ CardDeck.
 * @param {any} cardOrName
 * @returns {string}
 */
export function normalizeEquipKey(cardOrName) {
  if (!cardOrName) return '';
  if (typeof cardOrName === 'object') {
    const raw = cardOrName.name || cardOrName.idKey || cardOrName.key || cardOrName.id || '';
    return normalizeEquipKey(raw);
  }
  const clean = removeVietnameseAccents(cardOrName)
    .trim()
    .toLowerCase()
    .replace(/[-_][0-9]+.*$/, '') // Bỏ hậu tố ID dạng -0-1792...
    .replace(/[_-]/g, ' ');

  if (clean.includes('lien no') || clean.includes('crossbow')) return 'lien_no';
  if (clean.includes('thanh long') || clean.includes('dragon blade')) return 'thanh_long_dao';
  if (clean.includes('riu da') || clean.includes('quan thach') || clean.includes('rock axe')) return 'riu_da';
  if (clean.includes('song kiem') || clean.includes('twin sword')) return 'song_kiem';
  if (clean.includes('phuong thien') || clean.includes('sky halberd')) return 'phuong_thien_kich';
  if (clean.includes('quat sat') || clean.includes('co dinh') || clean.includes('iron fan')) return 'quat_sat';
  if (clean.includes('ky lan') || clean.includes('kirin bow')) return 'ky_lan_cung';

  if (clean.includes('bat quai') || clean.includes('eight trigram') || clean.includes('bagua')) return 'bat_quai';
  if (clean.includes('hac thuan') || clean.includes('black shield') || clean.includes('renwang')) return 'hac_thuan';
  if (clean.includes('bach ngan') || clean.includes('silver lion')) return 'bach_ngan';

  if (clean.includes('ngua chien') || clean.includes('ngua tan cong') || clean.includes('-1') || clean.includes('mount atk')) return 'ngua_chien';
  if (clean.includes('ngua than') || clean.includes('ngua phong thu') || clean.includes('+1') || clean.includes('mount def')) return 'ngua_than';

  return clean.replace(/\s+/g, '_');
}

/**
 * Kiểm tra đối tượng thẻ bài hoặc chuỗi có tương ứng với trang bị chuẩn chỉ định không
 * @param {any} cardOrEquip
 * @param {string} canonicalKey
 * @returns {boolean}
 */
export function isEquip(cardOrEquip, canonicalKey) {
  if (!cardOrEquip) return false;
  return normalizeEquipKey(cardOrEquip) === canonicalKey;
}

// ============================================================================
// 8. CHUẨN HÓA THẺ BÀI CƠ BẢN & CẨM NANG (BASIC & TRICK CARDS)
// ============================================================================

export const CANONICAL_CARD_KEYS = Object.freeze({
  // Bài cơ bản (Basic)
  BASIC_CHEM: 'chem',
  BASIC_NE: 'ne',
  BASIC_DAO: 'dao',
  BASIC_RUOU: 'ruou',

  // Cẩm nang thông thường (Normal Tricks)
  TRICK_QUYET_DAU: 'quyet_dau',
  TRICK_CUOP_BAI: 'cuop_bai',
  TRICK_TUOC_BAI: 'tuoc_bai',
  TRICK_MUON_DAO: 'muon_dao',
  TRICK_LOAN_TIEN: 'loan_tien',
  TRICK_DA_MAN: 'da_man',
  TRICK_HOI_XUAN: 'hoi_xuan',
  TRICK_HOA_GIAI: 'hoa_giai',
  TRICK_XIENG_XICH: 'xieng_xich',
  TRICK_HOA_CONG: 'hoa_cong',
  TRICK_VO_TRUNG: 'vo_trung',

  // Cẩm nang trì hoãn (Delayed Tricks)
  DELAYED_SAM_SET: 'sam_set',
  DELAYED_HON_LOAN: 'hon_loan',
  DELAYED_BINH_LUONG: 'binh_luong'
});

/**
 * Chuẩn hóa bất kỳ tên, ID hoặc đối tượng thẻ bài sang ID chuẩn snake_case
 * Khắc phục hoàn toàn lỗi phân mảnh chuỗi giữa tên tiếng Việt có dấu, ID sinh từ CardDeck, và slug.
 * @param {any} cardOrName
 * @returns {string}
 */
export function normalizeCardKey(cardOrName) {
  if (!cardOrName) return '';
  if (typeof cardOrName === 'object') {
    const raw = cardOrName.name || cardOrName.idKey || cardOrName.key || cardOrName.id || '';
    return normalizeCardKey(raw);
  }
  const clean = removeVietnameseAccents(cardOrName)
    .trim()
    .toLowerCase()
    .replace(/[-_][0-9]+.*$/, '') // Bỏ hậu tố ID dạng -0-1792...
    .replace(/[_-]/g, ' ');

  // 1. Cẩm nang trì hoãn (Delayed Tricks)
  if (clean.includes('sam set') || clean.includes('lightning')) return 'sam_set';
  if (clean.includes('hon loan') || clean.includes('lac bat') || clean.includes('indulgence') || clean.includes('acedia')) return 'hon_loan';
  if (clean.includes('binh luong') || clean.includes('starvation') || clean.includes('supply shortage')) return 'binh_luong';

  // 2. Cẩm nang thông thường (Normal Tricks) - Ưu tiên Longest Match trước Bài Cơ Bản (ví dụ 'Mượn Đao' trước 'Đào')
  if (clean.includes('muon dao') || clean.includes('borrow') || clean.includes('collateral')) return 'muon_dao';
  if (clean.includes('quyet dau') || clean.includes('duel')) return 'quyet_dau';
  if (clean.includes('cuop bai') || clean.includes('snatch')) return 'cuop_bai';
  if (clean.includes('tuoc bai') || clean.includes('dismantle')) return 'tuoc_bai';
  if (clean.includes('loan tien') || clean.includes('van tien') || clean.includes('archery attack')) return 'loan_tien';
  if (clean.includes('da man') || clean.includes('nam man') || clean.includes('barbarian') || clean.includes('savage')) return 'da_man';
  if (clean.includes('hoi xuan') || clean.includes('dao vien') || clean.includes('peach garden') || clean.includes('god salve')) return 'hoi_xuan';
  if (clean.includes('hoa giai') || clean.includes('negate') || clean.includes('nullification') || clean.includes('ward')) return 'hoa_giai';
  if (clean.includes('xieng xich') || clean.includes('iron chain') || clean.includes('chain')) return 'xieng_xich';
  if (clean.includes('hoa cong') || clean.includes('fire attack')) return 'hoa_cong';
  if (clean.includes('vo trung') || clean.includes('ex nihilo')) return 'vo_trung';

  // 3. Thẻ bài cơ bản (Basic Cards - Kiểm tra chính xác, tránh nhầm 'muon dao' thành 'dao')
  if (clean === 'chem' || clean.startsWith('chem ') || clean === 'slash' || clean.startsWith('slash ')) return 'chem';
  if (clean === 'ne' || clean.startsWith('ne ') || clean === 'dodge' || clean.startsWith('dodge ')) return 'ne';
  if (clean === 'dao' || clean.startsWith('dao ') || clean === 'peach' || clean.startsWith('peach ')) return 'dao';
  if (clean === 'ruou' || clean.startsWith('ruou ') || clean === 'analeptic' || clean === 'wine') return 'ruou';

  // 4. Nếu là trang bị, ủy quyền cho normalizeEquipKey
  const equipKey = normalizeEquipKey(cardOrName);
  if (equipKey) return equipKey;

  return clean.replace(/\s+/g, '_');
}

/**
 * Kiểm tra đối tượng thẻ bài hoặc chuỗi có phải là cẩm nang chỉ định không
 * @param {any} cardOrTrick
 * @param {string} canonicalKey
 * @returns {boolean}
 */
export function isTrick(cardOrTrick, canonicalKey) {
  if (!cardOrTrick) return false;
  return normalizeCardKey(cardOrTrick) === canonicalKey;
}

/**
 * Kiểm tra đối tượng thẻ bài có phải là cẩm nang trì hoãn không
 * @param {any} cardOrTrick
 * @param {string} [canonicalKey] (Tùy chọn: 'sam_set' | 'hon_loan' | 'binh_luong')
 * @returns {boolean}
 */
export function isDelayedTrick(cardOrTrick, canonicalKey = null) {
  if (!cardOrTrick) return false;
  const key = normalizeCardKey(cardOrTrick);
  if (canonicalKey) {
    return key === canonicalKey;
  }
  return key === 'sam_set' || key === 'hon_loan' || key === 'binh_luong';
}

/**
 * Kiểm tra đối tượng thẻ bài có phải cẩm nang toàn bàn (AOE) không
 * @param {any} cardOrTrick
 * @returns {boolean}
 */
export function isAOETrick(cardOrTrick) {
  if (!cardOrTrick) return false;
  const key = normalizeCardKey(cardOrTrick);
  return key === 'loan_tien' || key === 'da_man' || key === 'hoi_xuan';
}

/**
 * Kiểm tra đối tượng thẻ bài có phải thẻ cơ bản không
 * @param {any} cardOrBasic
 * @param {string} [canonicalKey] (Tùy chọn: 'chem' | 'ne' | 'dao' | 'ruou')
 * @returns {boolean}
 */
export function isBasicCard(cardOrBasic, canonicalKey = null) {
  if (!cardOrBasic) return false;
  const key = normalizeCardKey(cardOrBasic);
  if (canonicalKey) {
    return key === canonicalKey;
  }
  return key === 'chem' || key === 'ne' || key === 'dao' || key === 'ruou';
}


