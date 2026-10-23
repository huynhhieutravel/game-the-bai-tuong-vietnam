import { GameRoom } from './GameRoom.js';

class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomId -> GameRoom instance
    }

    createRoom(hostSocketId, options = {}) {
        // Generate a 4-character random code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let roomId;
        do {
            roomId = '';
            for (let i = 0; i < 4; i++) {
                roomId += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(roomId));

        const room = new GameRoom(roomId, this.io, this);
        this.rooms.set(roomId, room);
        console.log(`[RoomManager] Room created: ${roomId}`);
        return room;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId?.toUpperCase());
    }

    removeRoom(roomId) {
        this.rooms.delete(roomId);
        console.log(`[RoomManager] Room removed: ${roomId}`);
    }
}

export { RoomManager };
