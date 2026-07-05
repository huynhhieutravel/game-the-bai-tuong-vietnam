const fs = require('fs');
let content = fs.readFileSync('client/src/App.jsx', 'utf8');

// Thay thế playerId bằng 0 trong GameOver modal
content = content.replace(/p\.id === playerId \? '\(Bạn\)' : ''/g, "p.id === 0 ? '(Bạn)' : ''");

fs.writeFileSync('client/src/App.jsx', content);
