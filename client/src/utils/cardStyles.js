import { CARD_TYPES } from '../data/gameData';

export const getCardBg = (name) => {
  if (name === 'Chém') return '/images/cards/chem.png';
  if (name === 'Né') return '/images/cards/ne.png';
  if (name === 'Đào') return '/images/cards/dao.png';
  if (name === 'Rượu') return '/images/cards/ruou.png';

  if (name === 'Quyết Đấu') return '/images/cards/camnang_quyetdau.png';
  if (name === 'Tước Bài') return '/images/cards/camnang_tuocbai.png';
  if (name === 'Cướp Bài') return '/images/cards/camnang_tuocbai.png';
  if (name === 'Mượn Đao') return '/images/cards/camnang_muondao.png';
  if (name === 'Loạn Tiễn') return '/images/cards/camnang_loantien.png';
  if (name === 'Dã Man') return '/images/cards/camnang_daman.png';
  if (name === 'Hồi Xuân') return '/images/cards/camnang_hoixuan.png';
  if (name === 'Hóa Giải') return '/images/cards/camnang_hoagiai.png';
  if (name === 'Sấm Sét') return '/images/cards/camnang_samset.png';
  if (name === 'Hỗn Loạn') return '/images/cards/camnang_honloan.png';

  if (name === 'Liên Nỏ') return '/images/cards/vu-khi_lien-no.png';
  if (name === 'Thanh Long Đao') return '/images/cards/vu-khi_thanh-long-dao.png';
  if (name === 'Rìu Đá') return '/images/cards/vu-khi_riu-da.png';
  if (name === 'Bát Quái') return '/images/cards/giap_bat-quai.png';
  if (name === 'Hắc Thuẫn') return '/images/cards/giap_hac-thuan.png';
  if (name === 'Ngựa Chiến (-1)') return '/images/cards/toa-ky_ngua-chien.png';
  if (name === 'Ngựa Thần (+1)') return '/images/cards/toa-ky_ngua-than.png';

  return null;
};

export const getBadgeColor = (card) => {
  if (card.name === 'Chém') return 'rgba(220, 38, 38, 0.9)';
  if (card.name === 'Né') return 'rgba(5, 150, 105, 0.9)';
  if (card.name === 'Đào') return 'rgba(217, 119, 6, 0.9)';
  if (card.name === 'Rượu') return 'rgba(124, 58, 237, 0.9)';
  if (card.type === CARD_TYPES.TRICK) return 'rgba(31, 41, 55, 0.95)';
  if (card.type === CARD_TYPES.EQUIP) return 'rgba(37, 99, 235, 0.9)';
  return 'rgba(0, 0, 0, 0.8)';
};
