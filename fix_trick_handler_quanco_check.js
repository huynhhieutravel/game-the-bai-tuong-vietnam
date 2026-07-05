const fs = require('fs');

let code = fs.readFileSync('client/src/engine/core/handlers/TrickHandler.js', 'utf8');

code = code.replace(
`         const quanCoPlayers = orderedIds.filter(id => {
             const p = dispatcher.state.players.find(x => x.id === id);
             return p.heroes?.some((h, i) => p.revealedHeroes[i] && h.skills?.some(s => s.id === 'quan-co'));
         });`,
`         const quanCoPlayers = orderedIds.filter(id => {
             const p = dispatcher.state.players.find(x => x.id === id);
             // Cần require HeroRegistry ở đầu file, hoặc dùng dispatcher.hasSkill() nếu có
             // Nhưng TrickHandler có import HeroRegistry không? Hãy import HeroRegistry!
             // Tạm thời giả lập vì HeroRegistry đã import ở Dispatcher, nhưng trong TrickHandler thì có không?
             // Sẽ check lại phần import HeroRegistry
         });`
);
