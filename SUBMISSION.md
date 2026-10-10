# Submission

**Candidate name:** Vanessa Gabriela Kwok
**Date:** Oct 10, 2026
**Time spent:** _Approximate hours_

---

## Completed Tasks

Check off what you finished:

- [ ] Task 1 — Create Product
- [ ] Task 2 — Update Variant
- [x] Task 3 — Fix soft-delete bug
- [ ] Task 4 — Loading & error states
- [ ] Task 5 — Input validation

---

## Approach & Decisions

_Briefly describe the approach you took for each task. Mention any trade-offs you made or alternative approaches you considered._

### Task 1

### Task 2

### Task 3
- Product listing was showing soft-deleted products because the SQL query was not filtering them out
- Added p.deleted_at IS NULL to the conditions array, so the deleted products are excluded, even when searching or filtering by category
- After this fix, the # of tests are improved from 1/17 to 3/17 passing

### Task 4

### Task 5

---

## What I'd improve with more time

_What would you add, refactor, or fix if you had another couple of hours?_

---

## Anything else?

_Optional — anything you want the reviewer to know (e.g. bugs you noticed, improvements you'd suggest to the existing code, etc.)._
