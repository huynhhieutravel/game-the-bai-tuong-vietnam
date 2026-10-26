// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('QA: Infinite Hover Jitter Loop Prevention & Draft Timer Standard', () => {
  it('1. Toàn bộ CSS không được chứa margin/padding/dimension trong các rule :hover', () => {
    const cssFiles = [
      path.resolve(__dirname, '../../index.css'),
      path.resolve(__dirname, '../game/MyHeroBar.css')
    ];

    cssFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const regex = /([^{}]+:hover[^{}]*)\{([^}]+)\}/g;
      let match;
      const violations = [];

      while ((match = regex.exec(content)) !== null) {
        const selector = match[1].trim().replace(/\s+/g, ' ');
        const body = match[2].trim().replace(/\s+/g, ' ');
        const cleanBody = body.replace(/\/\*[\s\S]*?\*\//g, '');

        // Bắt các thuộc tính làm dịch chuyển layout khi hover
        const hasMargin = /\bmargin(-[a-z]+)?\s*:\s*(?!0\b)[^;]+/i.test(cleanBody);
        const hasPadding = /\bpadding(-[a-z]+)?\s*:\s*(?!0\b)[^;]+/i.test(cleanBody);
        const hasSize = /\b(width|height)\s*:\s*(?!auto\b)[^;]+/i.test(cleanBody);
        const hasPos = /\b(top|bottom|left|right)\s*:\s*(?!auto\b)[^;]+/i.test(cleanBody);

        if (hasMargin || hasPadding || hasSize || hasPos) {
          violations.push({ selector, body });
        }
      }

      expect(violations, `Phát hiện rule :hover gây nguy cơ Jitter trong ${path.basename(file)}: ${JSON.stringify(violations)}`).toEqual([]);
    });
  });

  it('2. .hand-cards .card.unplayable:hover phải có transform: none để không bị nhảy hover', () => {
    const indexCss = fs.readFileSync(path.resolve(__dirname, '../../index.css'), 'utf8');
    expect(indexCss).toContain('.hand-cards .card.unplayable:hover');
    expect(indexCss).toMatch(/\.hand-cards\s+\.card\.unplayable:hover\s*\{[^}]*transform:\s*none\s*!important/);
  });

  it('3. DraftScreen khởi tạo thời gian chọn tướng chuẩn 60 giây', () => {
    const draftScreenContent = fs.readFileSync(path.resolve(__dirname, '../game/DraftScreen.jsx'), 'utf8');
    expect(draftScreenContent).toContain('useState(60)');
  });
});
