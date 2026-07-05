const fs = require('fs');

let code = fs.readFileSync('client/src/App.jsx', 'utf8');

code = code.replace(
`      <Route path="/" element={
        <GameProvider playerCount={4}>
          <SelectionProvider>
            <GameView />
          </SelectionProvider>
        </GameProvider>
      } />`,
`      <Route path="/" element={<MainMenu />} />
      <Route path="/game" element={
        <GameProvider playerCount={4}>
          <SelectionProvider>
            <GameView />
          </SelectionProvider>
        </GameProvider>
      } />`
);

fs.writeFileSync('client/src/App.jsx', code);
console.log("Updated App.jsx routing");
