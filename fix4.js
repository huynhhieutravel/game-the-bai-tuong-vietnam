const fs = require('fs');
let content = fs.readFileSync('client/src/engine/ai/botLogic.js', 'utf8');
content = content.replace(/\}\n        \}\n\n        \/\/ Bot tự động mặc mọi trang bị trên tay/g, 
`}
        // Bot tự động mặc mọi trang bị trên tay`);
fs.writeFileSync('client/src/engine/ai/botLogic.js', content);
