# Test catalog — the flat worklist

Every use case (`UC-*`) and journey (`J-*`) in this artifact, one row each, with everything the E2E-authoring agent needs to schedule the work: priority, suggested spec file, page-object work, seed work, and **blocking gaps**. Details live in the linked feature/journey documents — this table is the index, not the spec.

**How to read it:**

- **Pri** — P0 first (see [`README.md` §Priorities](./README.md#priorities)).
- **Covered** — `✅` = an existing spec asserts this (including an explicitly accepted `test.fixme` or a leg owned by a shared matrix; do not duplicate);
  `◐` = partially covered (the uncovered legs are named in the feature doc).
- **Page object** — the shared abstraction used or proposed by the spec; the current inventory is documented in [`../e2e/README.md`](../e2e/README.md).
- **Seed work** — anything beyond "default baseline".
- **Blockers** — what must exist **before** the spec can be written. `HX-n` refers to
  [Harness extensions needed](#harness-extensions-needed); `testid` = missing `data-testid`(s) named in the feature doc; `✋` = manual-only leg (OAuth popup); `⚠` = locks in a suspected defect (assert today's reality — see [`testability-gaps.md`](./testability-gaps.md#documented-current-behaviour-vs-suspected-defects)).

The row-level **Blockers** column preserves authoring prerequisites for traceability; the harness-extension section records whether each prerequisite has since landed.

Suggested spec files are proposals — keep one feature area per file and mirror the feature-doc structure.

---

## UC-AUTH — auth & onboarding → [`features/auth-onboarding.md`](./features/auth-onboarding.md)

| ID         | Title                                            | Actor         | Pri | Covered                            | Spec file                | Page object     | Seed work                   | Blockers             |
| ---------- | ------------------------------------------------ | ------------- | --- | ---------------------------------- | ------------------------ | --------------- | --------------------------- | -------------------- |
| UC-AUTH-01 | `/` → guard chain → `/login` renders             | Anonymous     | P0  | ✅ `smoke.spec.ts`                 | `auth.spec.ts`           | `LoginPage`     | —                           | —                    |
| UC-AUTH-02 | Google provider button renders                   | Anonymous     | P0  | ✅ `auth.spec.ts`                  | `auth.spec.ts`           | `LoginPage`     | —                           | testid               |
| UC-AUTH-03 | Signed-in user NOT auto-redirected from `/login` | Admin         | P1  | ✅ `auth.spec.ts`                  | `auth.spec.ts`           | `LoginPage`     | —                           | —                    |
| UC-AUTH-04 | Sign-in as PUBLISHER lands `/welcome`            | Publisher     | P0  | —                                  | ✋ manual                | —               | —                           | ✋ popup             |
| UC-AUTH-05 | Sign-in as non-publisher lands `/home`           | Admin         | P0  | —                                  | ✋ manual                | —               | —                           | ✋ popup             |
| UC-AUTH-06 | Unknown account deleted → `/no-account`          | Anonymous     | P0  | —                                  | ✋ manual                | —               | —                           | ✋ popup             |
| UC-AUTH-07 | Popup cancelled → stays on `/login`              | Anonymous     | P1  | —                                  | ✋ manual                | —               | —                           | ✋ popup             |
| UC-AUTH-08 | `/welcome` renders greeting + congregation       | Publisher     | P0  | ✅ `auth.spec.ts`                  | `auth.spec.ts`           | `WelcomePage`   | —                           | testid               |
| UC-AUTH-09 | Non-publisher on `/welcome` → cancelled nav ⚠    | Admin         | P1  | ✅ `auth.spec.ts`                  | `auth.spec.ts`           | —               | —                           | ⚠                    |
| UC-AUTH-10 | `/no-account` renders, no actions                | Anyone        | P1  | ✅ `auth.spec.ts`                  | `auth.spec.ts`           | `NoAccountPage` | —                           | testid               |
| UC-AUTH-11 | Anonymous → `/login` redirect matrix             | Anonymous     | P0  | ✅ `auth.spec.ts`                  | `auth.spec.ts`           | `LoginPage`     | —                           | —                    |
| UC-AUTH-12 | Publisher → `/welcome` funnel matrix             | Publisher     | P0  | ✅ `auth.spec.ts`                  | `auth.spec.ts`           | `WelcomePage`   | —                           | —                    |
| UC-AUTH-13 | `roles:['*']` routes render anonymously ⚠        | Anonymous     | P1  | ✅ `auth.spec.ts`                  | `auth.spec.ts`           | —               | —                           | ⚠                    |
| UC-AUTH-14 | Valid invite renders `Cadastrar` card            | Invitee       | P0  | ✅ `invite-sign-in.spec.ts`        | `invite-sign-in.spec.ts` | `SignInPage`    | invite doc (raw until HX-2) | HX-2, testid         |
| UC-AUTH-15 | Missing invite → `INVALID_LINK`                  | Invitee       | P0  | ✅ `invite-sign-in.spec.ts`        | `invite-sign-in.spec.ts` | `SignInPage`    | none                        | testid               |
| UC-AUTH-16 | Consumed invite → `INVALID_LINK`                 | Invitee       | P0  | ✅ `invite-sign-in.spec.ts`        | `invite-sign-in.spec.ts` | `SignInPage`    | invite doc (raw until HX-2) | HX-2, testid         |
| UC-AUTH-17 | Successful invite redemption (full contract)     | Invitee       | P0  | —                                  | ✋ manual                | —               | invite doc                  | ✋ popup, HX-2       |
| UC-AUTH-18 | Wrong email → auth deleted + `INVALID_EMAIL`     | Invitee       | P1  | —                                  | ✋ manual                | —               | invite doc                  | ✋ popup, HX-2       |
| UC-AUTH-19 | Email-less invite redeemable by anyone           | Invitee       | P1  | —                                  | ✋ manual                | —               | invite doc                  | ✋ popup, HX-2       |
| UC-AUTH-20 | Existing user redeems invite; doc unchanged      | Existing user | P2  | —                                  | ✋ manual                | —               | invite doc                  | ✋ popup, HX-2       |
| UC-AUTH-21 | Invite-load failure swallowed; loading stuck ⚠   | Invitee       | P2  | —                                  | blocked                  | —               | —                           | HX-4, ⚠              |
| UC-AUTH-22 | Forced logout on auth-state loss → `/login`      | Admin         | P1  | ✅ `auth.spec.ts` (⚠ retained URL) | `auth.spec.ts`           | `HomePage`      | —                           | —                    |
| UC-AUTH-23 | `isAuthenticating` spinner replaces outlet       | Any           | P2  | ✅ `auth.spec.ts`                  | `auth.spec.ts`           | —               | —                           | flaky-timing caution |

## UC-NAV — navigation shell → [`features/navigation-shell.md`](./features/navigation-shell.md)

| ID        | Title                                             | Actor       | Pri | Covered                 | Spec file            | Page object       | Seed work        | Blockers                                |
| --------- | ------------------------------------------------- | ----------- | --- | ----------------------- | -------------------- | ----------------- | ---------------- | --------------------------------------- |
| UC-NAV-01 | Authenticated header shows `#profile-link`        | Any         | P0  | ✅ `navigation.spec.ts` | `navigation.spec.ts` | `HeaderComponent` | —                | —                                       |
| UC-NAV-02 | Anonymous header hides `#profile-link`            | Anonymous   | P1  | ✅ `navigation.spec.ts` | `navigation.spec.ts` | `HeaderComponent` | —                | —                                       |
| UC-NAV-03 | Logo navigates to `/home`                         | Admin       | P1  | ✅ `navigation.spec.ts` | `navigation.spec.ts` | `HeaderComponent` | —                | —                                       |
| UC-NAV-04 | App loading state (shell spinner)                 | Any         | P2  | ✅ `navigation.spec.ts` | `navigation.spec.ts` | —                 | —                | timing                                  |
| UC-NAV-05 | Home hub: greeting + cards                        | Admin       | P0  | ✅ `navigation.spec.ts` | `navigation.spec.ts` | `HomePage`        | —                | testid                                  |
| UC-NAV-06 | Publisher → `/welcome` from `/home`               | Publisher   | P0  | ✅ `auth.spec.ts`       | `navigation.spec.ts` | —                 | —                | (dup. of UC-AUTH-12 leg — own one copy) |
| UC-NAV-07 | Anonymous → `/login` from `/home`                 | Anonymous   | P0  | ✅ `auth.spec.ts`       | `navigation.spec.ts` | —                 | —                | (dup. of UC-AUTH-11 leg — own one copy) |
| UC-NAV-08 | Unauthorized role → cancelled navigation ⚠        | Custom role | P1  | ✅ `navigation.spec.ts` | `navigation.spec.ts` | —                 | custom-role user | HX-1, ⚠                                 |
| UC-NAV-09 | Unknown route → empty outlet + console error      | Any         | P2  | ✅ `navigation.spec.ts` | `navigation.spec.ts` | —                 | —                | —                                       |
| UC-NAV-10 | Anonymous reaches `/profile` + `/configuration` ⚠ | Anonymous   | P1  | ✅ `auth.spec.ts`       | `navigation.spec.ts` | —                 | —                | ⚠ (dup. of UC-AUTH-13 — own one copy)   |
| UC-NAV-11 | Home link → `/territories`                        | Admin       | P0  | ✅ `navigation.spec.ts` | `navigation.spec.ts` | `HomePage`        | —                | —                                       |
| UC-NAV-12 | Home link → `/territories/assign`                 | Admin       | P0  | ✅ `navigation.spec.ts` | `navigation.spec.ts` | `HomePage`        | —                | testid (heading)                        |
| UC-NAV-13 | Home link → `/territories/statistics`             | Admin       | P0  | ✅ `navigation.spec.ts` | `navigation.spec.ts` | `HomePage`        | —                | testid (heading)                        |
| UC-NAV-14 | Home link → `/users`                              | Admin       | P0  | ✅ `navigation.spec.ts` | `navigation.spec.ts` | `HomePage`        | —                | testid (heading)                        |

## UC-TERR — territories management → [`features/territories-management.md`](./features/territories-management.md)

| ID         | Title                                                | Actor             | Pri | Covered                          | Spec file                      | Page object                           | Seed work                            | Blockers            |
| ---------- | ---------------------------------------------------- | ----------------- | --- | -------------------------------- | ------------------------------ | ------------------------------------- | ------------------------------------ | ------------------- |
| UC-TERR-01 | List scoped to congregation                          | Admin             | P0  | ✅ `territories.spec.ts`         | `territories.spec.ts` (extend) | `TerritoriesPage` ✅                  | foreign territory                    | —                   |
| UC-TERR-02 | City select + `Todas` ordering                       | Admin             | P0  | ✅ `territories.spec.ts`         | `territories.spec.ts` (extend) | `TerritoriesPage` ✅                  | —                                    | testid (options)    |
| UC-TERR-03 | Empty city → zero rows                               | Admin             | P2  | ✅ `territories.spec.ts`         | `territories.spec.ts` (extend) | `TerritoriesPage` ✅                  | city w/o territories                 | —                   |
| UC-TERR-04 | Empty congregation breaks filter ⚠                   | Admin (2nd cong.) | P1  | ✅ `territories.spec.ts`         | `territories.spec.ts`          | `TerritoriesPage` ✅                  | empty-cities congregation + identity | HX-3, ⚠             |
| UC-TERR-05 | Multi-word AND search                                | Admin             | P0  | ✅ `territories.spec.ts`         | `territories.spec.ts` (extend) | `TerritoriesPage` ✅                  | —                                    | testid (search)     |
| UC-TERR-06 | Accent-sensitive search                              | Admin             | P1  | ✅ `territories.spec.ts`         | `territories.spec.ts` (extend) | `TerritoriesPage` ✅                  | —                                    | —                   |
| UC-TERR-07 | Sort by `positionIndex`                              | Admin             | P1  | ✅ `territories.spec.ts`         | `territories.spec.ts` (extend) | `TerritoriesPage` ✅                  | —                                    | —                   |
| UC-TERR-08 | Sort by `lastVisit`                                  | Admin             | P1  | ✅ `territories.spec.ts`         | `territories.spec.ts` (extend) | `TerritoriesPage` ✅ + sort dialog PO | —                                    | —                   |
| UC-TERR-09 | Bible-student toggle (default ON)                    | Admin             | P1  | ✅ `territories-filters.spec.ts` | `territories-filters.spec.ts`  | sort/filter dialog PO                 | —                                    | testid (toggle)     |
| UC-TERR-10 | Moved toggle (default OFF)                           | Admin             | P1  | ✅ `territories-filters.spec.ts` | `territories-filters.spec.ts`  | sort/filter dialog PO                 | unresolved-MOVED territory           | —                   |
| UC-TERR-11 | Icon select filter                                   | Admin             | P2  | ✅ `territories-filters.spec.ts` | `territories-filters.spec.ts`  | sort/filter dialog PO                 | —                                    | —                   |
| UC-TERR-12 | Active-filter badge counts default ⚠                 | Admin             | P2  | ✅ `territories-filters.spec.ts` | `territories-filters.spec.ts`  | sort/filter dialog PO                 | —                                    | ⚠                   |
| UC-TERR-13 | Filter state persists in localStorage                | Admin             | P1  | ✅ `territories-filters.spec.ts` | `territories-filters.spec.ts`  | sort/filter dialog PO                 | —                                    | —                   |
| UC-TERR-14 | Create: required-field validation                    | Admin             | P0  | ✅ `territories-crud.spec.ts`    | `territories-crud.spec.ts`     | `TerritoryManageDialog`               | —                                    | testid (form)       |
| UC-TERR-15 | Create: city prefills from filter                    | Admin             | P1  | ✅ `territories-crud.spec.ts`    | `territories-crud.spec.ts`     | `TerritoryManageDialog`               | —                                    | —                   |
| UC-TERR-16 | Bible-student toggle reveals/clears instructor ⚠     | Admin             | P2  | ✅ `territories-crud.spec.ts`    | `territories-crud.spec.ts`     | `TerritoryManageDialog`               | —                                    | ⚠                   |
| UC-TERR-17 | `positionIndex` = max+1 per city                     | Admin             | P1  | ✅ `territories-crud.spec.ts`    | `territories-crud.spec.ts`     | `TerritoryManageDialog`               | —                                    | —                   |
| UC-TERR-18 | Create vs edit labels                                | Admin             | P2  | ✅ `territories-crud.spec.ts`    | `territories-crud.spec.ts`     | `TerritoryManageDialog`               | —                                    | —                   |
| UC-TERR-19 | Edit pre-fills + merged diff                         | Admin             | P0  | ✅ `territories-crud.spec.ts`    | `territories-crud.spec.ts`     | `TerritoryManageDialog`               | —                                    | —                   |
| UC-TERR-20 | Delete confirm; orphaned history ⚠                   | Admin             | P0  | ✅ `territories-crud.spec.ts`    | `territories-crud.spec.ts`     | `ConfirmDialog`                       | —                                    | ⚠                   |
| UC-TERR-21 | Drag-and-drop persists `positionIndex`               | Admin             | P1  | ✅ `territories-crud.spec.ts`    | `territories-crud.spec.ts`     | `TerritoriesPage` ✅                  | —                                    | mouse-API technique |
| UC-TERR-22 | Drag handle gated by scope/sort                      | Admin             | P2  | ✅ `territories-crud.spec.ts`    | `territories-crud.spec.ts`     | `TerritoriesPage` ✅                  | —                                    | —                   |
| UC-TERR-23 | `Estudante` badge                                    | Admin             | P1  | ✅ `territories-alerts.spec.ts`  | `territories-alerts.spec.ts`   | `TerritoriesPage` ✅                  | —                                    | —                   |
| UC-TERR-24 | `Mudou` badge                                        | Admin             | P1  | ✅ `territories-alerts.spec.ts`  | `territories-alerts.spec.ts`   | `TerritoriesPage` ✅                  | unresolved-MOVED + note              | —                   |
| UC-TERR-25 | `Não quer visitas` badge (24-month)                  | Admin             | P1  | ✅ `territories-alerts.spec.ts`  | `territories-alerts.spec.ts`   | `TerritoriesPage` ✅                  | unresolved ATVNA + note              | —                   |
| UC-TERR-26 | `Revisita` badge                                     | Admin             | P1  | ✅ `territories-alerts.spec.ts`  | `territories-alerts.spec.ts`   | `TerritoriesPage` ✅                  | —                                    | —                   |
| UC-TERR-27 | Badges need non-empty `note` ⚠                       | Admin             | P1  | ✅ `territories-alerts.spec.ts`  | `territories-alerts.spec.ts`   | `TerritoriesPage` ✅                  | note-less qualifying territory       | ⚠                   |
| UC-TERR-28 | `Histórico` dialog: full subcollection ⚠             | Admin             | P1  | ✅ `territories-alerts.spec.ts`  | `territories-alerts.spec.ts`   | `HistoryDialog`                       | —                                    | ⚠                   |
| UC-TERR-29 | `Histórico` visible with zero visits                 | Admin             | P2  | ✅ `territories-alerts.spec.ts`  | `territories-alerts.spec.ts`   | `HistoryDialog`                       | history-less territory               | —                   |
| UC-TERR-30 | Resolve `Mudou` (3 outcomes)                         | Admin             | P0  | ✅ `territories-alerts.spec.ts`  | `territories-alerts.spec.ts`   | alert-resolution dialog PO            | unresolved-MOVED + note              | testid (radios)     |
| UC-TERR-31 | Resolve `Revisita` preserves `recentHistory` (fixed) | Admin             | P1  | ✅ `territories-alerts.spec.ts`  | `territories-alerts.spec.ts`   | alert-resolution dialog PO            | revisit + unrelated MOVED            | —                   |
| UC-TERR-32 | Resolve `Não Visitar`                                | Admin             | P1  | ✅ `territories-alerts.spec.ts`  | `territories-alerts.spec.ts`   | alert-resolution dialog PO            | unresolved ATVNA + note              | —                   |
| UC-TERR-33 | No maps button on `/territories` ⚠                   | Admin             | P2  | ✅ `territories.spec.ts`         | `territories.spec.ts` (extend) | `TerritoriesPage` ✅                  | —                                    | ⚠                   |
| UC-TERR-34 | CSV export (pt-BR, `;`, BOM, sorted)                 | Admin             | P1  | ✅ `territories-export.spec.ts`  | `territories-export.spec.ts`   | overflow menu PO                      | —                                    | download technique  |
| UC-TERR-35 | Overflow menu hidden for ORGANIZER/ELDER             | Organizer         | P1  | ✅ `territories-export.spec.ts`  | `territories.spec.ts`          | `TerritoriesPage` ✅                  | organizer/elder identity             | HX-1                |
| UC-TERR-36 | List-item menu excludes ORGANIZER                    | Organizer         | P1  | ✅ `territories-export.spec.ts`  | `territories.spec.ts`          | `TerritoriesPage` ✅                  | organizer identity                   | HX-1                |
| UC-TERR-37 | Anonymous → `/login`                                 | Anonymous         | P0  | ✅ `territories.spec.ts`         | —                              | —                                     | —                                    | —                   |

## UC-ASSIGN — territories assign → [`features/territories-assign.md`](./features/territories-assign.md)

| ID           | Title                                            | Actor             | Pri | Covered                         | Spec file                    | Page object             | Seed work                                   | Blockers                                |
| ------------ | ------------------------------------------------ | ----------------- | --- | ------------------------------- | ---------------------------- | ----------------------- | ------------------------------------------- | --------------------------------------- |
| UC-ASSIGN-01 | Page renders; disabled submit                    | Admin             | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | testid                                  |
| UC-ASSIGN-02 | City select + `Todas` alphabetical               | Admin             | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | testid                                  |
| UC-ASSIGN-03 | Zero territories: renders, cannot submit         | Admin (2nd cong.) | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | empty congregation + identity               | HX-3                                    |
| UC-ASSIGN-04 | Empty `cities` collapses selection ⚠             | Admin (2nd cong.) | P2  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | empty-cities congregation                   | HX-3, ⚠                                 |
| UC-ASSIGN-05 | Search narrows checkboxes                        | Admin             | P1  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | testid                                  |
| UC-ASSIGN-06 | Bible-student toggle gates selection             | Admin             | P1  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | + sort dialog PO        | —                                           | testid                                  |
| UC-ASSIGN-07 | Moved territory → `Se Mudou` confirm             | Admin             | P1  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `ConfirmDialog`         | unresolved-MOVED territory                  | testid                                  |
| UC-ASSIGN-08 | No-visit territory → `Não visitar` confirm       | Admin             | P1  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `ConfirmDialog`         | unresolved ATVNA territory                  | testid                                  |
| UC-ASSIGN-09 | Checkbox toggles submit disabled                 | Admin             | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | testid                                  |
| UC-ASSIGN-10 | Declining moved-confirm unticks                  | Admin             | P1  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `ConfirmDialog`         | unresolved-MOVED territory                  | testid                                  |
| UC-ASSIGN-11 | Selections persist across city switches          | Admin             | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | —                                       |
| UC-ASSIGN-12 | FAB badge selected count                         | Admin             | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | —                                       |
| UC-ASSIGN-13 | `expiresAt` = now + N days (raw ms)              | Admin             | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | time tolerance                          |
| UC-ASSIGN-14 | Missing settings → env default (45d)             | Admin (2nd cong.) | P2  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | settings-less congregation (raw write)      | HX-3                                    |
| UC-ASSIGN-15 | Submit creates designation (top-level fields)    | Admin             | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | whatsapp-popup capture                  |
| UC-ASSIGN-16 | Embedded snapshot shape ⚠ (history slice)        | Admin             | P1  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | territory w/ 6+ visits                      | ⚠                                       |
| UC-ASSIGN-17 | Overlapping designations independent             | Admin             | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | —                                       |
| UC-ASSIGN-18 | `in`-query batching (35 territories)             | Admin             | P2  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | 35 territories                              | slow; ⚠ (comment only)                  |
| UC-ASSIGN-19 | Share link = `location.origin` + whatsapp ⚠      | Admin             | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | popup technique, ⚠                      |
| UC-ASSIGN-20 | No clipboard affordance ⚠                        | Admin             | P2  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | ⚠                                       |
| UC-ASSIGN-21 | Failed creation keeps ticks (no marking); silent error ⚠ | Admin     | P1  | —                              | unit-only (`assign-territories-page.component.spec.ts`) | —                       | —                                           | HX-4 (e2e), ⚠                          |
| UC-ASSIGN-22 | Role matrix + APP_ADMIN bypass                   | Multi-role        | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | elder/organizer/super./app-admin identities | HX-1                                    |
| UC-ASSIGN-23 | Publisher → `/welcome`                           | Publisher         | P0  | ✅ `auth.spec.ts` (matrix leg)  | `territories-assign.spec.ts` | —                       | —                                           | (dup. of UC-AUTH-12 leg — own one copy) |
| UC-ASSIGN-24 | Anonymous → `/login`                             | Anonymous         | P0  | ✅ `auth.spec.ts` (matrix leg)  | `territories-assign.spec.ts` | —                       | —                                           | (dup. of UC-AUTH-11 leg — own one copy) |
| UC-ASSIGN-25 | Re-send share on assigned-territory tap          | Admin             | P0  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | whatsapp-popup capture                  |
| UC-ASSIGN-26 | Assigned-row buttons intact; dimmed icon (dark)  | Admin             | P1  | ✅ `territories-assign.spec.ts` | `territories-assign.spec.ts` | `AssignTerritoriesPage` | —                                           | window.open recorder                     |

## UC-STAT — territories statistics → [`features/territories-statistics.md`](./features/territories-statistics.md)

| ID         | Title                                                            | Actor             | Pri | Covered                                                                      | Spec file                        | Page object      | Seed work                     | Blockers                 |
| ---------- | ---------------------------------------------------------------- | ----------------- | --- | ---------------------------------------------------------------------------- | -------------------------------- | ---------------- | ----------------------------- | ------------------------ |
| UC-STAT-01 | Static totals, all cities                                        | Admin             | P0  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | —                             | testid                   |
| UC-STAT-02 | Static totals by city                                            | Admin             | P1  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | —                             | testid                   |
| UC-STAT-03 | `Mudaram` from fetched history (+ 03b: beyond the last 5 visits) | Admin             | P1  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | unresolved-MOVED territory    | —                        |
| UC-STAT-04 | Period `Este Mês`                                                | Admin             | P0  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | clock-relative visits         | testid                   |
| UC-STAT-05 | Period `1 Mês`                                                   | Admin             | P1  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | clock-relative visits         | testid                   |
| UC-STAT-06 | Period `3 Meses`                                                 | Admin             | P1  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | clock-relative visits         | testid                   |
| UC-STAT-07 | Period `6 meses`                                                 | Admin             | P1  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | clock-relative visits         | testid                   |
| UC-STAT-08 | Period `1 ano`                                                   | Admin             | P1  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | clock-relative visits         | testid                   |
| UC-STAT-09 | Period `Este Ano`                                                | Admin             | P1  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | clock-relative visits         | testid                   |
| UC-STAT-10 | Visit counting rule (0 and 4 only)                               | Admin             | P0  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | 5 visits, all outcomes        | testid                   |
| UC-STAT-11 | Revisit counting rule (boolean)                                  | Admin             | P0  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | mixed revisit flags           | testid                   |
| UC-STAT-12 | Reads full subcollection (7 visits)                              | Admin             | P0  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | 7-visit territory             | testid                   |
| UC-STAT-13 | Empty congregation renders zero totals                           | Admin (2nd cong.) | P2  | ✅ `territories-statistics.spec.ts` + `journey-empty-system.spec.ts` (Leg 3) | same                             | `StatisticsPage` | empty congregation + identity | HX-3                     |
| UC-STAT-14 | Loading state                                                    | Admin             | P2  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | —                             | timing                   |
| UC-STAT-15 | Organizer can view                                               | Organizer         | P1  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | organizer identity            | HX-1                     |
| UC-STAT-16 | Publisher → `/welcome`                                           | Publisher         | P1  | ✅ `auth.spec.ts` (matrix leg)                                               | `territories-statistics.spec.ts` | —                | —                             | (dup. of UC-AUTH-12 leg) |
| UC-STAT-17 | Anonymous → `/login`                                             | Anonymous         | P1  | ✅ `auth.spec.ts` (matrix leg)                                               | `territories-statistics.spec.ts` | —                | —                             | (dup. of UC-AUTH-11 leg) |
| UC-STAT-18 | Territory with no history                                        | Admin             | P2  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | history-less territory        | testid                   |
| UC-STAT-19 | Out-of-period visits excluded                                    | Admin             | P2  | ✅ `territories-statistics.spec.ts`                                          | `territories-statistics.spec.ts` | `StatisticsPage` | clock-relative visits         | testid                   |

## UC-WORK — work / designations → [`features/work-designations.md`](./features/work-designations.md)

| ID         | Title                                                | Actor     | Pri | Covered                       | Spec file                  | Page object              | Seed work                             | Blockers                 |
| ---------- | ---------------------------------------------------- | --------- | --- | ----------------------------- | -------------------------- | ------------------------ | ------------------------------------- | ------------------------ |
| UC-WORK-01 | Anonymous open of active designation                 | Anonymous | P0  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkPage`               | active designation (`history: []`!)   | testid                   |
| UC-WORK-02 | Non-existent id → blank page                         | Anonymous | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkPage`               | —                                     | —                        |
| UC-WORK-03 | Encoded slash in id throws ⚠                         | Anonymous | P2  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkPage`               | —                                     | ⚠                        |
| UC-WORK-04 | Missing `history` crashes read ⚠                     | Anonymous | P0  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkPage`               | history-less embedded territory       | ⚠                        |
| UC-WORK-05 | Frozen snapshot vs live territory                    | Anonymous | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkPage`               | designation + mid-test mutation       | raw `db.firestore` write |
| UC-WORK-06 | Signed-in admin: identical page                      | Admin     | P2  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkPage`               | active designation                    | —                        |
| UC-WORK-07 | Complete visit `SPOKE`                               | Publisher | P0  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkItemCompleteDialog` | designation + territory               | testid                   |
| UC-WORK-08 | Complete visit `NOT_ANSWERED`                        | Publisher | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkItemCompleteDialog` | idem                                  | testid                   |
| UC-WORK-09 | Complete visit `MOVED`                               | Publisher | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkItemCompleteDialog` | idem                                  | testid                   |
| UC-WORK-10 | Complete visit `ASKED_TO_NOT_VISIT_AGAIN`            | Publisher | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkItemCompleteDialog` | idem                                  | testid                   |
| UC-WORK-11 | `Aceitou revisita` → name required                   | Publisher | P0  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkItemCompleteDialog` | idem                                  | —                        |
| UC-WORK-12 | Name optional without revisit                        | Publisher | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkItemCompleteDialog` | idem                                  | —                        |
| UC-WORK-13 | Notes persisted verbatim                             | Publisher | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkItemCompleteDialog` | idem                                  | —                        |
| UC-WORK-14 | Empty notes → `Sem observações`                      | Publisher | P2  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkItemCompleteDialog` | idem                                  | —                        |
| UC-WORK-15 | Cancel keeps `PENDING`, no writes                    | Publisher | P0  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkItemCompleteDialog` | idem                                  | —                        |
| UC-WORK-16 | Edit last visit preserves id/date                    | Publisher | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkItemCompleteDialog` | DONE territory w/ history             | testid                   |
| UC-WORK-17 | Undo visit (`Apagar Visita`)                         | Publisher | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `ConfirmDialog`          | DONE territory w/ history             | testid                   |
| UC-WORK-18 | History button needs embedded history                | Publisher | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `HistoryDialog`          | 2 territories (w/ and w/o history)    | testid                   |
| UC-WORK-19 | Maps button gating + `_self` nav ⚠                   | Publisher | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkPage`               | w/ and w/o `mapsLink`                 | window.open stub, ⚠      |
| UC-WORK-20 | Expired + blocking: all blocked                      | Publisher | P0  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkPage`               | expired blocking designation          | testid                   |
| UC-WORK-21 | Expired + non-blocking: checkbox still disabled ⚠    | Publisher | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkPage`               | expired non-blocking designation      | ⚠                        |
| UC-WORK-22 | All done → `Parabéns!` state                         | Publisher | P1  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkPage`               | 1-territory designation               | —                        |
| UC-WORK-23 | Write-back overwrites `recentHistory` ⚠              | Publisher | P0  | ✅ `work-designation.spec.ts` | `work-designation.spec.ts` | `WorkItemCompleteDialog` | 5-visit territory + fresh designation | ⚠                        |
| UC-WORK-24 | Non-existent designation id renders not-found screen | Anonymous | P0  | ✅ `work-not-found.spec.ts`   | `work-not-found.spec.ts`   | `WorkPage`               | —                                     | —                        |

## UC-USERS — users & invites → [`features/users-invites.md`](./features/users-invites.md)

| ID          | Title                                                                    | Actor     | Pri | Covered                        | Spec file                | Page object          | Seed work                                       | Blockers                   |
| ----------- | ------------------------------------------------------------------------ | --------- | --- | ------------------------------ | ------------------------ | -------------------- | ----------------------------------------------- | -------------------------- |
| UC-USERS-01 | List scoped + role-priority order                                        | Admin     | P0  | ✅ `users.spec.ts`             | `users.spec.ts`          | `UsersPage`          | —                                               | testid                     |
| UC-USERS-02 | Row: initials, name, role badge                                          | Admin     | P1  | ✅ `users.spec.ts`             | `users.spec.ts`          | `UsersPage`          | —                                               | testid                     |
| UC-USERS-03 | Foreign-congregation user hidden                                         | Admin     | P0  | ✅ `users.spec.ts`             | `users.spec.ts`          | `UsersPage`          | foreign user                                    | —                          |
| UC-USERS-04 | Edit dialog fields; SUPERINTENDENT only for APP_ADMIN                    | Admin     | P1  | ✅ `users.spec.ts`             | `users.spec.ts`          | `UserEditDialog`     | app-admin identity (2nd half)                   | HX-1, testid               |
| UC-USERS-05 | Form enabled for non-admin targets (fixed)                               | Admin     | P0  | ✅ `users.spec.ts`             | `users.spec.ts`          | `UserEditDialog`     | —                                               | —                          |
| UC-USERS-06 | APP_ADMIN edit persists                                                  | App Admin | P1  | ✅ `users.spec.ts`             | `users.spec.ts`          | `UserEditDialog`     | app-admin identity                              | HX-1                       |
| UC-USERS-07 | Editing own account not special-cased                                    | Admin     | P2  | ✅ `users.spec.ts`             | `users.spec.ts`          | `UserEditDialog`     | —                                               | —                          |
| UC-USERS-08 | Delete confirm + doc removal                                             | Admin     | P0  | ✅ `users.spec.ts`             | `users.spec.ts`          | `ConfirmDialog`      | —                                               | testid                     |
| UC-USERS-09 | Delete also removes Auth account (callable)                              | Admin     | P0  | ✅ `users.spec.ts`             | `users.spec.ts`          | `ConfirmDialog`      | —                                               | functions emulator         |
| UC-USERS-10 | Invite FAB is ADMIN-only                                                 | Admin     | P0  | ✅ `users-invites.spec.ts`     | `users-invites.spec.ts`  | `UsersPage`          | —                                               | title selector             |
| UC-USERS-11 | Create invite (defaults; reference congregation)                         | Admin     | P0  | ✅ `users-invites.spec.ts`     | `users-invites.spec.ts`  | `InviteCreateDialog` | read `invitation_links` raw                     | HX-2 (for factory), testid |
| UC-USERS-12 | No-congregation guard (unreachable)                                      | —         | P2  | —                              | unit-only                | —                    | —                                               | not E2E-reachable          |
| UC-USERS-13 | Link = `environment.baseUrl` + clipboard copy                            | Admin     | P1  | ✅ `users-invites.spec.ts`     | `users-invites.spec.ts`  | `InviteCreateDialog` | —                                               | clipboard permissions      |
| UC-USERS-14 | `Enviar` → whatsapp link                                                 | Admin     | P2  | ✅ `users-invites.spec.ts`     | `users-invites.spec.ts`  | `InviteCreateDialog` | —                                               | window.open stub           |
| UC-USERS-15 | ORGANIZER/ELDER: list only                                               | Organizer | P1  | ✅ `users.spec.ts`             | `users.spec.ts`          | `UsersPage`          | organizer/elder identity                        | HX-1                       |
| UC-USERS-16 | Publisher → `/welcome`                                                   | Publisher | P0  | ✅ `auth.spec.ts` (matrix leg) | `users.spec.ts`          | —                    | —                                               | (dup. of UC-AUTH-12 leg)   |
| UC-USERS-17 | Anonymous → `/login`                                                     | Anonymous | P0  | ✅ `auth.spec.ts` (matrix leg) | `users.spec.ts`          | —                    | —                                               | (dup. of UC-AUTH-11 leg)   |
| UC-USERS-18 | `provisionUserFromInvite`: valid invite provisions + consumes atomically | Invitee   | P0  | ✅ `provision-user.spec.ts`    | `provision-user.spec.ts` | —                    | invite + auth user, minted token w/ email claim | functions emulator         |
| UC-USERS-19 | Callable idempotent on re-login (invite untouched)                       | Invitee   | P0  | ✅ `provision-user.spec.ts`    | `provision-user.spec.ts` | —                    | idem                                            | —                          |
| UC-USERS-20 | Consumed invite cannot provision another caller                          | Attacker  | P0  | ✅ `provision-user.spec.ts`    | `provision-user.spec.ts` | —                    | idem + 2nd auth user                            | —                          |
| UC-USERS-21 | Email-pinned invite rejects different email                              | Attacker  | P0  | ✅ `provision-user.spec.ts`    | `provision-user.spec.ts` | —                    | idem                                            | —                          |
| UC-USERS-22 | Unauthenticated callable call rejected                                   | Anonymous | P0  | ✅ `provision-user.spec.ts`    | `provision-user.spec.ts` | —                    | —                                               | —                          |
| UC-USERS-23 | Invite can never grant APP_ADMIN                                         | Admin     | P0  | ✅ `provision-user.spec.ts`    | `provision-user.spec.ts` | —                    | APP_ADMIN invite                                | —                          |

## UC-PROF — profile → [`features/profile.md`](./features/profile.md)

| ID         | Title                                     | Actor            | Pri | Covered              | Spec file         | Page object                     | Seed work                                  | Blockers |
| ---------- | ----------------------------------------- | ---------------- | --- | -------------------- | ----------------- | ------------------------------- | ------------------------------------------ | -------- |
| UC-PROF-01 | Identity card (ADMIN)                     | Admin            | P0  | ✅ `profile.spec.ts` | `profile.spec.ts` | `ProfilePage`                   | —                                          | testid   |
| UC-PROF-02 | Identity card (PUBLISHER)                 | Publisher        | P1  | ✅ `profile.spec.ts` | `profile.spec.ts` | `ProfilePage`                   | —                                          | —        |
| UC-PROF-03 | ⚠ Anonymous placeholders, no redirect     | Anonymous        | P1  | ✅ `profile.spec.ts` | `profile.spec.ts` | `ProfilePage`                   | —                                          | ⚠        |
| UC-PROF-04 | Switch card hidden for ADMIN/PUBLISHER    | Admin, Publisher | P1  | ✅ `profile.spec.ts` | `profile.spec.ts` | `ProfilePage`                   | —                                          | —        |
| UC-PROF-05 | Switch lists congregations by name        | Superintendent   | P1  | ✅ `profile.spec.ts` | `profile.spec.ts` | `ProfilePage`                   | 2nd congregation + superintendent identity | HX-1     |
| UC-PROF-06 | Switch persists + re-scopes (no reload)   | Superintendent   | P1  | ✅ `profile.spec.ts` | `profile.spec.ts` | `ProfilePage`                   | idem                                       | HX-1     |
| UC-PROF-07 | ⚠ No-congregation no-op (dead guard)      | Superintendent   | P2  | ✅ `profile.spec.ts` | `profile.spec.ts` | `ProfilePage`                   | congregation-less user (raw)               | HX-1, ⚠  |
| UC-PROF-08 | ⚠ Non-privileged switch throws, swallowed | Any (downgraded) | P2  | ✅ `profile.spec.ts` | `profile.spec.ts` | `ProfilePage`                   | mid-session role mutation (raw)            | HX-1, ⚠  |
| UC-PROF-09 | Logout confirm → `/login`                 | Admin            | P0  | ✅ `profile.spec.ts` | `profile.spec.ts` | `ProfilePage` + `ConfirmDialog` | —                                          | testid   |
| UC-PROF-10 | Logout cancel stays                       | Admin            | P1  | ✅ `profile.spec.ts` | `profile.spec.ts` | `ProfilePage` + `ConfirmDialog` | —                                          | —        |

## UC-CFG — configuration (cities) → [`features/configuration-cities.md`](./features/configuration-cities.md)

| ID        | Title                                       | Actor     | Pri | Covered                    | Spec file               | Page object         | Seed work | Blockers              |
| --------- | ------------------------------------------- | --------- | --- | -------------------------- | ----------------------- | ------------------- | --------- | --------------------- |
| UC-CFG-01 | Cities list renders                         | Admin     | P0  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | testid                |
| UC-CFG-02 | Add city row (local only)                   | Admin     | P0  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | —                     |
| UC-CFG-03 | Rename inline                               | Admin     | P0  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | —                     |
| UC-CFG-04 | Cancel edit (revert/remove)                 | Admin     | P1  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | —                     |
| UC-CFG-05 | Single-edit constraint; save mid-edit       | Admin     | P1  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | —                     |
| UC-CFG-06 | Empty name → toast, no write                | Admin     | P0  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | toast selector        |
| UC-CFG-07 | Duplicate name → toast, no write            | Admin     | P0  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | toast selector        |
| UC-CFG-08 | Save: congregation + batch territory rename | Admin     | P0  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | ⚠ (non-atomic note)   |
| UC-CFG-09 | New city skips territory batch              | Admin     | P1  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | —                     |
| UC-CFG-10 | ⚠ Delete city → orphan territories          | Admin     | P1  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | native `confirm()`, ⚠ |
| UC-CFG-11 | ⚠ Stale filter until reload                 | Admin     | P1  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | ⚠                     |
| UC-CFG-12 | ⚠ Anonymous: no-congregation banner         | Anonymous | P1  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | ⚠                     |
| UC-CFG-13 | ⚠ Every role can edit (unenforced gating)   | Publisher | P0  | ✅ `configuration.spec.ts` | `configuration.spec.ts` | `ConfigurationPage` | —         | ⚠                     |

## UC-TTL — Firestore TTL data retention policies

| ID        | Title                                                    | Actor | Pri | Covered                    | Spec file               | Page object             | Seed work | Blockers |
| --------- | -------------------------------------------------------- | ----- | --- | -------------------------- | ----------------------- | ----------------------- | --------- | -------- |
| UC-TTL-01 | Designation creation sets 180-day expireAt TTL timestamp | Admin | P0  | ✅ `firestore-ttl.spec.ts` | `firestore-ttl.spec.ts` | `AssignTerritoriesPage` | —         | —        |
| UC-TTL-02 | Client log creation sets 180-day expireAt TTL timestamp  | Admin | P1  | ✅ `firestore-ttl.spec.ts` | `firestore-ttl.spec.ts` | `AssignTerritoriesPage` | —         | —        |

## UC-RULES — Firestore security rules

| ID          | Title                                                                              | Actor                | Pri | Covered                      | Spec file                 | Page object | Seed work   | Blockers |
| ----------- | ---------------------------------------------------------------------------------- | -------------------- | --- | ---------------------------- | ------------------------- | ----------- | ----------- | -------- |
| UC-RULES-01 | Anonymous read access to public collections (200 allowed)                          | Anonymous            | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | invite doc  | —        |
| UC-RULES-02 | Anonymous read access to non-public collections is denied (403)                    | Anonymous            | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | log doc     | —        |
| UC-RULES-03 | Logs read access: PUBLISHER denied (403) vs APP_ADMIN allowed (200)                | Publisher, App Admin | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | log doc     | —        |
| UC-RULES-04 | Anonymous write to logs allowed (200), write to invitation_links denied (403)      | Anonymous            | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | invite doc  | —        |
| UC-RULES-05 | Territory write matrix: anonymous update allowed (200), create/delete denied (403) | Anonymous            | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | —           | —        |
| UC-RULES-06 | Territory history write matrix: anonymous create, update, delete allowed (200)     | Anonymous            | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | history doc | —        |
| UC-RULES-07 | Authenticated user can read and write non-public collections (200 allowed)         | Admin                | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | —           | —        |
| UC-RULES-08 | Users read matrix: self + elevated same-congregation (200), others 403             | Publisher, Organizer | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | —           | —        |
| UC-RULES-09 | Users docs can never be created client-side (403 for everyone)                     | Anonymous, Publisher | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | —           | —        |
| UC-RULES-10 | Users self-update: name 200, role escalation 403                                   | Publisher            | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | —           | —        |
| UC-RULES-11 | Users ADMIN edit matrix: same-congregation 200, protected targets/role grants 403  | Admin                | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | —           | —        |
| UC-RULES-12 | Users delete matrix: ADMIN same-congregation 200, protected targets/non-admins 403 | Admin, Publisher     | P0  | ✅ `firestore-rules.spec.ts` | `firestore-rules.spec.ts` | —           | —           | —        |

## Journeys → [`journeys/`](./journeys/README.md)

| ID   | Title                                                 | Identities        | Pri | Covered                                        | Spec file                                   | Page objects                                                                                                 | Seed work                            | Blockers                                         |
| ---- | ----------------------------------------------------- | ----------------- | --- | ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------ |
| J-01 | Admin creates + assigns ×2, publishers work own links | Admin → anon ×2   | P0  | ✅ `journey-admin-assign-work.spec.ts`         | `journey-admin-assign-work.spec.ts`         | `TerritoriesPage` ✅, `TerritoryManageDialog`, `AssignTerritoriesPage`, `WorkPage`, `WorkItemCompleteDialog` | —                                    | testid; whatsapp capture (or Firestore fallback) |
| J-02 | Visit feedback loop to Elder                          | anon → Elder      | P0  | ✅ `journey-visit-feedback.spec.ts`            | `journey-visit-feedback.spec.ts`            | `WorkPage`, `WorkItemCompleteDialog`, `TerritoriesPage` ✅, `HistoryDialog`, `StatisticsPage`                | designation + territory              | HX-1 (elder; interim admin), testid              |
| J-03 | Invite onboarding lifecycle                           | Admin → anon      | P0  | ✅ `journey-invite-onboarding.spec.ts`         | `journey-invite-onboarding.spec.ts`         | `UsersPage`, `InviteCreateDialog`, `SignInPage`, `LoginPage`                                                 | invite docs (raw until HX-2)         | HX-2, ✋ legs 7+12, testid                       |
| J-04 | Moved alert resolution loop                           | anon → Organizer  | P1  | ✅ `journey-moved-alert.spec.ts`               | `journey-moved-alert.spec.ts`               | `WorkPage`, `WorkItemCompleteDialog`, `TerritoriesPage` ✅, alert dialog PO, `StatisticsPage`                | designation + territory (note!)      | HX-1 (organizer caveat — see journey), testid    |
| J-05 | City rename cascade + orphan delete                   | Admin             | P1  | ✅ `journey-city-rename.spec.ts`               | `journey-city-rename.spec.ts`               | `ConfigurationPage`, `TerritoriesPage` ✅                                                                    | —                                    | native `confirm()`, ⚠ ×2                         |
| J-06 | Expired designation, both modes                       | anon              | P1  | ✅ `journey-expired-designation.spec.ts`       | `journey-expired-designation.spec.ts`       | `WorkPage`                                                                                                   | 2 expired designations + territories | ⚠ (UC-WORK-21)                                   |
| J-07 | Statistics reconciliation                             | Admin             | P1  | ✅ `journey-statistics-reconciliation.spec.ts` | `journey-statistics-reconciliation.spec.ts` | `StatisticsPage`                                                                                             | clock-relative visits                | testid                                           |
| J-08 | Empty-system journey                                  | Admin (2nd cong.) | P1  | ✅ `journey-empty-system.spec.ts`              | `journey-empty-system.spec.ts`              | `TerritoriesPage` ✅, `AssignTerritoriesPage`, `StatisticsPage`, overflow menu PO                            | empty congregation + identity        | **HX-3 (hard blocker)**                          |
| J-09 | TTL-purged designation renders not-found screen       | anon              | P0  | ✅ `work-not-found.spec.ts`                    | `work-not-found.spec.ts`                    | `WorkPage`                                                                                                   | designation + territory              | —                                                |

---

## Harness extensions needed

The planning prerequisites are retained here for traceability. HX-1, HX-2, HX-3, and HX-5 are delivered; HX-4 is deliberately deferred.

### HX-1 — Additional `signInAs` roles (`elder`, `organizer`, `superintendent`, `app_admin`)

- **Status:** ✅ Delivered by WP-01.
- **What:** seed one user per role in `default.seed.ts` (ids e.g. `seed-user-elder`), extend
  `DEFAULT_SEED_IDS`, add entries to `ROLE_UIDS` and the `TestRole` union in `e2e/config/auth.config.ts`.
- **Unblocked:** UC-NAV-08, UC-TERR-35/36, UC-ASSIGN-22, UC-STAT-15, UC-USERS-04/06/15, UC-PROF-05/06/07/08, J-02, J-04.

### HX-2 — `invitation_links` seed support

- **Status:** ✅ Delivered by WP-02.
- **What:** add `invitation_links: 'invitation_links'` to `e2e/seed/collections.ts` (mind the **underscore**), a `buildInvitationLink` factory (fields per
  [`domain/data-model.md` §2.6](./domain/data-model.md#26-invitationlink--srcmodelsinvitation-linkts) —
  `congregation` written as a `DocumentReference`, `id` embedded in the body, `isValid: true` default), an `invitationLinks` field on `SeedDefinition`, and seeder support in `e2e/seed/seeder.ts`.
- **Unblocked:** UC-AUTH-14/16 and J-03; the OAuth-popup legs remain manual for an unrelated browser-provider boundary.

### HX-3 — Second-congregation / arbitrary-uid identity

- **Status:** ✅ Delivered by WP-03 as `signInAsUser(uid)`.
- **What:** a way to `signInAs` a user outside the default baseline — either `signInAsUser(uid)` (mint a custom token for any seeded uid) or named extra `ROLE_UIDS` entries. A multi-congregation seed helper (`buildCongregation` + admin + Auth user in one call) would pair naturally with it.
- **Unblocked:** UC-TERR-04, UC-ASSIGN-03/04/14, UC-STAT-13, and J-08.

### HX-4 — Fault-injection hook (Firestore read/write failures)

- **Decision (WP-34):** **deliberately deferred**. No production-side test hook or emulator fault shim is added during the final sweep.
- **What:** a supported way to make a specific Firestore call fail from a test (emulator rules toggle, network interception of the Firestore channel, or a dedicated app-side test hook).
- **Remains blocked:** UC-ASSIGN-21 (e2e only — its rollback semantics are pinned by unit tests since 2026-09) and UC-AUTH-21. UC-CFG-08's happy path is covered; its partial-failure window remains a documented risk and unit/integration-test candidate.

### HX-5 — Browser-interaction helpers (not fixture extensions, but shared spec utilities)

- **Status:** ✅ Delivered by WP-04 under `e2e/utils/`.
- **What:** small helpers under `e2e/`: (a) a `window.open` recorder installed via `page.addInitScript`
  (for UC-USERS-14 and the Firefox/Safari branch of UC-WORK-19); (b) a WhatsApp-popup URL decoder (`page.waitForEvent('popup')` + `text=` param extraction, for UC-ASSIGN-19 / J-01); (c) a CSV download reader (`page.waitForEvent('download')` + `download.path()` + BOM-aware read, for UC-TERR-34 / J-08); (d) a native-`confirm()` auto-accept registrar (UC-CFG-10 / J-05); (e) a CDK mouse-drag sequence (UC-TERR-21).

---

## Coverage summary

| Area      | Entries | P0     | P1     | P2     | Covered    | Intentionally not automated |
| --------- | ------- | ------ | ------ | ------ | ---------- | --------------------------- |
| UC-AUTH   | 23      | 12     | 8      | 3      | 14 ✅      | 8 ✋, 1 HX-4                |
| UC-NAV    | 14      | 8      | 4      | 2      | 14 ✅      | —                           |
| UC-TERR   | 37      | 8      | 21     | 8      | 37 ✅      | —                           |
| UC-ASSIGN | 26      | 14     | 8      | 4      | 25 ✅      | 1 HX-4 (unit-pinned)        |
| UC-STAT   | 19      | 5      | 10     | 4      | 19 ✅      | —                           |
| UC-WORK   | 24      | 8      | 13     | 3      | 24 ✅      | —                           |
| UC-USERS  | 23      | 15     | 5      | 3      | 22 ✅      | 1 unit-only                 |
| UC-PROF   | 10      | 2      | 6      | 2      | 10 ✅      | —                           |
| UC-CFG    | 13      | 7      | 6      | 0      | 13 ✅      | —                           |
| UC-TTL    | 2       | 1      | 1      | 0      | 2 ✅       | —                           |
| UC-RULES  | 12      | 12     | 0      | 0      | 12 ✅      | —                           |
| Journeys  | 9       | 4      | 5      | 0      | 9 ✅       | —                           |
| **Total** | **212** | **96** | **87** | **29** | **201 ✅** | **11**                      |

Coverage arithmetic: 192 of 203 UC rows plus all 9 journeys are covered. The 11 exceptions are exactly the eight manual OAuth-popup rows, `UC-AUTH-21` and `UC-ASSIGN-21` (HX-4 deferred; the assign rollback semantics are unit-pinned since 2026-09), and `UC-USERS-12` (unit-only). `UC-PROF-07` is an explicitly accepted `test.fixme` and remains covered; redirect duplicates are owned once by the matrices in `auth.spec.ts`.

## Sources

- every `docs/features/*.md` and `docs/journeys/*.md` (row content)
- `apps/ministry-maps/e2e/tests/*.spec.ts` (coverage marks)
- `apps/ministry-maps/e2e/page-objects/*.page.ts` and `e2e/utils/` (shared test abstractions)
- `apps/ministry-maps/e2e/seed/`, `e2e/fixtures/`, and `e2e/config/auth.config.ts` (harness-extension status)
