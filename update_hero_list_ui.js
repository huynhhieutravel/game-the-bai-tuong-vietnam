const fs = require('fs');

let code = fs.readFileSync('client/src/components/wiki/HeroList.jsx', 'utf8');

code = code.replace(
`          <h1 style={{ color: 'var(--color-gold)', margin: '0 0 10px 0' }}>🦸 Danh sách Tướng ({Object.keys(activeHeroesMap).length}/{Object.values(EXPANSION_HEROES).flat().length})</h1>`,
`          <h1 style={{ color: 'var(--color-gold)', margin: '0 0 10px 0' }}>({Object.keys(activeHeroesMap).length}/{Object.values(EXPANSION_HEROES).flat().length}) 🦸 Danh sách Tướng</h1>`
);

code = code.replace(
`            Hệ {f.name} ({
              EXPANSION_HEROES[f.key].filter(h => {
                let searchName = h.name.includes('(') ? h.name.split('(')[0].trim() : h.name;
                return activeHeroesMap[searchName] || activeHeroesMap[h.name];
              }).length
            }/{EXPANSION_HEROES[f.key].length})`,
`            ({
              EXPANSION_HEROES[f.key].filter(h => {
                let searchName = h.name.includes('(') ? h.name.split('(')[0].trim() : h.name;
                return activeHeroesMap[searchName] || activeHeroesMap[h.name];
              }).length
            }/{EXPANSION_HEROES[f.key].length}) Hệ {f.name}`
);

fs.writeFileSync('client/src/components/wiki/HeroList.jsx', code);
console.log("Success");
