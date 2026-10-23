import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './RoomManager.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);
    
    // Store user's current room
    let currentRoomId = null;

    socket.on('room:create', ({ name, sessionId }, callback) => {
        try {
            const room = roomManager.createRoom(socket.id);
            socket.join(room.roomId);
            const player = room.addPlayer(socket.id, name, sessionId);
            currentRoomId = room.roomId;
            callback({ success: true, roomId: room.roomId, player });
        } catch (err) {
            callback({ success: false, error: err.message });
        }
    });

    socket.on('room:join', ({ roomId, name, sessionId }, callback) => {
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) {
                return callback({ success: false, error: "Phòng không tồn tại" });
            }
            socket.join(room.roomId);
            const player = room.addPlayer(socket.id, name, sessionId);
            currentRoomId = room.roomId;
            callback({ success: true, roomId: room.roomId, player });
        } catch (err) {
            callback({ success: false, error: err.message });
        }
    });

    socket.on('room:ready', ({ isReady }) => {
        if (!currentRoomId) return;
        const room = roomManager.getRoom(currentRoomId);
        if (room) {
            room.setReady(socket.id, isReady);
        }
    });

    socket.on('room:start', () => {
        try {
            if (!currentRoomId) throw new Error("Chưa vào phòng");
            const room = roomManager.getRoom(currentRoomId);
            if (room) {
                room.startGame(socket.id);
            }
        } catch (err) {
            socket.emit('game:error', err.message);
        }
    });

    socket.on('room:draft_select', ({ heroA, heroB }) => {
        try {
            if (!currentRoomId) throw new Error("Chưa vào phòng");
            const room = roomManager.getRoom(currentRoomId);
            if (room) {
                room.handleDraftSelect(socket.id, heroA, heroB);
            }
        } catch (err) {
            socket.emit('game:error', err.message);
        }
    });

    socket.on('game:action', (action) => {
        try {
            if (!currentRoomId) throw new Error("Chưa vào phòng");
            const room = roomManager.getRoom(currentRoomId);
            if (room) {
                room.handleAction(socket.id, action);
            }
        } catch (err) {
            socket.emit('game:error', err.message);
        }
    });

    socket.on('room:chat', ({ message }) => {
        try {
            if (!currentRoomId) throw new Error("Chưa vào phòng");
            const room = roomManager.getRoom(currentRoomId);
            if (room) {
                room.handleChat(socket.id, message);
            }
        } catch (err) {
            socket.emit('game:error', err.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.id}`);
        if (currentRoomId) {
            const room = roomManager.getRoom(currentRoomId);
            if (room) {
                room.removePlayer(socket.id);
            }
        }
    });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`[Server] Game Server running on port ${PORT}`);
});
