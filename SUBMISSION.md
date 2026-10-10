# Submission

**Candidate name:** Vanessa Gabriela Kwok
**Date:** Oct 10, 2026
**Time spent:** _Approximate hours_

---

## Completed Tasks

Check off what you finished:

- [ ] Task 1 — Create Product
- [x] Task 2 — Update Variant
- [x] Task 3 — Fix soft-delete bug
- [x] Task 4 — Loading & error states
- [ ] Task 5 — Input validation

---

## Approach & Decisions

_Briefly describe the approach you took for each task. Mention any trade-offs you made or alternative approaches you considered._

### Task 1

### Task 2
- Added the PUT endpoint to update the variants, with checks for invalid prices, inventory, and duplicate SKUs
- Added an Edit button so users can change the price and inventory directly on the product detail page
- Added Save and Cancel buttons, along with error messages for invalid inputs
- The backend tests passed successfully
- Tested the frontend with Fresh Basil Bunch by changing the price from $2.99 to $3.01 and inventory from 45 to 3. Refreshed the page to make sure the changes were saved

### Task 3
- Product listing was showing soft-deleted products because the SQL query was not filtering them out
- Added p.deleted_at IS NULL to the conditions array, so the deleted products are excluded, even when searching or filtering by category
- After this fix, the # of tests are improved from 1/17 to 3/17 passing

### Task 4
- Added the loading and error states to the products page so users know when the products are loading or something goes wrong
- Added a check for failed API responses
- Prevented older search requests from overwriting the newer search results
- Tested the new states, including the error state, by stopping the backend and refreshing the page

### Task 5

### Bonus A
- Added a deleting state to disable the Delete button while the request is in progress, preventing repeated clicks
- Added the error handling, so that the button will be available again if the previous request fails
- Tested deleting a product from the catalog, and confirmed that the product disappeared from the list
---

## What I'd improve with more time

_What would you add, refactor, or fix if you had another couple of hours?_

---

## Anything else?

_Optional — anything you want the reviewer to know (e.g. bugs you noticed, improvements you'd suggest to the existing code, etc.)._
