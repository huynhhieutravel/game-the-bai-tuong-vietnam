const fs = require('fs');

let code = fs.readFileSync('client/src/components/game/GameView.jsx', 'utf8');

code = code.replace(
`  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return <div style={{ color: 'white', padding: '20px' }}>Loading...</div>;
  }`,
``
);

code = code.replace(
`  if (!gameState) return null;`,
`  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return <div style={{ color: 'white', padding: '20px' }}>Loading...</div>;
  }`
);

fs.writeFileSync('client/src/components/game/GameView.jsx', code);
console.log("Fixed hooks error");
