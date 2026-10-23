import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Dispatcher,
  GameAPI,
  BotRunner,
  createGameState,
  selectDraftHeroes as legacySelectDraftHeroes,
  toViewModel
} from 'shared/engine_v4/application/index.js';

// 1. GameState Context: Dành cho UI render dữ liệu
export const GameStateContext = createContext(null);

// 2. GameAPI Context: Dành cho UI gọi hàm (không bao giờ re-render)
export const GameAPIContext = createContext(null);

export function GameProvider({ children, playerCount = 4 }) {
  const [gameState, _setGameState] = useState(null);
  
  // Refs để giữ các core objects không bị mất khi re-render
  const dispatcherRef = useRef(null);
  const gameAPIRef = useRef(null);
  const botRunnerRef = useRef(null);
  
  // Ref lưu raw state cho draft (vì draft dùng hệ thống cũ, chưa chạy qua Dispatcher)
  const rawStateRef = useRef(null);

  // Khởi tạo Engine một lần duy nhất (hoặc khi reset game)
  const initializeGame = useCallback((playersCount) => {
    const initialState = createGameState(playersCount);
    rawStateRef.current = initialState;
    
    // Chưa tạo Dispatcher ở giai đoạn DRAFT vì draft dùng hệ thống state cũ
    // Dispatcher chỉ được tạo SAU khi tất cả người chơi đã chọn tướng xong
    dispatcherRef.current = null;
    gameAPIRef.current = null;
    botRunnerRef.current = null;
    
    _setGameState(toViewModel(initialState));
  }, []);

  // Hàm xử lý Draft (bridge giữa hệ thống cũ và mới)
  const selectDraftHeroes = useCallback((playerId, heroA, heroB) => {
    if (!rawStateRef.current) return;
    
    const newState = legacySelectDraftHeroes(rawStateRef.current, playerId, heroA, heroB);
    rawStateRef.current = newState;
    
    // Nếu tất cả đã chọn xong → State mới đã chuyển sang engine format (có currentPhase, actionQueue, etc.)
    // → Tạo Dispatcher + GameAPI + BotRunner ngay
    if (newState.currentPhase) {
      // Đây là engine state rồi → wrap vào Dispatcher
      const dispatcher = new Dispatcher(newState);
      const api = new GameAPI(dispatcher);
      const runner = new BotRunner(api);
      
      dispatcherRef.current = dispatcher;
      gameAPIRef.current = api;
      botRunnerRef.current = runner;
      
      // Subscribe để React update UI mỗi khi State thay đổi trong Engine
      dispatcher.subscribe((engineState) => {
        isSubmittingGlobal = false; // Mở khóa ngay khi Engine đã xử lý xong và cập nhật State!
        _setGameState(toViewModel(engineState));
        
        // BotRunner phản ứng với State mới
        if (botRunnerRef.current) {
          botRunnerRef.current.onStateUpdate(engineState);
        }
      });
      
      // Notify lần đầu để UI render trạng thái sau draft
      _setGameState(toViewModel(newState));
      
      // Kick BotRunner lần đầu
      if (runner) {
        runner.onStateUpdate(newState);
      }
    } else {
      // Vẫn đang trong DRAFT phase
      _setGameState(toViewModel(newState));
    }
  }, []);

  // Chạy lúc mount
  useEffect(() => {
    initializeGame(playerCount);
    
    return () => {
      if (botRunnerRef.current) {
        botRunnerRef.current.cleanup();
      }
    };
  }, [initializeGame, playerCount]);

  // Context value — dùng object stable, API lấy từ ref
  const apiContextValue = useMemo(() => ({
    // Trả về proxy object thay vì ref trực tiếp
    // Để khi gameAPIRef.current thay đổi (sau draft), các component vẫn lấy được giá trị mới
    getAPI: () => gameAPIRef.current,
    selectDraftHeroes,
    restart: initializeGame
  }), [initializeGame, selectDraftHeroes]);

  return (
    <GameStateContext.Provider value={gameState}>
      <GameAPIContext.Provider value={apiContextValue}>
        {children}
      </GameAPIContext.Provider>
    </GameStateContext.Provider>
  );
}

// Custom hooks để lấy data nhanh
export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (ctx === undefined) throw new Error('useGameState must be used within a GameProvider');
  return ctx;
}

// Biến cờ toàn cục ở cấp độ module để quản lý chung cho mọi lời gọi API
let isSubmittingGlobal = false;

export function useGameAPI() {
  const ctx = useContext(GameAPIContext);
  if (ctx === undefined) throw new Error('useGameAPI must be used within a GameProvider');
  
  const api = ctx.getAPI();
  
  // Dùng useMemo để trả về Proxy reference ổn định
  return useMemo(() => {
    if (!api) return null;
    
    return new Proxy(api, {
      get(target, propKey, receiver) {
        const origMethod = target[propKey];
        if (typeof origMethod === 'function') {
          return (...args) => {
            // QUAN TRỌNG: Tuyệt đối KHÔNG chặn respond()!
            // respond() là phản hồi cho waitingForResponse của StateMachine (Hóa Giải, Né, Đào, Quyết Đấu...).
            // Chặn respond() sẽ khiến StateMachine chờ vĩnh viễn và gây treo game (deadlock).
            if (propKey === 'respond') {
              return origMethod.apply(target, args);
            }

            // Bypass cờ _isAuto (các lệnh từ useEffect tự động gửi)
            const isAuto = args[0] && args[0]._isAuto === true;

            // Chống lỗi click đúp / spam nút cho các hành động chủ động (chơi bài, dùng skill, kết thúc lượt)
            if (!isAuto && isSubmittingGlobal) {
               console.warn(`[Global API Throttle] Đã chặn lệnh gọi trùng lặp tới gameAPI.${String(propKey)}()`);
               return;
            }
            
            if (!isAuto) {
               isSubmittingGlobal = true;
               // Khóa an toàn 250ms, tự động nhả nếu chưa có state update
               setTimeout(() => {
                  isSubmittingGlobal = false;
               }, 250);
            }
            
            return origMethod.apply(target, args);
          };
        }
        return Reflect.get(target, propKey, receiver);
      }
    });
  }, [api]);
}

export function useGameController() {
    const ctx = useContext(GameAPIContext);
    return ctx; // Trả về object có chứa hàm restart + selectDraftHeroes
}
