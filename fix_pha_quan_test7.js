const fs = require('fs');

let dispatcherCode = fs.readFileSync('client/src/engine/core/Dispatcher.js', 'utf8');

dispatcherCode = dispatcherCode.replace(
`           this.resolveEvent(event);
           loopCount++;
           if (this.state.waitingForResponse) {
                const req = this.state.waitingForResponse;`,
`           this.resolveEvent(event);
           loopCount++;
           console.log("[TICK] loopCount:", loopCount, "event.type:", event.type, "waitingForResponse is:", this.state.waitingForResponse ? this.state.waitingForResponse.type : null);
           if (this.state.waitingForResponse) {
                const req = this.state.waitingForResponse;`
);

fs.writeFileSync('client/src/engine/core/Dispatcher.js', dispatcherCode);
console.log("Success");
