import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_BOUNDS,
  DEFAULT_CONTROL_BINDINGS,
  FULL_BOOST_COOLDOWN,
  SMALL_BOOST_COOLDOWN,
  applyReplayFrameToArena,
  buildBlueprintItem,
  calculateMmrDelta,
  calculateSeasonLevel,
  captureReplayFrame,
  claimSeasonTierReward,
  createInitialArenaState,
  evaluateRoundedArenaWall,
  executeRocketTradeIn,
  getRankTierFromMmr,
  openDropCrate,
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

test('Enlarged stadium bounds, solid curved ramp block, and boost pad 20s / 10s respawn cooldowns', () => {
  assert.equal(ARENA_BOUNDS.halfWidth, 58);
  assert.equal(ARENA_BOUNDS.halfLength, 88);
  assert.equal(ARENA_BOUNDS.ceiling, 46);
  assert.equal(ARENA_BOUNDS.cornerRadius, 16);
  assert.equal(FULL_BOOST_COOLDOWN, 20);
  assert.equal(SMALL_BOOST_COOLDOWN, 10);

  // Check rounded corner evaluation and solid curved ramp height
  const cornerCheck = evaluateRoundedArenaWall(56, 86, 1.9, false);
  assert.ok(cornerCheck.penetration > 0, 'Point outside rounded corner arc should report penetration');
  assert.ok(Math.abs(cornerCheck.clampedX) < 56, 'Clamped X should be pulled inward along corner arc');

  const rampCheck = evaluateRoundedArenaWall(ARENA_BOUNDS.halfWidth - 3.0, 0, 1.9, false);
  assert.ok(rampCheck.rampHeightY > 0.2, 'Solid curved wall ramp block should elevate car before vertical wall');
  assert.ok(rampCheck.rampSlopeAngle > 0.1, 'Solid curved wall ramp should have positive slope angle');

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

test('3v3 mode spawns 6 cars (3 Blue, 3 Orange) and Tie 2-2 triggers Golden Goal Overtime', () => {
  const state3v3 = createInitialArenaState('3v3', {
    ...TEST_LOADOUT,
    playlistCategory: 'competitive',
    region: 'EU'
  });
  assert.equal(state3v3.cars.length, 6);
  assert.equal(state3v3.cars.filter((c) => c.team === 'blue').length, 3);
  assert.equal(state3v3.cars.filter((c) => c.team === 'orange').length, 3);

  // Simulate 2 - 2 tie when timer hits 0 -> MUST NOT end match, MUST start Golden Goal Overtime
  state3v3.blueScore = 2;
  state3v3.orangeScore = 2;
  state3v3.timeRemaining = 0.01;
  const evTie = stepArenaPhysics(
    state3v3,
    {
      throttle: 0,
      steer: 0,
      jumpHeld: false,
      jumpJustPressed: false,
      boostHeld: false,
      driftHeld: false
    },
    0.05
  );
  assert.equal(evTie.overtimeStarted, true);
  assert.equal(state3v3.isOvertime, true);
  assert.equal(state3v3.matchEnded, false, '2-2 tie must NOT end match or declare victory');

  // Clear goalResetTimer from overtime kickoff and score Golden Goal into Orange net (+Z)
  state3v3.goalResetTimer = 0;
  state3v3.ball.position = { x: 0, y: 2.5, z: ARENA_BOUNDS.halfLength + 1.5 };
  state3v3.ball.velocity = { x: 0, y: 0, z: 30 };
  state3v3.ball.lastTouchedBy = 'TestPilot';
  state3v3.ball.lastTouchTeam = 'blue';

  const evGolden = stepArenaPhysics(
    state3v3,
    {
      throttle: 0,
      steer: 0,
      jumpHeld: false,
      jumpJustPressed: false,
      boostHeld: false,
      driftHeld: false
    },
    0.05
  );
  assert.equal(evGolden.goldenGoalWinner, 'blue');
  assert.equal(state3v3.blueScore, 3);
  assert.equal(state3v3.matchEnded, true, 'Golden goal in overtime immediately finishes the match');
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

test('Driving into solid curved ramp climbs smoothly up the wall, slides down when idle, and ceiling clings briefly (~1.4s) then drops', () => {
  const state = createInitialArenaState('practice', {
    ...TEST_LOADOUT,
    practiceBotEnabled: false
  });
  const car = state.cars[0];
  car.position = { x: ARENA_BOUNDS.halfWidth - 3.5, y: 0, z: 0 };
  car.yaw = Math.PI / 2;
  car.velocity = { x: 28, y: 0, z: 0 };

  for (let i = 0; i < 16; i++) {
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
  assert.ok(car.position.y > 5, `Expected car to climb up wall via curved ramp, got y=${car.position.y}`);

  // Wait on the wall with zero throttle/boost -> should slide down under gravity
  car.velocity = { x: 0, y: 0, z: 0 };
  const heightBeforeWait = car.position.y;
  for (let i = 0; i < 45; i++) {
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
    `Expected car to slide down wall (was ${heightBeforeWait}, now ${car.position.y})`
  );

  // Test ceiling cling (~0.8s stays on ceiling, >1.45s detaches and drops)
  car.position = { x: 0, y: ARENA_BOUNDS.ceiling - 1.1, z: 0 };
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

  // After 0.6s, still on ceiling
  for (let i = 0; i < 15; i++) {
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

  // After another 1.2s (total > 1.8s), car detaches and falls from ceiling
  for (let i = 0; i < 35; i++) {
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

test('Blueprints crafting, Rocket League automatic Trade-In, and Drop Crate opening', () => {
  // 1. Blueprint to normal item conversion
  const bpRes = buildBlueprintItem(
    'bp_car_dominus_gt',
    500,
    ['car_octane_pro'],
    ['bp_car_dominus_gt']
  );
  assert.equal(bpRes.ok, true);
  assert.equal(bpRes.newCredits, 200);
  assert.ok(bpRes.newOwnedItemIds.includes('car_dominus_gt'));
  assert.equal(bpRes.newOwnedBlueprintIds.length, 0);

  // 2. Automatic random Trade-In
  const tradeRes = executeRocketTradeIn(
    ['body_crimson_pulse', 'finish_titanium'],
    ['car_octane_pro', 'body_crimson_pulse', 'finish_titanium'],
    [],
    'items'
  );
  assert.equal(tradeRes.ok, true);
  assert.ok(tradeRes.rewardedItem !== undefined);

  // 3. Open Drop Crate
  const crateRes = openDropCrate(2, ['car_octane_pro'], [], 100);
  assert.equal(crateRes.ok, true);
  assert.equal(crateRes.newCrates, 1);
  assert.equal(crateRes.newCredits, 175);
  assert.ok(crateRes.dropLabel.includes('KUTUDAN ÇIKTI'));
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
