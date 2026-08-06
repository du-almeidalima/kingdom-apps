import { RoleEnum } from '../../src/models/enums/role';
import { TerritoryIcon } from '../../src/models/territory';
import { VisitOutcomeEnum } from '../../src/models/enums/visit-outcome';
import {
  buildCongregation,
  buildDesignation,
  buildDesignationTerritory,
  buildTerritory,
  buildUser,
  buildVisitHistory,
} from './factories';
import { SeedDefinition } from './types';

/**
 * Stable, well-known ids for the default baseline, so individual tests can reference seeded entities deterministically
 * (e.g., to assert their presence).
 */
export const DEFAULT_SEED_IDS = {
  congregation: 'seed-congregation',
  adminUser: 'seed-user-admin',
  publisherUsers: ['seed-user-publisher-1', 'seed-user-publisher-2', 'seed-user-publisher-3'],
  elderUser: 'seed-user-elder',
  organizerUser: 'seed-user-organizer',
  superintendentUser: 'seed-user-superintendent',
  appAdminUser: 'seed-user-app-admin',
  territories: ['seed-territory-1', 'seed-territory-2', 'seed-territory-3'],
  designation: 'seed-designation',
} as const;

/**
 * Builds the minimal, predictable baseline applied before every test:
 * 1 congregation, 8 users (an ADMIN, 3 PUBLISHERs, and one user per remaining role — ELDER, ORGANIZER,
 * SUPERINTENDENT, APP_ADMIN — so `signInAs` covers the whole `RoleEnum`), 3 territories (with visit
 * history), and 1 designation.
 * Built fresh on each call so callers never share a mutable state between tests.
 */
export function buildDefaultSeed(): SeedDefinition {
  const congregationId = DEFAULT_SEED_IDS.congregation;

  const congregation = buildCongregation({
    id: congregationId,
    name: 'Congregação Jardim Primavera',
    locatedOn: 'São Paulo, SP',
    cities: ['São Paulo', 'Osasco'],
  });

  const admin = buildUser({
    id: DEFAULT_SEED_IDS.adminUser,
    name: 'Carlos Almeida',
    email: 'carlos.almeida@example.com',
    role: RoleEnum.ADMIN,
    congregationId,
  });

  const publisherNames = ['Ana Souza', 'Pedro Lima', 'Mariana Costa'];
  const publishers = DEFAULT_SEED_IDS.publisherUsers.map((id, index) =>
    buildUser({
      id,
      name: publisherNames[index],
      email: `${id}@example.com`,
      role: RoleEnum.PUBLISHER,
      congregationId,
    }),
  );

  // One user per remaining role so `signInAs` can authenticate as any `RoleEnum` (see `ROLE_UIDS`).
  const roleUsers = [
    { id: DEFAULT_SEED_IDS.elderUser, name: 'Marcos Oliveira', role: RoleEnum.ELDER },
    { id: DEFAULT_SEED_IDS.organizerUser, name: 'Ricardo Santos', role: RoleEnum.ORGANIZER },
    {
      id: DEFAULT_SEED_IDS.superintendentUser,
      name: 'Felipe Rodrigues',
      role: RoleEnum.SUPERINTENDENT,
    },
    { id: DEFAULT_SEED_IDS.appAdminUser, name: 'Daniel Ferreira', role: RoleEnum.APP_ADMIN },
  ].map(({ id, name, role }) =>
    buildUser({
      id,
      name,
      email: `${id}@example.com`,
      role,
      congregationId,
    }),
  );

  const territories = [
    buildTerritory({
      id: DEFAULT_SEED_IDS.territories[0],
      congregationId,
      city: 'São Paulo',
      address: 'Rua das Acácias, 45 - Pinheiros',
      icon: TerritoryIcon.COUPLE,
      positionIndex: 0,
      history: [
        buildVisitHistory({
          notes: 'Casal recebeu bem, agendar revisita.',
          date: new Date('2024-03-10T14:30:00.000Z'),
          visitOutcome: VisitOutcomeEnum.REVISIT,
          isRevisit: true,
          name: 'Roberto',
        }),
        buildVisitHistory({
          notes: 'Primeiro contato, demonstraram interesse.',
          date: new Date('2024-02-20T09:15:00.000Z'),
          visitOutcome: VisitOutcomeEnum.SPOKE,
          name: 'Roberto',
        }),
      ],
    }),
    buildTerritory({
      id: DEFAULT_SEED_IDS.territories[1],
      congregationId,
      city: 'Osasco',
      address: 'Av. dos Autonomistas, 1200 - Centro',
      icon: TerritoryIcon.WOMAN,
      positionIndex: 1,
      history: [
        buildVisitHistory({
          notes: 'Não atendeu, tentar em outro horário.',
          date: new Date('2024-03-05T18:00:00.000Z'),
          visitOutcome: VisitOutcomeEnum.NOT_ANSWERED,
          isResolved: false,
          name: 'Helena',
        }),
      ],
    }),
    buildTerritory({
      id: DEFAULT_SEED_IDS.territories[2],
      congregationId,
      city: 'São Paulo',
      address: 'Rua Harmonia, 300 - Vila Madalena',
      icon: TerritoryIcon.MAN,
      positionIndex: 2,
      isBibleStudent: true,
      bibleInstructor: DEFAULT_SEED_IDS.publisherUsers[0],
      history: [
        buildVisitHistory({
          notes: 'Estudo bíblico em andamento.',
          date: new Date('2024-03-12T20:00:00.000Z'),
          visitOutcome: VisitOutcomeEnum.SPOKE,
          isRevisit: true,
          name: 'Fernando',
        }),
      ],
    }),
  ];

  const designation = buildDesignation({
    id: DEFAULT_SEED_IDS.designation,
    congregationId,
    createdBy: DEFAULT_SEED_IDS.adminUser,
    createdAt: new Date('2024-03-01T08:00:00.000Z'),
    expiresAt: new Date('2024-03-08T08:00:00.000Z'),
    territories: [
      buildDesignationTerritory({
        id: DEFAULT_SEED_IDS.territories[0],
        congregationId,
        city: 'São Paulo',
        address: 'Rua das Acácias, 45 - Pinheiros',
        icon: TerritoryIcon.COUPLE,
      }),
    ],
  });

  return {
    congregations: [congregation],
    users: [admin, ...publishers, ...roleUsers],
    territories,
    designations: [designation],
  };
}
