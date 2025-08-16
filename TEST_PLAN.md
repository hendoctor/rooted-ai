# Authentication Overhaul - Test Plan

## 🧪 **COMPREHENSIVE TESTING SCENARIOS**

### **Phase 1: Redirect Logic Testing**

#### **1.1 Public Route Access**
```
Scenario: Unauthenticated user visits public routes
Given: User is not signed in
When: User visits "/" or "/auth"
Then: Page loads normally, no redirects
Expected: ✅ Direct access allowed
```

#### **1.2 Protected Route Redirects**
```
Scenario: Unauthenticated user visits protected routes
Given: User is not signed in
When: User visits "/admin", "/profile", or "/:clientSlug"
Then: Redirected to "/auth?next=<original-path>"
Expected: ✅ Login form with return path
```

#### **1.3 Auth-Only Route Redirects**
```
Scenario: Authenticated user visits auth pages
Given: User is signed in
When: User visits "/auth"
Then: Redirected to "/" or "next" parameter
Expected: ✅ No access to login when authenticated
```

#### **1.4 Next Parameter Handling**
```
Scenario: Post-login redirect with next parameter
Given: User visits "/auth?next=/admin"
When: User completes sign in
Then: Redirected to "/admin"
Expected: ✅ Returns to intended page
```

---

### **Phase 2: Role-Based Access Control**

#### **2.1 Admin Role Access**
```
Test Cases:
- ✅ Admin can access all routes
- ✅ Admin sees all navigation items
- ✅ Admin can access any company portal
- ✅ Admin can manage users and permissions
```

#### **2.2 Client Role Access**
```
Test Cases:
- ✅ Client can access profile
- ❌ Client cannot access admin dashboard
- ✅ Client can access assigned company portals only
- ❌ Client cannot access other company portals
```

#### **2.3 Unauthenticated Access**
```
Test Cases:
- ✅ Can view home page
- ❌ Cannot access protected routes
- ❌ Navigation shows only public items
- ✅ Can access sign in page
```

---

### **Phase 3: Session Management**

#### **3.1 Session Persistence**
```
Scenario: Browser refresh maintains auth state
Given: User is signed in
When: Page is refreshed
Then: User remains signed in with correct role
Expected: ✅ No re-authentication required
```

#### **3.2 Session Expiry Handling**
```
Scenario: Session expires during use
Given: User has been idle for extended period
When: User attempts protected action
Then: Redirected to login with appropriate message
Expected: ✅ Graceful session expiry
```

#### **3.3 Cache Invalidation**
```
Scenario: Role change reflects immediately
Given: Admin changes user role
When: User refreshes or navigates
Then: New permissions take effect immediately
Expected: ✅ Real-time permission updates
```

---

### **Phase 4: Company Membership System**

#### **4.1 Company Portal Access**
```
Test Matrix:
User Type     | Own Company | Other Company | Admin View
------------- | ----------- | ------------- | ----------
Admin         | ✅ Access   | ✅ Access     | ✅ All
Client        | ✅ Access   | ❌ Denied     | ❌ None
Unauth        | ❌ Denied   | ❌ Denied     | ❌ None
```

#### **4.2 Company Data Isolation**
```
Scenario: Company data is properly isolated
Given: Multiple companies exist
When: Client user accesses company portal
Then: Only sees own company's data
Expected: ✅ No cross-company data leakage
```

#### **4.3 Dynamic Navigation**
```
Scenario: Navigation reflects company access
Given: User has multiple company memberships
When: User is signed in
Then: Navigation shows all accessible companies
Expected: ✅ Dynamic menu generation
```

---

### **Phase 5: Invitation & Redemption Flow**

#### **5.1 Invitation Token Validation**
```
Test Cases:
- ✅ Valid token shows invitation details
- ❌ Invalid token shows error message
- ❌ Expired token shows expiry message
- ❌ Used token shows already used message
```

#### **5.2 Account Creation Flow**
```
Scenario: New user redeems invitation
Given: Valid invitation token
When: User completes signup
Then: Account created with correct role and company
Expected: ✅ Proper company membership assignment
```

#### **5.3 Company Assignment**
```
Scenario: Invitation creates company membership
Given: Invitation for company "Acme Corp"
When: User redeems invitation
Then: User becomes member of "Acme Corp" with invited role
Expected: ✅ Company membership created automatically
```

---

### **Phase 6: Error Handling & Recovery**

#### **6.1 Network Failure Recovery**
```
Scenario: Network issues during auth
Given: User is signing in
When: Network request fails
Then: Shows appropriate error message with retry option
Expected: ✅ Graceful error handling
```

#### **6.2 Invalid Session Recovery**
```
Scenario: Corrupted session data
Given: Invalid session in storage
When: User navigates to protected route
Then: Session cleared and redirected to login
Expected: ✅ Automatic session cleanup
```

#### **6.3 Permission Check Failures**
```
Scenario: Database errors during permission check
Given: Database temporarily unavailable
When: User accesses protected route
Then: Falls back to safe default (deny access)
Expected: ✅ Fail-safe behavior
```

---

### **Phase 7: Performance & UX Testing**

#### **7.1 Loading States**
```
Test Cases:
- ✅ Shows loading spinner during auth check
- ✅ Prevents flash of wrong content
- ✅ Smooth transitions between states
- ✅ Reasonable timeout handling
```

#### **7.2 Cache Performance**
```
Scenario: Subsequent page loads are fast
Given: User has accessed pages before
When: User navigates to cached routes
Then: Permission checks use cache when possible
Expected: ✅ Sub-second permission checks
```

#### **7.3 Mobile Responsiveness**
```
Test Cases:
- ✅ Auth flows work on mobile devices
- ✅ Navigation menus adapt to screen size
- ✅ Touch interactions work properly
- ✅ No horizontal scrolling issues
```

---

## 🔧 **AUTOMATED TEST SCENARIOS**

### **Unit Tests**
```javascript
// AuthGuard utility tests
describe('AuthGuard', () => {
  it('redirects unauthenticated users from protected routes')
  it('prevents open redirect attacks')
  it('handles malformed URLs gracefully')
  it('validates redirect parameters')
})

// RBAC utility tests
describe('RBACManager', () => {
  it('correctly determines route access')
  it('builds navigation menus for roles')
  it('handles company-specific permissions')
  it('validates invitation tokens')
})
```

### **Integration Tests**
```javascript
// Auth flow tests
describe('Authentication Flow', () => {
  it('completes sign in and redirects correctly')
  it('maintains auth state across page refreshes')
  it('clears state on sign out')
  it('handles session expiry gracefully')
})

// RBAC integration tests
describe('Role-Based Access', () => {
  it('enforces admin-only route access')
  it('isolates company portal data')
  it('updates permissions on role changes')
  it('handles multiple company memberships')
})
```

---

## 📊 **PERFORMANCE BENCHMARKS**

### **Target Metrics**
- **Initial Auth Check**: < 200ms
- **Cached Permission Check**: < 50ms
- **Route Transition**: < 100ms
- **Session Refresh**: < 500ms

### **Monitoring Points**
- Auth state initialization time
- Permission cache hit ratio
- Session refresh frequency
- Failed authentication attempts
- Network timeout occurrences

---

## 🚨 **SECURITY TEST SCENARIOS**

### **Attack Vector Testing**
```
1. Open Redirect Attacks
   - Try redirecting to external sites
   - Test malformed URLs
   - Verify origin validation

2. Session Manipulation
   - Try accessing with expired tokens
   - Test session fixation attacks
   - Verify secure session handling

3. Authorization Bypass
   - Attempt direct API calls without auth
   - Try accessing other company data
   - Test privilege escalation attempts

4. XSS/CSRF Protection
   - Test input sanitization
   - Verify CSRF token handling
   - Check for script injection points
```

---

## ✅ **ACCEPTANCE CRITERIA**

### **Must Pass**
- [ ] All redirect scenarios work correctly
- [ ] Role-based access is properly enforced
- [ ] Company data isolation is complete
- [ ] Session management is reliable
- [ ] Error recovery works gracefully

### **Performance Requirements**
- [ ] Auth checks complete within target times
- [ ] No memory leaks in auth state management
- [ ] Efficient cache utilization
- [ ] Minimal re-renders on auth changes

### **Security Requirements**
- [ ] No unauthorized access possible
- [ ] All redirect attacks prevented
- [ ] Session security is maintained
- [ ] Audit trail is complete
- [ ] Error messages don't leak sensitive info

---

## 🎯 **TESTING ENVIRONMENT SETUP**

### **Test Data Requirements**
```
Users:
- Admin user (full access)
- Client user (limited access)
- Multi-company user (multiple memberships)

Companies:
- Company A (with multiple users)
- Company B (single user)
- Company C (admin only)

Test Scenarios:
- Valid/invalid invitation tokens
- Expired sessions
- Network failure simulations
```

### **Browser Support**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS/Android)

**Status**: Ready for comprehensive testing across all scenarios.