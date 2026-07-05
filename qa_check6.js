const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.js') || file.endsWith('.jsx')) {
                arrayOfFiles.push(path.join(__dirname, dirPath, "/", file));
            }
        }
    });
    return arrayOfFiles;
}

const engineFiles = getAllFiles('./client/src/engine');
const allFiles = [...engineFiles, path.join(__dirname, './client/src/App.jsx')];

const emittedTypes = new Set();
const handledInApp = new Set();
const handledInBot = new Set();

const emitRegex = /waitingForResponse\s*=\s*{\s*type:\s*'([^']+)'/g;
const reqTypeRegex = /req\.type\s*===\s*'([^']+)'/g;
const reqTypeIncludesRegex = /\[([^\]]+)\]\.includes\(req\.type\)/g;

allFiles.forEach(file => {
    if (file.includes('phase4_backup')) return;
    
    const content = fs.readFileSync(file, 'utf8');
    
    let m;
    while ((m = emitRegex.exec(content)) !== null) {
        emittedTypes.add(m[1]);
    }
    
    if (file.endsWith('App.jsx')) {
        let m2;
        while ((m2 = reqTypeRegex.exec(content)) !== null) {
            handledInApp.add(m2[1]);
        }
        while ((m2 = reqTypeIncludesRegex.exec(content)) !== null) {
            const types = [...m2[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
            types.forEach(t => handledInApp.add(t));
        }
    }
    
    if (file.endsWith('botLogic.js')) {
        let m2;
        while ((m2 = reqTypeRegex.exec(content)) !== null) {
            handledInBot.add(m2[1]);
        }
        while ((m2 = reqTypeIncludesRegex.exec(content)) !== null) {
            const types = [...m2[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
            types.forEach(t => handledInBot.add(t));
        }
    }
});

console.log("=== KẾT QUẢ KIỂM TRA EVENT DEADLOCK ===");
console.log(`Tổng số loại Event chờ phản hồi: ${emittedTypes.size}`);
console.log(`Số Event được xử lý trên UI (App.jsx): ${handledInApp.size}`);
console.log(`Số Event được xử lý bởi Bot (botLogic.js): ${handledInBot.size}`);

const unhandledByBot = [];
emittedTypes.forEach(type => {
    if (!handledInBot.has(type)) {
        unhandledByBot.push(type);
    }
});

console.log("\n[CẢNH BÁO] Các Event được phát ra nhưng BOT KHÔNG BIẾT XỬ LÝ (Có thể gây kẹt game):");
console.log(unhandledByBot.join(', '));

const unhandledByApp = [];
emittedTypes.forEach(type => {
    if (!handledInApp.has(type)) {
        unhandledByApp.push(type);
    }
});

console.log("\n[CẢNH BÁO] Các Event được phát ra nhưng UI KHÔNG BIẾT XỬ LÝ (Người chơi sẽ không thấy nút bấm):");
console.log(unhandledByApp.join(', '));

