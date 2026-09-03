# MealPrep — Architecture Design

> **Status**: Planning (🔵) — pending architecture approval
> **Source of truth**: `.kiro/specs/00-mealprep.living.md` §3
> **Last Updated**: 2026-09-03T00:00:00Z
> **Stack**: TypeScript/Node.js, AWS serverless (Lambda + API Gateway + Cognito + DynamoDB)

This document is exported from the Living Spec. It reflects the decisions from the Requirements Questionnaire (Q1=DynamoDB, Q2=Cognito, Q3=Lambda+API Gateway, Q4=exact-name consolidation, Q5=REST API) and the two high-priority security findings (PR-006 IDOR, PR-007 input validation).

---

## 1. System Components and Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **API Gateway (HTTP API)** | Public HTTPS entry point. Routes requests to Lambda handlers. Hosts the Cognito JWT authorizer that validates tokens before any handler runs. |
| **Cognito User Pool** | Manages user identities, sign-up/sign-in, and issues JWT access tokens. The `sub` claim is the canonical user id used for all authorization. |
| **JWT Authorizer** | Verifies the Cognito-issued token on every request at the edge. Rejects unauthenticated/expired tokens with 401 before invoking business logic. |
| **Recipe Lambda** | CRUD for custom recipes and their ingredients (PR-001). Validates input (PR-007). |
| **Meal Plan Lambda** | Assigns recipes to days of a weekly calendar (PR-002); applies serving-size scaling (PR-005). |
| **Grocery Lambda** | Generates a consolidated grocery list from a week's plan (PR-003) using exact-name merge; tracks check-off state (PR-004). |
| **Authorization module (shared)** | Derives the owner from the verified `sub` and enforces that every read/write targets only the caller's data (PR-006). Reused by all handlers. |
| **Validation module (shared)** | Schema validation/sanitization of request bodies: field types, lengths, allowed units (PR-007). |
| **DynamoDB (single table)** | Persists recipes, meal plans, and grocery lists. Items are partitioned per user for tenant isolation. |

---

## 2. Data Flow Between Components

Request lifecycle for a typical write (e.g., "add recipe"):

```
Client (curl/Postman)
  │  HTTPS + Authorization: Bearer <Cognito JWT>
  ▼
API Gateway (HTTP API)
  │  1. JWT Authorizer verifies token against Cognito User Pool
  │     - invalid/expired → 401 (stops here)
  │     - valid → forwards request + claims (incl. sub) to Lambda
  ▼
Recipe Lambda handler
  │  2. Validation module checks/sanitizes body (PR-007) → 400 on failure
  │  3. Authorization module sets owner = claims.sub (PR-006)
  │  4. Build item keys namespaced by USER#<sub>
  ▼
DynamoDB (single table)
  │  5. PutItem within the user's partition
  ▼
Recipe Lambda → API Gateway → Client (201 Created)
```

Read/consolidation flow ("generate grocery list"):

```
Client → API Gateway (authorized) → Grocery Lambda
  → Query DynamoDB for USER#<sub> meal plan for the target week
  → Query the referenced recipes (same partition)
  → Consolidate ingredients by exact name, summing quantities per unit (Q4=A)
  → Return grocery list (items default unchecked)
```

Data is always scoped to `USER#<sub>`; a request can never read or mutate another user's partition.

---

## 3. Authentication / Authorization Approach

**Authentication (who you are):**
- Amazon Cognito User Pool issues JWT access tokens on sign-in.
- API Gateway's JWT authorizer validates the token signature, issuer, audience, and expiry on every request. Business logic never runs for an invalid token.

**Authorization (what you can touch) — addresses PR-006 (IDOR):**
- Handlers never trust a user id from the request body or path for ownership. The owner is derived solely from the verified `sub` claim.
- All DynamoDB keys are namespaced with `USER#<sub>` so a query is physically constrained to the caller's partition.
- Any access to an item whose partition does not match the caller's `sub` is denied (404/403), preventing enumeration of others' resources.
- Least-privilege IAM: each Lambda's execution role is scoped to only the table/actions it needs.

---

## 4. Data Storage and Encryption Strategy

**Storage — DynamoDB single-table design (Q1=A):**

| Entity | PK | SK |
|--------|----|----|
| Recipe | `USER#<sub>` | `RECIPE#<recipeId>` |
| Meal plan (week) | `USER#<sub>` | `PLAN#<isoWeek>` |
| Grocery list | `USER#<sub>` | `GROCERY#<isoWeek>` |

- Partition key `USER#<sub>` guarantees per-user isolation at the storage layer.
- A single table keeps the MVP simple and cheap; access patterns are all "get/query within one user."

**Encryption:**
- **At rest**: DynamoDB server-side encryption enabled (AWS-owned or KMS-managed key).
- **In transit**: TLS enforced end-to-end (API Gateway HTTPS only; AWS SDK uses TLS to DynamoDB).
- **Secrets**: no static credentials in code; Lambdas use IAM execution roles. Any config secrets live in SSM Parameter Store / Secrets Manager, not env plaintext.

**Input integrity — addresses PR-007:**
- Every write passes schema validation (types, max lengths, allowed units, numeric ranges for quantities/servings) before persistence. Invalid payloads are rejected with 400 and never stored.

---

## 5. External Integrations

For the MVP the surface is intentionally minimal:

| Integration | Purpose | Notes |
|-------------|---------|-------|
| Amazon Cognito | Identity provider (auth) | Managed; only external identity dependency |
| AWS DynamoDB | Data persistence | Internal AWS service, not third-party |
| AWS CloudWatch | Logs / metrics | For latency and error-rate metrics (§5 of Living Spec) |
| (None third-party) | — | No grocery-store, delivery, or nutrition APIs in MVP (out of scope) |

Deferred / out of scope: grocery delivery APIs, store price lookups, nutrition data providers, recipe import from external sites.

---

## Traceability

| Req | Where addressed |
|-----|-----------------|
| PR-001 Recipes | §1 Recipe Lambda, §2 write flow |
| PR-002 Weekly calendar | §1 Meal Plan Lambda |
| PR-003 Grocery generation | §1 Grocery Lambda, §2 consolidation flow |
| PR-004 Check-off | §1 Grocery Lambda, §4 GROCERY item |
| PR-005 Serving adjustment | §1 Meal Plan Lambda |
| PR-006 IDOR prevention | §3 Authorization, §4 partition keys |
| PR-007 Input validation | §1 Validation module, §4 input integrity |
