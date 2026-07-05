const fs = require('fs');
let code = fs.readFileSync('client/src/engine/rangeSystem.js', 'utf8');

code = code.replace(
`  // Uy Chấn: Đinh Bộ Lĩnh chặn thẻ bài có cự ly < 3
  const targetPlayer = state.players[toId];
  if (targetPlayer && targetPlayer.askedUyChan && range < 3) {
      return false;
  }
  
  const hasNoThanOrThuyTo = fromPlayer.heroes?.some((h, i) => fromPlayer.revealedHeroes && fromPlayer.revealedHeroes[i] && h.skills?.some(s => s.id === 'no-than' || s.id === 'thuy-to'));`,
`  const hasNoThanOrThuyTo = fromPlayer.heroes?.some((h, i) => fromPlayer.revealedHeroes && fromPlayer.revealedHeroes[i] && h.skills?.some(s => s.id === 'no-than' || s.id === 'thuy-to'));`
);

fs.writeFileSync('client/src/engine/rangeSystem.js', code);
console.log("Success");
