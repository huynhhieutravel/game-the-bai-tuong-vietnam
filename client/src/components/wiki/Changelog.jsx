import React, { useState } from 'react';
import '../WikiPage.css';

const CHANGELOG_DATA = [
  {
    version: "3.1.1",
    codename: "Static Type Safety",
    date: "Ngày 5 Tháng 7 Năm 2026",
    status: "current",
    summary: "Xây dựng Hàng rào Kiểm tra tĩnh (Compile-time Guard) cho toàn bộ Core Engine. Khai tử triệt để lớp lỗi (Bug Class) truy xuất sai tên biến (Property Access Mismatch) gây hiệu ứng domino ngầm.",
    highlights: [
      "Khởi tạo hệ thống Module Types riêng biệt (Hero.js, PlayerState.js, GameState.js, Card.js, v.v...)",
      "Thiết lập Naming Conventions và Property Access Rules phân định rõ Runtime State và Immutable Definition",
      "Kích hoạt cờ kiểm tra @ts-check và cấu hình jsconfig.json với Strict Mode cho thư mục Engine",
      "Sử dụng Runtime Assertions thay vì Proxy để đảm bảo tốc độ tối đa cho Game Loop",
      "Áp dụng chính sách Zero Warnings (0 cảnh báo từ TypeScript Compiler) trên toàn bộ lõi Game"
    ],
    changes: [
      { type: "architecture", desc: "Tạo thư mục engine/types/ chứa JSDoc Schema độc lập cho từng thực thể (Entity)" },
      { type: "architecture", desc: "Tạo cấu hình jsconfig.json kích hoạt checkJs và moduleResolution" },
      { type: "refactor", desc: "Nhúng // @ts-check và JSDoc imports vào Dispatcher, CombatHandler, SkillRegistry, gameSetup" },
      { type: "bugfix", desc: "Sửa lỗi API Signature: hàm addLog() bị gọi dư tham số ở hơn 10 vị trí khác nhau" },
      { type: "bugfix", desc: "Sửa lỗi Object Shape: biến nextResponse bị gán sai cấu trúc gốc trong cardEffects.js" },
      { type: "bugfix", desc: "Xoá sổ 3 bộ keys bị trùng lặp âm thầm (An Bang, Diệu Dược, Xuân Hương) trong SkillDescriptions" }
    ]
  },
  {
    version: "3.1",
    codename: "Tối Ưu Hoá",
    date: "Đang lên kế hoạch",
    status: "planned",
    summary: "Tái cấu trúc tầng UI & dọn dẹp nợ kỹ thuật để sẵn sàng mở rộng hàng trăm tướng mới.",
    highlights: [
      "Tách GameView.jsx (1,666 dòng) thành các Custom Hooks + Sub-Components nhỏ",
      "Tách SkillRegistry.js (2,921 dòng) theo Phe: Lạc / Sơn / Việt / Trung Lập",
      "Loại bỏ hệ thống Legacy Bridge (engine/index.js) — chỉ còn 1 cách gọi Engine",
      "Dọn sạch ~6,000 dòng code zombie (App.jsx.bak, phase4_backup, botAI.js cũ)",
      "Tăng cường Testing: Từ 43 lên ≥80 test cases",
    ],
    changes: []
  },
  {
    version: "3.0",
    codename: "Dispatcher Era",
    date: "Tháng 7/2026",
    status: "current",
    summary: "Tái kiến trúc toàn bộ Game Engine sang mô hình Event-Driven (Dispatcher → Action → Event → Effect → State). Tách App.jsx monolithic (4,865 dòng) thành hệ thống Context + Component. Xây dựng hệ thống Bot AI mới chạy trên Dispatcher.",
    highlights: [
      "Xây dựng Dispatcher (State Machine) hoàn chỉnh với Action Queue + Reaction Stack",
      "Tách Dispatcher thành 3 Handler chuyên biệt: PhaseHandler, CombatHandler, TrickHandler",
      "Xây dựng GameAPI + GameProvider + BotRunner hoạt động qua Dispatcher",
      "Viết lại toàn bộ Bot AI (botLogic.js) chạy trên kiến trúc Dispatcher mới",
      "Tách 30 Modal UI riêng lẻ từ App.jsx monolithic",
      "Xây dựng hệ thống Rules Engine: CardRules, SkillRules, TargetResolver",
      "Xây dựng Reducer + Effects cho immutable state management",
      "Xây dựng SeededRNG cho random có thể tái tạo (multiplayer-ready)",
    ],
    changes: [
      { type: "architecture", desc: "Tạo Dispatcher.js — Trái tim State Machine của game (1,014 dòng)" },
      { type: "architecture", desc: "Tạo GameAPI.js, BotRunner.js, GameViewMapper.js — Tầng Application" },
      { type: "architecture", desc: "Tạo GameProvider.jsx + SelectionProvider.jsx — React Context tách State/API" },
      { type: "architecture", desc: "Tạo PhaseHandler.js, CombatHandler.js, TrickHandler.js — Tách logic xử lý" },
      { type: "architecture", desc: "Tạo CardRules.js, SkillRules.js, TargetResolver.js, TurnRules.js — Rules Engine" },
      { type: "architecture", desc: "Tạo Actions.js, Effects.js, Events.js, Reducer.js, State.js — Core primitives" },
      { type: "architecture", desc: "Tạo botLogic.js — Bot AI mới chạy trên Dispatcher thay vì monolithic botAI.js" },
      { type: "refactor", desc: "Tách App.jsx (4,865 dòng) → GameView.jsx (1,666 dòng) + 30 Modal riêng lẻ" },
      { type: "refactor", desc: "Tạo engine/index.js làm Bridge chuyển đổi API cũ sang Dispatcher mới" },
      { type: "bugfix", desc: "Fix #31: Sập trang trắng do React TDZ (cancelTargeting khai báo sau handleExecuteSkill)" },
      { type: "bugfix", desc: "Fix #32: Payload Mismatch (sourceId/targetIds vs playerId/targets) gây liệt toàn bộ kỹ năng" },
      { type: "bugfix", desc: "Fix #33: Missing UI Interceptor — Bấm bài khi đang dùng kỹ năng bị đánh ra sân thay vì chọn" },
      { type: "bugfix", desc: "Fix #29: Đột tử do Stale State khi uống Rượu cứu mạng" },
      { type: "bugfix", desc: "Fix #30: Bot AI quên cách cứu mình bằng Rượu và Nam Dược" },
      { type: "bugfix", desc: "Fix #28: Chớp tắt Modal Cứu Người / Đánh Né do kỹ năng bị khoá điều kiện lật tướng" },
      { type: "bugfix", desc: "Fix #24: Vòng lặp vô hạn khi Bot phản hồi Vũ khí (Thanh Long Đao)" },
      { type: "bugfix", desc: "Fix #23: Bát Quái mù màu (Unicode suit) và Sấm Sét tịt ngòi" },
      { type: "bugfix", desc: "Fix #22: AI Deadlock toàn diện (Cướp/Tước/Binh Lương/Vũ Khí)" },
      { type: "bugfix", desc: "Fix #21: AI kẹt vòng lặp chém (hasAttackedThisTurn vs attackCountThisTurn)" },
      { type: "bugfix", desc: "Fix #19-20: Trắng màn hình khi trúng Nam Man/Vạn Tiễn + Sai danh xưng UI" },
      { type: "bugfix", desc: "Fix #17-18: Bypass cấp cứu (0 HP vẫn sống) + Bỏ lọt phản đòn (Bát Quái, Tiên Phát)" },
      { type: "bugfix", desc: "Fix #14: Đứng hình do Bot AI dùng kỹ năng Tiên Phong / Duyên Thơ không kiểm tra mục tiêu" },
    ]
  },
  {
    version: "2.0",
    codename: "Hoàn Thiện Gameplay",
    date: "Tháng 6/2026",
    status: "stable",
    summary: "Game chơi được hoàn chỉnh, không lỗi nghiêm trọng. Tất cả tướng, bài, kỹ năng hoạt động đúng luật. Bot AI đánh được thông minh. Hệ thống Wiki nội bộ hoàn chỉnh.",
    highlights: [
      "Toàn bộ 30+ tướng với kỹ năng Chủ động + Bị động hoạt động đúng",
      "Toàn bộ bộ bài 108 lá (Cơ bản + Cẩm Nang + Trang bị) hoạt động",
      "Bot AI có chiều sâu: Đánh giá faction, ưu tiên mục tiêu, fallback chống kẹt",
      "Hệ thống Draft chọn tướng hoàn chỉnh với giao diện đẹp",
      "Wiki nội bộ: Trang Luật Chơi, Danh sách Tướng, Danh sách Bài, Lịch Sử Lỗi",
      "Universal AI Fallback — Vắc-xin chống treo game toàn cầu",
    ],
    changes: [
      { type: "feature", desc: "Hoàn thiện gameplay loop: Draft → Draw → Play → Respond → Discard → End Turn" },
      { type: "feature", desc: "Xây dựng SkillRegistry.js — Đăng ký toàn bộ ~70 kỹ năng tướng" },
      { type: "feature", desc: "Xây dựng CardRegistry.js — Logic xử lý cho tất cả loại bài" },
      { type: "feature", desc: "Xây dựng HeroRegistry.js + EquipRegistry.js — Database tướng và trang bị" },
      { type: "feature", desc: "Xây dựng hệ thống Vũ khí đặc biệt (Song Kiếm, Thanh Long Đao, Phá Quân, v.v.)" },
      { type: "feature", desc: "Xây dựng hệ thống Judgement (Phán xét bài: Bát Quái, Sấm Sét, v.v.)" },
      { type: "feature", desc: "Xây dựng hệ thống Xiềng Xích (chain damage propagation)" },
      { type: "feature", desc: "Xây dựng Wiki: HeroList, HeroDetail, CardLists, RulesView, BugHistory, v.v." },
      { type: "feature", desc: "Cài đặt Universal AI Fallback (Bot tự Bỏ Qua khi gặp request lạ)" },
      { type: "bugfix", desc: "Fix #1-13: Toàn bộ lỗi giai đoạn đầu (Chém liên tục, Hook sai mục tiêu, Import thiếu, v.v.)" },
      { type: "bugfix", desc: "Fix #15-16: Nhiếp Chính vẫn bắt bỏ bài + Crash đen màn hình khi chọn mục tiêu" },
      { type: "bugfix", desc: "Fix #25: Sai danh xưng UI trong bảng hỏi Hóa Giải / Nam Man" },
    ]
  },
  {
    version: "1.0",
    codename: "Khởi Nguyên",
    date: "Tháng 5/2026",
    status: "legacy",
    summary: "Xây dựng nền tảng dự án từ con số 0. Nghiên cứu cơ chế Tam Quốc Sát, thiết kế ánh xạ sang bối cảnh Việt Nam, tạo bộ dữ liệu tướng/bài/kỹ năng, và xây dựng prototype chơi được đầu tiên.",
    highlights: [
      "Nghiên cứu toàn bộ cơ chế Tam Quốc Sát gốc và viết tài liệu Game Bible",
      "Thiết kế bối cảnh Việt Nam: 3 phe Lạc / Sơn / Việt + phe Trung Lập",
      "Thiết kế 30+ tướng lịch sử Việt Nam với kỹ năng riêng biệt",
      "Tạo bộ bài 108 lá với chất/số/hiệu ứng đầy đủ",
      "Tạo hình ảnh artwork cho tướng, faction, và giao diện",
      "Xây dựng prototype UI đầu tiên bằng React + Vite",
      "Xây dựng bộ dữ liệu gameData.js — Nền tảng data cho toàn dự án",
    ],
    changes: [
      { type: "feature", desc: "Tạo Game Bible — Kinh thánh dự án (cơ chế game, ánh xạ Việt Nam, quy ước đặt tên)" },
      { type: "feature", desc: "Tạo Card Database — Bộ bài 108 lá đầy đủ chất, số, hiệu ứng" },
      { type: "feature", desc: "Tạo gameData.js — Constants, PHASES, HEROES, CARD_TYPES" },
      { type: "feature", desc: "Tạo expansionHeroes.js — Dữ liệu tướng mở rộng" },
      { type: "feature", desc: "Xây dựng gameState.js, rangeSystem.js, skillSystem.js, turnSystem.js, cardEffects.js" },
      { type: "feature", desc: "Xây dựng botAI.js — Bot AI prototype đầu tiên" },
      { type: "feature", desc: "Xây dựng App.jsx monolithic — Toàn bộ UI game trong 1 file (4,865 dòng)" },
      { type: "feature", desc: "Generate artwork: Hình tướng, faction icons, background bàn chơi" },
    ]
  }
];

const typeColors = {
  architecture: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', label: '🏗️ Kiến Trúc' },
  feature: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', label: '✨ Tính Năng' },
  bugfix: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', label: '🐛 Sửa Lỗi' },
  refactor: { bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', label: '♻️ Tái Cấu Trúc' },
};

const statusColors = {
  planned: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', label: '📋 Đang Lên Kế Hoạch' },
  current: { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', label: '🔵 Phiên Bản Hiện Tại' },
  stable: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', label: '✅ Ổn Định' },
  legacy: { bg: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', label: '📦 Legacy' },
};

export default function Changelog() {
  const [expandedVersion, setExpandedVersion] = useState("3.0");

  return (
    <div className="wiki-hero-detail" style={{ maxWidth: '100%', margin: '0', textAlign: 'left', lineHeight: '1.6' }}>
      <h1 style={{ color: 'var(--color-gold)', marginBottom: '10px', fontSize: '2rem' }}>
        📋 Changelog — Lịch Sử Phát Triển
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px', fontSize: '1.1rem' }}>
        Ghi chép toàn bộ quá trình xây dựng dự án Việt Sát — Game Thẻ Bài Chiến Thuật Việt Nam.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {CHANGELOG_DATA.map(release => {
          const statusStyle = statusColors[release.status];
          const isExpanded = expandedVersion === release.version;

          return (
            <div key={release.version} className="wiki-card" style={{ 
              padding: '0', 
              overflow: 'hidden',
              border: release.status === 'current' ? '1px solid rgba(59, 130, 246, 0.4)' : undefined
            }}>
              {/* Header */}
              <div 
                onClick={() => setExpandedVersion(isExpanded ? null : release.version)}
                style={{ 
                  padding: '25px 30px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: release.status === 'current' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                  borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.1)' : 'none'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                    <h2 style={{ color: 'var(--color-text-primary)', margin: 0, fontSize: '1.6rem' }}>
                      v{release.version}
                    </h2>
                    <span style={{ 
                      background: statusStyle.bg, 
                      color: statusStyle.color, 
                      padding: '4px 12px', 
                      borderRadius: '15px', 
                      fontSize: '0.8rem', 
                      fontWeight: 'bold' 
                    }}>
                      {statusStyle.label}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                      {release.date}
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-gold)', fontSize: '1rem', fontWeight: 'bold', marginBottom: '5px' }}>
                    "{release.codename}"
                  </div>
                  <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
                    {release.summary}
                  </p>
                </div>
                <span style={{ fontSize: '1.5rem', color: 'var(--color-text-secondary)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div style={{ padding: '25px 30px' }}>
                  {/* Highlights */}
                  <h3 style={{ color: 'var(--color-gold)', marginBottom: '15px', fontSize: '1.1rem' }}>
                    🌟 Điểm Nổi Bật
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 25px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {release.highlights.map((h, i) => (
                      <li key={i} style={{ 
                        color: 'var(--color-text-primary)', 
                        padding: '10px 15px', 
                        background: 'rgba(212, 168, 67, 0.05)', 
                        borderLeft: '3px solid var(--color-gold)', 
                        borderRadius: '0 6px 6px 0',
                        fontSize: '0.95rem'
                      }}>
                        {h}
                      </li>
                    ))}
                  </ul>

                  {/* Detailed Changes */}
                  {release.changes.length > 0 && (
                    <>
                      <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '15px', fontSize: '1.1rem' }}>
                        📝 Chi Tiết Thay Đổi ({release.changes.length})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {release.changes.map((c, i) => {
                          const style = typeColors[c.type];
                          return (
                            <div key={i} style={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              gap: '12px', 
                              padding: '8px 12px',
                              background: style.bg,
                              borderLeft: `3px solid ${style.border}`,
                              borderRadius: '0 6px 6px 0',
                              fontSize: '0.9rem'
                            }}>
                              <span style={{ 
                                color: style.border, 
                                fontWeight: 'bold', 
                                whiteSpace: 'nowrap',
                                minWidth: '120px',
                                fontSize: '0.8rem'
                              }}>
                                {style.label}
                              </span>
                              <span style={{ color: 'var(--color-text-primary)' }}>
                                {c.desc}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
