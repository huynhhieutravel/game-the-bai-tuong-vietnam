const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/CardRegistry.js', 'utf8');

code = code.replace(
`      const limit = (player.equipment.some(eq => eq.name === 'Liên Nỏ') || player.usedNhiepChinh) ? Infinity : 1;
      return player.attackCountThisTurn < limit;`,
`      const limit = (player.equipment.some(eq => eq.name === 'Liên Nỏ') || player.usedNhiepChinh) ? Infinity : 1;
      return (player.attackCountThisTurn || 0) < limit;`
);

fs.writeFileSync('client/src/engine/registries/CardRegistry.js', code);
console.log("Success");
