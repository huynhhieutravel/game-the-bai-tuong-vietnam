import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { GameStateContext, GameAPIContext } from './GameProvider';
import { toViewModel, GameAPI } from 'shared/engine_v4/application/index.js';
import { ChatWidget } from '../components/game/ChatWidget';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'; // Configurable socket server URL

export const SocketContext = createContext(null);

export function MultiplayerProvider({ children, playerName = "Người Chơi", roomId = null }) {
    const [gameState, setGameState] = useState(null);
    const [socket, setSocket] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [roomInfo, setRoomInfo] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);

    const socketRef = useRef(null);
    const sessionIdRef = useRef(null);

    useEffect(() => {
        let storedId = localStorage.getItem('vietsat_sessionId');
        if (!storedId) {
            storedId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('vietsat_sessionId', storedId);
        }
        sessionIdRef.current = storedId;
    }, []);

    // Mock API for GameAPI to forward dispatched actions to Socket
    const networkDispatcherRef = useRef({
        dispatchAction: (action) => {
            if (socketRef.current) {
                // Thêm playerId nếu cần
                socketRef.current.emit('game:action', action);
            }
        }
    });

    const apiRef = useRef(new GameAPI(networkDispatcherRef.current));

    useEffect(() => {
        if (!sessionIdRef.current) return; // Wait until sessionId is loaded

        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);
        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            setConnectionStatus('connected');
            if (roomId) {
                newSocket.emit('room:join', { roomId, name: playerName, sessionId: sessionIdRef.current }, (res) => {
                    if (res.success) {
                        console.log('Joined room:', res.roomId);
                    } else {
                        setConnectionStatus('error: ' + res.error);
                    }
                });
            } else {
                newSocket.emit('room:create', { name: playerName, sessionId: sessionIdRef.current }, (res) => {
                    if (res.success) {
                        console.log('Created room:', res.roomId);
                    } else {
                        setConnectionStatus('error: ' + res.error);
                    }
                });
            }
        });

        newSocket.on('room:state', (info) => {
            setRoomInfo(info);
            
            // Tìm index của mình trong danh sách
            if (info.players && newSocket.id) {
                const myIdx = info.players.findIndex(p => p.socketId === newSocket.id);
                if (myIdx !== -1) {
                    window.playerId = myIdx;
                }
            }

            // Check if game is started
            if (info.gameState) {
                setGameState(toViewModel(info.gameState));
            }
        });

        newSocket.on('game:stateUpdate', (newState) => {
            setGameState(toViewModel(newState));
        });

        newSocket.on('game:started', (newState) => {
            setGameState(toViewModel(newState));
        });

        newSocket.on('room:chat_message', (msg) => {
            setChatMessages(prev => [...prev, msg]);
        });

        newSocket.on('disconnect', () => {
            setConnectionStatus('disconnected');
        });

        return () => {
            newSocket.disconnect();
        };
    }, [roomId, playerName]);

    const apiContextValue = useMemo(() => ({
        getAPI: () => apiRef.current,
        selectDraftHeroes: (playerId, heroA, heroB) => {
            if (socket) {
                socket.emit('room:draft_select', { heroA, heroB });
            }
        },
        restart: () => { 
            if (socket) socket.emit('room:start'); 
        },
        sendChatMessage: (message) => {
            if (socket) {
                socket.emit('room:chat', { message });
            }
        },
        socket,
        roomInfo,
        connectionStatus,
        chatMessages
    }), [socket, roomInfo, connectionStatus, chatMessages]);

    // If game has not started, maybe we render a lobby UI
    if (!gameState) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)', color: 'white', padding: '20px', position: 'relative' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '20px', color: 'var(--color-gold)' }}>Phòng Chờ (Lobby)</h1>
                <p style={{ marginBottom: '20px', color: 'var(--color-text-muted)' }}>Trạng thái: {connectionStatus}</p>
                {roomInfo && (
                    <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '30px', borderRadius: '15px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '500px' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: '20px', textAlign: 'center' }}>Mã Phòng: <span style={{ color: '#34d399', fontFamily: 'monospace', letterSpacing: '5px' }}>{roomInfo.roomId}</span></h2>
                        <ul style={{ marginBottom: '30px', padding: 0, listStyle: 'none' }}>
                            {roomInfo.players.map((p, i) => (
                                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{p.name} {p.isHost ? '(Chủ phòng)' : ''}</span>
                                    <span style={{ color: p.isReady ? '#34d399' : '#fbbf24' }}>{p.isReady ? '✅ Sẵn sàng' : '⏳ Chờ...'}</span>
                                </li>
                            ))}
                        </ul>
                        
                        <div style={{ display: 'flex', gap: '15px' }}>
                            {!roomInfo.players.find(p => p.socketId === socket?.id)?.isHost && (
                                <button 
                                    className="btn-action primary"
                                    style={{ flex: 1, padding: '15px', fontSize: '1.2rem', borderRadius: '10px' }}
                                    onClick={() => socket.emit('room:ready', { isReady: true })}
                                >
                                    Sẵn Sàng
                                </button>
                            )}
                            {roomInfo.players.find(p => p.socketId === socket?.id)?.isHost && (
                                <button 
                                    className="btn-action primary"
                                    style={{ flex: 1, padding: '15px', fontSize: '1.2rem', borderRadius: '10px', background: 'var(--color-gold)' }}
                                    onClick={() => socket.emit('room:start')}
                                    disabled={roomInfo.players.length < 2 || !roomInfo.players.every(p => p.isReady)}
                                >
                                    Bắt Đầu Game
                                </button>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Lobby Chat */}
                <div style={{ position: 'absolute', bottom: '20px', left: '20px' }}>
                    <GameAPIContext.Provider value={apiContextValue}>
                        <ChatWidget />
                    </GameAPIContext.Provider>
                </div>
            </div>
        );
    }

    // Game has started! Provide contexts down to GameView
    return (
        <GameStateContext.Provider value={gameState}>
            <GameAPIContext.Provider value={apiContextValue}>
                {children}
            </GameAPIContext.Provider>
        </GameStateContext.Provider>
    );
}
