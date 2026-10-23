import { createGameState, selectDraftHeroes } from 'shared/engine_v4/application/gameSetupV4.js';
import { DispatcherV4 as Dispatcher } from 'shared/engine_v4/application/DispatcherV4.js';

class GameRoom {
    constructor(roomId, io, roomManager) {
        this.roomId = roomId;
        this.io = io;
        this.roomManager = roomManager;
        this.players = []; // { socketId, name, isHost, isReady }
        this.maxPlayers = 8;
        this.gameState = null;
        this.dispatcher = null;
        this.isPlaying = false;
    }

    get state() {
        return {
            roomId: this.roomId,
            players: this.players,
            isPlaying: this.isPlaying,
            gameState: this.gameState
        };
    }

    addPlayer(socketId, name, sessionId) {
        // Check for reconnect
        if (sessionId) {
            const existingPlayer = this.players.find(p => p.sessionId === sessionId);
            if (existingPlayer) {
                console.log(`[Room ${this.roomId}] Player reconnected: ${name} (${socketId})`);
                existingPlayer.socketId = socketId;
                existingPlayer.name = name;

                if (this.gameState) {
                    const statePlayer = this.gameState.players.find(p => p.id === this.players.indexOf(existingPlayer));
                    if (statePlayer) {
                        statePlayer.socketId = socketId;
                        statePlayer.name = name;
                    }
                }

                this.io.to(socketId).emit('room:state', this.state);
                if (this.gameState) {
                    if (this.gameState.currentPhase) {
                        this.io.to(socketId).emit('game:stateUpdate', this.gameState);
                    } else {
                        this.io.to(socketId).emit('game:started', this.gameState);
                    }
                }
                
                this.broadcastState();
                return existingPlayer;
            }
        }

        if (this.players.length >= this.maxPlayers) {
            throw new Error("Phòng đã đầy");
        }
        if (this.isPlaying) {
            throw new Error("Trận đấu đang diễn ra");
        }

        const isHost = this.players.length === 0;
        const player = {
            socketId,
            sessionId,
            name,
            isHost,
            isReady: isHost
        };
        this.players.push(player);
        console.log(`[Room ${this.roomId}] Player joined: ${name} (${socketId})`);
        this.broadcastState();
        return player;
    }

    removePlayer(socketId) {
        const idx = this.players.findIndex(p => p.socketId === socketId);
        if (idx !== -1) {
            const player = this.players[idx];
            
            if (this.isPlaying) {
                console.log(`[Room ${this.roomId}] Player disconnected (can reconnect): ${player.name} (${socketId})`);
                player.socketId = null;
                this.broadcastState();
                
                // If all disconnected, destroy room
                if (this.players.every(p => p.socketId === null)) {
                    this.roomManager.removeRoom(this.roomId);
                }
                return;
            }

            this.players.splice(idx, 1);
            console.log(`[Room ${this.roomId}] Player left: ${player.name} (${socketId})`);
            
            if (this.players.length === 0) {
                this.roomManager.removeRoom(this.roomId);
            } else {
                if (player.isHost) {
                    this.players[0].isHost = true;
                    this.players[0].isReady = true;
                }
                this.broadcastState();
            }
        }
    }

    setReady(socketId, isReady) {
        const player = this.players.find(p => p.socketId === socketId);
        if (player && !player.isHost) {
            player.isReady = isReady;
            this.broadcastState();
        }
    }

    startGame(socketId) {
        const player = this.players.find(p => p.socketId === socketId);
        if (!player || !player.isHost) {
            throw new Error("Chỉ chủ phòng mới có thể bắt đầu game");
        }
        
        if (this.players.length < 2) {
            throw new Error("Cần ít nhất 2 người chơi");
        }
        
        if (!this.players.every(p => p.isReady)) {
            throw new Error("Tất cả người chơi phải sẵn sàng");
        }

        this.isPlaying = true;

        // Bắt đầu phase Draft
        this.gameState = createGameState(this.players.length); 
        
        // Gắn socketId và tên cho người chơi
        this.gameState.players.forEach((p, idx) => {
            if (this.players[idx]) {
                p.name = this.players[idx].name;
                p.socketId = this.players[idx].socketId;
                p.isBot = false;
            } else {
                p.name = `Bot ${idx + 1}`;
                p.isBot = true;
            }
        });

        // Gửi state nháp cho mọi người để chọn tướng
        this.io.to(this.roomId).emit('game:started', this.gameState);
        console.log(`[Room ${this.roomId}] Draft started with ${this.players.length} players`);
    }

    handleDraftSelect(socketId, heroA, heroB) {
        if (!this.gameState || this.gameState.phase !== 'draft') return;

        const playerIndex = this.gameState.players.findIndex(p => p.socketId === socketId);
        if (playerIndex === -1) return;

        // Lưu lựa chọn tướng
        this.gameState = selectDraftHeroes(this.gameState, playerIndex, heroA, heroB);
        
        // Kiểm tra xem đã kết thúc phase draft chưa (nếu currentPhase có tồn tại thì là engine đã khởi tạo game loop thật)
        if (this.gameState.currentPhase) {
            console.log(`[Room ${this.roomId}] Draft complete, initializing Dispatcher`);
            
            // Khởi tạo dispatcher Engine v4
            this.dispatcher = new Dispatcher(this.gameState);
            this.dispatcher.subscribe((newState) => {
                this.gameState = newState;
                this.io.to(this.roomId).emit('game:stateUpdate', this.gameState);
                
                // Kiểm tra win
                if (this.gameState.winner) {
                    this.io.to(this.roomId).emit('game:over', { winner: this.gameState.winner });
                }
            });

            // Báo cho mọi người game bắt đầu chính thức
            this.io.to(this.roomId).emit('game:stateUpdate', this.gameState);
        } else {
            // Vẫn đang chờ người khác chọn xong
            this.io.to(this.roomId).emit('game:stateUpdate', this.gameState);
        }
    }

    handleAction(socketId, action) {
        if (!this.isPlaying || !this.dispatcher) return;
        
        // Find which player index this socket belongs to
        const playerIndex = this.gameState.players.findIndex(p => p.socketId === socketId);
        if (playerIndex === -1) return;

        // Validate that the action is coming from the correct player
        if (action.playerId !== undefined && action.playerId !== playerIndex) {
            console.warn(`[Room ${this.roomId}] Player ${playerIndex} tried to dispatch action for player ${action.playerId}`);
            return;
        }

        // Add player index if missing
        if (action.playerId === undefined) {
            action.playerId = playerIndex;
        }

        console.log(`[Room ${this.roomId}] Action from ${playerIndex}:`, action.type);
        try {
            this.dispatcher.dispatchAction(action);
        } catch (err) {
            console.error(`[Room ${this.roomId}] Action error:`, err);
            // Send error back to that specific player
            this.io.to(socketId).emit('game:error', err.message);
        }
    }

    handleChat(socketId, message) {
        const player = this.players.find(p => p.socketId === socketId);
        if (player) {
            this.io.to(this.roomId).emit('room:chat_message', {
                senderName: player.name,
                message: message,
                timestamp: Date.now()
            });
        }
    }

    broadcastState() {
        this.io.to(this.roomId).emit('room:state', this.state);
    }
}

export { GameRoom };
