const fs = require('fs');

let skillCode = fs.readFileSync('client/src/engine/registries/SkillRegistry.js', 'utf8');

skillCode = skillCode.replace(
`        if (askQueue.length > 0) {
            state.waitingForResponse.responderId = askQueue[0];
            state.waitingForResponse.askQueue = askQueue;
        } else {
            // Không ai đổi phán xét -> Tiến hành xử lý kết quả
            state.waitingForResponse = null;
        }`,
`        if (askQueue.length > 0) {
            state.waitingForResponse.responderId = askQueue[0];
            state.waitingForResponse.askQueue = askQueue;
        } else {
            // Không ai đổi phán xét -> Tiến hành xử lý kết quả
            state.waitingForResponse = null;
            console.log("Quân Cơ skipped! reactionStack size:", dispatcher.state.reactionStack.length);
            console.log("Top of reactionStack:", dispatcher.state.reactionStack[dispatcher.state.reactionStack.length - 1]);
        }`
);

fs.writeFileSync('client/src/engine/registries/SkillRegistry.js', skillCode);
console.log("Success");
