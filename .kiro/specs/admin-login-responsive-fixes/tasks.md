# Implementation Plan

## Overview

This task list follows the exploratory bugfix workflow for fixing admin login redirect and responsive layout issues:
1. **Explore** - Write tests BEFORE fix to understand the bugs
2. **Preserve** - Write tests for non-buggy behavior
3. **Implement** - Apply the fixes with understanding
4. **Validate** - Verify fixes work and don't break anything

---

## Bug 1: Admin Login Redirect Error

- [x] 1. Write bug condition exploration test for admin login redirect
  - **Property 1: Bug Condition** - Admin Redirect Race Condition
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the admin redirect bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing case - admin login with credentials (admin@techcycle.vn / 123456)
  - Test that after successful admin login and setting `window.location.hash = '#/dashboard'`, the Dashboard component renders with user state available (from Bug Condition 1 in design)
  - The test assertions should match: adminDashboardRendered(result) AND userStateAvailable(result)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists, likely showing null user state or Dashboard showing "Please log in")
  - Document counterexamples found to understand root cause (e.g., "Dashboard component receives null user state when mounting after redirect")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [ ] 2. Write preservation property tests for non-admin login behavior (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Admin Login Redirects
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-admin login cases (seller, technician, customer)
  - Observe: Seller login with seller credentials redirects to '#/dashboard' and renders SellerDashboard
  - Observe: Technician login redirects to '#/dashboard' and renders TechnicianDashboard
  - Observe: Customer login redirects to '#/home' page
  - Observe: Invalid credentials show error message without redirecting
  - Write property-based tests capturing these observed behaviors from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees (different roles, credential combinations)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Fix admin login redirect race condition

  - [ ] 3.1 Implement the admin login redirect fix in Auth.jsx
    - Add 50ms delay before setting `window.location.hash = '#/dashboard'` after admin login to allow React state propagation
    - Use `setTimeout(() => { window.location.hash = '#/dashboard'; }, 50)` after successful admin login
    - This ensures AuthContext state propagates through component tree before navigation triggers
    - _Bug_Condition: isBugCondition_AdminRedirect(input) where input.loginSuccess === true AND input.user.role === 'admin' AND input.targetHash === '#/dashboard' AND (NOT hashChangeEventTriggered OR NOT dashboardComponentRendered)_
    - _Expected_Behavior: adminDashboardRendered(result) AND userStateAvailable(result) from design_
    - _Preservation: Seller/technician/customer login redirects remain unchanged (Requirements 3.1, 3.2, 3.3)_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Admin Redirect Works Correctly
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms admin redirect bug is fixed, Dashboard receives user state)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Admin Login Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in seller/technician/customer login)
    - Confirm all tests still pass after fix (no regressions)

---

## Bug 2: Scroll Position Not Reset

- [ ] 4. Write bug condition exploration test for scroll position reset
  - **Property 1: Bug Condition** - Scroll Position Not Reset on Navigation
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the scroll position bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - navigation from shop (scrolled to 500px) to booking page
  - Test that after navigating from one page to another, `window.scrollY === 0` (from Bug Condition 2 in design)
  - The test assertions should match: window.scrollY === 0 after navigation
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists, scroll position remains at previous location)
  - Document counterexamples found (e.g., "Navigate from shop at 500px scroll to booking, scroll remains at 500px")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.3_

- [ ] 5. Write preservation property tests for non-navigation scroll behavior (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Dashboard Page Rendering
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-dashboard pages (shop, booking, cart, checkout, home)
  - Observe: Shop page renders with correct product grid and filtering
  - Observe: Booking page renders with calendar and form correctly
  - Observe: Cart and checkout pages render with correct layouts
  - Observe: Navbar, Footer, and ChatBot display correctly on all pages
  - Write property-based tests capturing these observed layout and functionality behaviors from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees (different pages, viewport combinations)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.4, 3.5_

- [ ] 6. Fix scroll position reset on navigation

  - [ ] 6.1 Implement scroll reset in App.jsx
    - Add new useEffect hook that watches `activePage` state
    - Call `window.scrollTo(0, 0)` whenever `activePage` changes
    - Place useEffect after existing hashchange event listener for proper execution order
    - _Bug_Condition: isBugCondition_ScrollPosition(input) where input.previousHash !== input.newHash AND input.scrollY > 0 AND NOT window.scrolledToTop_
    - _Expected_Behavior: window.scrollY === 0 after navigation from design_
    - _Preservation: Non-dashboard page rendering unchanged (Requirements 3.4, 3.5)_
    - _Requirements: 1.3, 2.3, 3.4, 3.5_

  - [ ] 6.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Scroll Position Resets Correctly
    - **IMPORTANT**: Re-run the SAME test from task 4 - do NOT write a new test
    - The test from task 4 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 4
    - **EXPECTED OUTCOME**: Test PASSES (confirms scroll position resets to 0 on navigation)
    - _Requirements: 2.3_

  - [ ] 6.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Dashboard Page Rendering Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 5 - do NOT write new tests
    - Run preservation property tests from step 5
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in page rendering)
    - Confirm all tests still pass after fix (no regressions)

---

## Bug 3: Fixed Height Layout Issues

- [ ] 7. Write bug condition exploration test for fixed height layout issues
  - **Property 1: Bug Condition** - Fixed Height Causes Overflow
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the fixed height layout bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - dashboard at 1366x768 and 1920x1080 viewports
  - Test that dashboard layout uses flexible heights and has no overflow issues at these screen sizes (from Bug Condition 3 in design)
  - The test assertions should match: hasFlexibleHeight(result) AND NOT hasOverflow(result)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists, fixed heights cause overflow)
  - Document counterexamples found (e.g., "Dashboard at 1366x768 has vertical scrollbar, content cut off at height: 100vh")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.4_

- [ ] 8. Write preservation property tests for dashboard role rendering (BEFORE implementing fix)
  - **Property 2: Preservation** - Role-Specific Dashboard Rendering
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for different role dashboards
  - Observe: Seller dashboard renders with product management features correctly
  - Observe: Technician dashboard renders with booking management correctly
  - Observe: Customer dashboard renders with order history correctly
  - Observe: Theme switching (light/dark mode) works across all dashboards
  - Write property-based tests capturing these observed behaviors from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees (different roles, theme combinations)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.6, 3.7_

- [ ] 9. Fix fixed height layout issues in Dashboard.css

  - [ ] 9.1 Replace fixed heights with flexible heights
    - Change `.admin-dashboard-layout .dashboard-sidebar` from `height: 100vh` to `min-height: 100vh`
    - Change `.admin-dashboard-layout .dashboard-main-content` from `height: 100vh` to `min-height: 100vh`
    - Change `.chat-view-layout` from `height: 650px` to `min-height: 500px; max-height: 80vh`
    - Change `.chat-messages-thread` to use `flex: 1` instead of fixed height
    - Change `.dashboard-main-content` from `min-height: 500px` to `min-height: auto`
    - _Bug_Condition: isBugCondition_FixedHeight(input) where (input.screenWidth === 1366 AND input.screenHeight === 768) OR (input.screenWidth === 1920 AND input.screenHeight === 1080) AND input.layoutType === 'dashboard' AND hasFixedHeightStyles(input.layoutType) AND hasOverflowIssues()_
    - _Expected_Behavior: hasFlexibleHeight(result) AND NOT hasOverflow(result) from design_
    - _Preservation: Role-specific dashboard rendering unchanged (Requirements 3.6, 3.7)_
    - _Requirements: 1.4, 2.4, 3.6, 3.7_

  - [ ] 9.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Flexible Heights Work Correctly
    - **IMPORTANT**: Re-run the SAME test from task 7 - do NOT write a new test
    - The test from task 7 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 7
    - **EXPECTED OUTCOME**: Test PASSES (confirms flexible heights work without overflow)
    - _Requirements: 2.4_

  - [ ] 9.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Role-Specific Dashboard Rendering Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 8 - do NOT write new tests
    - Run preservation property tests from step 8
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in dashboard role rendering)
    - Confirm all tests still pass after fix (no regressions)

---

## Bug 4: Sidebar Overlap on Small Screens

- [ ] 10. Write bug condition exploration test for sidebar overlap
  - **Property 1: Bug Condition** - Sidebar Overlaps Main Content
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the sidebar overlap bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - dashboard at widths below 1024px (e.g., 1000px, 768px)
  - Test that sidebar does not overlap main content at small screen widths (from Bug Condition 4 in design)
  - The test assertions should match: sidebarDoesNotOverlap(result)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists, sidebar overlaps content)
  - Document counterexamples found (e.g., "Dashboard at 1000px width: sidebar (260px) overlaps main content, text unreadable")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.5, 1.6_

- [ ] 11. Write preservation property tests for responsive breakpoints (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Responsive Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for existing responsive breakpoints
  - Observe: Dashboard layout adjusts at 1024px breakpoint (existing behavior)
  - Observe: Dashboard layout adjusts at 768px breakpoint (existing behavior)
  - Observe: Mobile layouts work correctly at small screen sizes
  - Write property-based tests capturing these observed responsive behaviors from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees (different viewport sizes, breakpoint transitions)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.4, 3.5, 3.6_

- [ ] 12. Fix sidebar overlap and add responsive breakpoints

  - [ ] 12.1 Add new responsive breakpoints for laptop screens
    - Add `@media (max-width: 1440px)` breakpoint for medium-large laptops
    - Add `@media (max-width: 1366px)` breakpoint for common laptop screens
    - Adjust grid gaps, padding, and font sizes at these breakpoints
    - Reduce `.stats-summary-grid` from 3 columns to 2 columns at 1366px
    - _Bug_Condition: isBugCondition_SidebarOverlap(input) where input.screenWidth < 1024 AND input.layoutType === 'dashboard' AND sidebarOverlapsContent()_
    - _Expected_Behavior: sidebarDoesNotOverlap(result) from design_
    - _Preservation: Existing responsive behavior at 1024px and 768px unchanged (Requirements 3.4, 3.5, 3.6)_
    - _Requirements: 1.5, 1.6, 2.5, 2.6, 3.4, 3.5, 3.6_

  - [ ] 12.2 Fix sidebar overlap at 1024px and below
    - In `@media (max-width: 1024px)` rule, ensure `.dashboard-grid-layout` stacks sidebar above content
    - Set `.dashboard-sidebar` width to `100%` and remove sticky positioning
    - Add `padding-bottom` to sidebar to create spacing before main content
    - Ensure all multi-column grids collapse to single column at 1024px and below
    - Add responsive padding adjustments to prevent content from touching edges
    - _Requirements: 1.5, 2.5, 3.4, 3.5, 3.6_

  - [ ] 12.3 Fix chat layout responsiveness
    - At 1100px: Verify `.chat-view-layout` uses `grid-template-columns: 220px 1fr` (already exists)
    - At 768px: Change height to `min-height: 500px` instead of fixed `height: 500px`
    - Add `overflow-y: auto` to allow scrolling when content exceeds available space
    - _Requirements: 1.4, 2.4_

  - [ ] 12.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Sidebar Does Not Overlap
    - **IMPORTANT**: Re-run the SAME test from task 10 - do NOT write a new test
    - The test from task 10 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 10
    - **EXPECTED OUTCOME**: Test PASSES (confirms sidebar does not overlap at small screens)
    - _Requirements: 2.5, 2.6_

  - [ ] 12.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Responsive Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 11 - do NOT write new tests
    - Run preservation property tests from step 11
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in responsive breakpoints)
    - Confirm all tests still pass after fix (no regressions)

---

## Final Checkpoint

- [ ] 13. Checkpoint - Ensure all tests pass
  - Run all exploration tests (tasks 1, 4, 7, 10) - all should PASS on fixed code
  - Run all preservation tests (tasks 2, 5, 8, 11) - all should PASS on fixed code
  - Verify admin login redirects correctly to AdminDashboard
  - Verify page navigation scrolls to top automatically
  - Verify dashboard layouts are flexible without overflow at 1366x768 and 1920x1080
  - Verify sidebar does not overlap at screen widths below 1024px
  - Verify new breakpoints at 1366px and 1440px work correctly
  - Verify non-admin login redirects continue to work (seller, technician, customer)
  - Verify non-dashboard pages render correctly (shop, booking, cart, checkout)
  - Verify role-specific dashboards render correctly (seller, technician, customer)
  - Verify theme switching works across all pages
  - Ask the user if questions arise or additional testing is needed
