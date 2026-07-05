const fs = require('fs');
const path = require('path');
const glob = require('glob'); // Note: glob might not be installed, we can just use recursive readdir

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          if (file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
          next();
        }
      });
    })();
  });
}

walk('./src', function(err, results) {
  if (err) throw err;
  const CONSTANTS = ['HEROES', 'CARDS', 'PHASES', 'CARD_TYPES', 'CARD_SUBTYPES', 'EXPANSION_HEROES'];
  
  results.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    CONSTANTS.forEach(c => {
      // Find usages of the constant (e.g., matching word boundary)
      const usageRegex = new RegExp(`\\b${c}\\b`);
      if (usageRegex.test(content)) {
        // Check if imported or defined in the file
        const importRegex = new RegExp(`(import|const|let|var).*\\b${c}\\b`);
        if (!importRegex.test(content)) {
          console.log(`Missing import for ${c} in ${file.replace(process.cwd(), '')}`);
        }
      }
    });
  });
});
