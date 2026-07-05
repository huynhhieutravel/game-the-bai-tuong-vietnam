/**
 * Định nghĩa Hành động (Action) từ Client gửi lên Server (Dispatcher)
 * 
 * @typedef {{
 *   type: string,
 *   payload: {
 *     playerId: number,
 *     targetIds?: number[],
 *     cardIds?: string[],
 *     skillId?: string,
 *     options?: any,
 *     [key: string]: any
 *   }
 * }} ClientAction
 */

export {};
