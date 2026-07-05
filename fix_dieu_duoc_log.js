const fs = require('fs');
let code = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

code = code.replace(
`                 dispatcher.applyEffect(Effects.RecoverEffect(target.id, 1));`,
`                 console.log("Diệu Dược: Bơm máu cho", target.id, "HP trước:", target.hp, "Max:", target.maxHp);
                 dispatcher.applyEffect(Effects.RecoverEffect(target.id, 1));
                 console.log("Diệu Dược: Bơm máu xong");`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', code);
console.log("Success");
