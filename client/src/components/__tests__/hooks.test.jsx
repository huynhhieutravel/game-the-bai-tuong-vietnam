/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useTargeting } from '../game/hooks/useTargeting';
import { useCardInteraction } from '../game/hooks/useCardInteraction';
import { describe, it, expect, vi } from 'vitest';

describe('Game Hooks', () => {
    describe('useTargeting', () => {
        it('should call cancelTargeting and clear state', () => {
            const setTargetSession = vi.fn();
            const setActiveSkill = vi.fn();
            const isActionPending = { current: true };

            const { result } = renderHook(() => useTargeting({
                gameAPI: {},
                gameState: {},
                targetSession: {},
                setTargetSession,
                setActiveSkill,
                isActionPending
            }));

            act(() => {
                result.current.cancelTargeting();
            });

            expect(setTargetSession).toHaveBeenCalledWith(null);
            expect(setActiveSkill).toHaveBeenCalledWith(null);
            expect(isActionPending.current).toBe(false);
        });
    });

    describe('useCardInteraction', () => {
        it('should track selected discards', () => {
            const { result } = renderHook(() => useCardInteraction({
                gameState: {
                    players: [{ id: 0, hp: 3, hand: ['card1', 'card2', 'card3', 'card4'] }],
                    waitingForResponse: { type: 'discard_phase', amount: 2 }
                },
                gameAPI: {},
                targetSession: null,
                setTargetSession: vi.fn(),
                cancelTargeting: vi.fn(),
                mainPlayerId: 0
            }));

            // Chọn 1 lá
            act(() => {
                result.current.handleDiscardToggle('card1');
            });
            expect(result.current.selectedDiscards).toContain('card1');

            // Bỏ chọn lá
            act(() => {
                result.current.handleDiscardToggle('card1');
            });
            expect(result.current.selectedDiscards).not.toContain('card1');
        });
    });
});

