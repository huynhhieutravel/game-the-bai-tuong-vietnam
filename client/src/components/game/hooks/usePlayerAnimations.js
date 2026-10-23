import { useEffect, useRef, useState } from 'react';

// Theo dõi sự thay đổi HP của người chơi để kích hoạt Animation
export function usePlayerAnimations(gameState) {
    const [animations, setAnimations] = useState({});
    const prevHpRef = useRef({});

    useEffect(() => {
        if (!gameState || !gameState.players) return;

        const newAnimations = { ...animations };
        let hasChanges = false;

        gameState.players.forEach(player => {
            const prevHp = prevHpRef.current[player.id];
            
            if (prevHp !== undefined && prevHp !== player.hp) {
                // Có sự thay đổi HP
                if (player.hp < prevHp) {
                    newAnimations[player.id] = 'anim-damage';
                    hasChanges = true;
                } else if (player.hp > prevHp) {
                    newAnimations[player.id] = 'anim-heal';
                    hasChanges = true;
                }
            }
            
            // Cập nhật HP mới vào ref
            prevHpRef.current[player.id] = player.hp;
        });

        if (hasChanges) {
            setAnimations(newAnimations);
            
            // Xóa animation sau 800ms để lần sau có thể trigger lại
            setTimeout(() => {
                setAnimations(prev => {
                    const cleared = { ...prev };
                    gameState.players.forEach(p => {
                        if (cleared[p.id]) delete cleared[p.id];
                    });
                    return cleared;
                });
            }, 800);
        }
    }, [gameState?.players]);

    return animations;
}
