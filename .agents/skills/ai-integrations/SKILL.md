---
name: ai-integrations
description: Build features on LLM APIs - prompt design as engineering, structured output, tool use, evals, cost/latency control, safety and fallback handling. Use when integrating language models or other AI services into a product.
---

# AI Integrations

An LLM call is an unreliable, expensive, slow, nondeterministic network dependency with a text
interface. Engineer it exactly as that sentence demands.

## Design procedure

1. **Should this be a model at all?** Regex, rules, or a lookup that solves it beats a model (cheaper, deterministic, testable). Model earns its place for: unstructured input, natural language, fuzzy classification, generation.
2. **Define the contract**: exact input (what context, how truncated), exact output (schema), failure behavior (below).
3. **Prompts are code**: version and review templates and evaluate behavior changes. Include examples when evaluations show they help; their number and format depend on the task.
4. **Structured output**: request JSON (schema/tool-enforced where the API supports it) → validate against schema in code → one retry with the validation error appended → then the fallback path. Never `JSON.parse` and hope; never regex fish from prose.
5. **Context discipline**: send only authorized, task-relevant context. Tune retrieval chunking and overlap against the actual corpus and evals; preserve structural boundaries and source attribution where users act on claims.

## Reliability rules

- Timeouts + bounded retries with backoff (respect 429/rate-limit headers); idempotency at your layer.
- **Define failure behavior**: bounded retry where safe, then an evaluated degraded path or clear error. An alternate provider is optional and must already meet data-handling and quality requirements; do not add one automatically.
- Nondeterminism: use supported model settings and version identifiers; low temperature is not a determinism guarantee. Re-run evals before adopting model changes.
- **Never trust output**: validate schema, allowlist any values that drive behavior (enum fields), sanitize anything rendered, authorize any action the output triggers — output is untrusted input. Prompt injection: any user/third-party text in the prompt can contain instructions; segregate it clearly, never let it authorize tools/actions beyond the user's own permissions.

## Evals (the test suite for AI behavior)

Use representative authorized or synthetic cases, including known failures and
prompt injection. Define expected outputs or a grading rubric; compare prompt/model
changes against that baseline. Log safe metadata such as prompt/model version,
latency, token counts and error codes. Keep raw prompts, model output and personal
data out of production logs. Curating user examples requires explicit data-handling
authority and redaction; do not automatically convert production traffic into a dataset.

## Cost & latency

Budget per call and per user/day at design time; enforce max_tokens; cache identical/near-identical
requests only with tenant/user isolation and a defined freshness policy; approximate
cache matches must not reuse another user's private response. Use the smallest model that passes evals;
stream user-facing generation (perceived latency); batch offline work.
