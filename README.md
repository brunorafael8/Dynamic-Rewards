# Dynamic Rewards Engine

A flexible, data-driven reward engine that lets managers define rules in JSON and automatically awards points when employee events match those rules.

## Quick Start

```bash
# Prerequisites: Node.js >= 20, pnpm >= 8
pnpm install

# Configure database
cp apps/backend/.env.example apps/backend/.env
# Add your DATABASE_URL (Neon PostgreSQL)

# Push schema
cd apps/backend && pnpm db:push && cd ../..
```

### Running the apps

```bash
# Terminal 1 — Backend API
pnpm --filter=@dynamic-rewards/backend dev
# → http://localhost:3000

# Terminal 2 — Admin Dashboard (Next.js)
pnpm --filter=@dynamic-rewards/admin dev
# → http://localhost:3001 (connects to backend at localhost:3000)

# Terminal 3 — Mobile App (Expo)
pnpm --filter=@dynamic-rewards/mobile start
# → Scan QR code with Expo Go (iOS/Android)
#   Uses localhost:3000 by default
```

Once the backend is running, seed sample data:

```bash
curl -X POST http://localhost:3000/seed
```

### Environment variables

```bash
# apps/backend/.env (required)
DATABASE_URL=postgresql://...        # Neon PostgreSQL connection
OPENAI_API_KEY=sk-...                # Optional — enables LLM operators
ANTHROPIC_API_KEY=sk-ant-...         # Optional — alternative LLM provider

# apps/admin/.env.local (optional, defaults to localhost:3000)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

The mobile app uses `localhost:3000` by default. For testing on a physical device, update the API URL in `apps/mobile/lib/api.ts` with your machine's local IP.

## Demo: Create Rule → Ingest Events → See Balances

### 1. Create a rule

```bash
curl -s -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "On-Time Clock In",
    "description": "Reward employees who clock in before scheduled start",
    "event_type": "shift",
    "conditions": [
      { "field": "clockInTime", "op": "lte_field", "value": "scheduledStartTime" },
      { "field": "correctClockInMethod", "op": "eq", "value": true }
    ],
    "points": 15
  }' | jq
```

### 2. Process events against all active rules

```bash
curl -s -X POST http://localhost:3000/events/process-all | jq
```

```json
{
  "totalEvents": 10,
  "rulesEvaluated": 3,
  "grantsCreated": 4,
  "totalPointsAwarded": 60,
  "skippedExisting": 0,
  "errors": []
}
```

### 3. Check updated balances

```bash
curl -s http://localhost:3000/employees | jq '.[] | {name, point_balance}'
```

Or use the **Admin Dashboard** at `localhost:3001` for a visual experience with a condition builder, leaderboard, and batch processing.

## Architecture

```
dynamic-rewards/
├── apps/
│   ├── backend/    Fastify API + Rule Engine           :3000
│   ├── admin/      Next.js 16 Dashboard                :3001
│   └── mobile/     Expo React Native App
├── packages/
│   └── shared/     TypeScript types + Zod schemas
└── turbo.json      Turborepo pipeline
```

| Layer | Tech |
|-------|------|
| API | Fastify 5, Drizzle ORM, Neon Postgres |
| Validation | Zod 4 (shared schemas across all apps) |
| AI | AI SDK 6 (Anthropic / OpenAI) |
| Admin | Next.js 16, Tailwind v4, TanStack Query v5 |
| Mobile | Expo 54, Tamagui, TanStack Query v5 |
| Monorepo | Turborepo + pnpm workspaces |

## Rule Engine

Rules are stored as JSON with a conditions array. The engine evaluates all conditions with AND logic against event metadata:

```json
{
  "name": "Helpful Documentation",
  "event_type": "shift",
  "conditions": [
    { "field": "documentation", "op": "not_null" },
    { "field": "documentation", "op": "llm", "value": "Is this note helpful?" }
  ],
  "points": 25
}
```

### Operators (14 total)

| Type | Operators |
|------|-----------|
| Comparison | `eq`, `neq`, `gt`, `gte`, `lt`, `lte` |
| Null checks | `not_null`, `is_null` |
| Cross-field | `lte_field`, `gte_field` |
| Text | `contains`, `llm`, `sentiment`, `quality_score` |

Adding a new operator = adding one entry to the operator map. Zero changes to core engine code.

### Data Model

```
employees ──< events ──< reward_grants >── reward_rules
              │                              │
              │ metadata: jsonb              │ conditions: jsonb
              │ (flexible per event type)    │ (array of {field, op, value})
```

- **Events** use `metadata: jsonb` — any event type without schema changes
- **Idempotency** via `UNIQUE(rule_id, event_id)` — safe to reprocess
- **Atomic** — grants + balance updates in a single transaction

## Testing

```bash
pnpm test    # 34 tests (26 unit + 8 integration)
pnpm build   # Type-check + build all packages
pnpm lint    # Biome (backend) + ESLint (admin)
```

Unit tests cover all 14 operators, edge cases (null/undefined/missing fields), and the AND-logic evaluator. Integration tests cover grant creation, balance updates, idempotency, and selective event processing.

## Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Rule format | JSON DSL with condition arrays | New rules without code changes |
| Event metadata | Flexible JSONB | Any event type without migrations |
| Operator dispatch | Map-based | O(1) lookup, single-entry extension |
| Idempotency | DB unique constraint | Crash-safe, no app-level dedup |
| Batch processing | Chunked inserts (500) | O(1) queries regardless of dataset size |
| LLM integration | Optional via AI SDK | Graceful degradation without API keys |
| Monorepo | Turborepo + pnpm | Shared types, cached builds |

## LLM Extension (Bonus)

Three AI-powered operators for text evaluation in conditions:

- **`llm`** — sends field value + prompt to LLM, returns boolean judgment
- **`sentiment`** — classifies text as positive/negative
- **`quality_score`** — rates text 1-10, compares against threshold

Concurrency is managed with `p-limit` (max 5 parallel calls). Without an API key, LLM operators return `false` and the engine continues with standard operators.

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/rules` | Create reward rule |
| `GET` | `/rules` | List rules (`?active=true`) |
| `GET` | `/rules/:id` | Get rule details |
| `PUT` | `/rules/:id` | Update rule |
| `DELETE` | `/rules/:id` | Soft-delete (`active=false`) |
| `GET` | `/employees` | List employees (`?limit=20&offset=0`) |
| `GET` | `/employees/:id` | Employee detail + grant history |
| `POST` | `/events/process-all` | Process all events against active rules |
| `POST` | `/events/process` | Process specific event IDs |
| `POST` | `/seed` | Seed sample data |

