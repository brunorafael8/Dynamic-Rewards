# Jolly Rewards Engine

Dynamic rules engine for processing employee events and granting reward points. Built for the Jolly take-home challenge.

## Quick Start

### Backend API

```bash
cp .env.example .env          # Add your DATABASE_URL
npm install
npm run db:push               # Push schema to database
npm run db:seed               # Load sample data
npm run dev                   # Start server on :3000
```

### Mobile App (Bonus)

Premium React Native app built with Expo, Tamagui, and Jolly's design system.

```bash
cd mobile
npm install
npm start                     # Start Expo dev server
```

Scan the QR code with Expo Go to test on your device.

**Features:**
- Jolly design system (extracted colors + visual style)
- Dark mode with smooth theme transitions
- View and manage reward rules
- Process visits with real-time feedback
- Native-feel UX with Tamagui components

## API Reference

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

### Profiles & Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profiles` | List profiles (?limit=20&offset=0) |
| GET | `/profiles/:id` | Profile detail + grant history |
| POST | `/seed` | Seed database from data.json |
| GET | `/health` | Health check |

## Rule DSL

Rules are defined using a flexible JSON DSL. Each rule has a name, conditions (array), and points value.

### Available Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{"field":"correctClockInMethod","op":"eq","value":true}` |
| `neq` | Not equals | `{"field":"documentation","op":"neq","value":null}` |
| `gt` / `gte` | Greater than (or equal) | `{"field":"pointBalance","op":"gt","value":1000}` |
| `lt` / `lte` | Less than (or equal) | `{"field":"pointBalance","op":"lte","value":500}` |
| `not_null` | Field has value | `{"field":"clockInTime","op":"not_null"}` |
| `is_null` | Field is null | `{"field":"documentation","op":"is_null"}` |
| `lte_field` | Compare to another field | `{"field":"clockInTime","op":"lte_field","value":"scheduledStartTime"}` |
| `gte_field` | Compare to another field | `{"field":"clockOutTime","op":"gte_field","value":"scheduledEndTime"}` |
| `contains` | String contains (case-insensitive) | `{"field":"documentation","op":"contains","value":"urgent"}` |
| `llm` | LLM evaluation (requires API key) | `{"field":"documentation","op":"llm","value":"Is this professional?"}` |

### Example Rules

**Reward correct clock-in method:**
```bash
curl -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Correct Clock-In Method",
    "conditions": [
      {"field": "correctClockInMethod", "op": "eq", "value": true}
    ],
    "points": 10
  }'
```

**Reward early clock-in:**
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

**LLM-powered documentation check (bonus feature):**
```bash
curl -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Helpful Documentation",
    "conditions": [
      {"field": "documentation", "op": "llm", "value": "Is this documentation helpful and professional?"}
    ],
    "points": 25
  }'
```

## Processing Events

Process all visits against active rules:

```bash
curl -X POST http://localhost:3000/events/process-all | jq
```

Response:
```json
{
  "totalVisits": 5600,
  "totalRulesEvaluated": 5600,
  "grantsCreated": 2800,
  "totalPointsAwarded": 28000,
  "skippedExisting": 0,
  "errors": [],
  "durationMs": 1234
}
```

Check updated balances:
```bash
curl "http://localhost:3000/profiles?limit=5" | jq '.data[] | {name, pointBalance}'
```

## Architecture

The engine separates concerns into modules: profiles, visits, rules, and events. The rule engine core uses a map-based operator dispatch pattern, making it easy to add new operators without touching existing code. All grant inserts and balance updates happen in chunks with proper idempotency (unique constraint on rule_id + visit_id).

```
src/
├── db/                      # Drizzle schema + seed
├── modules/
│   ├── profiles/            # Profile endpoints
│   ├── rules/               # CRUD + engine
│   │   └── engine/
│   │       ├── evaluator.ts      # Orchestrates batch processing
│   │       ├── operators.ts      # Pure comparison functions
│   │       ├── llm-evaluator.ts  # OpenAI integration (bonus)
│   │       └── types.ts
│   ├── events/              # Process visits
│   └── admin/               # Seed + health
└── shared/                  # Errors, env validation
```

## Design Decisions

**Batch processing over loops:** Fetches all rules/visits/grants upfront with 3 queries instead of N queries per visit. Grants and balance updates happen in chunks of 500.

**Idempotency via unique constraint:** Database enforces one grant per rule+visit combo. Re-processing the same visits is safe and won't double-award points.

**Operator extensibility:** Adding a new operator means adding one entry to the operators map. No changes to core evaluation logic.

**Soft delete on rules:** Setting active=false preserves audit trail while excluding rules from future processing.

**LLM as optional bonus:** Works without OPENAI_API_KEY (graceful degradation). Throttled to 5 concurrent calls to respect rate limits.

## What's Next

If this were production:
- Add webhook support for real-time event ingestion
- Implement rule versioning (track changes over time)
- Add time-based conditions (e.g., "weekday only", "after 6pm")
- Support complex boolean logic (OR, NOT, nested groups)
- Add metrics dashboard (grants per rule, avg processing time)

## Tests

```bash
npm test                     # Run all tests
npm run lint                 # Check code style
```

Unit tests cover operator logic (pure functions). Integration tests validate the full flow with a real database.

## Deployment

```bash
docker build -t jolly-rewards .
docker run -p 3000:3000 -e DATABASE_URL=<url> jolly-rewards
```

---

Built with Fastify, Drizzle ORM, Neon (Postgres), Zod, and OpenAI.
