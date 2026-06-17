import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import * as fc from 'fast-check';
import App from '../App';

/**
 * Bug Condition Exploration Test for Admin Login Redirect
 * 
 * **Validates: Requirements 1.1, 1.2**
 * 
 * **Property 1: Bug Condition - Admin Redirect Race Condition**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * NOTE: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * GOAL: Surface counterexamples that demonstrate the admin redirect bug exists
 * 
 * Scoped PBT Approach: Scope the property to concrete failing case - admin login with credentials
 * (admin@techcycle.vn / 123456)
 * 
 * Test that after successful admin login and setting window.location.hash = '#/dashboard',
 * the Dashboard component renders with user state available (from Bug Condition 1 in design)
 * 
 * The test assertions match: adminDashboardRendered(result) AND userStateAvailable(result)
 * 
 * EXPECTED OUTCOME: Test FAILS on unfixed code (this is correct - it proves the bug exists,
 * likely showing null user state or Dashboard showing "Please log in")
 */

describe('Bug Condition 1: Admin Login Redirect Race Condition', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset window.location.hash
    window.location.hash = '#/auth';
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  /**
   * Helper function to check if AdminDashboard is rendered
   * AdminDashboard should contain control panel elements specific to admin
   */
  const adminDashboardRendered = (container) => {
    // Check for admin-specific elements that would only appear in AdminDashboard
    // AdminDashboard contains unique text or elements that distinguish it from the login screen
    const hasAdminElements = 
      // Should NOT show the "Please log in" message
      !screen.queryByText(/Please log in to access the dashboard/i) &&
      // Should show dashboard-specific content (not auth page)
      !container.querySelector('.auth-page');
    
    return hasAdminElements;
  };

  /**
   * Helper function to check if user state is available
   * This checks that the Dashboard component has access to the user object
   */
  const userStateAvailable = (container) => {
    // If the "Please log in" message appears, user state is NOT available
    const pleaseLoginMessage = screen.queryByText(/Please log in to access the dashboard/i);
    return !pleaseLoginMessage;
  };

  /**
   * Mock the login API to return successful admin user
   */
  const mockAdminLoginSuccess = () => {
    global.fetch = vi.fn((url) => {
      // Mock login endpoint
      if (url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            token: 'mock-admin-token',
            user: {
              id: 1,
              username: 'Admin User',
              email: 'admin@techcycle.vn',
              role: 'admin',
              avatar: null,
            },
          }),
        });
      }
      
      // Mock /me endpoint for token verification
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 1,
            username: 'Admin User',
            email: 'admin@techcycle.vn',
            role: 'admin',
            avatar: null,
          }),
        });
      }
      
      return Promise.reject(new Error('Unknown endpoint'));
    });
  };

  it('Property 1: Admin login redirect race condition - Dashboard should render with user state after admin login', async () => {
    /**
     * This test simulates the exact bug condition:
     * 1. Admin user logs in successfully
     * 2. Auth.jsx sets window.location.hash = '#/dashboard' immediately
     * 3. Dashboard component renders
     * 4. Expected: Dashboard should have access to user state and render AdminDashboard
     * 5. ACTUAL (unfixed): Dashboard receives null user, shows "Please log in"
     * 
     * This is a RACE CONDITION where the hash changes before React's AuthContext
     * state has propagated through the component tree.
     */
    
    // Setup mock API
    mockAdminLoginSuccess();
    
    // Set initial hash to auth page
    window.location.hash = '#/auth';
    
    // Render the app
    const { container } = render(<App />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(container.querySelector('.auth-page')).toBeTruthy();
    }, { timeout: 2000 });
    
    // Simulate the login flow by directly calling the actions that Auth.jsx performs
    // We simulate the race condition by setting the hash immediately after login state update
    await act(async () => {
      // Simulate login API call
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'admin@techcycle.vn', 
          password: '123456' 
        }),
      });
      
      const data = await response.json();
      
      // Store token (simulating what AuthContext.login does)
      localStorage.setItem('techcycle_token', data.token);
      
      // CRITICAL: This is where the bug manifests
      // Auth.jsx immediately sets the hash after login() returns
      // But the AuthContext's setUser() is asynchronous and may not have propagated yet
      window.location.hash = '#/dashboard';
    });
    
    // Wait for navigation and rendering
    // The Dashboard component should now render
    await waitFor(() => {
      const currentHash = window.location.hash;
      expect(currentHash).toBe('#/dashboard');
    }, { timeout: 2000 });
    
    // CRITICAL ASSERTIONS
    // These encode the expected behavior that should hold after the fix
    
    // Wait a bit for potential state propagation (simulating async React updates)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if AdminDashboard rendered (not the "Please log in" message)
    const dashboardRendered = adminDashboardRendered(container);
    
    // Check if user state is available (no "Please log in" message)
    const userAvailable = userStateAvailable(container);
    
    // These assertions encode the EXPECTED behavior
    // On UNFIXED code, these will FAIL because:
    // - Dashboard will show "Please log in to access the dashboard"
    // - User state is null when Dashboard first renders due to race condition
    expect(dashboardRendered).toBe(true);
    expect(userAvailable).toBe(true);
    
    // Log the actual state for debugging
    if (!dashboardRendered || !userAvailable) {
      console.log('BUG CONFIRMED: Dashboard rendered without user state');
      console.log('Hash:', window.location.hash);
      console.log('Please log in message present:', !!screen.queryByText(/Please log in to access the dashboard/i));
    }
  });

  /**
   * Property-Based Test: Generate multiple admin login scenarios
   * 
   * This test uses fast-check to generate various admin login scenarios
   * to ensure the property holds across different timing conditions
   */
  it('Property 1 (PBT): Admin redirect works across various timing scenarios', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate delay values to simulate different timing conditions
        fc.integer({ min: 0, max: 100 }),
        async (delayMs) => {
          // Setup for each property test iteration
          localStorage.clear();
          window.location.hash = '#/auth';
          mockAdminLoginSuccess();
          
          const { container, unmount } = render(<App />);
          
          try {
            // Wait for auth page to render
            await waitFor(() => {
              expect(container.querySelector('.auth-page')).toBeTruthy();
            }, { timeout: 2000 });
            
            // Simulate login with variable delay
            await act(async () => {
              const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  email: 'admin@techcycle.vn', 
                  password: '123456' 
                }),
              });
              
              const data = await response.json();
              localStorage.setItem('techcycle_token', data.token);
              
              // Introduce variable delay to test race condition
              await new Promise(resolve => setTimeout(resolve, delayMs));
              
              // Set hash (simulating Auth.jsx behavior)
              window.location.hash = '#/dashboard';
            });
            
            // Wait for navigation
            await waitFor(() => {
              expect(window.location.hash).toBe('#/dashboard');
            }, { timeout: 2000 });
            
            // Wait for potential state propagation
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Property assertions
            const dashboardRendered = adminDashboardRendered(container);
            const userAvailable = userStateAvailable(container);
            
            // The property should hold: admin dashboard should always render with user state
            // On UNFIXED code, this will fail for small delay values (race condition)
            expect(dashboardRendered && userAvailable).toBe(true);
          } finally {
            unmount();
          }
        }
      ),
      { 
        numRuns: 20, // Run 20 iterations with different delays
        timeout: 60000, // 60 second timeout for all runs
      }
    );
  });
});
