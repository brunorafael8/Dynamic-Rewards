# Jolly Rewards Engine - Project Context

## Overview

**Project:** Dynamic Rewards Rules Engine (Jolly Take-Home Challenge)
**Purpose:** Process employee events (visits) and grant reward points based on configurable rules
**Status:** Backend complete + Mobile app in progress
**Timeline:** Staff/Tech Lead position @ Jolly (Faria Lima, $96K+/yr)

---

## Project Structure

```
/Users/bruno/Projects/jolly-rewards-engine/
├── src/                          # Backend (Node.js/Fastify)
│   ├── db/
│   │   ├── index.ts              # Drizzle + Neon connection
│   │   ├── schema.ts             # Tables: profiles, visits, rewardRules, rewardGrants
│   │   └── seed.ts               # Batch insert from data.json
│   ├── modules/
│   │   ├── profiles/             # GET profiles, GET profiles/:id
│   │   │   ├── profiles.routes.ts
│   │   │   ├── profiles.service.ts
│   │   │   └── profiles.schema.ts
│   │   ├── rules/                # CRUD + rule evaluation engine
│   │   │   ├── rules.routes.ts
│   │   │   ├── rules.service.ts
│   │   │   ├── rules.schema.ts
│   │   │   └── engine/
│   │   │       ├── evaluator.ts       # Batch processing orchestrator
│   │   │       ├── operators.ts       # Pure comparison functions (eq, gt, llm, etc)
│   │   │       ├── llm-evaluator.ts   # OpenAI integration (bonus)
│   │   │       └── types.ts
│   │   ├── events/               # POST /events/process, /process-all
│   │   │   └── events.routes.ts
│   │   └── admin/                # POST /seed, GET /health
│   │       └── admin.routes.ts
│   ├── shared/
│   │   ├── errors.ts             # Custom error classes
│   │   └── env.ts                # Zod env validation
│   ├── app.ts                    # Fastify app + plugins
│   └── server.ts                 # Entry point
├── mobile/                       # Expo app (React Native)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx         # Rules List screen
│   │   │   ├── two.tsx           # Placeholder (to be replaced)
│   │   │   └── _layout.tsx
│   │   ├── _layout.tsx           # Root layout with Tamagui provider
│   │   └── +not-found.tsx
│   ├── components/               # Themed components (default template)
│   ├── constants/
│   │   └── Colors.ts
│   └── package.json
├── data/
│   └── data.json                 # Seed data (100 profiles, 5600 visits)
├── tests/                        # Jest tests
│   ├── engine.test.ts            # Unit tests (operators)
│   └── rules.test.ts             # Integration tests (DB)
├── PLAN-BACKEND.md               # Backend implementation plan
├── PLAN-MOBILE.md                # Mobile app plan
├── README.md                     # API docs + setup
├── Dockerfile
└── package.json
```

---

## Stack

### Backend
| Tech | Version | Purpose |
|------|---------|---------|
| Node.js | 22.14.0 | Runtime (LTS) |
| Fastify | 5.x | Web framework (fast, type-safe) |
| Drizzle ORM | 0.45.x | Type-safe database queries |
| Neon | Serverless | Postgres (serverless, free tier) |
| Zod | 4.x | Schema validation |
| OpenAI | 6.x | LLM bonus feature |
| Biome | 2.x | Linting + formatting |
| Jest + ts-jest | 30.x | Testing |

### Mobile (Expo)
| Tech | Version | Purpose |
|------|---------|---------|
| Expo | 54 | Framework |
| React Native | 0.81.5 | Mobile runtime |
| Expo Router | 6.x | File-based navigation |
| Tamagui | 2.x | UI components + dark mode |
| TanStack Query | 5.x | Data fetching + caching |
| React Hook Form | 7.x | Form handling |
| Zod | 4.x | Validation (shared with backend) |
| Lucide Icons | latest | Iconography |

---

## Database Schema

### Tables (Drizzle ORM)

**profiles** (imported from data.json)
```typescript
{
  id: uuid (PK),
  name: text,
  pointBalance: integer (default 0),
  onboarded: boolean (default false),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**visits** (imported from data.json)
```typescript
{
  id: uuid (PK),
  profileId: uuid (FK → profiles),
  clockInTime: timestamp,
  clockOutTime: timestamp,
  scheduledStartTime: timestamp,
  scheduledEndTime: timestamp,
  correctClockInMethod: boolean,
  documentation: text,
  createdAt: timestamp,
  updatedAt: timestamp
}
Index: profile_id
```

**rewardRules** (created via API)
```typescript
{
  id: uuid (PK),
  name: text,
  description: text,
  eventType: text (default 'visit'),
  conditions: jsonb,           // Array of Condition objects
  points: integer,
  active: boolean (default true),
  createdAt: timestamp,
  updatedAt: timestamp
}
Index: active
```

**rewardGrants** (audit log)
```typescript
{
  id: uuid (PK),
  ruleId: uuid (FK → rewardRules),
  profileId: uuid (FK → profiles),
  visitId: uuid (FK → visits),
  pointsAwarded: integer,
  createdAt: timestamp
}
Unique: (rule_id, visit_id)  // Idempotency
```

---

## Rule DSL (Condition System)

### Condition Structure
```typescript
interface Condition {
  field: string;        // Visit field name (e.g., "clockInTime")
  op: Operator;         // Comparison operator
  value?: unknown;      // Comparison value (optional for not_null/is_null)
}
```

### Available Operators
| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{"field":"correctClockInMethod","op":"eq","value":true}` |
| `neq` | Not equals | `{"field":"documentation","op":"neq","value":null}` |
| `gt` | Greater than | `{"field":"pointBalance","op":"gt","value":1000}` |
| `gte` | Greater or equal | ... |
| `lt` | Less than | ... |
| `lte` | Less or equal | ... |
| `not_null` | Field has value | `{"field":"clockInTime","op":"not_null"}` |
| `is_null` | Field is null | `{"field":"documentation","op":"is_null"}` |
| `lte_field` | Compare to another field | `{"field":"clockInTime","op":"lte_field","value":"scheduledStartTime"}` |
| `gte_field` | Compare to another field | `{"field":"clockOutTime","op":"gte_field","value":"scheduledEndTime"}` |
| `contains` | String contains (case-insensitive) | `{"field":"documentation","op":"contains","value":"urgent"}` |
| `llm` | LLM evaluation (requires OPENAI_API_KEY) | `{"field":"documentation","op":"llm","value":"Is this helpful?"}` |

### Example Rules

**Correct Clock-In Method**
```json
{
  "name": "Correct Clock-In Method",
  "conditions": [
    {"field": "correctClockInMethod", "op": "eq", "value": true}
  ],
  "points": 10
}
```

**Early Clock-In (multi-condition)**
```json
{
  "name": "Early Clock-In",
  "conditions": [
    {"field": "clockInTime", "op": "not_null"},
    {"field": "clockInTime", "op": "lte_field", "value": "scheduledStartTime"}
  ],
  "points": 15
}
```

**LLM-Powered Documentation Check (bonus)**
```json
{
  "name": "Helpful Documentation",
  "conditions": [
    {"field": "documentation", "op": "llm", "value": "Is this documentation helpful and professional?"}
  ],
  "points": 25
}
```

---

## API Endpoints

### Rules Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rules` | Create a reward rule |
| GET | `/rules` | List all rules (?active=true) |
| GET | `/rules/:id` | Get rule by ID |
| PUT | `/rules/:id` | Update a rule |
| DELETE | `/rules/:id` | Soft-delete (set active=false) |

### Event Processing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events/process` | Process specific visit IDs |
| POST | `/events/process-all` | Process all unprocessed visits |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profiles` | List profiles (?limit=20&offset=0) |
| GET | `/profiles/:id` | Profile detail + grant history |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/seed` | Seed database from data.json |
| GET | `/health` | Health check |

**Response Format:** Lists use `{ data: T[], meta: { total, limit, offset } }`

---

## Architecture Patterns

### Rule Engine Core

**File:** `src/modules/rules/engine/evaluator.ts`

**Batch Processing Flow:**
1. Fetch all active rules
2. Fetch visits (by IDs or all)
3. Fetch existing grants in bulk (avoid N+1)
4. For each visit + rule combo:
   - Skip if grant already exists (idempotency via Set lookup)
   - Evaluate conditions against visit fields
   - If match: collect grant + points delta
5. Batch insert grants + batch update balances (in TRANSACTION)
6. Return ProcessResult summary

**Transaction Safety:** Grant inserts + balance updates happen atomically. If fails, rollback.

**Batch Optimization:**
- 1 query for all rules
- 1 query for visits (IN clause or all)
- 1 query for existing grants (IN clause)
- 1 batch insert for new grants (chunks of 500)
- 1 batch update for balances (chunks of 500)

### Operator Dispatch

**File:** `src/modules/rules/engine/operators.ts`

Uses map-based dispatch pattern:
```typescript
const operators: Record<Operator, EvaluatorFn> = {
  eq: (fieldValue, condValue) => fieldValue === condValue,
  gt: (fieldValue, condValue) => fieldValue > condValue,
  // ... more operators
};
```

**Benefits:**
- Add new operator = add 1 entry to map (no core changes)
- Pure functions (easy to test)
- Type-safe

### LLM Integration (Bonus)

**File:** `src/modules/rules/engine/llm-evaluator.ts`

- OpenAI with temperature=0, max_tokens=5, responds "true"/"false"
- Only called when `op === 'llm'` and `OPENAI_API_KEY` exists
- Graceful degradation: skip silently if no API key
- Concurrency limit: max 5 parallel LLM calls (respects rate limits)
- Timeout: 10 seconds per LLM call
- Retry logic: 3 retries with exponential backoff on rate limits/server errors

---

## Resilience Patterns

### Transaction Atomicity

**File:** `src/modules/rules/engine/evaluator.ts:166`

All grant inserts and balance updates happen in a single database transaction:

```typescript
await db.transaction(async (tx) => {
  // Insert grants in chunks
  for (const chunk of chunks) {
    await tx.insert(rewardGrants).values(chunk);
  }

  // Update profile balances
  for (const [profileId, delta] of Object.entries(pointsDelta)) {
    await tx.update(profiles).set(...).where(...);
  }
});
```

**Benefit:** If balance update fails, grants are rolled back. No inconsistent state.

### Idempotency

**Database:** Unique constraint on `(rule_id, visit_id)` prevents duplicate grants
**Application:** Set-based lookup skips already-processed combinations

```typescript
const existingSet = new Set(
  existingGrants.map(g => `${g.ruleId}:${g.visitId}`)
);

if (existingSet.has(grantKey)) {
  continue; // Skip already granted
}
```

**Benefit:** Re-processing visits is safe. No double points awarded.

### LLM Concurrency Throttling

**File:** `src/modules/rules/engine/evaluator.ts:17-20`

Uses `p-limit` to control concurrent LLM calls:

```typescript
const LLM_CONCURRENCY = 5;
const llmLimit = pLimit(LLM_CONCURRENCY);

// Process LLM conditions in parallel with limit
const results = await Promise.all(
  llmConditions.map(condition =>
    llmLimit(() => evaluateLLMCondition(...))
  )
);
```

**Benefit:** Faster than sequential (5x parallel) but respects OpenAI rate limits.

### Timeout Protection

**File:** `src/modules/rules/engine/llm-evaluator.ts:26`

LLM calls timeout after 10 seconds using Promise.race:

```typescript
const response = await Promise.race([
  openai.chat.completions.create({...}),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('LLM timeout')), 10000)
  )
]);
```

**Benefit:** Prevents indefinite hanging on slow/stuck API calls.

### Retry Logic with Exponential Backoff

**File:** `src/modules/rules/engine/llm-evaluator.ts:32`

Uses `p-retry` for transient failures:

```typescript
const response = await pRetry(
  async () => {
    // LLM call with timeout
  },
  {
    retries: 3,
    onFailedAttempt: (error) => {
      const isRetryable =
        error.message.includes('429') ||  // Rate limit
        error.message.includes('500');    // Server error

      if (!isRetryable) {
        throw new AbortError(error.message);
      }
    }
  }
);
```

**Benefit:** Automatic recovery from rate limits and temporary server errors.

### Graceful Degradation

**File:** `src/modules/rules/engine/llm-evaluator.ts:7`

LLM features work without API key:

```typescript
function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null; // Graceful
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// In evaluator
if (!openai) return false; // Skip LLM conditions
```

**Benefit:** System works without LLM. No hard dependency on external service.

### Batch Processing

**File:** `src/modules/rules/engine/evaluator.ts:164`

Inserts in chunks of 500 to avoid overwhelming database:

```typescript
const CHUNK_SIZE = 500;

for (let i = 0; i < grantsToInsert.length; i += CHUNK_SIZE) {
  const chunk = grantsToInsert.slice(i, i + CHUNK_SIZE);
  await tx.insert(rewardGrants).values(chunk);
}
```

**Benefit:** O(1) queries instead of O(N). Handles large datasets efficiently.

### Error Boundaries

**File:** `src/app.ts:25`, `src/modules/rules/engine/evaluator.ts:135`

Errors are caught and collected without stopping processing:

```typescript
try {
  const llmMatch = await evaluateLLMConditionsForVisit(...);
} catch (err) {
  result.errors.push(`LLM error: ${err.message}`);
  continue; // Don't stop processing other visits
}
```

**Benefit:** One failed visit doesn't break entire batch. All errors reported in summary.

---

## Mobile App Design

### Jolly Design System (Extracted)

**Color Palette:**
```typescript
export const jollyColors = {
  light: {
    background: '#F6F8FA',      // Light neutral gray
    color: '#666D80',            // Medium gray (text primary)
    colorSecondary: '#818988',   // Lighter gray (text secondary)
    primary: '#123769',          // Dark blue
    card: '#FFFFFF',
    border: '#E5E7EB',
    accent: 'rgba(18, 55, 105, 0.1)',
  },
  dark: {
    background: '#0F172A',       // Dark slate
    color: '#E2E8F0',            // Light text
    colorSecondary: '#94A3B8',   // Muted light text
    primary: '#3B82F6',          // Bright blue
    card: '#1E293B',
    border: '#334155',
    accent: 'rgba(59, 130, 246, 0.2)',
  },
};
```

**Visual Style:**
- Modern, clean aesthetic
- Gradient-based animations
- Smooth 3D transforms
- Floating, rotated elements
- Professional yet dynamic feel

### Screens (Planned)
1. **Rules List** (`app/(tabs)/index.tsx`) - Browse active rules
2. **Process Visits** (`app/(tabs)/process.tsx`) - Trigger batch processing
3. **Profiles Dashboard** (`app/(tabs)/profiles.tsx`) - View employee points
4. **Create Rule** (`app/rules/create.tsx`) - Dynamic form with condition builder

---

## Development Workflow

### Backend

**Setup:**
```bash
cp .env.example .env          # Add DATABASE_URL
npm install
npm run db:push               # Push schema to Neon
npm run db:seed               # Load sample data
npm run dev                   # Start server on :3000
```

**Test:**
```bash
npm test                      # Jest (unit + integration)
npm run lint                  # Biome check
```

**Build:**
```bash
npm run build                 # TypeScript → dist/
docker build -t jolly-rewards .
```

### Mobile

**Setup:**
```bash
cd mobile
npm install
npm start                     # Expo dev server
```

**Test:**
- Scan QR code with Expo Go
- Test on iOS Simulator: `npm run ios`
- Test on Android: `npm run android`

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Framework** | Fastify | Performance, native schema validation, Pino built-in |
| **ORM** | Drizzle | Type-safe, lightweight, good migration story |
| **DB** | Neon (Postgres) | Serverless, free tier, production-like |
| **Conditions** | JSON DSL | Extensible, parseable, managers can write it |
| **Operators** | Map-based dispatch | Add new operator = 1 entry (no core changes) |
| **Idempotency** | Unique constraint (rule_id + visit_id) | Prevents double grants on re-processing |
| **Transactions** | Atomic grant + balance update (db.transaction) | No partial state if fails, rollback on error |
| **Batch Processing** | Bulk fetch + bulk insert (chunks of 500) | O(1) queries instead of O(N) per visit |
| **Concurrency Control** | p-limit (max 5 concurrent LLM calls) | Faster than sequential, respects rate limits |
| **Timeout** | Promise.race (10s timeout on LLM) | Prevents indefinite hanging |
| **Retry Logic** | p-retry (3 retries with exponential backoff) | Auto-recovery from transient failures (429, 500) |
| **Soft Delete** | active=false on rules | Preserves audit trail |
| **LLM** | Optional (graceful degradation) | Works without API key, no hard dependency |
| **Mobile UI** | Tamagui | Components + dark mode + Tailwind-like syntax |
| **State Management** | TanStack Query | Caching, refetch, mutations |

---

## Patterns & Conventions

### TypeScript
- Strict mode always
- Avoid `any` - use specific types or `unknown`
- Prefer `interface` for objects, `type` for unions/intersections

### Error Handling
- Custom errors: `NotFoundError`, `ValidationError`, `ConflictError`
- Error mapping in Fastify:
  - `ValidationError` → 400
  - `NotFoundError` → 404
  - `ConflictError` → 409
  - Drizzle unique violation → 409
  - Unknown → 500

### Database
- Soft delete: `active: false` (never hard delete)
- Batch operations: chunks of 500
- Transactions for multi-step operations
- Timestamps: `createdAt`, `updatedAt` on all tables

### API
- Pagination: `?limit=N&offset=N` (default limit=20)
- Response envelope for lists: `{ data: T[], meta: { total, limit, offset } }`
- Single resources: return object directly

### Mobile (Expo)
- Components: functional with hooks
- Style: Tamagui components (use $background, $color for theme-aware)
- Navigation: Expo Router (file-based)
- Data: TanStack Query with `queryKey`, `placeholderData`
- Forms: React Hook Form + Zod
- Icons: Lucide React Native

---

## Anti-Patterns (Avoid)

### Backend
❌ NEVER use float for monetary values (use integer cents)
❌ NEVER hard delete (use soft delete with active=false)
❌ NEVER skip transactions for multi-step operations
❌ NEVER use `any` in TypeScript
❌ NEVER commit without running lint (`npm run lint`)

### Mobile
❌ NEVER use StyleSheet.create (use Tamagui components)
❌ NEVER forget placeholderData in TanStack Query
❌ NEVER forget to invalidate cache after mutations
❌ NEVER skip error handling on API calls

### General
❌ NEVER commit with "Co-Authored-By: Claude"
❌ NEVER over-engineer (add features not requested)
❌ NEVER use emojis unless explicitly requested

---

## Testing Strategy

### Unit Tests (backend)
**File:** `tests/engine.test.ts`

- Test operators as pure functions (NO DB)
- Test cases:
  - eq: match true/false
  - neq: match with null
  - not_null / is_null
  - lte_field: time comparison (clockInTime vs scheduledStartTime)
  - contains: string search
  - evaluateAllConditions: multiple conditions (AND logic)
  - Edge cases: missing field → false, wrong type → false

### Integration Tests (backend)
**File:** `tests/rules.test.ts`

- Use real Neon DB (same DB, clean tables before each test)
- Test flow:
  1. Seed → Create rule → Process visits → Check grants created
  2. Verify point balances updated correctly
  3. Verify idempotency (process twice, same result)

---

## Environment Variables

```bash
# Backend (.env)
DATABASE_URL=postgres://...    # Neon connection string (required)
OPENAI_API_KEY=sk-...          # OpenAI API key (optional, for LLM operator)
PORT=3000                      # Server port (default: 3000)

# Mobile (no .env needed - uses localhost:3000 for dev)
```

---

## Git Workflow

### Commit Convention
- Format: `type: brief description` (single line)
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Language: English
- NO body (keep it simple)
- NO "Co-Authored-By: Claude" or AI mentions

### Example Commits
```
feat: add rules CRUD endpoints
feat: implement rule evaluation engine
test: add unit tests for operators
docs: add readme with api docs
chore: add dockerfile for deployment
```

---

## What's Next (Production Roadmap)

If this were production:
- Add webhook support for real-time event ingestion
- Implement rule versioning (track changes over time)
- Add time-based conditions (e.g., "weekday only", "after 6pm")
- Support complex boolean logic (OR, NOT, nested groups)
- Add metrics dashboard (grants per rule, avg processing time)
- Add admin UI for non-technical users
- Implement rate limiting on API endpoints
- Add observability (Sentry, DataDog)

---

## Quick Reference

### Start Backend
```bash
npm run dev
```

### Start Mobile
```bash
cd mobile && npm start
```

### Create Rule (cURL)
```bash
curl -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Early Clock-In",
    "conditions": [
      {"field": "clockInTime", "op": "not_null"},
      {"field": "clockInTime", "op": "lte_field", "value": "scheduledStartTime"}
    ],
    "points": 15
  }'
```

### Process All Visits
```bash
curl -X POST http://localhost:3000/events/process-all | jq
```

### Check Profile Balances
```bash
curl "http://localhost:3000/profiles?limit=5" | jq '.data[] | {name, pointBalance}'
```

---

> **Note:** This is a take-home challenge project for Jolly (Staff/Tech Lead position). Backend is complete with tests. Mobile app is in progress using Expo + Tamagui with Jolly's design system.
