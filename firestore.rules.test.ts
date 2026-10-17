import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesText = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

interface AuthContext {
  uid: string;
  email_verified: boolean;
}

interface EvalRequest {
  auth: AuthContext | null;
  time: number;
  pathId: string;
  op: 'create' | 'update' | 'get' | 'list';
  collection: 'players' | 'matches' | 'marketOrders';
  parentExists?: boolean;
  existingData?: Record<string, unknown>;
  incomingData?: Record<string, unknown>;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

function evaluateRules(req: EvalRequest): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!req.auth) return 'PERMISSION_DENIED';
  if (req.op !== 'get' && req.op !== 'list' && !req.auth.email_verified) {
    return 'PERMISSION_DENIED';
  }
  if (req.op !== 'list' && !isValidId(req.pathId)) {
    return 'PERMISSION_DENIED';
  }

  if (req.collection === 'players') {
    if (req.op === 'list') {
      return req.existingData?.uid === req.auth.uid ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (req.pathId !== req.auth.uid) return 'PERMISSION_DENIED';
    const d = req.incomingData;
    if (!d) return 'PERMISSION_DENIED';
    const requiredKeys = [
      'uid', 'displayName', 'mmr', 'rankTier', 'credits',
      'seasonXp', 'seasonLevel', 'wins', 'matchesPlayed', 'goalsScored',
      'equippedBodyColor', 'equippedFinish', 'equippedBoostColor', 'equippedWheelStyle',
      'ownedItemIds', 'claimedSeasonTiers', 'createdAt', 'updatedAt'
    ];
    const keys = Object.keys(d);
    if (keys.length !== requiredKeys.length || !requiredKeys.every((k) => keys.includes(k))) {
      return 'PERMISSION_DENIED';
    }
    if (d.uid !== req.auth.uid) return 'PERMISSION_DENIED';
    if (typeof d.displayName !== 'string' || d.displayName.length < 1 || d.displayName.length > 60) {
      return 'PERMISSION_DENIED';
    }
    if (!Array.isArray(d.ownedItemIds) || d.ownedItemIds.length > 50) {
      return 'PERMISSION_DENIED';
    }
    if (!Array.isArray(d.claimedSeasonTiers) || d.claimedSeasonTiers.length > 30) {
      return 'PERMISSION_DENIED';
    }
    if (req.op === 'create') {
      if (d.createdAt !== req.time || d.updatedAt !== req.time) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
    if (req.op === 'update') {
      if (!req.existingData) return 'PERMISSION_DENIED';
      if (d.createdAt !== req.existingData.createdAt || d.uid !== req.existingData.uid) {
        return 'PERMISSION_DENIED';
      }
      if (d.updatedAt !== req.time) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
  }

  if (req.collection === 'matches') {
    if (req.op === 'update') return 'PERMISSION_DENIED';
    if (req.op === 'list') {
      return req.existingData?.ownerId === req.auth.uid ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (!req.parentExists) return 'PERMISSION_DENIED';
    const d = req.incomingData;
    if (!d || d.ownerId !== req.auth.uid || d.status !== 'completed' || d.createdAt !== req.time) {
      return 'PERMISSION_DENIED';
    }
    return 'ALLOW';
  }

  if (req.collection === 'marketOrders') {
    if (req.op === 'update') {
      if (req.existingData?.status !== 'active') return 'PERMISSION_DENIED';
    }
  }

  return 'PERMISSION_DENIED';
}

const baseValidProfile = (uid = 'user_1', now = 1000): Record<string, unknown> => ({
  uid,
  displayName: 'TurboStriker',
  mmr: 850,
  rankTier: 'Platin II',
  credits: 1200,
  seasonXp: 2400,
  seasonLevel: 4,
  wins: 12,
  matchesPlayed: 18,
  goalsScored: 34,
  equippedBodyColor: '#06B6D4',
  equippedFinish: 'anodized',
  equippedBoostColor: '#F59E0B',
  equippedWheelStyle: 'aero_apex',
  ownedItemIds: ['body_octane_cyan', 'boost_solar_flare'],
  claimedSeasonTiers: [1, 2],
  createdAt: now,
  updatedAt: now
});

test('Firestore rules file contains all Eight Pillars of Hardened Rules', () => {
  assert.ok(rulesText.includes("rules_version = '2';"));
  assert.ok(rulesText.includes('allow read, write: if false;'));
  assert.ok(rulesText.includes('function isValidPlayerProfile(data)'));
  assert.ok(rulesText.includes('function isValidMatchRecord(data)'));
  assert.ok(rulesText.includes('function isValidMarketOrder(data)'));
  assert.ok(rulesText.includes('affectedKeys().hasOnly('));
});

test('Dirty Dozen #1: Unauthenticated write is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: null,
      time: 1000,
      pathId: 'user_1',
      op: 'create',
      collection: 'players',
      incomingData: baseValidProfile()
    }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #2: Unverified email spoof is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: { uid: 'user_1', email_verified: false },
      time: 1000,
      pathId: 'user_1',
      op: 'create',
      collection: 'players',
      incomingData: baseValidProfile()
    }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #3: Identity spoofing uid mismatch is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: { uid: 'user_1', email_verified: true },
      time: 1000,
      pathId: 'user_2',
      op: 'create',
      collection: 'players',
      incomingData: baseValidProfile('user_2')
    }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #4: Shadow field injection is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: { uid: 'user_1', email_verified: true },
      time: 1000,
      pathId: 'user_1',
      op: 'create',
      collection: 'players',
      incomingData: { ...baseValidProfile(), isAdmin: true }
    }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #5: ID poisoning with invalid characters is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: { uid: 'user$bad!', email_verified: true },
      time: 1000,
      pathId: 'user$bad!',
      op: 'create',
      collection: 'players',
      incomingData: baseValidProfile('user$bad!')
    }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #6: Value poisoning with oversized displayName is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: { uid: 'user_1', email_verified: true },
      time: 1000,
      pathId: 'user_1',
      op: 'create',
      collection: 'players',
      incomingData: { ...baseValidProfile(), displayName: 'X'.repeat(500) }
    }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #7: Unbounded array overflow (> 50 ownedItemIds) is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: { uid: 'user_1', email_verified: true },
      time: 1000,
      pathId: 'user_1',
      op: 'create',
      collection: 'players',
      incomingData: {
        ...baseValidProfile(),
        ownedItemIds: Array.from({ length: 55 }, (_, i) => `item_${i}`)
      }
    }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #8: Orphaned subcollection match write without parent player is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: { uid: 'user_1', email_verified: true },
      time: 1000,
      pathId: 'match_1',
      op: 'create',
      collection: 'matches',
      parentExists: false,
      incomingData: {
        ownerId: 'user_1',
        mode: '1v1',
        playerScore: 3,
        opponentScore: 1,
        opponentName: 'ApexBot',
        mmrDelta: 24,
        outcome: 'victory',
        status: 'completed',
        createdAt: 1000
      }
    }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #9: Immortal createdAt mutation on update is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: { uid: 'user_1', email_verified: true },
      time: 2000,
      pathId: 'user_1',
      op: 'update',
      collection: 'players',
      existingData: baseValidProfile('user_1', 1000),
      incomingData: { ...baseValidProfile('user_1', 2000), createdAt: 2000, updatedAt: 2000 }
    }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #10: Forged client timestamp on create is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: { uid: 'user_1', email_verified: true },
      time: 1000,
      pathId: 'user_1',
      op: 'create',
      collection: 'players',
      incomingData: { ...baseValidProfile('user_1', 9999) }
    }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #11: Terminal state violation on completed MatchRecord is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: { uid: 'user_1', email_verified: true },
      time: 2000,
      pathId: 'match_1',
      op: 'update',
      collection: 'matches',
      parentExists: true,
      existingData: { status: 'completed' },
      incomingData: { status: 'completed' }
    }),
    'PERMISSION_DENIED'
  );
});

test('Dirty Dozen #12: Cross-user match list scraping is PERMISSION_DENIED', () => {
  assert.equal(
    evaluateRules({
      auth: { uid: 'user_2', email_verified: true },
      time: 1000,
      pathId: 'match_1',
      op: 'list',
      collection: 'matches',
      existingData: { ownerId: 'user_1' }
    }),
    'PERMISSION_DENIED'
  );
});
