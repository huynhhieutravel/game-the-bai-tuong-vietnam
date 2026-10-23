import React, { useState, useEffect, useRef } from 'react';
import { useGameAPI } from '../../contexts/GameProvider';

export function ChatWidget({ style }) {
    const api = useGameAPI();
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    // Xử lý cả ở MultiplayerProvider (socket, chatMessages, sendChatMessage)
    // Nhưng vì ChatWidget có thể được dùng ở Lobby (không có GameStateContext)
    // Chúng ta lấy context values trực tiếp từ GameAPIContext
    const { chatMessages = [], sendChatMessage } = api || {};

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    if (!sendChatMessage) return null; // Chỉ render khi có multiplayer support

    const handleSend = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            sendChatMessage(inputValue.trim());
            setInputValue('');
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '300px',
            height: '400px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(5px)',
            ...style
        }}>
            {/* Header */}
            <div style={{
                padding: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderBottom: '1px solid var(--color-border)',
                fontWeight: 'bold',
                color: 'var(--color-gold)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>💬 Phòng Chat</span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {chatMessages?.length || 0} tin nhắn
                </span>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {chatMessages && chatMessages.map((msg, idx) => (
                    <div key={idx} style={{
                        fontSize: '0.9rem',
                        lineHeight: '1.4'
                    }}>
                        <strong style={{ color: '#38bdf8' }}>{msg.senderName}:</strong>{' '}
                        <span style={{ color: '#f8fafc', wordBreak: 'break-word' }}>{msg.message}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{
                display: 'flex',
                padding: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderTop: '1px solid var(--color-border)'
            }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '20px',
                        color: 'white',
                        outline: 'none'
                    }}
                />
                <button type="submit" style={{
                    marginLeft: '8px',
                    padding: '8px 15px',
                    backgroundColor: 'var(--color-gold)',
                    border: 'none',
                    borderRadius: '20px',
                    color: 'black',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                }}>
                    Gửi
                </button>
            </form>
        </div>
    );
}
