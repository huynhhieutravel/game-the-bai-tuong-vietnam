const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `                {me.heroes && me.heroes.flatMap((h, i) => me.revealedHeroes[i] ? (h.skills || []) : [])
                  .filter(s => ['Khai Thiên', 'Dời Núi', 'Thần Hỏa', 'Thủy Tổ', 'Bọc Trăm Trứng (Chủ Công Kỹ)', 'Tiên Duyên', 'Tiên Phong', 'Tự Chủ', 'Diệu Dược', 'Hòa Thân', 'Bình Loạn', 'Trung Dũng', 'Bạch Đằng', 'Lặn Sâu', 'Tâm Công', 'Vân Đồn', 'Duyên Thơ', 'Kỳ Tập'].includes(s.name))
                  .map(s => (`;

const newLogic = `                { (() => {
                    let skills = me.heroes && me.heroes.flatMap((h, i) => me.revealedHeroes[i] ? (h.skills || []) : [])
                       .filter(s => ['Khai Thiên', 'Dời Núi', 'Thần Hỏa', 'Thủy Tổ', 'Bọc Trăm Trứng (Chủ Công Kỹ)', 'Tiên Duyên', 'Tiên Phong', 'Tự Chủ', 'Diệu Dược', 'Hòa Thân', 'Bình Loạn', 'Trung Dũng', 'Bạch Đằng', 'Lặn Sâu', 'Tâm Công', 'Vân Đồn', 'Duyên Thơ', 'Kỳ Tập', 'Định Quốc'].includes(s.name));
                    
                    const myFaction = getPlayerFaction(me);
                    if (myFaction === 'sơn') {
                        const hasDinhQuocUser = gameState.players.some(p => p.id !== me.id && p.isAlive && p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.name === 'Định Quốc')));
                        // Đảm bảo không bị trùng nếu chính mình là Đinh Điền
                        const iHaveDinhQuoc = skills.some(s => s.name === 'Định Quốc');
                        if (hasDinhQuocUser && !iHaveDinhQuoc) {
                            skills.push({ name: 'Định Quốc', desc: 'Đưa 1 lá bài cho tướng Định Quốc để họ hồi máu' });
                        }
                    }
                    return skills.map(s => (`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
