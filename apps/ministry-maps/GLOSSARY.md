# Ministry Maps

Territory assignment, visit tracking, and congregation administration for field ministry.

## Language

### Congregation & Geography

**Congregation** (_Congregação_):
An autonomous local group of publishers that owns and works a set of territories across one or more cities.
_Avoid_: Configuration, tenant, organization, church

**Congregation Settings** (_Configurações da Congregação_):
Congregation-level policy governing how long designations remain valid and whether expired designations block further visit actions.
_Avoid_: Global config, app settings

**City** (_Cidade_):
A municipality or geographic area within a congregation's coverage under which territories are grouped and ordered.
_Avoid_: Region, zone, neighborhood

**Territory** (_Território_):
A single household or address to be visited in the ministry, not a map polygon or neighborhood block.
_Avoid_: Map area, block, address card

### Ministry & Visits

**Designation** (_Designação_):
A time-bound list of territories assigned to a publisher to work during a period.
_Avoid_: Assignment, task list, work order

**Designation Session** (_Sessão de Designações_):
An active cycle grouping all designations created by a congregation before the session is closed.
_Avoid_: Batch, campaign

**Visit** (_Visita_):
A recorded contact attempt at a territory, capturing the date, outcome, and notes.
_Avoid_: Call, log entry, check-in

**Revisit** (_Revisita_):
A follow-up visit requested or agreed to by the householder during a previous contact.
_Avoid_: Return call, callback

**Bible Student** (_Estudante da Bíblia_):
A householder at a territory who is conducting an ongoing Bible study with a designated instructor.
_Avoid_: Student, learner

**Alert** (_Alerta_):
An unresolved attention marker on a territory triggered by a visit outcome (such as a householder moving, asking not to be visited, or requesting a revisit).
_Avoid_: Notification, flag, warning

### People & Roles

**Person / User** (_Pessoa_):
A member associated with a congregation who holds a role granting specific permissions in the system.
_Avoid_: Account, member, profile

**Invitation Link** (_Link de Convite_):
A single-use onboarding link generated for a congregation that grants a specific role to the recipient upon sign-in.
_Avoid_: Registration token, magic link

**Publisher** (_Publicador_):
A congregation member who receives and works territory designations via shared links.

**Organizer** (_Organizador_):
A brother who organizes field-service group work and assigns territories.

**Elder** (_Ancião_):
A congregation overseer who manages territories, resolves visit alerts, and reviews statistics.

**Congregation Admin** (_Admin_):
The congregation administrator (typically the service overseer) responsible for managing the congregation's cities, territories, people, and invitation links.
_Avoid_: Super user, owner

**Superintendent** (_Superintendente_):
A circuit overseer who visits and inspects multiple congregations and can switch between them.

**App Admin** (_App Admin._):
The system maintainer with cross-congregation access and the ability to provision new congregations.
