const fs = require('fs');
let content = fs.readFileSync('client/src/engine/registries/CardRegistry.js', 'utf8');

content = content.replace(
    /p\.equipment\.some\(e => e\.type === 'Vũ khí'\)/g,
    "p.equipment.some(e => e.subType === 'Vũ khí' || e.type === 'Vũ khí' || e.type === 'equip_weapon')"
);

fs.writeFileSync('client/src/engine/registries/CardRegistry.js', content);
