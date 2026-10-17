import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_BOUNDS,
  DEFAULT_CONTROL_BINDINGS,
  FULL_BOOST_COOLDOWN,
  SMALL_BOOST_COOLDOWN,
  applyReplayFrameToArena,
  calculateMmrDelta,
  calculateSeasonLevel,
  captureReplayFrame,
  claimSeasonTierReward,
  createInitialArenaState,
  evaluateRoundedArenaWall,
  getRankTierFromMmr,
  purchaseMarketItem,
  stepArenaPhysics
} from './rules.ts';

const TEST_LOADOUT = {
  displayName: 'TestPilot',
  bodyColor: '#06B6D4',
  finish: 'anodized',
  boostColor: '#F59E0B',
  wheelStyle: 'aero_apex',
  platform: 'PC_STEAM_EPIC' as const
};

test('Enlarged stadium bounds, rounded corners, and boost pad 20s / 10s respawn cooldowns', () => {
  assert.equal(ARENA_BOUNDS.halfWidth, 58);
  assert.equal(ARENA_BOUNDS.halfLength, 88);
  assert.equal(ARENA_BOUNDS.ceiling, 46);
  assert.equal(ARENA_BOUNDS.cornerRadius, 16);
  assert.equal(FULL_BOOST_COOLDOWN, 20);
  assert.equal(SMALL_BOOST_COOLDOWN, 10);

  // Check rounded corner evaluation
  const cornerCheck = evaluateRoundedArenaWall(56, 86, 1.9, false);
  assert.ok(cornerCheck.penetration > 0, 'Point outside rounded corner arc should report penetration');
  assert.ok(Math.abs(cornerCheck.clampedX) < 56, 'Clamped X should be pulled inward along corner arc');

  const state = createInitialArenaState('practice', TEST_LOADOUT);
  const fullPad = state.boostPads.find((p) => p.isFull)!;
  const smallPad = state.boostPads.find((p) => !p.isFull)!;

  state.cars[0].boost = 10;
  state.cars[0].position = { x: fullPad.x, y: 0, z: fullPad.z };
  stepArenaPhysics(
    state,
    {
      throttle: 0,
      steer: 0,
      jumpHeld: false,
      jumpJustPressed: false,
      boostHeld: false,
      driftHeld: false
    },
    0.016
  );
  assert.equal(fullPad.active, false);
  assert.ok(Math.abs(fullPad.cooldown - 20) < 0.1);

  state.cars[0].boost = 20;
  state.cars[0].position = { x: smallPad.x, y: 0, z: smallPad.z };
  stepArenaPhysics(
    state,
    {
      throttle: 0,
      steer: 0,
      jumpHeld: false,
      jumpJustPressed: false,
      boostHeld: false,
      driftHeld: false
    },
    0.016
  );
  assert.equal(smallPad.active, false);
  assert.ok(Math.abs(smallPad.cooldown - 10) < 0.1);
});

test('Default control bindings match WASD + Right-Click Jump + Left-Click Boost + Shift Drift', () => {
  assert.equal(DEFAULT_CONTROL_BINDINGS.forward, 'KeyW');
  assert.equal(DEFAULT_CONTROL_BINDINGS.backward, 'KeyS');
  assert.equal(DEFAULT_CONTROL_BINDINGS.left, 'KeyA');
  assert.equal(DEFAULT_CONTROL_BINDINGS.right, 'KeyD');
  assert.equal(DEFAULT_CONTROL_BINDINGS.jump, 'MouseRight');
  assert.equal(DEFAULT_CONTROL_BINDINGS.boost, 'MouseLeft');
  assert.equal(DEFAULT_CONTROL_BINDINGS.drift, 'ShiftLeft');
});

test('Directional dodge flips: Backflip (S), Left Flip (A), Right Flip (D), Front Flip (W)', () => {
  const directions = [
    { throttle: -1, steer: 0, expected: 'back' },
    { throttle: 0, steer: 1, expected: 'left' },
    { throttle: 0, steer: -1, expected: 'right' },
    { throttle: 1, steer: 0, expected: 'front' }
  ] as const;

  for (const dir of directions) {
    const state = createInitialArenaState('practice', {
      ...TEST_LOADOUT,
      practiceBotEnabled: false
    });
    const car = state.cars[0];
    stepArenaPhysics(
      state,
      {
        throttle: 0,
        steer: 0,
        jumpHeld: true,
        jumpJustPressed: true,
        boostHeld: false,
        driftHeld: false
      },
      0.02
    );
    assert.equal(car.isGrounded, false);

    const ev = stepArenaPhysics(
      state,
      {
        throttle: dir.throttle,
        steer: dir.steer,
        jumpHeld: true,
        jumpJustPressed: true,
        boostHeld: false,
        driftHeld: false
      },
      0.02
    );
    assert.equal(ev.dodged, true);
    assert.equal(ev.dodgeType, dir.expected);
  }
});

test('Driving into wall climbs up the wall, waiting 2-3s slides down, and ceiling clings for 1-2s then drops', () => {
  const state = createInitialArenaState('practice', {
    ...TEST_LOADOUT,
    practiceBotEnabled: false
  });
  const car = state.cars[0];
  // Position car near right side wall facing +X
  car.position = { x: ARENA_BOUNDS.halfWidth - 3.5, y: 0, z: 0 };
  car.yaw = Math.PI / 2;
  car.velocity = { x: 26, y: 0, z: 0 };

  for (let i = 0; i < 15; i++) {
    stepArenaPhysics(
      state,
      {
        throttle: 1,
        steer: 0,
        jumpHeld: false,
        jumpJustPressed: false,
        boostHeld: true,
        driftHeld: false
      },
      0.04
    );
  }

  assert.equal(car.surfaceState, 'wall');
  assert.ok(car.position.y > 5, `Expected car to climb up wall, got y=${car.position.y}`);

  // Now wait on the wall with zero throttle/boost for 2.6 seconds -> should slowly slide down
  car.velocity = { x: 0, y: 0, z: 0 };
  const heightBeforeWait = car.position.y;
  for (let i = 0; i < 65; i++) {
    stepArenaPhysics(
      state,
      {
        throttle: 0,
        steer: 0,
        jumpHeld: false,
        jumpJustPressed: false,
        boostHeld: false,
        driftHeld: false
      },
      0.04
    );
  }
  assert.ok(
    car.position.y < heightBeforeWait - 1.5,
    `Expected car to slide down wall after waiting 2.6s (was ${heightBeforeWait}, now ${car.position.y})`
  );

  // Test ceiling cling (1-2s) and then drop
  car.position = { x: 0, y: ARENA_BOUNDS.ceiling - 1.2, z: 0 };
  car.velocity = { x: 0, y: 5, z: 10 };
  stepArenaPhysics(
    state,
    {
      throttle: 1,
      steer: 0,
      jumpHeld: false,
      jumpJustPressed: false,
      boostHeld: false,
      driftHeld: false
    },
    0.04
  );
  assert.equal(car.surfaceState, 'ceiling');

  // After 1.0s of clinging on ceiling, still on ceiling
  for (let i = 0; i < 20; i++) {
    stepArenaPhysics(
      state,
      {
        throttle: 1,
        steer: 0,
        jumpHeld: false,
        jumpJustPressed: false,
        boostHeld: false,
        driftHeld: false
      },
      0.04
    );
  }
  assert.equal(car.surfaceState, 'ceiling');

  // After another 1.5s (total > 2.0s), car detaches and falls from ceiling
  for (let i = 0; i < 40; i++) {
    stepArenaPhysics(
      state,
      {
        throttle: 0,
        steer: 0,
        jumpHeld: false,
        jumpJustPressed: false,
        boostHeld: false,
        driftHeld: false
      },
      0.04
    );
  }
  assert.ok(
    car.position.y < ARENA_BOUNDS.ceiling - 3,
    `Expected car to fall from ceiling after cling timer expires, got y=${car.position.y}`
  );
});

test('Practice mode supports optional bot and bot difficulty levels', () => {
  const soloPractice = createInitialArenaState('practice', {
    ...TEST_LOADOUT,
    practiceBotEnabled: false,
    botDifficulty: 'rookie'
  });
  assert.equal(soloPractice.cars.length, 1);

  const botPractice = createInitialArenaState('practice', {
    ...TEST_LOADOUT,
    practiceBotEnabled: true,
    botDifficulty: 'unfair'
  });
  assert.equal(botPractice.cars.length, 2);
  assert.equal(botPractice.botDifficulty, 'unfair');
});

test('Supersonic turbo collision demolishes opponent car and respawns after 3s', () => {
  const state = createInitialArenaState('1v1', TEST_LOADOUT);
  const player = state.cars[0];
  const bot = state.cars[1];

  player.position = { x: 0, y: 0, z: -2 };
  player.velocity = { x: 0, y: 0, z: 46 };
  player.supersonic = true;

  bot.position = { x: 0, y: 0, z: 0 };
  bot.velocity = { x: 0, y: 0, z: 0 };

  const ev = stepArenaPhysics(
    state,
    {
      throttle: 1,
      steer: 0,
      jumpHeld: false,
      jumpJustPressed: false,
      boostHeld: true,
      driftHeld: false
    },
    0.04
  );

  assert.ok(ev.carDemolished !== null);
  assert.equal(bot.demolishedTimer, 3.0);
  assert.equal(player.demolitions, 1);
});

test('Replay frame capture and restoration', () => {
  const state = createInitialArenaState('1v1', TEST_LOADOUT);
  state.blueScore = 3;
  state.orangeScore = 2;
  state.ball.position = { x: 12, y: 18, z: -24 };
  state.cars[0].position = { x: -8, y: 14, z: -20 };
  state.cars[0].dodgeType = 'left';

  const frame = captureReplayFrame(state, 42.5, 'GOL');
  const targetState = createInitialArenaState('1v1', TEST_LOADOUT);
  applyReplayFrameToArena(targetState, frame);
  assert.equal(targetState.blueScore, 3);
  assert.equal(targetState.ball.position.y, 18);
  assert.equal(targetState.cars[0].dodgeType, 'left');
});

test('Ranked MMR, Marketplace, and Season Rewards pure logic', () => {
  const winDelta = calculateMmrDelta(1000, 1000, 3, 1);
  assert.ok(winDelta > 0);
  const tier = getRankTierFromMmr(0);
  assert.equal(tier.tierName, 'Bronz I');
  const lvl = calculateSeasonLevel(1200);
  assert.equal(lvl.level, 3);
  const buyRes = purchaseMarketItem('body_crimson_pulse', 500, ['body_octane_cyan']);
  assert.equal(buyRes.ok, true);
  const claimRes = claimSeasonTierReward(1, 0, 100, ['body_octane_cyan'], []);
  assert.equal(claimRes.ok, true);
});
