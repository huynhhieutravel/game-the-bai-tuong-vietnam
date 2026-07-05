import { CARDS } from './src/data/gameData.js';
const horse = CARDS.find(c => c.name === 'Ngựa Chiến (-1)');
console.log(horse.type);
