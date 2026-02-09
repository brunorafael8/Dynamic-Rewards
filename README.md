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

**Backend** — `apps/backend/.env`
```bash
DATABASE_URL=postgresql://...        # Required — Neon PostgreSQL connection
OPENAI_API_KEY=sk-...                # Optional — enables llm, sentiment, quality_score operators
ANTHROPIC_API_KEY=sk-ant-...         # Optional — alternative LLM provider (either one works)
PORT=3000                            # Optional — defaults to 3000
```

**Admin** — `apps/admin/.env.local`
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000   # Optional — defaults to localhost:3000
```

**Mobile** — `apps/mobile/.env` (optional)
```bash
EXPO_PUBLIC_API_URL=http://localhost:3000   # Optional — defaults to localhost:3000
# For physical devices, use your machine's local IP (e.g. http://192.168.1.100:3000)
```

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

### LLM-Powered Rules (Bonus)

With `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` configured, you can use AI-powered operators:

```bash
# Create an LLM rule
curl -s -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Quality Documentation",
    "event_type": "event",
    "conditions": [
      { "field": "documentation", "op": "not_null" },
      { "field": "documentation", "op": "llm", "value": "Is this documentation thorough and professional?" }
    ],
    "points": 25
  }' | jq

# Process limited events for quick demo (LLM calls take ~1s each)
curl -s -X POST 'http://localhost:3000/events/process-all?limit=10' | jq
```

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

**Hybrid Model Selection (2026 Best Practices):**
The engine automatically routes requests to appropriate models based on task complexity, inspired by [RouteLLM](https://github.com/lm-sys/RouteLLM) (LMSYS/Berkeley):
- **Simple tasks** (<0.4 complexity) → Haiku/GPT-4o-mini ($0.25/$0.15 per M tokens)
- **Complex tasks** (0.4-0.75 complexity) → Sonnet/GPT-4o ($3/$2.5 per M tokens)
- **Ultra-complex tasks** (>0.75 complexity) → Opus/o1-preview ($15/$15 per M tokens)

**Complexity scoring** (weighted 0-1 scale):
- Token count (max 0.4): Longer prompts need stronger models
- Reasoning keywords (0.2): Keywords like "why", "analyze", "evaluate"
- Deep reasoning (0.2): Multi-part comparisons, detailed analysis
- Content length (0.2): Long content to evaluate (>500 chars)

This achieves up to **3.66x cost savings** while maintaining quality ([research](https://arxiv.org/html/2406.18665v1)).

Concurrency is managed with `p-limit` (max 5 parallel calls). Without an API key, LLM operators return `false` and the engine continues with standard operators.

## Advanced LLM Features

### 1. Chain-of-Thought Reasoning 🧠

Every LLM evaluation uses chain-of-thought prompting for better accuracy:

```typescript
// Response includes step-by-step reasoning
{
  "thinking": "1. Key aspects: helpfulness, detail, professionalism\n2. Evidence: mentions specific metrics, uses professional tone\n3. Confidence: High - meets all criteria",
  "match": true,
  "confidence": 0.92,
  "reasoning": "Documentation is thorough with specific details and professional tone"
}
```

Benefits:
- **Higher accuracy** - Model shows its work
- **Explainability** - Understand why decisions were made
- **Debugging** - Identify prompt issues faster

### 2. Semantic Caching 💾

Caches LLM responses using fast embedding-based similarity:

```bash
# First call: ~1000ms (LLM API call)
"Is this documentation good?" → Cache MISS → LLM evaluation

# Similar call: ~5ms (cache hit)
"Is this documentation high quality?" → Cache HIT (87% similar)
```

**How it works:**
- Converts prompts to embeddings using character trigrams (offline, fast)
- Uses cosine similarity to find cached results (threshold: 85%)
- TTL: 1 hour (configurable)

**Benefits:**
- **10-100x faster** for similar queries
- **Zero API cost** for cache hits
- **Works offline** (no external embedding API needed)

### 3. LLM Analytics & Cost Tracking 📊

Comprehensive metrics for monitoring and optimization:

```bash
# Get detailed analytics
curl http://localhost:3000/analytics/llm/summary | jq
```

```json
{
  "summary": {
    "totalCalls": 150,
    "cachedCalls": 45,
    "cacheHitRate": "30.0%",
    "totalCost": "$0.0124",
    "costSavings": "$0.0432",
    "savingsMultiplier": "4.48x",
    "avgLatency": "847ms"
  },
  "complexity": {
    "simple": "75 (50%)",
    "complex": "60 (40%)",
    "ultraComplex": "15 (10%)"
  },
  "models": {
    "claude-haiku-4-5-20251001": 75,
    "claude-sonnet-4-5-20250929": 60,
    "claude-opus-4-6-20250514": 15
  },
  "cache": {
    "entries": 42,
    "totalHits": 45,
    "avgHitsPerEntry": "1.1"
  }
}
```

**Tracks:**
- Model usage distribution (Haiku/Sonnet/Opus)
- Token consumption (input/output)
- Cost per call and total spend
- Latency per model tier
- Cache hit rate and efficiency
- Complexity distribution

**Use cases:**
- **Cost monitoring** - Track spend in real-time
- **Performance optimization** - Identify slow calls
- **Model tuning** - Adjust complexity thresholds
- **ROI demonstration** - Show hybrid routing savings

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Rules** |||
| `POST` | `/rules` | Create reward rule |
| `GET` | `/rules` | List rules (`?active=true`) |
| `GET` | `/rules/:id` | Get rule details |
| `PUT` | `/rules/:id` | Update rule |
| `DELETE` | `/rules/:id` | Soft-delete (`active=false`) |
| **Events** |||
| `POST` | `/events/process-all` | Process all events (`?limit=N` for subset) |
| `POST` | `/events/process` | Process specific event IDs |
| **Employees** |||
| `GET` | `/employees` | List employees (`?limit=20&offset=0`) |
| `GET` | `/employees/:id` | Employee detail + grant history |
| **Analytics** |||
| `GET` | `/analytics/llm` | Full LLM metrics (JSON) |
| `GET` | `/analytics/llm/summary` | Formatted summary for display |
| `DELETE` | `/analytics/llm` | Reset analytics + cache |
| **Admin** |||
| `POST` | `/seed` | Seed sample data |
| `GET` | `/health` | Health check |

