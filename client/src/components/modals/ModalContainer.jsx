import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useGameState, useGameAPI } from '../../contexts/GameProvider';
import { getFullPlayerName, getPlayerFaction } from "shared/utils/playerHelpers";
import { hasSkill, getEffectiveSuit, getEffectiveColor } from "shared/engine_v4/application/index.js";
import { isEquip } from 'shared/utils/translationHelper.js';
import { CardSelector } from './CardSelector';

import { AskBocTramTrungSlashModal } from './AskBocTramTrungSlashModal';
import { AskChangeJudgeModal } from './AskChangeJudgeModal';
import { JudgementRollModal } from './JudgementRollModal';
import { HauVienModal } from './HauVienModal';
import { AskSnatchDismantleModal } from './AskSnatchDismantleModal';
import { AskWeaponSkillModal } from './AskWeaponSkillModal';
import { BachDangModal } from './BachDangModal';
import { BanhChungModal } from './BanhChungModal';
import { BinhLoanModal } from './BinhLoanModal';
import { BorrowSwordModal } from './BorrowSwordModal';
import { ChuongDuongMoveModal } from './ChuongDuongMoveModal';
import { DaTrachModal } from './DaTrachModal';
import { DieuDuocModal } from './DieuDuocModal';
import { DoatSaoModal } from './DoatSaoModal';
import { DodgeModal } from './DodgeModal';
import { DuongQuanModal } from './DuongQuanModal';
import { HoGiaModal } from './HoGiaModal';
import { HoaThanModal } from './HoaThanModal';
import { HoaThanAnTuModal } from './HoaThanAnTuModal';
import { VanDonModal } from './VanDonModal';
import { HienHauModal } from './HienHauModal';
import { XaThanModal } from './XaThanModal';
import { KhoanDanModal } from './KhoanDanModal';
import { KhoiNghiaModal } from './KhoiNghiaModal';
import { NamQuocSonHaModal } from './NamQuocSonHaModal';
import { ThuyToBonusModal } from './ThuyToBonusModal';
import { ThuyToModal } from './ThuyToModal';
import { TienPhatModal } from './TienPhatModal';
import { TienPhongModal } from './TienPhongModal';
import { TrungDungModal } from './TrungDungModal';
import { TuChuModal } from './TuChuModal';
import { TuChuTargetModal } from './TuChuTargetModal';
import { VipHeroSelectorModal } from './VipHeroSelectorModal';
import { HoaCongRevealModal } from './HoaCongRevealModal';
import { HoaCongDiscardModal } from './HoaCongDiscardModal';
import { ThatTramSoPunishModal } from './ThatTramSoPunishModal';
import { DuyenThoModal } from './DuyenThoModal';
import HoaNghiModal from './HoaNghiModal';
import { DinhQuocModal } from './DinhQuocModal';

export function ModalContainer({ mainPlayerId = 0 }) {
  const gameState = useGameState();
  const gameAPI = useGameAPI();
  
  const handleResponseAction = useCallback((payload) => {
    gameAPI.respond({ playerId: mainPlayerId, ...payload });
  }, [gameAPI, mainPlayerId]);

  const req = gameState?.waitingForResponse;
  const me = gameState?.players.find(p => p.id === mainPlayerId) || gameState?.players[0];

  const findPlayer = useCallback((id) => {
    if (id === null || id === undefined) return null;
    return (gameState?.players || []).find(p => p.id === id) || gameState?.players?.[id] || null;
  }, [gameState]);

  const isAskNegate = req?.type === 'ask_negate' && req?.responderId === mainPlayerId;

  const askNegateValidCards = useMemo(() => {
      if (!isAskNegate || !me) return [];
      const hasLinhGiam = hasSkill(me, 'linh_giam');
      const hasChuongDuong = hasSkill(me, 'chuong_duong');
      
      const cards = me.hand.map((c, idx) => ({ ...c, idx, fromEquip: false })).filter(c => {
         if (c.name === 'Hóa Giải') return true;
         if (hasLinhGiam && getEffectiveColor(me, c) === 'black') return true;
         return false;
      }).map(c => ({
         ...c,
         virtualReason: c.name !== 'Hóa Giải' ? 'Linh Giám' : null
      }));
      
      if (hasChuongDuong) {
         const equips = Array.isArray(me.equipment) ? me.equipment : Object.values(me.equipment || {}).filter(Boolean);
         equips.forEach((c, idx) => {
             cards.push({ ...c, idx, fromEquip: true, virtualReason: 'Chương Dương', originalName: c.name, name: 'Hóa Giải' });
         });
      }
      return cards;
  }, [isAskNegate, me]);

  // Auto-skip logic for ask_negate if player has no valid cards OR if player was the one who just played Hóa Giải
  useEffect(() => {
     if (isAskNegate) {
       if (req?.lastNegaterId === mainPlayerId || askNegateValidCards.length === 0) {
         gameAPI.respond({ playerId: mainPlayerId, doNegate: false, _isAuto: true });
       }
     }
  }, [isAskNegate, req?.lastNegaterId, askNegateValidCards, mainPlayerId, gameAPI]);

  // Auto-trigger Bát Quái khi dính Loạn Tiễn (van-tien)
  const isVanTienDodge = req?.type === 'ask_dodge' && req?.reason === 'van-tien' && req?.responderId === me?.id;
  const meEquips = Array.isArray(me?.equipment) ? me.equipment : Object.values(me?.equipment || {}).filter(Boolean);
  const hasPassiveBagua = me && hasSkill(me, 'than-giap') && !meEquips.some(c => c.name === 'Bát Quái' || c.name === 'Hắc Thuẫn' || isEquip(c, 'bat_quai') || isEquip(c, 'hac_thuan'));
  const hasBaguaVanTien = hasPassiveBagua || meEquips.some(e => e.name === 'Bát Quái' || isEquip(e, 'bat_quai'));
  const canBaguaVanTien = isVanTienDodge && hasBaguaVanTien && req?.baguaAvailable !== false;

  const autoBaguaVanTienKeyRef = useRef(null);
  useEffect(() => {
    if (canBaguaVanTien) {
      const key = `${req.id || ''}_van_tien_${req.responderId}`;
      if (autoBaguaVanTienKeyRef.current !== key) {
        autoBaguaVanTienKeyRef.current = key;
        gameAPI.respond({ playerId: mainPlayerId, doBagua: true });
      }
    }
  }, [canBaguaVanTien, req?.id, req?.responderId, mainPlayerId, gameAPI]);

  // Client-Side Watchdog Timer (Timeline badge - Tạm dừng auto-skip để người chơi thực chiến thoải mái)
  const [timeLeft, setTimeLeft] = useState(15);
  const activeReqKey = useMemo(() => {
    if (!req || req.responderId !== me?.id) return null;
    const ignoredPhases = ['draw_phase', 'play_phase', 'discard_phase', 'end_phase'];
    if (ignoredPhases.includes(req.type)) return null;
    if (isAskNegate && askNegateValidCards.length === 0) return null;
    return `${req.id ?? ''}_${req.type}_${req.reason ?? ''}_${req.responderId}_${req.sourceId ?? ''}_${req.targetId ?? ''}`;
  }, [req, me?.id, isAskNegate, askNegateValidCards.length]);

  useEffect(() => {
    if (!activeReqKey) {
      setTimeLeft(15);
      return;
    }

    setTimeLeft(15);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Tạm dừng tự động skip theo yêu cầu để người chơi thực chiến và thử nghiệm không bị gián đoạn
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeReqKey]);

  if (!gameState || !req) return null;

  const renderModal = () => {
    // Modal Style
    /** @type {import('react').CSSProperties} */
    const modalStyle = {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(17, 24, 39, 0.95)',
          border: '2px solid var(--color-gold-dark)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
          zIndex: 100,
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 0 40px rgba(0,0,0,0.6)',
          minWidth: '280px',
        };
        // Ask Khai Quốc
        if (req.type === 'ask_khai_quoc' && req.responderId === me.id) {
            return (
              <div style={modalStyle}>
                <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                  👑 Dùng Khai Quốc
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                  Chọn 1 lá bài để đưa cho người chơi khác!
                </div>
                <CardSelector 
                  validCards={me.hand.map((c, i) => ({ ...c, idx: i }))}
                  confirmText="Đưa bài"
                  cancelText="Hủy"
                  requireTarget={true}
                  validTargets={gameState.players.filter(p => p.id !== me.id && p.isAlive)}
                  onSelect={(idx, targetId) => {
                      if (targetId === null) {
                         alert('Vui lòng chọn mục tiêu!');
                         return;
                      }
                      handleResponseAction({ doReact: true, cardIndexSelected: idx, targetId: targetId });
                  }}
                  onCancel={() => handleResponseAction({ doReact: false })}
                />
              </div>
            );
        }
        if (req.type === 'ask_snatch' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <AskSnatchDismantleModal req={req} gameState={gameState} onConfirm={handleResponseAction} isSnatch={true} />
            </div>
          );
        }
        
        if (req.type === 'ask_dismantle' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <AskSnatchDismantleModal req={req} gameState={gameState} onConfirm={handleResponseAction} isSnatch={false} />
            </div>
          );
        }

        // Quân Cơ Ask
        if (req.type === 'ask_quan_co' && req.responderId === me.id) {
            const targetPlayer = findPlayer(req.targetId);
            const targetName = getFullPlayerName(targetPlayer, me.id);
            const validCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => c.name === req.reqCard);
            
            return (
              <div style={modalStyle}>
                <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                  👑 Dùng Quân Cơ
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                  Đánh giúp {targetName} 1 lá <strong>[{req.reqCard}]</strong>?
                </div>
                <CardSelector 
                  validCards={validCards}
                  confirmText={`Đánh ${req.reqCard}`}
                  cancelText="Bỏ qua"
                  onSelect={(idx) => handleResponseAction({ doReact: true, cardIndexSelected: idx })}
                  onCancel={() => handleResponseAction({ doReact: false })}
                />
              </div>
            );
        }
        
        // Quân Cơ Draw Ask (for the target)
        if (req.type === 'ask_quan_co_draw' && req.responderId === me.id) {
            const helperPlayer = findPlayer(req.targetId);
            const helperName = getFullPlayerName(helperPlayer, me.id);
            
            return (
              <div style={modalStyle}>
                <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                  🎁 Quà Trả Lễ
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                  {helperName} vừa dùng Quân Cơ cứu bạn! Bạn có muốn cho họ rút 1 lá bài không?
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-action primary" style={{ flex: 1 }} onClick={() => handleResponseAction({ doReact: true })}>
                      Cho phép rút
                    </button>
                    <button className="btn-action secondary" style={{ flex: 1 }} onClick={() => handleResponseAction({ doReact: false })}>
                      Không cho
                    </button>
                </div>
              </div>
            );
        }

        if (req.type === 'ask_banh_chung' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <BanhChungModal req={req} onConfirm={handleResponseAction} />
            </div>
          );
        }
        
        
        
        
        if (req.type === 'ask_thong_ngon' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>📜 THÔNG NGÔN</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
                Lá bài phán xét của bạn vừa có hiệu lực. Bạn có muốn thu hồi lá bài này về tay không?
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn-action success" onClick={() => handleResponseAction({ doUse: true })}>Thu Hồi Bài</button>
                <button className="btn-action secondary" onClick={() => handleResponseAction({ doUse: false })}>Bỏ qua</button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_hau_vien' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <HauVienModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_change_judge' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <AskChangeJudgeModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if ((req.type === 'ask_judgement_roll' || req.type === 'ask_judgement_result') && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <JudgementRollModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_tien_phat' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <TienPhatModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_doat_sao' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <DoatSaoModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_hien_hau' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <HienHauModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_that_tram_so' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#ef4444', fontWeight: 'bold' }}>📜 THẤT TRẢM SỚ</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>Tiến hành phán xét. Nếu không phải ♥, nguồn sát thương phải chọn mất bài hoặc máu.</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn-action success" onClick={() => handleResponseAction({ doUse: true })}>Phán Xét</button>
                  <button className="btn-action secondary" onClick={() => handleResponseAction({ doUse: false })}>Bỏ qua</button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_that_tram_so_punish' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <ThatTramSoPunishModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_doi_su' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#3b82f6', fontWeight: 'bold' }}>🗣️ ĐỐI SỨ</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>Thu lấy 1 lá bài từ tay nguồn sát thương?</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn-action success" onClick={() => handleResponseAction({ doUse: true })}>Rút bài của họ</button>
                  <button className="btn-action secondary" onClick={() => handleResponseAction({ doUse: false })}>Bỏ qua</button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_hoa_nghi' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <HoaNghiModal req={req} me={me} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_ho_chu' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#f59e0b', fontWeight: 'bold' }}>🛡️ HỘ CHỦ</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>Lật bài "Trung", nếu không trùng điểm với "Trung" cũ sẽ hồi 1 HP!</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn-action success" onClick={() => handleResponseAction({ doUse: true })}>Lật Bài</button>
                  <button className="btn-action secondary" onClick={() => handleResponseAction({ doUse: false })}>Bỏ qua</button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_can_gian' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#f59e0b', fontWeight: 'bold' }}>✋ CAN GIÁN</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>Mất 1 HP để giúp tướng vừa mất bài rút 2 lá?</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn-action success" onClick={() => handleResponseAction({ doUse: true })}>Mất 1 HP</button>
                  <button className="btn-action secondary" onClick={() => handleResponseAction({ doUse: false })}>Bỏ qua</button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_xa_than' && req.responderId === me.id) {
          return <XaThanModal req={req} gameState={gameState} onConfirm={handleResponseAction} />;
        }

        if (req.type === 'ask_xuan_huong' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#ec4899', fontWeight: 'bold' }}>🌸 XUÂN HƯƠNG</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>Bạn vừa mất Trang bị, rút 2 lá bài?</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn-action success" onClick={() => handleResponseAction({ doUse: true })}>Rút bài</button>
                  <button className="btn-action secondary" onClick={() => handleResponseAction({ doUse: false })}>Bỏ qua</button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_bach_dang' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <BachDangModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }
        
        if (req.type === 'ask_lan_sau' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#ef4444', fontWeight: 'bold' }}>🌊 LẶN SÂU</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>Mất 1 HP để rút 2 lá bài?</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn-action success" onClick={() => handleResponseAction({ canceled: false })}>Mất 1 HP</button>
                  <button className="btn-action secondary" onClick={() => handleResponseAction({ canceled: true })}>Bỏ qua</button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_suit' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#3b82f6', fontWeight: 'bold' }}>🔮 Tâm Công</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>Đoán chất lá bài trên tay đối thủ:</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button className="btn-action secondary" onClick={() => handleResponseAction({ suit: '♠' })}>♠ Bích</button>
                  <button className="btn-action secondary" onClick={() => handleResponseAction({ suit: '♣' })}>♣ Chuồn</button>
                  <button className="btn-action success" style={{ background: '#ef4444' }} onClick={() => handleResponseAction({ suit: '♥' })}>♥ Cơ</button>
                  <button className="btn-action success" style={{ background: '#ef4444' }} onClick={() => handleResponseAction({ suit: '♦' })}>♦ Rô</button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_van_don' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <VanDonModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_phat_tam' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#10b981', fontWeight: 'bold' }}>🧘 PHẬT TÂM</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
                Giai đoạn Chuẩn bị: Bạn có muốn tiến hành phán xét Phật Tâm để thu các lá bài Đen liên tiếp?
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn-action success" onClick={() => handleResponseAction({ doUse: true })}>🧘 Phán Xét</button>
                <button className="btn-action secondary" onClick={() => handleResponseAction({ doUse: false })}>⏭️ Bỏ qua</button>
              </div>
            </div>
          );
        }


        if (req.type === 'ask_duyen_tho' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <DuyenThoModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }


        if (req.type === 'ask_doat_sao_discard' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#ef4444' }}>
                🗑️ Bỏ 1 lá bài
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
                Chọn 1 lá bài trên tay để bỏ đi. Nếu là Trang bị, bạn sẽ tự động mặc nó.
              </div>
              <CardSelector 
                validCards={me.hand.map((c, idx) => ({ ...c, idx }))}
                confirmText="Bỏ lá này"
                cancelText=""
                onSelect={(idx) => handleResponseAction({ cardIndexSelected: idx })}
                onCancel={() => {}}
              />
            </div>
          );
        }
        
        if (req.type === 'ask_chuong_duong_discard' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#ef4444' }}>
                🗑️ [Chương Dương] Bỏ 1 lá bài
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
                Chọn 1 lá bài trên tay để bỏ đi. Kế tiếp bạn có thể chọn di chuyển 1 trang bị hoặc phán xét.
              </div>
              <CardSelector 
                validCards={me.hand.map((c, idx) => ({ ...c, idx }))}
                confirmText="Bỏ lá này"
                cancelText="Bỏ qua"
                onSelect={(idx) => handleResponseAction({ doUse: true, cardIndexSelected: idx })}
                onCancel={() => handleResponseAction({ doUse: false })}
              />
            </div>
          );
        }

        if (req.type === 'ask_chuong_duong_move' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <ChuongDuongMoveModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_da_trach' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <DaTrachModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_khoi_nghia' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <KhoiNghiaModal req={req} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_khoan_dan' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <KhoanDanModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_nam_quoc_son_ha' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <NamQuocSonHaModal req={req} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_tu_chu' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <TuChuModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_tu_chu_target' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <TuChuTargetModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }
        
        if ((req.type === 'ask_duong_quan' || req.type === 'ask_duong_quan_1' || req.type === 'ask_duong_quan_2' || req.type === 'ask_duong_quan_3') && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <DuongQuanModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }
        
        if (req.type === 'ask_tien_phong' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <TienPhongModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_dinh_quoc' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <DinhQuocModal req={req} gameState={gameState} me={me} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_uy_chan' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                ⭐ KÍCH HOẠT UY CHẤN!
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                {getFullPlayerName(findPlayer(req.sourceId), me.id)} phát động [Uy Chấn], bạn được chọn:
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-action primary" onClick={() => handleResponseAction({ choice: 'heal' })}>
                  🩸 Hồi 1 Sinh lực cho họ
                </button>
                <button className="btn-action success" onClick={() => handleResponseAction({ choice: 'draw' })}>
                  🃏 Rút 1 lá bài
                </button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_an_bang' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                ⭐ KÍCH HOẠT AN BANG!
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                Bạn có muốn phát động [An Bang] để rút 1 lá bài không?
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-action success" onClick={() => handleResponseAction({ doUse: true })}>
                  ✔️ Rút bài
                </button>
                <button className="btn-action danger" onClick={() => handleResponseAction({ canceled: true })}>
                  ❌ Bỏ qua
                </button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_phat_toi' && req.responderId === me.id) {
          const validTargets = gameState.players.filter(p => p.id !== me.id && p.isAlive);
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                ⭐ CHỌN MỤC TIÊU PHẠT TỘI
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                {validTargets.map(t => (
                   <button key={t.id} className="btn-action primary" onClick={() => handleResponseAction({ targetId: t.id })}>
                     Phạt {getFullPlayerName(t, me.id)}
                   </button>
                ))}
                <button className="btn-action danger" onClick={() => handleResponseAction({ targetId: null })}>
                  Bỏ qua
                </button>
              </div>
            </div>
          );
        }



        if (req.type === 'ask_pha_thanh' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                ⭐ KÍCH HOẠT PHÁ THÀNH!
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                Bạn có muốn nhận bài Phán xét thay vì rút 2 lá bài không?
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-action success" onClick={() => handleResponseAction({ doJudge: true })}>
                  ✔️ Nhận Phán xét
                </button>
                <button className="btn-action danger" onClick={() => handleResponseAction({ doJudge: false })}>
                  ❌ Rút bài bình thường
                </button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_dieu_duoc' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <DieuDuocModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_hoa_than' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <HoaThanModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_hoa_than_an_tu' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <HoaThanAnTuModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_binh_loan' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <BinhLoanModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_trung_dung' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <TrungDungModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_nghi_ngo' && req.responderId === me.id) {
          const player = findPlayer(req.sourceId);
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                ⭐ NGHI NGỜ TRUNG DŨNG?
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                {getFullPlayerName(player, me.id)} vừa dùng [Trung Dũng] làm [{req.virtualCardName}]. Bạn có nghi ngờ không? (Nghi ngờ sai sẽ bị phạt Hộ Giá)
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-action danger" onClick={() => handleResponseAction({ doDoubt: true })}>
                  👁️ LẬT TẨY
                </button>
                <button className="btn-action secondary" onClick={() => handleResponseAction({ doDoubt: false })}>
                  Bỏ qua
                </button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_perfect_pair' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                💖 CẶP ĐÔI HOÀN HẢO!
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                Bạn đã lật trúng Châu Liên Bích Hợp! Chọn phần thưởng của bạn:
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-action success" onClick={() => handleResponseAction({ action: 'draw' })}>
                  🃏 Rút 2 lá bài
                </button>
                <button className="btn-action primary" onClick={() => handleResponseAction({ action: 'heal' })}>
                  🩸 Hồi 1 Sinh lực
                </button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_reveal_for_skill' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                ⭐ KÍCH HOẠT KỸ NĂNG?
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                Bạn có muốn lật tướng để sử dụng kỹ năng [{req.skillName}] không?
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-action primary" onClick={() => handleResponseAction({ reveal: true })}>
                  ✔️ Lật tướng
                </button>
                <button className="btn-action danger" onClick={() => handleResponseAction({ reveal: false })}>
                  ❌ Bỏ qua
                </button>
              </div>
            </div>
          );
        }

        if (req.type === 'ask_thuy_to' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <ThuyToModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_thuy_to_bonus' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <ThuyToBonusModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_boc_tram_trung_slash' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <AskBocTramTrungSlashModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_tre_nga_discard' && req.responderId === me.id) {
          const suitFilter = req.judgeSuit;
          const validCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => (getEffectiveSuit(me, c) || c.suit) === suitFilter);
          
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: '#ef4444' }}>
                🎋 KỸ NĂNG BỊ KHÓA!
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                {getFullPlayerName(findPlayer(req.sourceId), me.id)} phát động [Tre Ngà]. Phán xét ra chất {suitFilter}.<br/>
                Bạn có muốn bỏ 1 lá bài {suitFilter} để được quyền dùng [Né] không?
              </div>
              <CardSelector 
                validCards={validCards}
                confirmText={`🗑️ Bỏ 1 lá ${suitFilter}`}
                cancelText="⏭️ Bỏ qua (Bị chém)"
                onSelect={(idx) => handleResponseAction({ doDiscard: true, cardIndexSelected: idx })}
                onCancel={() => handleResponseAction({ doDiscard: false })}
              />
            </div>
          );
        }

        if (req.type === 'ask_dodge' && (!req.reason || req.reason === 'chem') && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <DodgeModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }

        if (req.type === 'ask_slash' && req.reason === 'quyet-dau' && req.responderId === me.id) {
          // Dời Núi (Né -> Chém)
          const hasDoiNui = hasSkill(me, 'doi_nui') || hasSkill(me, 'doi-nui');
          
          // Khai Thiên (Bài đỏ -> Chém)
          const hasKhaiThien = hasSkill(me, 'khai_thien') || hasSkill(me, 'khai-thien');
          
          // Bọc Trăm Trứng
          const canBocTramTrung = !req.bocTramTrungFailed && (hasSkill(me, 'boc_tram_trung') || hasSkill(me, 'boc-tram-trung')) && 
                                  gameState.players.some(p => p.id !== me.id && p.isAlive && (p.faction === 'lac' || p.faction === 'Lạc' || getPlayerFaction(p) === 'Lạc'));

          const opponent = findPlayer(req.duelTargetId ?? req.opponentId ?? (req.attackerId === me.id ? req.targetId : (req.sourceId ?? req.attackerId)));
          const opponentName = getFullPlayerName(opponent, me.id);

          const validCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => {
             if (c.name === 'Chém') return true;
             if (hasDoiNui && c.name === 'Né') return true;
             if (hasKhaiThien && getEffectiveColor(me, c) === 'red') return true;
             return false;
          }).map(c => ({
             ...c,
             virtualReason: c.name !== 'Chém' ? (c.name === 'Né' && hasDoiNui ? 'Dời Núi' : 'Khai Thiên') : null
          }));

          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                ⚡ Quyết Đấu với {opponentName}!
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                {opponentName} vừa đánh ra [Chém]! Đến lượt bạn phải ra <strong>[Chém]</strong> để đánh trả:
              </div>
              <CardSelector 
                validCards={validCards}
                confirmText="⚔️ Đánh trả!"
                cancelText="🩸 Chịu thua (Mất 1 HP)"
                onSelect={(idx) => {
                   const c = me.hand[idx];
                   if (c.name !== 'Chém') {
                      const activeSkill = c.name === 'Né' && hasDoiNui ? 'Dời Núi' : 'Khai Thiên';
                      handleResponseAction({ doReact: true, virtualCardName: 'Chém', activeSkill, cardIndexSelected: idx, cardId: c.id });
                   } else {
                      handleResponseAction({ doReact: true, cardIndexSelected: idx, cardId: c.id });
                   }
                }}
                onCancel={() => handleResponseAction({ doReact: false })}
                extraButtons={canBocTramTrung && (
                  <button className="btn-action success" style={{ flex: '1 1 100%' }} onClick={() => handleResponseAction({ callBocTramTrung: true })}>
                    🐉 Bọc Trăm Trứng (Gọi Lạc)
                  </button>
                )}
              />
            </div>
          );
        }
        if (req.type === 'ask_slash' && req.reason === 'muon-dao' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <BorrowSwordModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }
        
        if (req.type === 'ask_hoacong_reveal' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <HoaCongRevealModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }
        if (req.type === 'ask_hoacong_discard' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <HoaCongDiscardModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
            </div>
          );
        }
        
        if (req.type === 'ask_hoa_tien' && req.responderId === me.id) {
          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: '#ef4444' }}>
                🌟 Hóa Tiên
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                Bạn đang hấp hối! Bạn có muốn phát động [Hóa Tiên] (bỏ toàn bộ bài, hồi phục 3 HP và rút 3 lá) không?
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
                <button className="btn-action success" onClick={() => handleResponseAction({ doUse: true })}>
                  🌟 Phát động!
                </button>
                <button className="btn-action secondary" onClick={() => handleResponseAction({ doUse: false })}>
                  ⏭️ Bỏ qua
                </button>
              </div>
            </div>
          );
        }
        
        if (req.type === 'ask_peach' && req.responderId === me.id) {
          const dyingId = req.dyingPlayerId ?? req.dyingId ?? req.targetId;
          const isSelf = dyingId === me.id;
          const dyingPlayer = findPlayer(dyingId) || me;
          
          const hasNamDuoc = hasSkill(me, 'nam-duoc');
          const isOutsideTurn = gameState.currentPlayerIndex !== me.id;
          
          const validCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => {
             if (c.name === 'Đào') return true;
             if (isSelf && c.name === 'Rượu') return true;
             if (hasNamDuoc && isOutsideTurn && getEffectiveColor(me, c) === 'red') return true;
             return false;
          }).map(c => ({
             ...c,
             virtualReason: (c.name !== 'Đào' && c.name !== 'Rượu') ? 'Nam Dược' : null,
             originalName: c.name,
             name: (c.name !== 'Đào' && c.name !== 'Rượu') ? 'Đào' : c.name
          }));

          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: '#ef4444' }}>
                🚨 CẤP CỨU!
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                {isSelf ? "Bạn đang hấp hối!" : `${getFullPlayerName(dyingPlayer, me.id)} đang hấp hối!`} (HP: {dyingPlayer?.hp ?? 0})
              </div>
              
              <CardSelector 
                validCards={validCards}
                confirmText="💖 Dùng cứu"
                cancelText="⏭️ Bỏ qua"
                onSelect={(idx) => {
                   const c = validCards.find(card => card.idx === idx);
                   if (c.originalName || (c.name !== 'Đào' && c.name !== 'Rượu')) {
                      handleResponseAction({ askerId: me.id, doSave: true, virtualCardName: c.name, activeSkill: c.virtualReason, cardIndexSelected: idx, cardId: c.id });
                   } else {
                      handleResponseAction({ askerId: me.id, doSave: true, cardIndexSelected: idx, cardId: c.id });
                   }
                }}
                onCancel={() => handleResponseAction({ askerId: me.id, doSave: false })}
              />
            </div>
          );
        }

        if (req.type === 'ask_negate' && req.responderId === mainPlayerId) {
          if (req.lastNegaterId === mainPlayerId) return null; // Không bao giờ bắt người chơi tự Hóa Giải lại chính mình!
          const validCards = askNegateValidCards;

          if (validCards.length === 0) return null; // Ngăn chặn flash pop-up rác trước khi useEffect auto-skip kịp chạy

          const sourceName = getFullPlayerName(findPlayer(req.sourceId), me.id);
          const targetName = getFullPlayerName(findPlayer(req.targetId), me.id);
          
          let cardName = 'Cẩm nang';
          if (req.trickType) {
              const mapTrick = { 'thi-thanh': 'Xiềng Xích', 'vo-trung': 'Vô Trung', 'qua-ha': 'Tước Bài', 'thuan-thu': 'Cướp Bài', 'sam-set': 'Sấm Sét', 'binh-luong': 'Binh Lương', 'hoa-cong': 'Hỏa Công', 'quyet-dau': 'Quyết Đấu', 'muon-dao': 'Mượn Đao', 'nam-man': 'Dã Man', 'van-tien': 'Loạn Tiễn', 'hoi-xuan': 'Hồi Xuân', 'hon-loan': 'Hỗn Loạn' };
              cardName = mapTrick[req.trickType] || req.trickType;
          } else if (req.card && req.card.name) {
              cardName = req.card.name;
          }

          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                🛡️ Hóa Giải?
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                {req.isNegated 
                  ? <span>{req.lastNegaterId !== undefined ? getFullPlayerName(findPlayer(req.lastNegaterId), me.id) : 'Ai đó'} vừa dùng [Hóa Giải] vô hiệu hóa lá <strong>[{cardName}]</strong>. Bạn có muốn dùng [Hóa Giải] để phục hồi nó không?</span>
                  : req.isJudgementNegate
                    ? <span>⚖️ Sắp phán xét cẩm nang trì hoãn <strong>[{cardName}]</strong> cho {targetName}. Bạn có muốn dùng [Hóa Giải] để vô hiệu hóa không?</span>
                    : <span>{sourceName} đang dùng <strong>[{cardName}]</strong> lên {targetName}. Bạn có muốn Hóa Giải không?</span>
                }
                {!validCards.some(c => c.name === 'Hóa Giải' && !c.virtualReason) && (
                  <div style={{ marginTop: '8px', fontStyle: 'italic', color: '#9ca3af' }}>
                    (Bạn không có [Hóa Giải], nhưng có thể dùng kỹ năng ẩn của Tướng hoặc Trang bị để Hóa Giải!)
                  </div>
                )}
              </div>
              <CardSelector 
                validCards={validCards}
                confirmText="🛡️ Hóa Giải!"
                cancelText="⏭️ Bỏ qua"
                onSelect={(idx) => {
                   const c = validCards.find(card => card.idx === idx);
                   if (c.fromEquip) {
                      handleResponseAction({ askerId: 0, doNegate: true, negateEquipIndex: idx, activeSkill: 'Chương Dương' });
                   } else if (c.originalName || (c.name !== 'Hóa Giải')) {
                      handleResponseAction({ askerId: 0, doNegate: true, negateCardIndex: idx, activeSkill: 'Linh Giám' });
                   } else {
                      handleResponseAction({ askerId: 0, doNegate: true, negateCardIndex: idx });
                   }
                }}
                onCancel={() => handleResponseAction({ askerId: 0, doNegate: false })}
              />
            </div>
          );
        }

        if ((req.type === 'ask_dodge' && req.reason === 'van-tien' && req.responderId === me.id) ||
        (req.type === 'ask_slash' && req.reason === 'nam-man' && req.responderId === me.id)) {
          const reqCardName = req.trickType === 'barbarian' ? 'Chém' : 'Né';
          const sourceName = getFullPlayerName(findPlayer(req.sourceId), me.id);
          
          // Dời Núi (Chém <-> Né)
          const hasDoiNui = hasSkill(me, 'doi-nui');
          
          // Khai Thiên (Bài đỏ -> Chém)
          const hasKhaiThien = hasSkill(me, 'khai-thien');
          
          // Bọc Trăm Trứng (Chỉ cho Dã Man - Cần Chém)
          const canBocTramTrung = !req.bocTramTrungFailed && reqCardName === 'Chém' && hasSkill(me, 'boc-tram-trung') && 
                                  gameState.players.some(p => p.id !== me.id && p.isAlive && getPlayerFaction(p) === 'Lạc');
          
          // Thính Chính (Bài đen -> Né)
          const hasThinhChinh = reqCardName === 'Né' && hasSkill(me, 'thinh-chinh', true);
          
          // Linh Giám (Bài đen -> Hóa Giải)
          const hasLinhGiam = hasSkill(me, 'linh-giam', true) || hasSkill(me, 'linh_giam', true);

          const validCards = me.hand.map((c, idx) => ({ ...c, idx })).filter(c => {
             if (c.name === reqCardName) return true;
             if (hasDoiNui && c.name === (reqCardName === 'Chém' ? 'Né' : 'Chém')) return true;
             if (hasKhaiThien && reqCardName === 'Chém' && getEffectiveColor(me, c) === 'red') return true;
             if (hasThinhChinh && getEffectiveColor(me, c) === 'black') return true;
             if (c.name === 'Hóa Giải' || c.idKey === 'hoa_giai') return true;
             if (hasLinhGiam && getEffectiveColor(me, c) === 'black') return true;
             return false;
          }).map(c => {
             let virtualReason = null;
             if (c.name === 'Hóa Giải' || c.idKey === 'hoa_giai') {
                virtualReason = 'Hóa Giải (Cá nhân)';
             } else if (hasLinhGiam && getEffectiveColor(me, c) === 'black' && c.name !== reqCardName) {
                virtualReason = 'Linh Giám (Hóa Giải)';
             } else if (c.name !== reqCardName) {
                virtualReason = c.name === (reqCardName === 'Chém' ? 'Né' : 'Chém') && hasDoiNui ? 'Dời Núi' : (hasThinhChinh && getEffectiveColor(me, c) === 'black' ? 'Thính Chính' : 'Khai Thiên');
             }
             return {
                ...c,
                virtualReason
             };
          });

          if (canBaguaVanTien) {
            return (
              <div style={modalStyle}>
                <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                  🏹 Trúng [Loạn Tiễn]!
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(0,0,0,0.35)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                  <div style={{ fontSize: '2.5rem' }}>☯️</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#c084fc' }}>
                    Đang tự động phán xét [Bát Quái Trận] né Loạn Tiễn...
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    Rút bài phán xét: <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Đỏ = Né thành công</span>, <span style={{ color: '#e2e8f0' }}>Đen = Thất bại (cần dùng Né / Hóa Giải)</span>.
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div style={modalStyle}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-gold)' }}>
                ⚠️ Trúng {req.card?.name || 'Cẩm nang'}!
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                {req.baguaAvailable === false && hasBaguaVanTien && reqCardName === 'Né' && (
                  <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>
                    ❌ Bát Quái phán xét ĐEN (Thất bại)!
                  </div>
                )}
                {sourceName} dùng <strong>[{req.card?.name || 'Cẩm nang'}]</strong>. Bạn phải ra lá <strong>[{reqCardName}]</strong> hoặc dùng <strong>[Hóa Giải]</strong> để tự bảo vệ mình!
              </div>
              <CardSelector 
                validCards={validCards}
                confirmText="🃏 Xác nhận ra bài!"
                cancelText="🩸 Chịu sát thương"
                onSelect={(idx) => {
                   const c = me.hand[idx];
                   if (c.name === 'Hóa Giải' || c.idKey === 'hoa_giai') {
                      handleResponseAction({ doReact: true, virtualCardName: 'Hóa Giải', cardIndexSelected: idx, cardId: c.id });
                   } else if (hasLinhGiam && getEffectiveColor(me, c) === 'black' && c.name !== reqCardName && (!hasThinhChinh || reqCardName !== 'Né')) {
                      handleResponseAction({ doReact: true, virtualCardName: 'Hóa Giải', activeSkill: 'Linh Giám', cardIndexSelected: idx, cardId: c.id });
                   } else if (c.name !== reqCardName) {
                      const activeSkill = c.name === (reqCardName === 'Chém' ? 'Né' : 'Chém') && hasDoiNui ? 'Dời Núi' : (hasThinhChinh ? 'Thính Chính' : 'Khai Thiên');
                      handleResponseAction({ doReact: true, virtualCardName: reqCardName, activeSkill, cardIndexSelected: idx, cardId: c.id });
                   } else {
                      handleResponseAction({ doReact: true, cardIndexSelected: idx, cardId: c.id });
                   }
                }}
                onCancel={() => handleResponseAction({ doReact: false })}
                extraButtons={
                  <>

                    {canBocTramTrung && (
                      <button className="btn-action success" style={{ flex: '1 1 100%' }} onClick={() => handleResponseAction({ callBocTramTrung: true })}>
                        🐉 Bọc Trăm Trứng (Gọi Lạc)
                      </button>
                    )}
                    {reqCardName === 'Né' && (hasSkill(me, 'tien_phat') || hasSkill(me, 'tien-phat')) && me.isLord && (
                      <button className="btn-action" style={{ backgroundColor: '#ec4899', color: '#fff', flex: '1 1 100%' }} onClick={() => handleResponseAction({ doTienPhat: true })}>
                        👑 Kích Hoạt Tiên Phát
                      </button>
                    )}
                    {reqCardName === 'Né' && hasSkill(me, 'ho-gia') && me.isLord && (
                      <button className="btn-action" style={{ backgroundColor: '#f59e0b', color: '#fff', flex: '1 1 100%' }} onClick={() => handleResponseAction({ doHoGia: true })}>
                        👑 Kích Hoạt Hộ Giá
                      </button>
                    )}
                  </>
                }
              />
            </div>
          );
        }
        
        const isWeaponActor = req.responderId !== undefined 
          ? req.responderId === me.id 
          : (req.weapon === 'Song Kiếm' ? req.targetId : req.sourceId) === me.id;
        if (req.type === 'ask_weapon_skill' && isWeaponActor) {
           return (
             <div style={modalStyle}>
               <AskWeaponSkillModal req={req} gameState={gameState} onConfirm={handleResponseAction} />
             </div>
           );
        }

        // Universal Fallback UI: Bắt lỗi nếu Player 0 cần respond nhưng không có UI Modal nào match req.type
        // Bỏ qua các type thuộc về Phase chính vì chúng được xử lý ở giao diện bên ngoài Modal (Nút Rút Bài, Bỏ Bài...)
        const ignoredPhases = ['draw_phase', 'play_phase', 'discard_phase', 'end_phase'];
        if (req.responderId === me.id && !ignoredPhases.includes(req.type)) {
            console.warn(`[UI FALLBACK] Unhandled request type: ${req.type} for human player!`);
            return (
              <div style={modalStyle}>
                <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: '#ef4444' }}>
                  ⚠️ Lỗi hiển thị kỹ năng! ({req.type})
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                  Hệ thống yêu cầu bạn hành động nhưng chưa có giao diện cho kỹ năng này. Bạn có thể Bỏ qua để game tiếp tục.
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
                  <button className="btn-action secondary" onClick={() => handleResponseAction({ doReact: false, doUse: false, canceled: true, doNegate: false, doProvide: false })}>
                    Bỏ qua (Fallback)
                  </button>
                </div>
              </div>
            );
        }

        return null; // Return null if it's someone else's turn to respond
  };

  const modalElement = renderModal();
  if (!modalElement) return null;

  return (
    <>
      {modalElement}
      <div 
        data-testid="modal-watchdog-pill"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '6px 14px',
          borderRadius: '20px',
          background: timeLeft === 0 ? 'rgba(75, 85, 99, 0.85)' : (timeLeft <= 5 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(15, 23, 42, 0.85)'),
          border: timeLeft === 0 ? '2px solid #9ca3af' : (timeLeft <= 5 ? '2px solid #ef4444' : '2px solid #f59e0b'),
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.85rem',
          boxShadow: timeLeft <= 5 && timeLeft > 0 ? '0 0 16px rgba(239, 68, 68, 0.8)' : '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 99999,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          letterSpacing: '0.5px',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease'
        }}
      >
        <span>⏳</span>
        <span>{timeLeft > 0 ? `${timeLeft}s` : '0s (Chờ thao tác)'}</span>
      </div>
    </>
  );
}
