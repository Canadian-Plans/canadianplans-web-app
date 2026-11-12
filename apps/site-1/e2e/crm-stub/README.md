# CRM stub

A contract-checking stand-in for the Canadian Plans CRM's website API, used only
by the storefront's browser suites. It is test tooling, not a second backend:
state is in memory, one site, one process, started by Playwright
(`playwright.config.ts`) with `tsx`.

## What it implements

Only the routes the storefront calls, under `/api/v1`:

| Route                                                              | Notes                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `GET /health`                                                      | No key needed.                                                                                    |
| `GET /website/plans`                                               | Optional `leadType`.                                                                              |
| `POST /website/leads`                                              | Lead-type rules, `Idempotency-Key` replay and conflict.                                           |
| `GET`, `PATCH /website/leads/:id`                                  | `X-Draft-Grant`; `submit: true` turns the draft into the order.                                   |
| `POST /website/uploads/intents`, `/uploads/:id/finalize`           | `X-Draft-Grant`; finalize checks size, SHA-256 and the file signature.                            |
| `POST /website/tracking/code`, `/tracking/verify`                  | The code is never sent anywhere; a spec reads it through a control.                               |
| `GET /website/tracking/orders`                                     | `X-Customer-Grant`.                                                                               |
| `POST /website/tracking/orders/:ref/changes`                       | `X-Customer-Grant`; only a `sim_order` at a stage that may still change.                          |
| `POST /website/tracking/orders/:ref/uploads/intents`, `…/finalize` | `X-Customer-Grant`; the document joins the order's pending change request.                        |
| `PUT /storage/uploads/:uploadId`                                   | Stands in for object storage: the target of the signed PUT (see `STORAGE_ORIGIN` in `config.ts`). |

## What it checks

- Every request body with the request schema exported by
  `@canadian-plans/crm-contracts`; every answer, including errors, with that
  package's response schema before it is sent (`reply` in `http.ts`). An answer
  that fails its own schema is a 500, which fails the suite.
- The bearer site key (`missing_credential`, `invalid_credential`), the draft
  grant (`draft_not_found`, `draft_expired`, `draft_already_submitted`) and the
  customer grant (401 `not_found`).
- `Idempotency-Key`: the same key and body return the same lead with
  `replayed: true`; the same key with another body is 409 `idempotency_conflict`.
- The lead-type rules the storefront depends on: `sim_order` is a draft that
  needs a contact name and email, a plan and `delivery` to submit, and takes an
  `MS-<n>` reference; `internet` and `mobility` must be created with
  `submit: true`; a plan the site does not sell for the type is
  `plan_not_available`.
- Errors use the CRM's envelope: `{ error: { code, message, requestId, details? } }`,
  with the status codes of the CRM's `routes/website.ts` and `routes/tracking.ts`.
- The bot check is the CRM's "delegated" style: a missing token and any
  well-formed token are accepted. Nothing is sent to Cloudflare.

## Test-only controls

Under `/__stub/`, never part of the CRM's API (`control.ts`; the suites call
them through `../stub.ts`):

| Control                        | Use                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `POST /reset`                  | Empty state and the seed plans (`SEED_PLANS` in `state.ts`). Run before every test.                   |
| `GET`, `PUT /plans`            | Read or replace what the site sells.                                                                  |
| `GET /leads`                   | Every lead received, with its form, plan, consent versions, attribution and files.                    |
| `GET /requests`                | Every `/api/v1` request received: method, path, idempotency key, bot action, body, status.            |
| `POST /failures`               | Make the next matching call fail: `transport`, `drop_response` (saved, answer lost) or an error code. |
| `GET /tracking-code?email=`    | The code that "was emailed"; 404 when none was sent.                                                  |
| `POST /expire-tracking-grants` | End every tracking session.                                                                           |
| `POST /expire-draft-grants`    | Expire every draft grant.                                                                             |
| `POST /stage`                  | Move an order to a working stage, as staff would.                                                     |

## What it is not

It has no database, sends no email, applies no rate limit and keeps no audit
trail, and it implements none of the CRM's staff API. Request bodies are kept in
memory for the suites to read and are never written to a log. When the CRM's
contract changes, refresh `packages/crm-contracts` (see its README) and run the
suites: a mismatch shows up here as a failed request or a failed answer.
