/**
 * Định nghĩa Thẻ Bài
 * 
 * @typedef {import('./GameState').GameState} GameState
 * @typedef {import('./PlayerState').PlayerState} PlayerState
 * 
 * @typedef {Readonly<{
 *   id: string,
 *   name: string,
 *   type: 'basic' | 'trick' | 'equip',
 *   subType?: string,
 *   targeting: { type: 'single' | 'multiple' | 'all' | 'none', max?: number },
 *   canPlay?: (state: GameState, player: PlayerState) => boolean,
 *   getValidTargets?: (state: GameState, player: PlayerState, cardId: string) => PlayerState[],
 *   onPlay?: (dispatcher: any, state: GameState, playerId: number, targets: number[], cardId: string) => void
 * }>} CardDefinition
 * 
 * @typedef {Readonly<{
 *   id: string,
 *   cardId: string,
 *   suit: 'Spade' | 'Heart' | 'Club' | 'Diamond',
 *   value: number,
 *   name: string,
 *   type: string,
 *   subType?: string
 * }>} RuntimeCard
 */

export {};
