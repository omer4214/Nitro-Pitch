# Security Specification (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth

1. **Master Source of Truth (`players/{playerId}`)**:
   - Every player profile document ID `{playerId}` MUST strictly match `request.auth.uid` and `isValidId(playerId)`.
   - All writes require a verified authenticated user (`request.auth != null && request.auth.token.email_verified == true`).
   - Zero PII (`email`, `phone`, `address`) is stored in `players/{playerId}` so leaderboard queries stay safe while profile writes remain strictly owner-locked.
   - All arrays (`ownedItemIds`, `claimedSeasonTiers`) are bounded (`size() <= 50` and `size() <= 30`) and element-type guarded.
   - `createdAt` is immortal (`incoming().createdAt == existing().createdAt` on update) and validated against `request.time`.

2. **Relational Subcollection Sync (`players/{playerId}/matches/{matchId}`)**:
   - A `MatchRecord` cannot exist without its parent `players/{playerId}` document existing (`exists(/databases/$(database)/documents/players/$(playerId))`).
   - `ownerId` MUST equal `request.auth.uid` and `playerId`.
   - Terminal State Locking: `MatchRecord` is created with `status == 'completed'` and cannot be updated after creation (`allow update: if false;`).

3. **Marketplace Orders (`marketOrders/{orderId}`)**:
   - `sellerId` MUST equal `request.auth.uid` on creation and must reference an existing `players/$(incoming().sellerId)` profile.
   - Terminal State Locking: Once `existing().status` is `'sold'` or `'cancelled'`, no further updates are permitted.
   - Action-Based Updates: Only specific state transitions (`status`, `updatedAt`) are allowed via `affectedKeys().hasOnly(['status', 'updatedAt'])`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Unauthenticated Write)**: Creating `/players/user_1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Email Spoof)**: Creating `/players/user_1` where `auth.token.email_verified == false` -> `PERMISSION_DENIED`.
3. **Payload 3 (Identity Spoofing on Profile)**: User `user_1` creating `/players/user_2` or setting `uid: 'user_2'` -> `PERMISSION_DENIED`.
4. **Payload 4 (Shadow Field Injection)**: Updating `/players/user_1` with an undeclared field `isAdmin: true` -> `PERMISSION_DENIED`.
5. **Payload 5 (ID Poisoning / Resource Exhaustion)**: Creating a document with an invalid ID containing special characters or `> 128` chars -> `PERMISSION_DENIED`.
6. **Payload 6 (Value Poisoning on String Size)**: Setting `displayName` to a 5,000-character string (`> 60`) -> `PERMISSION_DENIED`.
7. **Payload 7 (Unbounded Array Overflow)**: Passing 60 items in `ownedItemIds` (`> 50` limit) -> `PERMISSION_DENIED`.
8. **Payload 8 (Orphaned Subcollection Write)**: Creating `/players/user_1/matches/match_1` when `/players/user_1` does not exist -> `PERMISSION_DENIED`.
9. **Payload 9 (Immortal Field Mutation)**: Updating `createdAt` or `uid` on `/players/user_1` -> `PERMISSION_DENIED`.
10. **Payload 10 (Forged Client Timestamp)**: Creating `/players/user_1` with `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`.
11. **Payload 11 (Terminal State Violation)**: Attempting to update a completed `MatchRecord` or a `'sold'` `MarketOrder` -> `PERMISSION_DENIED`.
12. **Payload 12 (Cross-User Match List Scraping)**: User `user_2` attempting to `list` `/players/user_1/matches` where `resource.data.ownerId != request.auth.uid` -> `PERMISSION_DENIED`.

---

## 3. Red Team Audit & Conflict Report

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning | Validation Helper in Update | Value Poisoning | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/players/{playerId}` | Blocked (`uid == request.auth.uid && playerId == request.auth.uid`) | Blocked (strict action keys & `request.time`) | Blocked (`isValidId`, string & array `.size()` limits) | Present (`isValidPlayerProfile(incoming())`) | Blocked | PASS |
| `/players/{playerId}/matches/{matchId}` | Blocked (`ownerId == request.auth.uid` + parent `get()`) | Blocked (`status == 'completed'`, updates disabled) | Blocked (`isValidId`, string bounds) | N/A (`allow update: if false`) | Blocked | PASS |
| `/marketOrders/{orderId}` | Blocked (`sellerId == request.auth.uid` + parent `exists()`) | Blocked (terminal lock on `sold`/`cancelled`) | Blocked (`isValidId`, price & string bounds) | Present (`isValidMarketOrder(incoming())`) | Blocked | PASS |
