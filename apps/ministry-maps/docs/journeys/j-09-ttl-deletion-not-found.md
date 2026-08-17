# J-09 — TTL deletion renders designation not-found screen

An active designation link is opened anonymously and renders normally. A simulated Firestore TTL
data retention purge deletes the designation document from the database. On subsequent navigation
or reload, the client gracefully presents the designation not-found screen.

- **Identities:** Anonymous
- **Priority:** P0
- **Spec file:** `apps/ministry-maps/e2e/tests/work-not-found.spec.ts`
- **Page objects:** `WorkPage`
- **Composes:** UC-WORK-01, UC-WORK-24, UC-TTL-01

---

## Seed

```typescript
const territory = seed.factories.buildTerritory({
  congregationId: seed.ids.congregation,
  address: 'Rua do TTL, 500',
  city: 'São Paulo',
  history: [],
});

const designationTerritory = seed.factories.buildDesignationTerritory({
  id: territory.id,
  congregationId: seed.ids.congregation,
  address: territory.address,
  city: territory.city,
  history: [],
});

const designation = seed.factories.buildDesignation({
  id: `d-ttl-${Math.random().toString(36).slice(2, 10)}`,
  congregationId: seed.ids.congregation,
  territories: [designationTerritory],
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

await seed.write({
  territories: [territory],
  designations: [designation],
});
```

The designation id is generated per run (kept in a local `designationId` variable); substitute it
for `d-ttl-...` in the steps below.

---

## Steps

### Leg 1 — Anonymous publisher opens active designation link (UC-WORK-01)

1. `page.goto('/work/' + designationId)` without signing in.
2. Wait for loading to finish.
3. Assert territories heading and territory row are visible.
4. Assert not-found screen is hidden.

### Leg 2 — Simulate TTL purge via Admin SDK (TTL policy simulation)

1. `await db.firestore.collection(db.collections.designations).doc(designationId).delete()`
2. Verify document is deleted in Firestore.

### Leg 3 — Subsequent navigation renders not-found screen (UC-WORK-24)

1. `page.goto('/work/' + designationId)`
2. Assert `workPage.notFound` wrapper is visible.
3. Assert heading has text `Designação não encontrada`.
4. Assert body paragraphs explain that the designation may have expired or been removed, instructing the publisher to contact their Group Overseer (SG).
5. Assert territory list is hidden.
