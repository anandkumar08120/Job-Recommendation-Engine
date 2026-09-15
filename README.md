# Job Match API

A small, transparent job-recommendation service. Given a candidate, it returns a ranked list of
jobs with a 0–100 match score and a breakdown explaining exactly where every point came from.

No machine learning, no embeddings, no black box: the scorer is a pure function of four
dimensions, and every number it produces can be traced back to a rule you can read in this file.

```
  90.63  Senior Backend Engineer
         skills: 42.5/50  |  experience: 20/20  |  location: 15/15  |  salary: 13.13/15
```

---

## Contents

- [Quick start](#quick-start)
- [API reference](#api-reference)
- [Scoring formula and the reasoning behind the weights](#scoring-formula-and-the-reasoning-behind-the-weights)
- [Worked example](#worked-example)
- [Configurable weights](#configurable-weights)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Assumptions](#assumptions)
- [What I'd do differently with more time](#what-id-do-differently-with-more-time)
- [How AI tools were used](#how-ai-tools-were-used)

---

## Quick start

Requires Node.js 20.11+ (developed on Node 22). **No database needed** — the default storage
driver is in-memory.

```bash
npm install
npm start                 # http://localhost:3000
```

Load a small demo dataset (with the API running, in a second terminal):

```bash
npm run seed
```

Then:

```bash
curl -s "localhost:3000/candidates/cand-ada/recommendations?limit=3" | jq
```

Other scripts:

```bash
npm test                  # full suite
npm run test:coverage     # with coverage thresholds
npm run dev               # watch mode
npm run lint
npm run format
```

Configuration is read once at boot from the environment; copy `.env.example` to `.env` to change
anything. All values have sensible defaults, so `.env` is optional.

| Variable                       | Default  | Purpose                                      |
| ------------------------------ | -------- | -------------------------------------------- |
| `PORT`                         | `3000`   | HTTP port                                    |
| `LOG_LEVEL`                    | `info`   | pino log level                               |
| `STORAGE_DRIVER`               | `memory` | `memory` or `postgres`                       |
| `DATABASE_URL`                 | —        | Required only when `STORAGE_DRIVER=postgres` |
| `DEFAULT_RECOMMENDATION_LIMIT` | `10`     | Used when `?limit=` is omitted               |
| `MAX_RECOMMENDATION_LIMIT`     | `100`    | Upper bound on `?limit=`                     |

### Running with Docker (bonus)

A multi-stage `Dockerfile` and a `docker-compose.yml` (API + Postgres) are included:

```bash
docker compose up --build       # API on :3000, Postgres on :5432
```

Compose sets `STORAGE_DRIVER=postgres` and waits on the database's healthcheck before starting the
API, so the first query cannot race Postgres' initialisation. `db/init.sql` is mounted into
`/docker-entrypoint-initdb.d` and applied on first boot; against an existing database, run
`npm run migrate`.

> **Honest caveat:** the Docker setup was written but **not built or run** in the environment where
> this was developed (no Docker daemon, no Postgres available). The in-memory path — which is what
> `npm start` and the entire test suite use — is fully exercised.

---

## API reference

Every route is available both unprefixed (as in the brief) and under `/api/v1`.

| Method | Path                              | Purpose                                               |
| ------ | --------------------------------- | ----------------------------------------------------- |
| `POST` | `/candidates`                     | Create a candidate profile                            |
| `GET`  | `/candidates`                     | List candidates                                       |
| `GET`  | `/candidates/:id`                 | Fetch one candidate                                   |
| `GET`  | `/candidates/:id/recommendations` | **Ranked jobs for a candidate**                       |
| `POST` | `/jobs`                           | Create a job posting                                  |
| `GET`  | `/jobs`                           | List jobs                                             |
| `GET`  | `/jobs/:id`                       | Fetch one job                                         |
| `GET`  | `/jobs/:id/recommendations`       | **Ranked candidates for a job** (bonus, reverse view) |
| `GET`  | `/health`                         | Liveness — never touches the database                 |
| `GET`  | `/ready`                          | Readiness — pings storage                             |

### Create a candidate

```bash
curl -X POST localhost:3000/candidates \
  -H 'content-type: application/json' \
  -d '{
    "name": "Ada Iyer",
    "skills": ["JavaScript", "Node.js", "PostgreSQL", "Docker"],
    "yearsOfExperience": 6,
    "location": "Bengaluru",
    "expectedSalary": 2400000
  }'
```

### Create a job

```bash
curl -X POST localhost:3000/jobs \
  -H 'content-type: application/json' \
  -d '{
    "title": "Senior Backend Engineer",
    "requiredSkills": [
      { "name": "Node.js",    "mustHave": true  },
      { "name": "PostgreSQL", "mustHave": true  },
      { "name": "Kubernetes", "mustHave": false },
      { "name": "Docker",     "mustHave": false }
    ],
    "minYearsExperience": 5,
    "location": "Bengaluru",
    "salaryRange": { "min": 2200000, "max": 3000000 },
    "remoteAllowed": false
  }'
```

`id` is optional on both — one is generated if omitted. `mustHave` and `remoteAllowed` default to
`false`.

### Get recommendations

```bash
curl "localhost:3000/candidates/cand-ada/recommendations?limit=3"
```

```jsonc
{
  "data": [
    {
      "jobId": "job-backend-blr",
      "title": "Senior Backend Engineer",
      "location": "Bengaluru",
      "remoteAllowed": false,
      "salaryRange": { "min": 2200000, "max": 3000000 },
      "score": 90.63,
      "summary": ["skills: 42.5/50", "experience: 20/20", "location: 15/15", "salary: 13.13/15"],
      "breakdown": {
        "skills": {
          "points": 42.5,
          "maxPoints": 50,
          "ratio": 0.85,
          "reason": "Has all 2 must-have skills; matched 1 of 2 nice-to-haves",
          "detail": {
            "mustHave": { "required": 2, "matched": 2, "missing": [] },
            "niceToHave": { "required": 2, "matched": 1, "missing": ["Kubernetes"] },
          },
        },
        // ... experience, location, salary
      },
    },
  ],
  "meta": {
    "candidate": { "id": "cand-ada", "name": "Ada Iyer" },
    "weights": { "skills": 50, "experience": 20, "location": 15, "salary": 15 },
    "limit": 3,
    "totalJobs": 4,
    "eligibleJobs": 2,
    "filteredOutByMustHaveSkills": 2,
  },
}
```

`meta.filteredOutByMustHaveSkills` exists so that an empty result set explains itself. "No
recommendations" and "no recommendations _because you're missing must-have skills on all 40 open
roles_" are very different answers, and only one of them is useful.

### Errors

All errors share one envelope, and 5xx responses carry a request id rather than internals:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "source": "body",
      "issues": [{ "path": "skills", "message": "Required", "code": "invalid_type" }]
    },
    "requestId": "0f0f…"
  }
}
```

Unknown body fields and unknown query params are rejected with a 400 rather than ignored. A typo
like `yearsOfExperiance` or `?limt=5` should be loud, not silently defaulted — silent defaults are
how a candidate ends up stored with zero years of experience.

---

## Scoring formula and the reasoning behind the weights

### The shape of the model

```
IF the candidate is missing ANY must-have skill  ->  the job is removed entirely (no score)

OTHERWISE:

score = 50 × skillsRatio      (0..1)
      + 20 × experienceRatio  (0..1)
      + 15 × locationRatio    (0..1)
      + 15 × salaryRatio      (0..1)
                                     = 0..100
```

Each dimension is a pure function returning a ratio in `0..1` plus a human-readable reason; the
orchestrator multiplies by the weight. That separation is the whole design: dimensions know nothing
about weights, weights know nothing about HTTP, and the score is reproducible from its inputs alone.

### Why this weight split — 50 / 20 / 15 / 15

The weights encode a single claim: **the further down this list you go, the more negotiable it
gets.**

| Dimension      | Weight | Why it earns that share                                                                                                                                                                                                                                                                                  |
| -------------- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Skills**     | **50** | The only dimension that can't be fixed by negotiation. You can move, wait a year, or split the difference on money; you cannot acquire three years of Kubernetes during a notice period. It gets half the budget because it is the only thing that genuinely predicts whether the person can do the job. |
| **Experience** | **20** | A real signal, but a noisy proxy. "5+ years" is shorthand for a level of autonomy, and the relationship between years and competence is loose. Worth a fifth of the score, worth less than half of skills.                                                                                               |
| **Location**   | **15** | Mostly a logistics constraint, and one that remote work has made softer. Large enough that a local candidate visibly outranks a distant one; small enough that it never outweighs actual capability.                                                                                                     |
| **Salary**     | **15** | The most negotiable dimension of all — ranges are advertised, not fixed, and a strong candidate moves a band. Equal to location so neither can dominate, but both together (30) still can't outvote skills.                                                                                              |

Two sanity checks that fall out of this split, and that I used to choose the numbers:

- **A perfect skills match with everything else wrong still scores 50** — it surfaces, and a human
  decides whether the location or money is workable. That is the right outcome; those are solvable
  problems.
- **A bare-minimum skills match with everything else perfect scores 85** — strong, but it cannot
  reach 100. Meeting only the must-haves shouldn't look identical to meeting them plus the whole
  wish list.

If those two outcomes look wrong for a given market, the weights are the dial to turn — and they're
overridable per request without a redeploy (see [Configurable weights](#configurable-weights)).

### Skills (50 points) — a gate _and_ a score

Must-have skills are a **hard filter**, applied before scoring. A job requiring a skill the
candidate doesn't have is removed from the results entirely, regardless of how perfect everything
else is. It cannot be out-scored, because a 100-point salary fit for a job you cannot do is not a
recommendation, it is noise.

That creates a subtlety worth stating, because it drove the design:

> Once the gate has run, **every** remaining job has 100% must-have coverage. Scoring must-haves
> again would therefore award every surviving job an identical number and discriminate between none
> of them.

So the 50 points split:

```
skillsRatio = 0.7  +  0.3 × (nice-to-have skills matched ÷ nice-to-have skills required)

            = 35 points for clearing the gate
            + up to 15 points of actual discrimination
```

- **35 points (70%) for clearing the gate.** Clearing it _is_ the achievement — it's the single
  strongest fact in the whole model — and it should carry most of the dimension's weight.
- **15 points (30%) for nice-to-haves.** This is the part that actually varies between two
  candidates who both qualify, which is exactly what ranking needs.
- **A job listing no nice-to-haves gets full marks for that share.** The candidate matched 100% of
  what was asked. A terse job spec shouldn't rank below a verbose one describing the same role.
- **Extra skills earn no bonus.** Skills the job never asked for say nothing about fit for _this_
  job, and rewarding them would systematically favour generalists over specialists.

Matching is on a canonical form — lowercased, with spacing and punctuation stripped — so
`Node.js`, `node js` and `NODEJS` are the same skill.

### Experience (20 points) — penalise, don't exclude

**This was the most deliberate decision in the model, so here is the full reasoning.**

A candidate below `minYearsExperience` is penalised, never filtered out:

```
yearsShort     = max(0, minYearsExperience − yearsOfExperience)
experienceRatio = max(0, 1 − 0.25 × yearsShort)
```

| Shortfall        | Ratio | Points (of 20) |
| ---------------- | ----: | -------------: |
| meets or exceeds |  1.00 |             20 |
| 1 year short     |  0.75 |             15 |
| 2 years short    |  0.50 |             10 |
| 3 years short    |  0.25 |              5 |
| 4+ years short   |  0.00 |              0 |

**Why penalise rather than exclude:**

1. **`minYearsExperience` is shorthand, not a requirement.** It's a number someone typed to mean
   "senior enough to run this without supervision". Treating that shorthand as a hard boundary
   grants it a precision nobody intended when writing it.
2. **Excluding makes the filter do the recruiter's job, silently.** A candidate 4.9 years into a
   5-year ask, holding every must-have skill, is a plausible hire — and if the API drops them, the
   recruiter never learns they existed. A hard filter here doesn't inform the decision, it _makes_
   the decision, invisibly. A gate is only defensible when the answer is a genuine no.
3. **Experience is the noisiest dimension in the model.** Years correlate loosely with capability.
   Hard-filtering on the noisiest signal is exactly backwards — you get the most false negatives
   where you have the least confidence.
4. **The penalty is already strong enough to do the ranking job.** At 25% per year, a candidate two
   years short drops 10 points — they will sit below every qualified candidate with comparable
   skills. They're visible, and they're visibly ranked lower, with the shortfall spelled out in the
   response. That's the honest outcome: _ranked down_, not _disappeared_.

**Why must-have skills are different**, and get the hard filter instead: missing a must-have skill
isn't a matter of degree. "Can't write Rust" is a fact about today, not a proxy for one, and no
amount of salary fit changes it. The rule I applied is: **gate on facts, penalise on proxies.**

Extra years earn no bonus. Seniority beyond the requirement says little about fit for _this_ role,
and paying for it would push every posting toward the most senior person available.

### Location (15 points)

Exactly the ordering the brief requires — exact match > remote-allowed > mismatch:

| Situation                                             | Ratio | Points |
| ----------------------------------------------------- | ----: | -----: |
| Same location                                         |  1.00 |     15 |
| Candidate is remote-seeking **and** job allows remote |  1.00 |     15 |
| Different location, `remoteAllowed: true`             |  0.60 |      9 |
| Different location, on-site only                      |  0.00 |      0 |

Remote deliberately scores _less_ than an exact match rather than equalling it. It removes the
relocation blocker, but it doesn't remove timezone overlap, occasional on-site days, or payroll
geography — real friction a local hire doesn't carry. 60% says "strong option, still second
choice".

The one case where remote _is_ a perfect fit gets full marks: a candidate who lists their location
as `Remote` (or `Anywhere` / `WFH`) matched with a remote-friendly job. For them, remote isn't a
compromise — it's what they asked for.

A mismatched on-site job scores a true zero rather than a token amount. It's the one dimension
where the answer really can be "no", and 0/15 is what makes a same-city role visibly beat an
identical role two timezones away.

### Salary (15 points)

Scored on how the candidate's expectation sits against the band:

| Situation                    |               Ratio | Reasoning                                                              |
| ---------------------------- | ------------------: | ---------------------------------------------------------------------- |
| `expected ≤ min`             |                1.00 | The entire band clears the expectation — comfortably above, full marks |
| `min < expected ≤ max`       | 1.00 → 0.50, linear | Payable, but headroom is shrinking                                     |
| `max < expected ≤ max × 1.1` | 0.15 → 0.00, linear | Near zero — a small, negotiable gap                                    |
| `expected > max × 1.1`       |                0.00 | The job cannot pay what they want                                      |

```
in-range:   salaryRatio = 1 − 0.5 × (expected − min) ÷ (max − min)
just above: salaryRatio = 0.15 × (1 − (expected − max) ÷ (max × 0.1))
```

Two choices worth defending:

**The in-range floor of 0.5.** An expectation sitting exactly at the top of the band is technically
affordable, but it leaves nothing for a counter-offer, a competing bid, or next year's raise. That
is a materially worse fit than a band that _starts_ above the expectation, so it earns half marks,
not full. Interpolating between the two tracks the shrinking headroom smoothly.

**Crossing the ceiling is a cliff, not a slope.** The brief requires a job whose `max` is below the
expectation to score _near zero_, and the first version of this scorer didn't honour that — it
decayed gently from the in-range floor, so a 2.5% overreach still scored 0.375 (over a third of the
dimension). The employer has stated a ceiling; that's a real constraint, not a rounding error. So
the moment the expectation crosses `max`, the score drops straight to 0.15 and decays to exactly
zero across a narrow 10% band. The band exists only because advertised ranges are negotiable — and
it is never enough to carry an unaffordable job into the top results on its own.

### Ranking and ties

Results are sorted by score descending, then by skills points, then by id. The final tie-break on
id looks pedantic but isn't: without it, two equal-scoring jobs could swap places between identical
requests, which quietly breaks pagination and caching. `?limit=N` is applied **after** ranking, so
it returns the true top N.

### Why the numbers always add up

Each dimension's points are rounded to 2dp _before_ being summed, so the breakdown reconciles with
the headline score exactly. An explanation that doesn't add up is worse than no explanation.

The weight budget itself is apportioned with largest-remainder rounding so it sums to exactly 100 —
rounding each weight independently let leftovers accumulate (a `3:1:1:1` split produced 100.01,
letting a perfect match score above the documented maximum). A bounds test caught it.

---

## Worked example

**Candidate — Ada Iyer:** `[JavaScript, Node.js, PostgreSQL, Docker]`, 6 years, Bengaluru, expects
2,400,000.

**Job — Senior Backend Engineer:** must-have `Node.js`, `PostgreSQL`; nice-to-have `Kubernetes`,
`Docker`; min 5 years; Bengaluru; band 2,200,000–3,000,000; on-site.

| Dimension  | Calculation                                                                         |    Points |
| ---------- | ----------------------------------------------------------------------------------- | --------: |
| Skills     | Gate passed (2/2 must-haves). Nice-to-haves 1/2 → `0.7 + 0.3 × 0.5 = 0.85` → `× 50` | **42.50** |
| Experience | 6 ≥ 5, no shortfall → `1.0 × 20`                                                    | **20.00** |
| Location   | Exact match → `1.0 × 15`                                                            | **15.00** |
| Salary     | In band, position `(2.4M − 2.2M) ÷ 0.8M = 0.25` → `1 − 0.5 × 0.25 = 0.875` → `× 15` | **13.13** |
|            |                                                                                     | **90.63** |

She scores 90.63 rather than 100 for two legible reasons: she's missing `Kubernetes`, and her
expectation sits a quarter of the way into the band rather than below it. Both appear in the
response.

Against **Systems Engineer (Rust)** — a higher-paying, remote-friendly role in her own city — she
doesn't appear at all. She doesn't write Rust, and it's marked must-have. That's the hard filter
doing precisely what it should: no salary or location fit can buy a way past it.

---

## Configurable weights

Both recommendation endpoints accept per-request overrides, so the policy can be tuned without a
redeploy:

```bash
# "Skills matter twice as much as anything else; ignore location entirely"
curl "localhost:3000/candidates/cand-ada/recommendations?skillsWeight=2&experienceWeight=1&locationWeight=0&salaryWeight=1"
```

| Query param        | Default | Effect                                       |
| ------------------ | ------: | -------------------------------------------- |
| `limit`            |    `10` | Top-N results (1…`MAX_RECOMMENDATION_LIMIT`) |
| `skillsWeight`     |    `50` | Relative weight                              |
| `experienceWeight` |    `20` | Relative weight                              |
| `locationWeight`   |    `15` | Relative weight                              |
| `salaryWeight`     |    `15` | Relative weight                              |

Weights are **relative, not absolute**: whatever arrives is rescaled to a 100-point budget. So
`?skillsWeight=3&salaryWeight=1` means "skills matter three times as much as salary", and the
resulting score is still directly comparable with a default-weighted one. The weights actually
applied are echoed back in `meta.weights`.

The scoring _behaviour_ is tunable too, for anyone who wants to argue with the curve rather than
the budget:

| Query param                | Default | Effect                                                |
| -------------------------- | ------: | ----------------------------------------------------- |
| `mustHaveShare`            |   `0.7` | Share of the skills budget paid for clearing the gate |
| `experiencePenaltyPerYear` |  `0.25` | Penalty per year of shortfall — lower is more lenient |
| `remoteLocationShare`      |   `0.6` | What a remote-friendly mismatch is worth              |
| `salaryInRangeFloor`       |   `0.5` | Score at the very top of the band                     |
| `salaryOverreachTolerance` |   `0.1` | How far above `max` before salary hits zero           |
| `salaryOverreachCeiling`   |  `0.15` | Score the instant the expectation crosses `max`       |

Defaults live in one place — [`src/domain/scoring/weights.js`](src/domain/scoring/weights.js) —
with the rationale for each value beside it.

---

## Testing

```bash
npm test
```

**82 tests**, ~95% statement coverage. The scoring domain is the highest-value place to test, so
that's where the density is — every dimension is a pure function, tested directly, with no HTTP or database in the way.

Edge cases covered, including the ones the brief calls out:

- Candidate missing a must-have skill → excluded, **even when every other dimension is perfect**
- A job with no salary overlap at all → salary scores zero, and a 2.5% overreach scores near zero
- Salary range where `min === max` → no division by zero
- Job with no nice-to-have skills, and a job with no required skills at all
- Candidate 1/2/3/4+ years short → penalised on a known curve, never excluded
- Overqualified candidate → capped at full marks, no bonus
- Location precedence: exact > remote-preferred > remote-allowed > mismatch
- Skill matching across case, spacing and punctuation (`Node.js` ≡ `node js`)
- Extra skills beyond the job spec earn nothing
- Breakdown always reconciles with the headline score
- Score stays within 0–100 under arbitrary custom weights
- Ties rank identically regardless of input order
- `?limit=` applied after ranking, not before
- Empty result set when nothing is eligible, with the reason in `meta`
- Weight rescaling: odd splits still sum to exactly 100, a dimension can be switched off, and
  unknown/negative/all-zero weights are rejected
- An unknown candidate 404s rather than returning an empty recommendation list

Integration tests drive the real Express app via supertest over in-memory repositories — no mocking
framework, no database. What's tested is what runs.

---

## Project structure

```
src/
├── domain/scoring/       # Pure scoring logic — no I/O, no framework, no clock
│   ├── skills.js         #   gate + nice-to-have coverage
│   ├── experience.js     #   penalty curve
│   ├── location.js       #   exact > remote > mismatch
│   ├── salary.js         #   band overlap
│   ├── weights.js        #   every tunable number, with its rationale
│   ├── scoreMatch.js     #   applies weights, builds the breakdown
│   └── rank.js           #   sorting, tie-breaks, limit
├── services/             # Use-cases; orchestrate repositories + domain
├── repositories/         # Storage behind one contract (memory | postgres)
├── api/                  # Express: routes, zod schemas, middleware
├── config/               # Validated environment, resolved once at boot
└── lib/                  # Logger, error taxonomy, text canonicalisation
```

The dependency rule runs one way: `api → services → domain`. The domain imports nothing from the
layers above it, which is what makes the scorer testable as a plain function and keeps "what is a
good match" from leaking into route handlers.

---

## Assumptions

- **Skill matching is exact on a canonical form**, not semantic. `Node.js` ≡ `node js` ≡ `NODEJS`,
  but `React` ≠ `React Native` and `Postgres` ≠ `PostgreSQL`. A synonym/alias table is the obvious
  next step; fuzzy matching is not, because it would make the "why" of a score much harder to
  defend — and explainability was the point.
- **Locations are compared as normalised strings**, with no geocoding. `Bengaluru` ≠ `Bangalore`
  and there is no notion of "within 50km" or same-timezone.
- **`expectedSalary` is a single number**, per the brief, and currency-agnostic: every amount is
  assumed to be in the same currency and period. Nothing converts or annualises.
- **Scoring runs in-process over all records.** Correct and fast at this scale, and it keeps the
  scorer one readable function rather than a SQL expression split across two systems.
- **The in-memory store is the default** and is not durable — data lives for the life of the
  process. It exists so the service runs and is fully testable with zero setup; Postgres is the
  durable option.
- **No auth, no pagination beyond `limit`, no update/delete endpoints** — all out of scope per the
  brief.
- **Unmarked skills are nice-to-have** (`mustHave` defaults to `false`). Must-haves eliminate
  people, so the safe default is the one that can't silently hide anyone.

---

## What I'd do differently with more time

1. **Push the must-have gate into the database.** Today every job is loaded and scored in-process.
   Past ~10k jobs the right move is a `jsonb`/GIN containment query that eliminates ineligible jobs
   in SQL, then score only the survivors in Node. The repository seam is already there for exactly
   this — no caller would change.
2. **A skill taxonomy.** Aliases (`Postgres` → `PostgreSQL`), and ideally a shallow hierarchy so
   `React` can partially satisfy `Frontend`. This is the single biggest accuracy win available, and
   it stays fully explainable.
3. **Calibrate the weights against real outcomes.** The current split is a defensible prior, not a
   measured truth. With a few thousand application-to-hire records I'd fit the weights to actual
   outcomes and keep the formula transparent — tuned rules, still not a black box.
4. **Recency-weighted skills.** "Kubernetes, used daily last year" and "Kubernetes, touched once in
   2018" are currently the same fact. That needs a richer skill model (last used, depth) than the
   brief's data model allows.
5. **Versioned migrations** (node-pg-migrate or similar) instead of a single idempotent
   `init.sql`, plus a repository contract test suite run against both drivers to guarantee they
   stay behaviourally identical.
6. **Operational polish:** rate limiting, OpenAPI spec generated from the zod schemas, request
   metrics, and score-distribution monitoring — if the median match score drifts, the weights or
   the data have changed and someone should know.
7. **Explain the near-misses.** The API knows precisely why each excluded job was excluded. A
   `?includeIneligible=true` mode would turn that into career advice: _"you're one skill away from
   12 more roles — it's Kubernetes."_

---

## How AI tools were used

This project was built with **Claude (Claude Code)** as an active pair-programmer, and this section
is a faithful account of that, including where its output was wrong.

**What AI was used for:** scaffolding the layered structure, drafting the Express/zod boilerplate,
generating the first pass of each dimension scorer and its tests, writing the Dockerfile and
compose file, and drafting this README.

**Where its suggestions were overridden or corrected — the substantive ones:**

- **The salary curve was wrong on the first pass.** The initial implementation decayed gently from
  the in-range floor once the expectation crossed the band ceiling, so a 2.5% overreach still
  scored 0.375 of the dimension. The brief says such a job must score _near zero_. A test written
  against the brief (not against the implementation) caught it; the curve was replaced with a cliff
  to 0.15 decaying to zero. This is the clearest example of the model being confidently plausible
  and still wrong.
- **The 0–100 bound leaked.** Rounding each dimension independently let rounding errors accumulate:
  a `3:1:1:1` weight split summed to 100.01, so a perfect match could exceed the documented
  maximum. Fixed by apportioning the weight budget with largest-remainder rounding — a fix the
  first draft didn't reach for on its own.
- **Skills scoring was restructured.** The natural first draft scored must-have coverage as part of
  the skills points. That's incoherent once must-haves are a hard gate — every surviving job has
  100% coverage, so the term is constant and discriminates between nothing. Replaced with a flat
  gate-clearing share plus nice-to-have coverage.
- **Weight rationale was rewritten by hand.** The generated justifications were generic ("skills
  are most important"). The negotiability argument, the two sanity checks (50 for skills-only, 85
  for bare-minimum), and the gate-on-facts/penalise-on-proxies rule are the actual reasoning and
  were written deliberately.
- **`strictObject` over `object`** for request validation — the default drops unknown keys
  silently, which turns a typo into a wrong record instead of a 400.

**Where AI was not used:** the weighting policy itself. The numbers, the penalty curve and the
gate/penalise boundary are judgement calls that needed defending in prose, and delegating them
would have defeated the purpose of an explainable scorer.

> If you're reviewing this repo, the two places worth reading in full are
> [`src/domain/scoring/`](src/domain/scoring/) and the
> [scoring rationale](#scoring-formula-and-the-reasoning-behind-the-weights) above.
