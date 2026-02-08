# Jolly Take-Home: Dynamic Rewards Rules Engine

## Context

Desafio técnico para vaga Staff/Tech Lead na Jolly (Faria Lima, $96K+/yr).
Objetivo: construir um reward engine que armazena regras de recompensa e processa eventos de funcionários, concedendo pontos quando regras são atendidas.

**Constraint:** 4 horas. Simple, working code > half-finished ambition.

**Dados reais fornecidos (data.json):**
- 100 profiles (id, name, pointBalance, onboarded)
- 5,600 visits (id, profileId, clockInTime, clockOutTime, scheduledStartTime, scheduledEndTime, correctClockInMethod, documentation, createdAt, updatedAt)
- ~50% visits têm clockIn, ~50% têm docs, ~50% correctMethod true

**Insight crítico:** O PDF fala em "Employee" + "Event" genéricos, mas os dados reais usam **profiles** e **visits** com campos flat (sem metadata JSON). A arquitetura precisa trabalhar com esses dados reais.

**Critérios de avaliação (do PDF):**
- Problem solving: breaking into clear, smaller steps
- Rule flexibility: add a new rule without touching core code
- Clarity: clean structure, clear names, concise README
- Code quality: readable, idiomatic, small functions, lint passes
- Bonus: thoughtful LLM extension, neat UI touches, good test coverage

---

## Stack

| Tool | Version | Why |
|------|---------|-----|
| Node.js | 22.14.0 (LTS) | Instalado, alinhado com Jolly |
| Fastify | latest | Rápido, schema validation nativa, TypeScript-first |
| Drizzle ORM | latest | Type-safe queries, migration kit |
| Neon | serverless | Postgres real, free tier, production-ready |
| Zod | latest | Runtime validation |
| Biome | latest | Lint + format all-in-one |
| Jest + ts-jest | latest | Testes (industry standard) |
| OpenAI SDK | latest | LLM bonus feature |

---

## Project Structure

```
/Users/bruno/Projects/jolly-rewards-engine/
├── src/
│   ├── db/
│   │   ├── index.ts              # Drizzle + Neon connection
│   │   ├── schema.ts             # Drizzle table definitions
│   │   └── seed.ts               # Seed from data.json
│   ├── modules/
│   │   ├── profiles/
│   │   │   ├── profiles.routes.ts
│   │   │   ├── profiles.service.ts
│   │   │   └── profiles.schema.ts    # Zod schemas
│   │   ├── visits/
│   │   │   ├── visits.routes.ts
│   │   │   ├── visits.service.ts
│   │   │   └── visits.schema.ts
│   │   └── rules/
│   │       ├── rules.routes.ts
│   │       ├── rules.service.ts
│   │       ├── rules.schema.ts
│   │       └── engine/
│   │           ├── evaluator.ts       # Core rule evaluation logic
│   │           ├── operators.ts       # Condition operators (eq, gt, lte_field, etc.)
│   │           ├── llm-evaluator.ts   # LLM-powered rule evaluation (bonus)
│   │           └── types.ts           # Engine-specific types
│   ├── shared/
│   │   ├── errors.ts             # Custom error classes
│   │   └── logger.ts             # Pino logger (Fastify default)
│   ├── app.ts                    # Fastify app setup + plugin registration
│   └── server.ts                 # Entry point
├── tests/
│   ├── engine.test.ts            # Unit tests for rule evaluation
│   ├── rules.test.ts             # Integration tests for rules API
│   └── helpers.ts                # Test utilities
├── data/
│   └── data.json                 # Seed data (provided by Jolly)
├── drizzle/                      # Generated migrations
├── .env.example
├── .nvmrc                        # 22
├── biome.json
├── drizzle.config.ts
├── jest.config.ts
├── tsconfig.json
├── Dockerfile                    # "Ready to deploy" (deliverable)
├── .dockerignore
├── package.json
└── README.md
```

---

## Database Schema (Drizzle)

### `src/db/schema.ts`

**profiles** — imported from data.json
```typescript
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  pointBalance: integer('point_balance').notNull().default(0),
  onboarded: boolean('onboarded').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**visits** — imported from data.json
```typescript
export const visits = pgTable('visits', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id),
  clockInTime: timestamp('clock_in_time'),
  clockOutTime: timestamp('clock_out_time'),
  scheduledStartTime: timestamp('scheduled_start_time'),
  scheduledEndTime: timestamp('scheduled_end_time'),
  correctClockInMethod: boolean('correct_clock_in_method').default(false),
  documentation: text('documentation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**rewardRules** — created by managers via API
```typescript
export const rewardRules = pgTable('reward_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  eventType: text('event_type').notNull().default('visit'),
  conditions: jsonb('conditions').notNull(),  // Condition DSL (array)
  points: integer('points').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**rewardGrants** — audit log (idempotency key: rule_id + visit_id)
```typescript
export const rewardGrants = pgTable('reward_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: uuid('rule_id').notNull().references(() => rewardRules.id),
  profileId: uuid('profile_id').notNull().references(() => profiles.id),
  visitId: uuid('visit_id').notNull().references(() => visits.id),
  pointsAwarded: integer('points_awarded').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueGrant: unique().on(table.ruleId, table.visitId), // Idempotency
}));
```

---

## Condition DSL

O condition é um array de objetos. Todas as condições devem ser verdadeiras (AND implícito).

### Operators disponíveis:

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals value | `{ "field": "correctClockInMethod", "op": "eq", "value": true }` |
| `neq` | Not equals | `{ "field": "documentation", "op": "neq", "value": null }` |
| `gt` | Greater than | `{ "field": "pointBalance", "op": "gt", "value": 1000 }` |
| `gte` | Greater/equal | ... |
| `lt` | Less than | ... |
| `lte` | Less/equal | ... |
| `not_null` | Field is not null | `{ "field": "clockInTime", "op": "not_null" }` |
| `is_null` | Field is null | `{ "field": "documentation", "op": "is_null" }` |
| `lte_field` | <= another field | `{ "field": "clockInTime", "op": "lte_field", "value": "scheduledStartTime" }` |
| `gte_field` | >= another field | ... |
| `contains` | String contains | `{ "field": "documentation", "op": "contains", "value": "follow-up" }` |
| `llm` | LLM evaluation | `{ "field": "documentation", "op": "llm", "value": "Is this helpful?" }` |

### Example rules:

```json
{
  "name": "Correct Clock-In Method",
  "eventType": "visit",
  "conditions": [
    { "field": "correctClockInMethod", "op": "eq", "value": true }
  ],
  "points": 10
}
```

```json
{
  "name": "Early Clock-In",
  "eventType": "visit",
  "conditions": [
    { "field": "clockInTime", "op": "not_null" },
    { "field": "clockInTime", "op": "lte_field", "value": "scheduledStartTime" }
  ],
  "points": 15
}
```

```json
{
  "name": "Helpful Documentation",
  "eventType": "visit",
  "conditions": [
    { "field": "documentation", "op": "llm", "value": "Is this visit documentation helpful and professional?" }
  ],
  "points": 25
}
```

---

## API Endpoints

### Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rules` | Create a reward rule |
| GET | `/rules` | List all rules (filter: ?active=true) |
| GET | `/rules/:id` | Get rule by ID |
| PUT | `/rules/:id` | Update a rule |
| DELETE | `/rules/:id` | Soft-delete (set active=false) |

### Events (Visit Processing)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events/process` | Process a batch of visit IDs against all active rules |
| POST | `/events/process-all` | Process ALL unprocessed visits |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profiles` | List all profiles (?limit=20&offset=0) |
| GET | `/profiles/:id` | Profile detail + grant history |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/seed` | Seed database from data.json (batch inserts in chunks of 500) |
| GET | `/health` | Health check |

**Pagination:** List endpoints support `?limit=N&offset=N` (default limit=20).
**Response envelope:** `{ data: T[], meta: { total, limit, offset } }` para listas.

---

## Rule Engine Core (`src/modules/rules/engine/`)

### `evaluator.ts` — Orquestra a avaliação

```
processVisits(visitIds?: string[])
  1. Fetch all active rules
  2. Fetch visits (by IDs or all)
  3. Fetch existing grants in bulk (avoid N+1)
  4. For each visit:
     → for each active rule:
       → skip if grant already exists (idempotency via Set lookup)
       → evaluate conditions against visit fields
       → if match: collect grant + points delta
  5. Batch insert grants + batch update balances (in TRANSACTION)
  6. Return ProcessResult summary
```

**Transaction safety:** Grant inserts + balance updates happen atomically.
Se falhar no meio, nada é persistido (rollback).

**Batch optimization:** Em vez de 1 query por visit/rule combo, faz:
- 1 query para buscar todas as rules
- 1 query para buscar visits (com IN clause ou all)
- 1 query para buscar existing grants (com IN clause)
- 1 batch insert para novos grants
- 1 batch update para balances

### `operators.ts` — Funções puras de comparação

```typescript
type Operator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'not_null' | 'is_null' | 'lte_field' | 'gte_field' | 'contains';

function evaluateCondition(condition: Condition, record: Record<string, unknown>): boolean
function evaluateAllConditions(conditions: Condition[], record: Record<string, unknown>): boolean
```

Cada operator é uma função pura, fácil de testar e estender.
Recebe `Record<string, unknown>` para ser genérico (não acoplado a Visit).

### `llm-evaluator.ts` — LLM bonus

```typescript
async function evaluateLLMCondition(
  fieldValue: string,
  prompt: string
): Promise<boolean>
```

Usa OpenAI com temperature=0, max_tokens=5, responde "true"/"false".
Só é chamado quando `op === 'llm'` e `OPENAI_API_KEY` existe.
Sem API key → skip silenciosamente (graceful degradation).

**LLM throttling:** Processa LLM conditions com concurrency limit (p-limit ou manual).
Max 5 concurrent LLM calls para não estourar rate limits.

### `ProcessResult` — Response type

```typescript
interface ProcessResult {
  totalVisits: number;
  totalRulesEvaluated: number;
  grantsCreated: number;
  totalPointsAwarded: number;
  skippedExisting: number;
  errors: string[];
  duration: number; // ms
}
```

---

## Implementation Steps

### Step 1: Project Bootstrap (~20min)
1. `mkdir /Users/bruno/Projects/jolly-rewards-engine && cd` nele
2. `npm init -y` + `git init`
3. Install deps: `fastify`, `@fastify/cors`, `drizzle-orm`, `@neondatabase/serverless`, `zod`, `dotenv`, `openai`
4. Install devDeps: `typescript`, `@types/node`, `tsx`, `drizzle-kit`, `@biomejs/biome`, `jest`, `ts-jest`, `@types/jest`
5. `npx tsc --init` com strict mode, paths: `{ "@/*": ["./src/*"] }`
6. `npx @biomejs/biome init`
7. `.nvmrc` → `22`
8. `.env.example` com `DATABASE_URL`, `OPENAI_API_KEY` (optional), `PORT` (default 3000)
9. `.gitignore` (node_modules, dist, .env, drizzle/meta)
10. `package.json` scripts: `dev`, `build`, `start`, `test`, `lint`, `format`, `db:generate`, `db:push`, `db:seed`
11. Copiar `data.json` para `data/`
12. **Commit:** `feat: bootstrap project with fastify and drizzle`

**Nota:** Usar `tsx` ao invés de `ts-node` (mais rápido, ESM nativo).
**Nota:** Pino já vem built-in no Fastify (não precisa instalar separado).

### Step 2: Database + Schemas (~25min)
1. Criar `src/db/schema.ts` com todas as tables + indexes
   - Index em `visits.profile_id` (FK lookup)
   - Index em `reward_grants(rule_id, visit_id)` (unique + idempotency)
   - Index em `reward_rules.active` (filter active rules)
2. Criar `src/db/index.ts` com Drizzle + Neon connection
3. Criar `drizzle.config.ts`
4. `npx drizzle-kit push` → apply to Neon (direto, sem migrations neste momento)
5. Criar `src/db/seed.ts`:
   - Batch insert profiles (100 rows, 1 chunk)
   - Batch insert visits (5,600 rows, chunks of 500)
   - Clear tables before seed (truncate cascade)
   - Log progress
6. **Commit:** `feat: add database schema and seed script`

### Step 3: Shared Utilities + App Setup (~15min)
1. `src/shared/errors.ts` → `NotFoundError`, `ValidationError`, `ConflictError`
2. `src/shared/env.ts` → Validate env vars with Zod on startup (fail fast)
3. `src/app.ts` → Fastify instance + CORS + error handler (map custom errors → HTTP codes)
4. `src/server.ts` → Entry point (env validation → app.listen)
5. **Commit:** `feat: add app setup with error handling`

**Error mapping:**
- `ValidationError` → 400
- `NotFoundError` → 404
- `ConflictError` → 409
- Drizzle unique violation → 409
- Unknown → 500

### Step 4: Profiles Module (~15min)
1. `profiles.schema.ts` → Zod schemas para query params (pagination)
2. `profiles.service.ts` → list (paginated), getById (com grant history via join)
3. `profiles.routes.ts` → GET /profiles, GET /profiles/:id
4. **Commit:** `feat: add profiles module`

### Step 5: Rules Module (~25min)
1. `rules.schema.ts` → Zod schemas (create, update, condition validation)
   - Validate condition structure (field, op, value)
   - Validate operator is in allowed list
2. `rules.service.ts` → CRUD operations (soft delete via active=false)
3. `rules.routes.ts` → POST/GET/PUT/DELETE
4. **Commit:** `feat: add rules CRUD module`

### Step 6: Rule Engine (~50min) ← CORE
1. `engine/types.ts` → Condition type, Operator enum, ProcessResult
2. `engine/operators.ts` → Pure functions (um por operator)
   - Map de operators: `Record<Operator, (fieldValue, condValue, record) => boolean>`
   - Facilita adicionar novos operators sem if/else chain
3. `engine/evaluator.ts` → processVisits orchestrator
   - Batch fetch (visits, rules, existing grants)
   - Transaction: insert grants + update balances
   - Return ProcessResult com summary
4. `engine/llm-evaluator.ts` → OpenAI integration (bonus)
   - Concurrency limit (max 5 parallel calls)
   - Timeout per call (10s)
   - Graceful skip if no API key
5. Wire up: `events.routes.ts` → POST /events/process, POST /events/process-all
6. **Commit:** `feat: implement rule evaluation engine`

### Step 7: Seed + Health (~10min)
1. POST /seed → runs seed.ts (batch inserts, chunks of 500)
2. GET /health → `{ status: 'ok', timestamp, version }`
3. **Commit:** `feat: add seed and health endpoints`

### Step 8: Tests (~35min)
1. `tests/helpers.ts` → Mock data factories (buildVisit, buildRule)
2. `tests/engine.test.ts` → **Unit tests** (operators, pure functions - NO DB)
   - eq: match true/false
   - neq: match with null
   - not_null / is_null
   - lte_field: time comparison (clockInTime vs scheduledStartTime)
   - contains: string search
   - evaluateAllConditions: multiple conditions (AND logic)
   - Edge cases: missing field returns false, wrong type returns false
3. `tests/rules.test.ts` → **Integration tests** (with real Neon DB)
   - Seed → Create rule → Process visits → Check grants created
   - Verify point balances updated correctly
   - Verify idempotency (process twice, same result)
4. **Commit:** `test: add unit and integration tests for rule engine`

**Test strategy:** Unit tests mockam DB (pure functions). Integration tests usam Neon real (mesmo DB, tabelas limpas antes de cada test).

### Step 9: Dockerfile (~5min)
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```
**Commit:** `chore: add dockerfile`

### Step 10: README + Polish (~25min)
1. README.md (conciso, sem parecer AI):
   - Quick start: 4 comandos
   - API reference: tabela com endpoints
   - Rule DSL: operators + examples
   - Architecture: 1 parágrafo + folder structure
   - Design decisions: 3-4 tradeoffs curtos
   - What's next: 4-5 bullet points
2. cURL examples inline no README (mais prático que Postman)
3. Review geral: biome lint, naming, typos
4. **Commit:** `docs: add readme with setup and api docs`

### Commit Strategy (parecer natural):
```
1. feat: bootstrap project with fastify and drizzle
2. feat: add database schema and seed script
3. feat: add app setup with error handling
4. feat: add profiles module
5. feat: add rules CRUD module
6. feat: implement rule evaluation engine
7. feat: add seed and health endpoints
8. test: add unit and integration tests for rule engine
9. chore: add dockerfile
10. docs: add readme with setup and api docs
11. feat: add llm-powered rule evaluation (se der tempo)
```

---

## Verification

### Manual Testing Flow:
```bash
# 1. Setup
cp .env.example .env  # Add Neon DATABASE_URL
npm install
npm run db:migrate
npm run dev

# 2. Seed data
curl -X POST http://localhost:3000/seed

# 3. Check profiles
curl http://localhost:3000/profiles | jq '.[0]'

# 4. Create a rule
curl -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -d '{"name":"Correct Method","conditions":[{"field":"correctClockInMethod","op":"eq","value":true}],"points":10}'

# 5. Process all visits
curl -X POST http://localhost:3000/events/process-all

# 6. Check updated balances
curl http://localhost:3000/profiles | jq '.[0].pointBalance'

# 7. Verify idempotency (run again, balance should NOT change)
curl -X POST http://localhost:3000/events/process-all
curl http://localhost:3000/profiles | jq '.[0].pointBalance'
```

### Automated Tests:
```bash
npm test
```

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| **ORM** | Drizzle | Type-safe, lightweight, good migration story |
| **DB** | Neon (Postgres) | Real DB, serverless, free tier, production-like |
| **Framework** | Fastify | Performance, native schema validation, Pino built-in |
| **Conditions** | JSON DSL (array of objects) | Extensible, parseable, managers can write it |
| **Operators** | Map-based dispatch | Add new operator = add 1 entry to map (no core changes) |
| **Idempotency** | Unique constraint (rule_id + visit_id) | Prevents double grants on re-processing |
| **Transactions** | Atomic grant insert + balance update | No partial state if something fails |
| **Batch processing** | Bulk fetch + bulk insert | O(1) queries instead of O(N) per visit |
| **Pagination** | limit/offset on list endpoints | Handles large datasets |
| **Soft delete** | active=false on rules | Preserves audit trail |
| **LLM** | Optional (graceful degradation) | Works without API key, throttled (max 5 concurrent) |
| **Tooling** | Biome | Fast, all-in-one, modern |
| **Docker** | Simple Dockerfile | "Ready to deploy" deliverable |
| **Env validation** | Zod on startup | Fail fast with clear error messages |

---

## Skills a Usar na Implementação

| Fase | Skill | Motivo |
|------|-------|--------|
| Step 6-7 (Rules + Engine) | `create-feature` | Criar módulos com patterns corretos |
| Step 9 (Tests) | `test` | Gerar testes com boa cobertura |
| Antes de cada commit | `review-staged` | Revisar código antes de commitar |
| Commits | `commit` | Commits limpos e padronizados |
| Se houver bugs | `debug` / `fix` | Debug e correção rápida |
| Final | `review-staged` | Review geral antes de submeter |

---

## Anti-AI Checklist

Para não parecer gerado por AI:
- [ ] Sem emoji headers no README (usar ## simples)
- [ ] Sem "Welcome to..." ou "This project..." genéricos
- [ ] Commits progressivos e naturais (não 1 commit gigante)
- [ ] Sem comentários óbvios (// Get user by id)
- [ ] Variáveis práticas, não excessivamente descritivas
- [ ] README conciso e direto
- [ ] Sem Co-Authored-By
- [ ] Sem over-documentation
- [ ] Alguns TODOs reais onde faz sentido
- [ ] Commit history que conta uma história natural
