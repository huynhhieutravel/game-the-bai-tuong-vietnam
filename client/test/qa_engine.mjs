/**
 * QA Test Script — Chạy trực tiếp qua Node.js, không cần browser
 * Test toàn bộ luồng: Draft → Engine Init → Draw → Play Card → End Turn → Bot Turn
 */

// Patch import.meta.url for Node.js ESM compatibility
import { createGameState, selectDraftHeroes } from '../src/engine/index.js';
import { Dispatcher } from '../src/engine/core/Dispatcher.js';
import { GameAPI } from '../src/engine/application/GameAPI.js';
import { BotRunner } from '../src/engine/application/BotRunner.js';
import { toViewModel } from '../src/engine/application/GameViewMapper.js';
import { PHASES } from '../src/data/gameData.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${'='.repeat(60)}\n📋 ${name}\n${'='.repeat(60)}`);
}

// ========== TEST 1: Draft Phase ==========
section('TEST 1: Draft Phase — createGameState');

const initialState = createGameState(4);
assert(initialState !== null, 'createGameState returns non-null');
assert(initialState.phase === PHASES.DRAFT, `Phase is DRAFT (got: ${initialState.phase})`);
assert(initialState.players.length === 4, `4 players created (got: ${initialState.players.length})`);
assert(initialState.players[0].isBot === false, 'Player 0 is NOT bot');
assert(initialState.players[1].isBot === true, 'Player 1 IS bot');
assert(initialState.players[0].draftHeroes?.length > 0, 'Player 0 has draft heroes');
assert(Array.isArray(initialState.players[0].hand), 'Player 0 has hand array');
assert(Array.isArray(initialState.players[0].equipment), 'Player 0 has equipment array');

// ========== TEST 2: toViewModel on Draft State ==========
section('TEST 2: toViewModel on Draft State');

const vm1 = toViewModel(initialState);
assert(vm1 !== null, 'toViewModel returns non-null');
assert(vm1.phase === PHASES.DRAFT, `ViewModel phase is DRAFT (got: ${vm1.phase})`);
assert(vm1.players.length === 4, `ViewModel has 4 players (got: ${vm1.players.length})`);
assert(Array.isArray(vm1.deck), `ViewModel.deck is array (got: ${typeof vm1.deck})`);
assert(Array.isArray(vm1.playedCards), 'ViewModel.playedCards is array');
assert(Array.isArray(vm1.logs), 'ViewModel.logs is array');
assert(vm1.currentPlayerIndex !== undefined, 'ViewModel.currentPlayerIndex exists');
assert(vm1.players[0].hand !== undefined, 'Player 0 hand exists in VM');
assert(vm1.players[0].equipment !== undefined, 'Player 0 equipment exists in VM');

// ========== TEST 3: selectDraftHeroes ==========
section('TEST 3: selectDraftHeroes');

let state = initialState;

// Select for all players
for (const p of state.players) {
  const factions = {};
  p.draftHeroes.forEach(h => {
    if (!factions[h.faction]) factions[h.faction] = [];
    factions[h.faction].push(h);
  });
  let pair = null;
  for (const fac in factions) {
    if (factions[fac].length >= 2) {
      pair = [factions[fac][0], factions[fac][1]];
      break;
    }
  }
  if (!pair && p.draftHeroes.length >= 2) {
    pair = [p.draftHeroes[0], p.draftHeroes[1]];
  }
  assert(pair !== null, `Player ${p.id} found valid pair for draft`);
  state = selectDraftHeroes(state, p.id, pair[0].id, pair[1].id);
}

// After all players draft, should transition to engine state
assert(state.currentPhase !== undefined, `Engine state has currentPhase (got: ${state.currentPhase})`);
assert(state.actionQueue !== undefined, 'Engine state has actionQueue');
assert(state.reactionStack !== undefined, 'Engine state has reactionStack');
assert(state.players[0].hand.length > 0, `Player 0 has cards in hand (got: ${state.players[0].hand.length})`);

// ========== TEST 4: Dispatcher wraps engine state ==========
section('TEST 4: Dispatcher Init');

const dispatcher = new Dispatcher(state);
assert(dispatcher !== null, 'Dispatcher created');
assert(dispatcher.state !== null, 'Dispatcher has state');
assert(typeof dispatcher.subscribe === 'function', 'Dispatcher has subscribe method');
assert(typeof dispatcher.dispatchAction === 'function', 'Dispatcher has dispatchAction method');

// ========== TEST 5: GameAPI ==========
section('TEST 5: GameAPI Init');

const api = new GameAPI(dispatcher);
assert(api !== null, 'GameAPI created');
assert(typeof api.playCard === 'function', 'GameAPI has playCard');
assert(typeof api.respond === 'function', 'GameAPI has respond');
assert(typeof api.drawPhase === 'function', 'GameAPI has drawPhase');
assert(typeof api.endPhase === 'function', 'GameAPI has endPhase');
assert(typeof api.discardCards === 'function', 'GameAPI has discardCards');
assert(typeof api.selectDraftHeroes === 'function', 'GameAPI has selectDraftHeroes');
assert(typeof api.revealHero === 'function', 'GameAPI has revealHero');

// ========== TEST 6: Subscribe and state updates ==========
section('TEST 6: Subscribe');

let lastNotifiedState = null;
dispatcher.subscribe((newState) => {
  lastNotifiedState = newState;
});
assert(dispatcher.listeners.length > 0, 'Subscriber registered');

// ========== TEST 7: toViewModel on engine state ==========
section('TEST 7: toViewModel on Engine State');

const vm2 = toViewModel(dispatcher.getState());
assert(vm2 !== null, 'toViewModel on engine state returns non-null');
assert(vm2.phase !== undefined && vm2.phase !== null, `Phase is defined (got: ${vm2.phase})`);
assert(vm2.players.length === 4, 'Still has 4 players');
assert(vm2.players[0].hand.length > 0, `Player 0 hand has cards (got: ${vm2.players[0].hand.length})`);

// ========== TEST 8: Draw Phase ==========
section('TEST 8: Draw Phase Flow');

const preDrawState = dispatcher.getState();
const currentPhase = preDrawState.currentPhase;
console.log(`  Current phase: ${currentPhase}`);
console.log(`  waitingForResponse: ${JSON.stringify(preDrawState.waitingForResponse?.type)}`);

if (preDrawState.waitingForResponse?.type === 'draw_phase' && preDrawState.waitingForResponse?.targetId === 0) {
  console.log('  → Player 0 is in draw phase, calling drawPhase...');
  api.drawPhase(0);
  
  const postDraw = dispatcher.getState();
  assert(postDraw.players[0].hand.length > preDrawState.players[0].hand.length, 
    `Player drew cards (${preDrawState.players[0].hand.length} → ${postDraw.players[0].hand.length})`);
  assert(lastNotifiedState !== null, 'Subscriber was notified after draw');
  
  // ========== TEST 9: Play Card ==========
  section('TEST 9: Play Card (Chém)');
  
  const postDrawState = dispatcher.getState();
  const me = postDrawState.players[0];
  const slashCard = me.hand.find(c => c.name === 'Chém');
  
  if (slashCard) {
    console.log(`  Found Chém card: ${slashCard.id}`);
    const aliveOpponents = postDrawState.players.filter(p => p.id !== 0 && p.isAlive);
    if (aliveOpponents.length > 0) {
      const target = aliveOpponents[0];
      console.log(`  Target: Player ${target.id}`);
      
      // Check waitingForResponse
      console.log(`  waitingForResponse: ${JSON.stringify(postDrawState.waitingForResponse?.type)}`);
      
      api.playCard(0, slashCard.id, [target.id]);
      
      const postPlay = dispatcher.getState();
      console.log(`  After playCard waitingForResponse: ${JSON.stringify(postPlay.waitingForResponse?.type)}`);
      assert(postPlay.waitingForResponse !== null || postPlay.players[0].hand.length < me.hand.length,
        'Card was played (waiting for response or card removed from hand)');
    } else {
      console.log('  ⚠️ No alive opponents to test Chém');
    }
  } else {
    console.log('  ⚠️ No Chém card in hand, skipping play test');
  }
  
  // ========== TEST 10: End Phase ==========
  section('TEST 10: End Phase');
  
  const preEnd = dispatcher.getState();
  // If we're still waiting for response (e.g. dodge request), skip to auto-respond
  if (preEnd.waitingForResponse) {
    console.log(`  Waiting for: ${preEnd.waitingForResponse.type}`);
    // Auto respond to clear
    if (preEnd.waitingForResponse.type === 'dodge' || preEnd.waitingForResponse.type === 'ask_dodge') {
      api.respond({ askerId: preEnd.waitingForResponse.targetId || 0, doNegate: false });
    }
  }
  
  const preEnd2 = dispatcher.getState();
  if (preEnd2.waitingForResponse?.type === 'play_phase') {
    console.log('  → Calling endPhase(0)...');
    api.endPhase(0);
    const postEnd = dispatcher.getState();
    console.log(`  After endPhase waitingForResponse: ${JSON.stringify(postEnd.waitingForResponse?.type)}`);
    assert(true, 'endPhase executed without crash');
  } else {
    console.log(`  ⚠️ Not in play_phase, current: ${preEnd2.waitingForResponse?.type || 'null'}`);
  }
} else {
  console.log(`  ⚠️ Not in draw_phase for player 0, waiting: ${JSON.stringify(preDrawState.waitingForResponse)}`);
  console.log('  Skipping draw/play/end tests');
}

// ========== TEST 11: toViewModel safety checks ==========
section('TEST 11: toViewModel Safety');

const finalVM = toViewModel(dispatcher.getState());
assert(finalVM.deck !== undefined, 'deck exists');
assert(finalVM.discardPile !== undefined, 'discardPile exists');
assert(finalVM.chainedDamageQueue !== undefined, 'chainedDamageQueue exists');
assert(finalVM.currentPlayerIndex !== undefined, 'currentPlayerIndex exists');
assert(finalVM.turn !== undefined, 'turn exists');

for (let i = 0; i < finalVM.players.length; i++) {
  const p = finalVM.players[i];
  assert(Array.isArray(p.hand), `Player ${i} hand is array`);
  assert(Array.isArray(p.equipment), `Player ${i} equipment is array`);
  assert(Array.isArray(p.judgementArea), `Player ${i} judgementArea is array`);
  assert(p.hp !== undefined, `Player ${i} hp exists`);
  assert(p.maxHp !== undefined, `Player ${i} maxHp exists`);
  assert(p.heroes !== undefined, `Player ${i} heroes exists`);
  assert(p.revealedHeroes !== undefined, `Player ${i} revealedHeroes exists`);
}

// ========== SUMMARY ==========
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);

if (failed > 0) {
  process.exit(1);
}
