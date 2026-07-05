const fs = require('fs');

let code = fs.readFileSync('client/src/engine/core/Dispatcher.js', 'utf8');

// Add listeners to constructor
code = code.replace(
`  constructor(initialState) {
    this.state = initialState;
    this._tickDepth = 0; // Anti-recursion guard: đếm độ sâu tick() lồng nhau
    this._maxTickDepth = 0; // Tracking: ghi nhận độ sâu lồng tối đa (để debug)
  }`,
`  constructor(initialState) {
    this.state = initialState;
    this._tickDepth = 0; // Anti-recursion guard: đếm độ sâu tick() lồng nhau
    this._maxTickDepth = 0; // Tracking: ghi nhận độ sâu lồng tối đa (để debug)
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }
  
  getState() {
    return this.state;
  }`
);

// Add notifyListeners after tick() in dispatchAction
code = code.replace(
`    // Kích hoạt Vòng lặp State Machine
    this.tick();
  }`,
`    // Kích hoạt Vòng lặp State Machine
    this.tick();
    
    // Notify listeners that state has changed
    this.notifyListeners();
  }`
);

fs.writeFileSync('client/src/engine/core/Dispatcher.js', code);
console.log("Updated Dispatcher.js with subscribe/notify");
