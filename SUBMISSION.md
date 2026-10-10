# Submission

**Candidate name:** Vanessa Gabriela Kwok
**Date:** Oct 10, 2026
**Time spent:** Approx 2.5 hours

---

## Completed Tasks


- [x] Task 1 — Create Product
- [x] Task 2 — Update Variant
- [x] Task 3 — Fix soft-delete bug
- [x] Task 4 — Loading & error states
- [x] Task 5 — Input validation

---

## Approach & Decisions


### Task 1
- Added a form to create products with one or more variants
- Tested creating a product and confirmed it shows up correctly
- I used a database transaction to save the product and its variants together. This way, if something goes wrong while adding a variant, the entire operation is rolled back instead of leaving a partially created product

### Task 2
- Added the PUT endpoint to update the variants, with checks for invalid prices, inventory, and duplicate SKUs
- I added variant editing directly to the product detail page. This lets users make quick changes to prices and inventory without needing a separate edit page
- Added Save and Cancel buttons, along with error messages for invalid inputs
- The backend tests passed successfully
- Tested the frontend with Fresh Basil Bunch by changing the price from $2.99 to $3.01 and inventory from 45 to 3. Refreshed the page to make sure the changes were saved

### Task 3
- Product listing was showing soft-deleted products because the SQL query was not filtering them out
- Added p.deleted_at IS NULL to the SQL conditions so deleted products are excluded directly from the API response, including when searching or filtering by category. This avoids relying on the frontend to hide them

### Task 4
- Added the loading and error states to the products page so users know when the products are loading or something goes wrong
- Added a check for failed API responses
- Prevented older search requests from overwriting the newer search results
- Tested the new states, including the error state, by stopping the backend and refreshing the page

### Task 5
- Added validation for required fields, duplicate SKUs, and negative prices or inventory
- Used frontend validation to give users immediate feedback and backend validation to prevent invalid data from being saved
- Tested negative inventory and duplicate SKUs. Both were rejected

### Bonus A
- Added a deleting state to disable the Delete button while the request is in progress, preventing repeated clicks
- Added the error handling, so that the button will be available again if the previous request fails
- Tested deleting a product from the catalog, and confirmed that the product disappeared from the list

### Bonus B
- Updated the product endpoints to return JSON error responses instead of plain text
- Added error handling to the product DELETE endpoint, so unexpected database errors also return JSON
- Checked the remaining backend routes for consistency and confirmed all 17 backend tests still pass
---

## What I'd improve with more time

- Add product image uploads so users can see photos instead of placeholder icons, making products easier to identify
- Add tooltips and a simple help page to explain buttons and fields, especially for first-time users
- Add a Help & Support form where users can describe an issue and send it directly to the support team by email
- Add automated frontend tests for product creation, variant editing, and validation
- Use a separate database for automated tests so running them doesn't reset manually created products

---

## Anything else?

All 17 backend tests passed, and the frontend build completed successfully. I also manually tested product creation, variant editing, input validation, loading and error states, and product deletion.
