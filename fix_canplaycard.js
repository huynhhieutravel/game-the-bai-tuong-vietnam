const fs = require('fs');
let code = fs.readFileSync('client/src/engine/rules/CardRules.js', 'utf8');

code = code.replace(
`  const actualCardName = physicalCard ? physicalCard.name : cardNameOrId;`,
`  const isVirtual = cardNameOrId && physicalCardId && cardNameOrId !== physicalCardId;
  const actualCardName = isVirtual ? cardNameOrId : (physicalCard ? physicalCard.name : cardNameOrId);`
);

fs.writeFileSync('client/src/engine/rules/CardRules.js', code);
console.log("Success");
