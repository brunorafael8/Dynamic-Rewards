# DynamicRewards - Monorepo Context

**Project:** DynamicRewards - Flexible reward rules engine
**Structure:** Turborepo monorepo with pnpm workspaces
**Status:** Production-ready (Backend + Mobile complete, Admin planned)

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Development (all apps)
pnpm dev

# Build all
pnpm build

# Test (34 tests)
pnpm test

# Lint
pnpm lint

# Work on specific app
pnpm --filter=@dynamic-rewards/backend dev
pnpm --filter=@dynamic-rewards/mobile start
```

---

## Monorepo Structure

```
dynamic-rewards/
├── apps/
│   ├── backend/          # Fastify API (@dynamic-rewards/backend)
│   │   ├── src/
│   │   │   ├── db/                    # Drizzle ORM + Neon
│   │   │   ├── modules/
│   │   │   │   ├── profiles/          # GET /profiles
│   │   │   │   ├── rules/             # CRUD /rules + engine
│   │   │   │   ├── events/            # POST /events/process-all
│   │   │   │   └── admin/             # Health + seed
│   │   │   ├── shared/                # Errors, env validation
│   │   │   ├── app.ts                 # Fastify setup
│   │   │   └── server.ts              # Entry point
│   │   ├── tests/                     # 26 unit + 8 integration
│   │   ├── .env                       # DATABASE_URL, OPENAI_API_KEY
│   │   └── Dockerfile                 # Production build
│   │
│   ├── mobile/           # Expo App (@dynamic-rewards/mobile)
│   │   ├── app/
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx          # Rules List
│   │   │   │   └── two.tsx            # Process Visits
│   │   │   └── _layout.tsx            # Root provider
│   │   ├── lib/
│   │   │   ├── api.ts                 # Axios + TanStack Query
│   │   │   ├── query-keys.ts          # Centralized keys
│   │   │   └── theme-context.tsx      # Dark mode
│   │   ├── app.json                   # Expo config (com.jolly.rewards)
│   │   └── eas.json                   # EAS Build config
│   │
│   └── admin/            # [PLANNED] Next.js Admin Dashboard
│
├── packages/
│   └── shared/           # Shared types + schemas (@dynamic-rewards/shared)
│       └── src/
│           ├── types.ts               # Profile, RewardRule, Condition
│           └── schemas.ts             # Zod validation
│
├── turbo.json            # Turborepo task pipeline
├── pnpm-workspace.yaml   # pnpm workspaces
└── package.json          # Root monorepo
```

---

## Stack

### Backend (`apps/backend`)
| Tech | Version | Purpose |
|------|---------|---------|
| Fastify | 5.x | Web framework |
| Drizzle ORM | 0.45.x | Type-safe queries |
| Neon | Serverless | Postgres database |
| Zod | 4.x | Validation |
| AI SDK | 6.x | LLM integration (Anthropic/OpenAI) |
| Biome | 2.x | Lint + format |
| Jest | 30.x | Testing (34 tests) |

### Mobile (`apps/mobile`)
| Tech | Version | Purpose |
|------|---------|---------|
| Expo | 54 | React Native framework |
| Tamagui | 2.x | UI components + dark mode |
| TanStack Query | 5.x | Data fetching + cache |
| Expo Router | 6.x | File-based routing |
| Expo Image | 3.x | Optimized images |
| React Native Reanimated | 4.x | GPU animations |
| Zod | 4.x | Validation |

### Shared (`packages/shared`)
- TypeScript types (Profile, RewardRule, Condition, Visit)
- Zod schemas (createRuleSchema, updateRuleSchema, conditionSchema)

---

## Database Schema (Drizzle)

**profiles** - Employee records
```typescript
{
  id: uuid,
  name: text,
  pointBalance: integer (default 0),
  onboarded: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**visits** - Employee visit records
```typescript
{
  id: uuid,
  profileId: uuid → profiles.id,
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

**rewardRules** - Configurable reward rules
```typescript
{
  id: uuid,
  name: text,
  description: text,
  eventType: text (default 'visit'),
  conditions: jsonb,  // Array of Condition objects
  points: integer,
  active: boolean (default true),
  createdAt: timestamp,
  updatedAt: timestamp
}
Index: active
```

**rewardGrants** - Audit log
```typescript
{
  id: uuid,
  ruleId: uuid → rewardRules.id,
  profileId: uuid → profiles.id,
  visitId: uuid → visits.id,
  pointsAwarded: integer,
  createdAt: timestamp
}
Unique: (rule_id, visit_id)  // Idempotency
```

---

## Rule Engine DSL

### Condition Structure
```typescript
interface Condition {
  field: string;        // Visit field name
  op: Operator;         // Comparison operator
  value?: unknown;      // Comparison value (optional for not_null/is_null)
}
```

### Available Operators
| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{"field":"correctClockInMethod","op":"eq","value":true}` |
| `neq` | Not equals | `{"field":"documentation","op":"neq","value":null}` |
| `gt` / `gte` / `lt` / `lte` | Numeric comparison | `{"field":"pointBalance","op":"gt","value":100}` |
| `not_null` | Field has value | `{"field":"clockInTime","op":"not_null"}` |
| `is_null` | Field is null | `{"field":"documentation","op":"is_null"}` |
| `lte_field` | <= another field | `{"field":"clockInTime","op":"lte_field","value":"scheduledStartTime"}` |
| `gte_field` | >= another field | `{"field":"clockOutTime","op":"gte_field","value":"scheduledEndTime"}` |
| `contains` | String contains (case-insensitive) | `{"field":"documentation","op":"contains","value":"urgent"}` |
| `llm` | LLM evaluation | `{"field":"documentation","op":"llm","value":"Is this helpful?"}` |

---

## API Endpoints (Backend)

### Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rules` | Create reward rule |
| GET | `/rules` | List rules (?active=true) |
| GET | `/rules/:id` | Get rule by ID |
| PUT | `/rules/:id` | Update rule |
| DELETE | `/rules/:id` | Soft-delete (active=false) |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events/process` | Process specific visit IDs |
| POST | `/events/process-all` | Process all visits |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profiles` | List profiles (?limit=20&offset=0) |
| GET | `/profiles/:id` | Profile detail + grants |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/seed` | Seed from data.json |
| GET | `/health` | Health check |

---

## Turborepo Configuration

### Task Pipeline (`turbo.json`)

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],           // Build dependencies first
      "inputs": ["src/**"],              // Cache invalidation
      "outputs": ["dist/**", ".next/**"] // Cache outputs
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tests/**"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []                      // No outputs (fast)
    },
    "dev": {
      "cache": false,
      "persistent": true                 // Long-running
    }
  }
}
```

### Workspace Dependencies

All apps use shared types:
```typescript
// Backend
import { RewardRule } from '@dynamic-rewards/shared/types';
import { createRuleSchema } from '@dynamic-rewards/shared/schemas';

// Mobile
import { Profile, ProcessResult } from '@dynamic-rewards/shared/types';
```

---

## Key Patterns & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Monorepo** | Turborepo + pnpm | Type-safety across apps, shared code, atomic deploys |
| **Database** | Neon (Postgres) | Serverless, free tier, production-like |
| **ORM** | Drizzle | Type-safe, lightweight, good DX |
| **Conditions** | JSON DSL (array of objects) | Extensible without code changes |
| **Operators** | Map-based dispatch | Add operator = add 1 map entry |
| **Idempotency** | Unique (rule_id, visit_id) | Safe re-processing |
| **Transactions** | Atomic grants + balances | No partial state |
| **Batch Processing** | Bulk fetch + insert (chunks of 500) | O(1) queries vs O(N) |
| **LLM** | Optional (graceful degradation) | Works without API key |
| **Concurrency** | p-limit (max 5 LLM calls) | Respects rate limits |

---

## Environment Variables

### Backend (`.env`)
```bash
DATABASE_URL=postgres://...           # Neon connection (required)
OPENAI_API_KEY=sk-...                 # OpenAI (optional, for LLM operator)
ANTHROPIC_API_KEY=sk-ant-...          # Anthropic (optional, for LLM operator)
PORT=3000                             # Server port (default: 3000)
```

### Mobile
No .env needed (uses localhost:3000 for dev)

---

## Testing

### Backend Tests (34 total)
- **Unit tests** (26) - `tests/engine.test.ts`
  - All operators (eq, neq, gt, lt, contains, lte_field, etc.)
  - Edge cases (null, undefined, missing fields)
  - evaluateAllConditions (AND logic)

- **Integration tests** (8) - `tests/rules.test.ts`
  - Grant creation + balance updates
  - Idempotency
  - Multiple matching rules
  - Complex conditions

---

## Admin Dashboard (Planned)

### Stack (Recommended)
- **Framework:** Next.js 15 (App Router)
- **UI:** Shadcn/ui + Tailwind
- **Data:** TanStack Query (same as mobile)
- **Auth:** Clerk (align with Jolly's stack)
- **Charts:** Recharts or Tremor

### Features (Phase 1)
- Dashboard overview (total points, active rules, grants)
- Rules management (CRUD with visual condition builder)
- Profiles leaderboard
- Processing history
- LLM usage analytics

### Implementation Steps
```bash
# 1. Create admin app
npx create-next-app@latest apps/admin --typescript --tailwind --app

# 2. Install dependencies
cd apps/admin
pnpm add @dynamic-rewards/shared@workspace:*
pnpm add @tanstack/react-query axios zod

# 3. Configure turbo.json
# (already has Next.js build outputs configured)

# 4. Build UI
# - Dashboard (overview metrics)
# - Rules table + modal form
# - Condition builder component
# - Profiles leaderboard
```

---

## Development Workflow

### Add New Feature
1. **Shared types** - Add to `packages/shared/src/types.ts`
2. **Backend** - Add route + service in `apps/backend/src/modules/`
3. **Mobile** - Add screen in `apps/mobile/app/`
4. **Admin** - Add page in `apps/admin/app/` (when exists)

### Run Tasks
```bash
# All packages
pnpm build
pnpm test
pnpm lint

# Specific package
pnpm --filter=@dynamic-rewards/backend dev
pnpm --filter=@dynamic-rewards/mobile start

# Only changed (CI)
turbo run build --affected
turbo run test --affected
```

---

## Git Workflow

### Commit Convention
- Format: `type: brief description` (single line, English)
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- NO body, NO "Co-Authored-By: Claude"

### Branch Strategy
- `main` - production-ready
- `feature/*` - new features
- `fix/*` - bug fixes

---

## Deployment

### Backend
```bash
# Docker build
docker build -t dynamic-rewards-api apps/backend/

# Railway / Render
# Point to apps/backend/Dockerfile
```

### Mobile
```bash
# Development build
cd apps/mobile
eas build --profile development --platform ios

# Production
eas build --profile production --platform all
eas submit
```

### Admin (Future)
```bash
# Vercel
vercel --cwd apps/admin

# Or Netlify/Railway
```

---

## Anti-Patterns (Avoid)

❌ Hard delete (use soft delete with active=false)
❌ Skip transactions for multi-step operations
❌ Use `any` in TypeScript
❌ Forget placeholderData in TanStack Query
❌ Skip cache invalidation after mutations
❌ Use inline objects in FlatList props
❌ Use `&&` for conditional rendering (use ternaries)
❌ Add features not requested (over-engineering)
❌ Commit with "Co-Authored-By: Claude"

---

## Production Readiness Checklist

### Backend
- [x] Type-safe (TypeScript strict)
- [x] Tested (34 tests passing)
- [x] Linted (Biome)
- [x] Documented (README + API docs)
- [x] Dockerized
- [x] Environment validation (Zod)
- [x] Error handling
- [x] Transaction safety
- [x] Idempotency
- [x] Batch processing

### Mobile
- [x] Performance optimized (React Native best practices)
- [x] Dark mode
- [x] Production config (bundle IDs, EAS)
- [x] TanStack Query optimized
- [x] expo-image for all images
- [x] Memoized components
- [x] Stable callbacks

### Admin
- [ ] To be implemented

---

## Next Steps

1. **Create Admin Dashboard** (apps/admin)
   - Next.js 15 + Shadcn
   - Visual rule builder
   - Analytics dashboard

2. **Enhance Rule Engine**
   - OR conditions (currently only AND)
   - Time-based rules (weekday, time range)
   - Rule versioning

3. **Add Observability**
   - Sentry error tracking
   - Metrics (grants/day, avg processing time)
   - LLM usage monitoring

4. **Add Real-time**
   - WebSocket for live updates
   - Server-sent events for processing status

---

> **Note:** This is a take-home challenge for Jolly (Staff/Tech Lead position) demonstrating monorepo architecture, type-safety, and production-ready patterns.
