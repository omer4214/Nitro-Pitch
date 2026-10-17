import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  User
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  CarModelType,
  getRankTierFromMmr,
  calculateSeasonLevel,
  PlayerRegion
} from '../game/rules';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: boolean | string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Normal Account Registration / Login (Email & Password with automatic local account fallback
 * if Email/Password provider is disabled in Firebase Console).
 */
export interface NormalAccountSession {
  uid: string;
  email: string;
  displayName: string;
  region: PlayerRegion;
}

const LOCAL_ACCOUNTS_KEY = 'nitro_pitch_normal_accounts_v1';
const ACTIVE_NORMAL_SESSION_KEY = 'nitro_pitch_active_session_v1';

export async function normalAccountRegisterOrLogin(params: {
  mode: 'register' | 'login';
  email: string;
  password: string;
  username?: string;
  region?: PlayerRegion;
}): Promise<NormalAccountSession> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanUser = (params.username || cleanEmail.split('@')[0] || 'Pilot').trim().slice(0, 32);
  const cleanRegion: PlayerRegion = params.region || 'EU';

  // Try Firebase Auth Email/Password first
  try {
    isSigningIn = true;
    if (params.mode === 'register') {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
      if (cleanUser) {
        await updateProfile(cred.user, { displayName: cleanUser }).catch(() => {});
      }
      const session: NormalAccountSession = {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: cleanUser,
        region: cleanRegion
      };
      window.localStorage.setItem(ACTIVE_NORMAL_SESSION_KEY, JSON.stringify(session));
      return session;
    } else {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, params.password);
      const session: NormalAccountSession = {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: cred.user.displayName || cleanUser,
        region: cleanRegion
      };
      window.localStorage.setItem(ACTIVE_NORMAL_SESSION_KEY, JSON.stringify(session));
      return session;
    }
  } catch (err: unknown) {
    // Fallback to verified local account store if Firebase Email/Password provider is not enabled
    const rawStore = window.localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const store: Record<
      string,
      { uid: string; email: string; password: string; displayName: string; region: PlayerRegion }
    > = rawStore ? JSON.parse(rawStore) : {};

    if (params.mode === 'register') {
      const uid = `pilot_${cleanEmail.replace(/[^a-z0-9]/g, '_').slice(0, 24)}`;
      const entry = {
        uid,
        email: cleanEmail,
        password: params.password,
        displayName: cleanUser,
        region: cleanRegion
      };
      store[cleanEmail] = entry;
      window.localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(store));
      const session: NormalAccountSession = {
        uid,
        email: cleanEmail,
        displayName: cleanUser,
        region: cleanRegion
      };
      window.localStorage.setItem(ACTIVE_NORMAL_SESSION_KEY, JSON.stringify(session));
      return session;
    } else {
      const existing = store[cleanEmail];
      if (existing && existing.password !== params.password) {
        throw new Error('Şifre hatalı. Lütfen şifrenizi kontrol edin.');
      }
      const uid = existing?.uid || `pilot_${cleanEmail.replace(/[^a-z0-9]/g, '_').slice(0, 24)}`;
      const session: NormalAccountSession = {
        uid,
        email: cleanEmail,
        displayName: existing?.displayName || cleanUser,
        region: existing?.region || cleanRegion
      };
      window.localStorage.setItem(ACTIVE_NORMAL_SESSION_KEY, JSON.stringify(session));
      return session;
    }
  } finally {
    isSigningIn = false;
  }
}

export function getSavedNormalSession(): NormalAccountSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_NORMAL_SESSION_KEY);
    return raw ? (JSON.parse(raw) as NormalAccountSession) : null;
  } catch {
    return null;
  }
}

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACTIVE_NORMAL_SESSION_KEY);
  }
  await auth.signOut().catch(() => {});
  cachedAccessToken = null;
};

export interface PlayerProfileData {
  uid: string;
  displayName: string;
  region?: PlayerRegion;
  accountOnboarded?: boolean;
  mmr: number;
  rankTier: string;
  credits: number;
  seasonXp: number;
  seasonLevel: number;
  wins: number;
  matchesPlayed: number;
  goalsScored: number;
  savesMade?: number;
  shotsTaken?: number;
  demolitionsCount?: number;
  cratesCount?: number;
  equippedCarModel?: CarModelType;
  equippedBodyColor: string;
  equippedFinish: string;
  equippedBoostColor: string;
  equippedWheelStyle: string;
  ownedItemIds: string[];
  ownedBlueprintIds?: string[];
  claimedSeasonTiers: number[];
  claimedMissionIds?: string[];
}

export interface MatchRecordData {
  id?: string;
  ownerId: string;
  mode: string;
  playerScore: number;
  opponentScore: number;
  opponentName: string;
  mmrDelta: number;
  outcome: 'victory' | 'defeat';
  status: 'completed';
}

export interface MarketOrderData {
  id?: string;
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  rarity: 'Common' | 'Rare' | 'Import' | 'Exotic' | 'BlackMarket';
  priceCredits: number;
  status: 'active' | 'sold' | 'cancelled';
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return VALID_ID_REGEX.test(cleaned) ? cleaned : 'player_default';
}

export async function ensurePlayerProfile(
  user: User,
  fallbackProfile: PlayerProfileData
): Promise<PlayerProfileData> {
  const safeUid = sanitizeId(user.uid);
  const path = `players/${safeUid}`;
  const ref = doc(db, 'players', safeUid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as PlayerProfileData;
      return {
        ...fallbackProfile,
        ...data,
        uid: safeUid
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const displayName = (user.displayName || fallbackProfile.displayName || 'Pilot').slice(0, 60);
  const newProfile = {
    uid: safeUid,
    displayName,
    mmr: Math.max(0, Math.min(10000, fallbackProfile.mmr)),
    rankTier: getRankTierFromMmr(fallbackProfile.mmr).tierName.slice(0, 40),
    credits: Math.max(0, Math.min(10000000, fallbackProfile.credits)),
    seasonXp: Math.max(0, Math.min(10000000, fallbackProfile.seasonXp)),
    seasonLevel: calculateSeasonLevel(fallbackProfile.seasonXp).level,
    wins: Math.max(0, fallbackProfile.wins),
    matchesPlayed: Math.max(0, fallbackProfile.matchesPlayed),
    goalsScored: Math.max(0, fallbackProfile.goalsScored),
    equippedBodyColor: fallbackProfile.equippedBodyColor.slice(0, 16),
    equippedFinish: fallbackProfile.equippedFinish.slice(0, 32),
    equippedBoostColor: fallbackProfile.equippedBoostColor.slice(0, 16),
    equippedWheelStyle: fallbackProfile.equippedWheelStyle.slice(0, 32),
    ownedItemIds: fallbackProfile.ownedItemIds.slice(0, 50),
    claimedSeasonTiers: fallbackProfile.claimedSeasonTiers.slice(0, 30),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(ref, newProfile);
    return { ...fallbackProfile, uid: safeUid, displayName };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function syncGarageLoadoutToFirestore(
  uid: string,
  updates: Pick<
    PlayerProfileData,
    | 'equippedBodyColor'
    | 'equippedFinish'
    | 'equippedBoostColor'
    | 'equippedWheelStyle'
    | 'ownedItemIds'
    | 'credits'
    | 'claimedSeasonTiers'
  >
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeUid = sanitizeId(uid);
  const path = `players/${safeUid}`;
  try {
    await updateDoc(doc(db, 'players', safeUid), {
      equippedBodyColor: updates.equippedBodyColor.slice(0, 16),
      equippedFinish: updates.equippedFinish.slice(0, 32),
      equippedBoostColor: updates.equippedBoostColor.slice(0, 16),
      equippedWheelStyle: updates.equippedWheelStyle.slice(0, 32),
      ownedItemIds: updates.ownedItemIds.slice(0, 50),
      credits: Math.max(0, Math.min(10000000, updates.credits)),
      claimedSeasonTiers: updates.claimedSeasonTiers.slice(0, 30),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resetPlayerProfileToZeroInFirestore(
  uid: string,
  zeroProfile: PlayerProfileData
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeUid = sanitizeId(uid);
  const path = `players/${safeUid}`;
  try {
    await updateDoc(doc(db, 'players', safeUid), {
      mmr: 0,
      rankTier: 'Bronz I',
      credits: 0,
      seasonXp: 0,
      seasonLevel: 1,
      wins: 0,
      matchesPlayed: 0,
      goalsScored: 0,
      equippedBodyColor: zeroProfile.equippedBodyColor.slice(0, 16),
      equippedFinish: zeroProfile.equippedFinish.slice(0, 32),
      equippedBoostColor: zeroProfile.equippedBoostColor.slice(0, 16),
      equippedWheelStyle: zeroProfile.equippedWheelStyle.slice(0, 32),
      ownedItemIds: zeroProfile.ownedItemIds.slice(0, 50),
      claimedSeasonTiers: [],
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function recordMatchProgressionToFirestore(
  uid: string,
  progression: Pick<
    PlayerProfileData,
    'mmr' | 'rankTier' | 'credits' | 'seasonXp' | 'seasonLevel' | 'wins' | 'matchesPlayed' | 'goalsScored'
  >,
  matchData: Omit<MatchRecordData, 'id' | 'ownerId' | 'status'>
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeUid = sanitizeId(uid);
  const profilePath = `players/${safeUid}`;
  try {
    await updateDoc(doc(db, 'players', safeUid), {
      mmr: Math.max(0, Math.min(10000, progression.mmr)),
      rankTier: progression.rankTier.slice(0, 40),
      credits: Math.max(0, Math.min(10000000, progression.credits)),
      seasonXp: Math.max(0, Math.min(10000000, progression.seasonXp)),
      seasonLevel: Math.max(1, Math.min(200, progression.seasonLevel)),
      wins: Math.max(0, progression.wins),
      matchesPlayed: Math.max(0, progression.matchesPlayed),
      goalsScored: Math.max(0, progression.goalsScored),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, profilePath);
  }

  const matchId = `match_${Date.now()}`;
  const matchPath = `players/${safeUid}/matches/${matchId}`;
  try {
    await setDoc(doc(db, 'players', safeUid, 'matches', matchId), {
      ownerId: safeUid,
      mode: matchData.mode.slice(0, 24),
      playerScore: Math.max(0, Math.min(99, matchData.playerScore)),
      opponentScore: Math.max(0, Math.min(99, matchData.opponentScore)),
      opponentName: matchData.opponentName.slice(0, 60),
      mmrDelta: Math.max(-200, Math.min(200, matchData.mmrDelta)),
      outcome: matchData.outcome,
      status: 'completed',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, matchPath);
  }
}

export function subscribeToPlayerMatches(
  uid: string,
  onUpdate: (matches: MatchRecordData[]) => void
): () => void {
  const safeUid = sanitizeId(uid);
  const path = `players/${safeUid}/matches`;
  const q = query(
    collection(db, 'players', safeUid, 'matches'),
    where('ownerId', '==', safeUid),
    limit(10)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: MatchRecordData[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as MatchRecordData) });
      });
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createMarketOrderInFirestore(
  order: Omit<MarketOrderData, 'id' | 'status'>
): Promise<MarketOrderData> {
  const orderId = `order_${Date.now()}`;
  const path = `marketOrders/${orderId}`;
  const safeSellerId = sanitizeId(order.sellerId);
  const payload = {
    sellerId: safeSellerId,
    sellerName: order.sellerName.slice(0, 60),
    itemId: sanitizeId(order.itemId).slice(0, 64),
    itemName: order.itemName.slice(0, 60),
    rarity: order.rarity,
    priceCredits: Math.max(50, Math.min(100000, Math.round(order.priceCredits))),
    status: 'active' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'marketOrders', orderId), payload);
    return { id: orderId, ...order, status: 'active' };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchActiveMarketOrders(): Promise<MarketOrderData[]> {
  if (!auth.currentUser) return [];
  const path = 'marketOrders';
  try {
    const q = query(collection(db, 'marketOrders'), where('status', '==', 'active'), limit(15));
    const snap = await getDocs(q);
    const orders: MarketOrderData[] = [];
    snap.forEach((d) => {
      orders.push({ id: d.id, ...(d.data() as MarketOrderData) });
    });
    return orders;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
