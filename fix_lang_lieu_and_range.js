const fs = require('fs');

let testCode = fs.readFileSync('client/src/engine/__tests__/heroes_lac.test.js', 'utf8');
testCode = testCode.replace(
`      dispatcher.dispatchAction({
        type: 'ACTION_SKILL_RESPONSE',
        payload: {
           orderedCards: true,`,
`      dispatcher.dispatchAction({
        type: 'ACTION_SKILL_RESPONSE',
        payload: {
           req: askEvent,
           orderedCards: true,`
);
fs.writeFileSync('client/src/engine/__tests__/heroes_lac.test.js', testCode);

let rangeCode = fs.readFileSync('client/src/engine/rangeSystem.js', 'utf8');
rangeCode = rangeCode.replace(
`import HeroRegistry from './registries/HeroRegistry.js';`,
`import { HeroRegistry } from './registries/HeroRegistry.js';`
);
fs.writeFileSync('client/src/engine/rangeSystem.js', rangeCode);
console.log("Success");
