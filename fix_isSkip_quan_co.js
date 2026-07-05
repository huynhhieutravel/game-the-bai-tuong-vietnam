const fs = require('fs');

let code = fs.readFileSync('client/src/engine/core/Dispatcher.js', 'utf8');

code = code.replace(
`            // ============== EARLY BYPASS CHO QUAN_CO ==============
            if (waitingType === 'ask_quan_co') {
                if (isSkip || !data || !data.cardId) {`,
`            // ============== EARLY BYPASS CHO QUAN_CO ==============
            if (waitingType === 'ask_quan_co') {
                const isSkipReq = responseType === 'skip' || responseType === 'cancel' || !data || !data.cardId;
                if (isSkipReq) {`
);

fs.writeFileSync('client/src/engine/core/Dispatcher.js', code);
console.log("Success");
