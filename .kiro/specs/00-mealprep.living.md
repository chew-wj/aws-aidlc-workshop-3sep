# Living Spec: MealPrep

> **Last Updated**: 2026-09-03T00:25:00Z
> **Phase**: 🟢 Building
> **Current Stage**: Stage 2 — Meal calendar (next)
> **Project Type**: Greenfield
> **Owner**: @chew
> **Drift Score**: 0%

## Current Status
- **Next Action**: Implement Stage 2 (Meal calendar)
- **Blockers**: None
- **Last Completed**: Stage 0 (scaffold + shared modules) and Stage 1 (Recipes CRUD) — typecheck clean, 9/9 tests passing

---

## 1. Intent

### Problem Statement
Busy professionals want to eat home-cooked meals but lose significant time each week deciding what to cook and assembling grocery lists. The manual process is repetitive, error-prone (forgotten ingredients, duplicate purchases), and discourages consistent meal planning.

### Hypothesis
| Element | Description |
|---------|-------------|
| Problem | Weekly meal planning and grocery list creation is slow and tedious |
| Solution | Plan a week of meals in ~5 minutes and auto-generate a consolidated grocery list |
| Customer | Busy working professionals who cook at home |
| Value Prop | Saves 2+ hours per week; no forgotten or duplicate ingredients |

### Success Criteria
| Criteria | Target | Current | Status |
|----------|--------|---------|--------|
| 🎯 Primary | 40% weekly active users after 4 weeks | - | ⬚ |
| 📈 Secondary | 5+ meals planned per week per active user | - | ⬚ |

### Failure Triggers
- [ ] Users plan fewer than 3 meals/week on average after 4 weeks
- [ ] Weekly active retention below 15% after 4 weeks
- [ ] Grocery list generation is inaccurate enough that users abandon it

### Scope
**In Scope (MVP):**
- Recipe library (add custom recipes)
- Weekly meal calendar
- Auto-generated grocery list from meal plan
- Grocery list with check-off
- Serving size adjustment

**Out of Scope (MVP):**
- Nutrition tracking
- Recipe sharing / social features
- Pantry inventory management
- Grocery delivery / store integrations
- Mobile native apps (web/API first)

---

## 2. Requirements

### ⚠️ QUESTIONNAIRE - ACTION REQUIRED

> **🛑 STOP: Complete this questionnaire before proceeding to Architecture.**

#### Q1: Persistence / Data Store
**Question:** How should recipes, meal plans, and grocery lists be stored?
**Options:** A) DynamoDB (serverless-native, single-table) B) Serverless Postgres (Aurora/Neon) C) In-memory/JSON for prototype only
**Your Answer:** `A`
**Status:** ✅ Answered

#### Q2: Authentication
**Question:** Do we need user accounts in the MVP, or single-user/no-auth for the 2-hour build?
**Options:** A) No auth (single user) for MVP B) Simple API key C) Full auth (Cognito)
**Your Answer:** `C`
**Status:** ✅ Answered

#### Q3: Serverless Platform
**Question:** Which serverless runtime target?
**Options:** A) AWS Lambda + API Gateway (SAM/Serverless Framework) B) AWS Lambda + CDK C) Other (Vercel/Cloudflare functions)
**Your Answer:** `A`
**Status:** ✅ Answered

#### Q4: Grocery Consolidation Logic
**Question:** How aggressively should the grocery list merge ingredients across recipes?
**Options:** A) Exact name match only B) Name match + unit conversion (e.g., tsp→tbsp) C) Fuzzy match + unit conversion
**Your Answer:** `A`
**Status:** ✅ Answered

#### Q5: Client / Interface
**Question:** What consumes the API for the MVP?
**Options:** A) REST API only (test via curl/Postman) B) Minimal web UI C) Full SPA (React)
**Your Answer:** `A`
**Status:** ✅ Answered

---

### Questionnaire Status
| Total | Answered | Ready to Proceed? |
|-------|----------|-------------------|
| 5 | 5 | ✅ Yes |

### Project-Level Requirements
| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| PR-001 | Users can add, edit, and list custom recipes with ingredients | HIGH | ✅ |
| PR-002 | Users can assign recipes to days in a weekly calendar | HIGH | ⬚ |
| PR-003 | System auto-generates a consolidated grocery list from the week's plan | HIGH | ⬚ |
| PR-004 | Users can check off items on the grocery list | HIGH | ⬚ |
| PR-005 | Users can adjust serving sizes, scaling ingredient quantities | MEDIUM | ✅ |
| PR-006 | Enforce object-level authorization: users may only read/write items owned by their authenticated Cognito identity (IDOR prevention) | HIGH | 🔄 |
| PR-007 | Validate and sanitize all recipe/meal-plan inputs (field types, lengths, allowed units) to prevent stored injection and malformed data | HIGH | ✅ |

### Related Kiro Specs
| Spec | Path | Phase | Description |
|------|------|-------|-------------|
| (none yet) | - | - | Option A: Living Spec only |

### Traceability Matrix
| Req ID | Design Ref | Task IDs | Test IDs | Status |
|--------|------------|----------|----------|--------|
| PR-001 | §3 | Stage 1 | model.test, validation.test | ✅ Linked |
| PR-002 | §3 | - | - | ⬚ Unlinked |
| PR-003 | §3 | - | - | ⬚ Unlinked |
| PR-004 | §3 | - | - | ⬚ Unlinked |
| PR-005 | §3 | Stage 1 | model.test (scaleRecipe) | ✅ Linked |
| PR-006 | §3.3 | Stage 0/1 | (integration pending TD-002) | 🔄 Partial |
| PR-007 | §3.4 | Stage 0/1 | validation.test | ✅ Linked |

---

## 3. Architecture

### Approval Gate
> ⚠️ **APPROVAL REQUIRED** before Building phase.
> Status: ✅ Approved (2026-09-03T00:10:00Z)

### System Overview
Serverless REST API on AWS. API Gateway (HTTP API) fronts a set of TypeScript Lambda handlers, one per resource domain (recipes, meal plans, grocery lists). A Cognito User Pool authorizer authenticates every request; handlers scope all data access to the caller's `sub` (user id). A single DynamoDB table (single-table design) stores all entities, partitioned by user. See exported document `architecture.md` for full diagrams and detail.

### Key Decisions

#### Decision: DynamoDB single-table store
- **Timestamp**: 2026-09-03T00:00:00Z
- **Context**: Need serverless-native persistence with per-user partitioning.
- **Options**: 1) DynamoDB single-table 2) Serverless Postgres
- **Choice**: DynamoDB single-table (Q1=A)
- **Rationale**: No server to manage, natural `USER#<sub>` partitioning enforces tenant isolation, fits Lambda scaling.
- **Approval**: ✅ Approved (2026-09-03T00:10:00Z)

#### Decision: Cognito User Pool authentication + per-request authorizer
- **Timestamp**: 2026-09-03T00:00:00Z
- **Context**: Q2=C selected full auth; security review requires per-user isolation.
- **Options**: 1) No auth 2) API key 3) Cognito
- **Choice**: Cognito User Pool with API Gateway JWT authorizer (Q2=C)
- **Rationale**: Managed identity, JWT verified at the edge, `sub` claim drives object-level authorization (PR-006).
- **Approval**: ✅ Approved (2026-09-03T00:10:00Z)

#### Decision: Lambda + API Gateway (HTTP API) via IaC
- **Timestamp**: 2026-09-03T00:00:00Z
- **Context**: Serverless runtime target (Q3=A).
- **Options**: 1) SAM/Serverless Framework 2) CDK 3) Vercel/Cloudflare
- **Choice**: AWS Lambda + API Gateway (Q3=A)
- **Rationale**: Fastest TypeScript path; pay-per-use; integrates with Cognito authorizer and DynamoDB.
- **Approval**: ✅ Approved (2026-09-03T00:10:00Z)

#### Decision: Exact-name grocery consolidation
- **Timestamp**: 2026-09-03T00:00:00Z
- **Context**: Consolidation strategy (Q4=A).
- **Options**: 1) Exact match 2) + unit conversion 3) fuzzy + conversion
- **Choice**: Exact name match, summing quantities per unit (Q4=A)
- **Rationale**: Simplest correct behavior for MVP; unit conversion deferred to Tech Debt.
- **Approval**: ✅ Approved (2026-09-03T00:10:00Z)

### Technology Stack
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Language | TypeScript/Node.js | Per project constraint |
| Compute | AWS Lambda | Serverless, pay-per-use |
| API | API Gateway (HTTP API) | Managed routing + JWT authorizer |
| Auth | Amazon Cognito User Pool | Managed identity; `sub` drives authz (Q2=C) |
| Data | DynamoDB (single-table) | Serverless, per-user partition (Q1=A) |
| IaC | AWS SAM / Serverless Framework | Reproducible deploys (Q3=A) |
| Client | REST API (curl/Postman) | API-first MVP (Q5=A) |

### Security Requirements (from Design Review)
| ID | Finding | Mitigation |
|----|---------|------------|
| PR-006 | Broken object-level authorization (IDOR) | Every handler derives owner from verified Cognito `sub`; DynamoDB keys namespaced `USER#<sub>`; deny cross-user access. |
| PR-007 | Unvalidated / unsanitized input | Schema validation (types, lengths, allowed units) at handler boundary; reject on failure. |

---

## 4. Implementation

### Phase Gate: Planning → Building
> - [x] Intent complete
> - [x] Questionnaire answered (all ✅)
> - [x] Architecture approved
> - [x] **Comprehension gate passed**

### Execution Plan
| Stage | Name | Goal | Status |
|-------|------|------|--------|
| 0 | Scaffold | Project structure, shared auth/validation/db modules | ✅ |
| 1 | Recipes | CRUD for custom recipes | ✅ |
| 2 | Meal calendar | Assign recipes to weekly days | ⬚ |
| 3 | Grocery generation | Consolidate ingredients from plan | ⬚ |
| 4 | Grocery check-off | Track purchased items | ⬚ |
| 5 | Serving adjustment | Scale ingredient quantities | ⬚ |

### Component Map
| Component | Location | Description |
|-----------|----------|-------------|
| HTTP helpers | `src/lib/http.ts` | Consistent JSON responses / error shapes |
| Auth module | `src/lib/auth.ts` | Derives owner from Cognito `sub` (PR-006) |
| Validation module | `src/lib/validation.ts` | Recipe input schema validation (PR-007) |
| DynamoDB client + keys | `src/lib/db.ts` | Doc client + `USER#<sub>` key helpers |
| Recipe model | `src/recipes/model.ts` | Recipe type, `scaleRecipe` (PR-005) |
| Recipe repository | `src/recipes/repository.ts` | Per-user CRUD against DynamoDB |
| Recipe handler | `src/recipes/handler.ts` | Lambda for /recipes routes (PR-001) |
| Infra | `template.yaml` | SAM: Cognito, DynamoDB (SSE on), HTTP API w/ JWT authorizer |

### Technical Debt Register
| ID | Description | Trigger | Severity |
|----|-------------|---------|----------|
| TD-001 | Grocery consolidation is exact-name only; no unit conversion (e.g. tsp→tbsp) | If users report merge misses across recipes | ⚠️ Medium |
| TD-002 | Repository/handler lack integration tests (only pure logic unit-tested) | Before production launch | ⚠️ Medium |

---

## 5. Metrics

### Phase Gate: Building → Operating
> - [ ] All stages complete
> - [ ] Tests passing
> - [ ] **Comprehension gate passed**

### Business Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Weekly active users (wk 4) | 40% | - | ⬚ |
| Meals planned per week | 5+ | - | ⬚ |

### Technical Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Latency (p99) | < 500ms | - | ⬚ |
| Error rate | < 1% | - | ⬚ |

---

## 6. Decision Log

| Timestamp | Decision | Phase | Context | Outcome |
|-----------|----------|-------|---------|---------|
| 2026-09-03T00:00:00Z | Created Living Spec (Option A: Living Spec only) | 🔵 | MVP, solo build, 2-hour timeline | Spec initialized |
| 2026-09-03T00:05:00Z | Answered questionnaire; added PR-006/PR-007 security reqs | 🔵 | Q1=A, Q2=C, Q3=A, Q4=A, Q5=A | Requirements locked |
| 2026-09-03T00:10:00Z | Approved architecture; passed comprehension gate; transitioned 🔵→🟢 | 🟢 | User approved design and answered comprehension check | Building started |
| 2026-09-03T00:25:00Z | Completed Stage 0 (scaffold) + Stage 1 (Recipes CRUD) | 🟢 | TS/Node serverless; PR-001/005/007 done, PR-006 partial | Typecheck clean, 9/9 tests pass |

---

## 7. Next Actions

### Current Focus
- [ ] **HIGH**: Implement Stage 2 — Meal calendar (PR-002)

### Backlog
- [ ] Stage 3 — Grocery generation (PR-003)
- [ ] Stage 4 — Grocery check-off (PR-004)
- [ ] TD-002 — Add integration tests for repository/handler (covers PR-006 fully)
- [ ] TD-001 — Optional unit conversion in grocery consolidation

### Blocked
[None]

### Completed
- [x] Intent drafted from project pitch
- [x] Requirements questionnaire answered (5/5)
- [x] Architecture defined, exported, and approved
- [x] Planning → Building comprehension gate passed
- [x] Stage 0 — Scaffold + shared modules
- [x] Stage 1 — Recipes CRUD (PR-001, PR-005, PR-007; PR-006 partial)

---

## Comprehension Tracking

| Date | Gate | Score | Notes |
|------|------|-------|-------|
| 2026-09-03 | Planning → Building | Passed | User confirmed problem/user, per-user isolation rationale (Cognito + USER#<sub>), and failure risks (inaccurate consolidation, weak isolation, low adoption) |
