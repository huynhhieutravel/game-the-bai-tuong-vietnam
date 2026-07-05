const fs = require('fs');
const path = '/Users/huynhtronghieu/Documents/WORK Hiếu/game-vietnam-the-bai/client/src/engine/core/Dispatcher.js';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const linesToReplace = [
    334, 527, 542, 562, 580, 595, 600, 698, 852, 867, 906, 929, 944, 1060, 1067, 1074, 1081, 1090, 1101
];

for (let i = 0; i < lines.length; i++) {
    if (linesToReplace.includes(i + 1)) {
        if (lines[i].includes('return;')) {
            lines[i] = lines[i].replace('return;', 'continue;');
            console.log(`Replaced at line ${i + 1}: ${lines[i].trim()}`);
        } else {
            console.log(`WARNING: Line ${i + 1} does not contain return; -> ${lines[i]}`);
        }
    }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Done!');
