# J-06 — Expired designation: blocking vs non-blocking settings, and what actually stays disabled

- **Priority:** P1 — expiry is the safety valve of the share-link model; this journey pins down the real
  (and counter-intuitive) difference between the two `shouldDesignationBlockAfterExpired` modes.
- **Identities:** `Admin` (setup via UI, optional) → `anonymous` (the publisher opening the stale links).
- **Suggested spec file:** `e2e/tests/journey-expired-designation.spec.ts`.
- **Composes:** UC-WORK-01, UC-WORK-19, UC-WORK-20, UC-WORK-21, UC-ASSIGN-13.

## Seed

Default baseline **plus two already-expired designations** over two real territories (both territories get
a `mapsLink` from the `buildTerritory` default — keep it, leg 2 needs it):

```ts
const tBlocked = seed.factories.buildTerritory({ id: 'j06-t-blocked', congregationId: seed.ids.congregation, city: 'São Paulo', history: [] });
const tOpen = seed.factories.buildTerritory({ id: 'j06-t-open', congregationId: seed.ids.congregation, city: 'São Paulo', history: [] });
await seed.write({
  territories: [tBlocked, tOpen],
  designations: [
    seed.factories.buildDesignation({
      id: 'j06-d-blocked',
      congregationId: seed.ids.congregation,
      createdBy: seed.ids.adminUser,
      expiresAt: new Date('2020-01-01'), // long expired
      settings: { shouldDesignationBlockAfterExpired: true },
      territories: [seed.factories.buildDesignationTerritory({ id: 'j06-t-blocked', congregationId: seed.ids.congregation, history: [] })],
    }),
    seed.factories.buildDesignation({
      id: 'j06-d-nonblocking',
      congregationId: seed.ids.congregation,
      createdBy: seed.ids.adminUser,
      expiresAt: new Date('2020-01-01'),
      settings: { shouldDesignationBlockAfterExpired: false },
      territories: [seed.factories.buildDesignationTerritory({ id: 'j06-t-open', congregationId: seed.ids.congregation, history: [] })],
    }),
  ],
});
```

The expiry values are seeded directly, so no time travel is needed. (UC-ASSIGN-13 documents how a real
designation derives `expiresAt` from `congregation.settings.designationAccessExpiryDays` at creation —
asserted separately; this journey is purely about consumption.)

## Script

### Leg 1 — Expired + blocking: every action is blocked

1. Anonymously (no `signInAs`), `page.goto('/work/j06-d-blocked')`.
2. Assert the info note (`lib-note`) renders the exact text
   `Essa designação está desabilitada. Por favor peça ao seu SG uma designação nova.` (UC-WORK-20).
3. Assert the territory row renders but its checkbox is `disabled`; the maps button is `disabled` too
   (`isBlocked = isDisabled && settings.shouldDesignationBlockAfterExpired` — both true).
4. Attempt to click the disabled checkbox (Playwright allows the attempt; the control must not react).

⟶ **HAND-OFF (Firestore):** `db.getSubcollectionDocs(db.collections.territories, 'j06-t-blocked',
db.historySubcollection)` is still **empty** — no write occurred; `db.getDoc(db.collections.designations,
'j06-d-blocked').territories[0].status === 'PENDING'`.

### Leg 2 — Expired + non-blocking: ⚠ the checkbox is _still_ disabled; only maps is usable

5. `page.goto('/work/j06-d-nonblocking')`.
6. Assert the **same** info note renders (`@if (isDisabled)` checks expiry alone, not the setting) — the
   page _looks_ identically unusable (UC-WORK-21).
7. Assert the row's checkbox is **still `disabled`** — `WorkPageComponent` binds the checkbox/edit/undo
   controls to `isDisabled` (expiry), not to `isBlocked`; `shouldDesignationBlockAfterExpired: false` does
   **not** restore them (⚠ suspected defect — assert today's reality, not the intuitive reading).
8. Assert the maps button is the **only enabled** action on the row — it alone binds to `isBlocked`,
   which is `false` here. Do not click it (on Chromium it navigates the same tab away via
   `window.open(link, '_self')` — see UC-WORK-19's technique notes if a click assertion is ever added).
9. Attempt the checkbox as in leg 1.

⟶ **HAND-OFF (Firestore):** `db.getSubcollectionDocs(db.collections.territories, 'j06-t-open',
db.historySubcollection)` is still **empty**; `db.getDoc(db.collections.designations,
'j06-d-nonblocking').territories[0].status === 'PENDING'`.

### Leg 3 — Contrast: the baseline expired designation is doubly unusable

10. Note (assertion-free documentation step): the default baseline `seed-designation` is also expired and
    blocking, but it additionally crashes its read pipeline because its embedded territory omits `history`
    (UC-WORK-04). This journey deliberately seeds its own designations with `history: []` — never point
    this journey at `seed.ids.designation`.

⟶ **FINAL SWEEP (Firestore):** both `j06` territories have empty history subcollections and `null`
`lastVisit`; both designations remain fully `PENDING`; the only difference between the two modes ever
observable in the UI is the maps button's `disabled` state.

## Testability notes

- **Gaps:** no `data-testid` on the info note or the rows — match the note's verbatim text; rows by
  address text; the maps button by its `map-5` icon.
- The expired-date seed (`2020-01-01`) makes this journey deterministic — do **not** compute expiry from
  the wall clock in this spec.
- If the ⚠ defect in UC-WORK-21 is ever fixed (checkbox gated by `isBlocked` instead of `isDisabled`),
  leg 2's assertions flip: checkbox enabled, completion possible — update this journey together with
  UC-WORK-21.

## Sources

- `docs/features/work-designations.md` (UC-WORK-01/04/19/20/21 and the `isDisabled`/`isBlocked` table)
- `docs/features/territories-assign.md` (UC-ASSIGN-13)
- `docs/domain/data-model.md` (§5 baseline designation caveat)
