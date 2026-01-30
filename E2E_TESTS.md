# E2E Testing Guide

## 🎯 Manual Test Scenarios

These are comprehensive end-to-end test scenarios to validate the system.

## 📋 Test 1: Complete Signup → Trial → Upgrade Flow

### Prerequisites
- Clean database or test tenant
- Access to Dev Admin panel
- Valid payment method (or test mode)

### Steps

#### 1. Tenant Signup
- [ ] Navigate to signup page
- [ ] Fill company name, admin email, password
- [ ] Submit form
- [ ] Verify email sent (or skip if auto-verified)
- [ ] Confirm account creation

**Expected**: 
- Tenant created in `tenants` table
- User created in `users` table
- Subscription created with status `trialing`
- Default trial period (e.g., 14 days)

#### 2. Trial Period Usage
- [ ] Login with new credentials
- [ ] Access dashboard
- [ ] Try to access trial features (should work)
- [ ] Try to access premium features (should be blocked)
- [ ] Verify trial expiry banner shows

**Expected**:
- Feature flags enforce plan limits
- Trial countdown displayed
- Premium features show upgrade prompt

#### 3. Upgrade to Paid Plan
- [ ] Click "Upgrade" button
- [ ] Select paid plan (e.g., Pro)
- [ ] Enter payment details
- [ ] Confirm subscription

**Expected**:
- Subscription status changed to `active`
- `trial_ends_at` cleared or marked as completed
- Premium features now accessible
- Invoice generated

#### 4. Feature Access Validation
- [ ] Access previously blocked features
- [ ] Verify all plan features available
- [ ] Check feature overrides don't interfere

---

## 📋 Test 2: Dev Admin Management

### Prerequisites
- Dev Admin account
- At least one tenant to manage

### Steps

#### 1. Create New Tenant
- [ ] Login to Dev Admin
- [ ] Navigate to Tenants
- [ ] Click "Create Tenant"
- [ ] Fill tenant details
- [ ] Assign plan
- [ ] Submit

**Expected**:
- Tenant created
- Subscription created with selected plan
- Tenant appears in list
- Audit log created

#### 2. Change Subscription Plan
- [ ] Find tenant in list
- [ ] Click "Manage Subscription"
- [ ] Change from Free → Pro
- [ ] Save changes

**Expected**:
- Subscription `plan_id` updated
- Features immediately reflect new plan
- Tenant can access new features
- Audit log created

#### 3. Feature Override
- [ ] Open tenant details
- [ ] Go to "Feature Overrides"
- [ ] Enable "CRM" feature (not in plan)
- [ ] Set expiration: 30 days
- [ ] Add reason: "30-day trial"
- [ ] Save

**Expected**:
- Override created in `tenant_feature_overrides`
- Tenant immediately has CRM access
- Expiration date set correctly
- Audit log created

#### 4. Suspend Subscription
- [ ] Open tenant
- [ ] Click "Suspend Subscription"
- [ ] Confirm action
- [ ] Add reason

**Expected**:
- Subscription status = `suspended`
- Tenant cannot login (or sees suspended message)
- Data preserved
- Audit log created

#### 5. Reactivate Subscription
- [ ] Find suspended tenant
- [ ] Click "Reactivate"
- [ ] Confirm

**Expected**:
- Subscription status = `active`
- Tenant can login again
- All data intact
- Audit log created

---

## 📋 Test 3: Support Impersonation

### Prerequisites
- Dev Admin account with `DEV_ADMIN` or `SUPER_ADMIN` role
- Active tenant to impersonate

### Steps

#### 1. Start Impersonation
- [ ] Go to Support panel
- [ ] Find tenant/ticket
- [ ] Click "Impersonate"
- [ ] Enter reason: "Debugging billing issue"
- [ ] Confirm

**Expected**:
- Session created in `support_sessions`
- Impersonation token generated
- Banner shows "🎭 Impersonating: [Tenant Name]"
- Session expires in 15 minutes

#### 2. Perform Actions as Tenant
- [ ] Navigate to tenant dashboard
- [ ] View customer data
- [ ] Create test work
- [ ] Modify settings
- [ ] Export report

**Expected**:
- All actions logged in `support_session_logs`
- Actions also in `audit_logs` with `is_impersonation: true`
- Tenant ID correctly set
- No cross-tenant access

#### 3. Session Expiration
- [ ] Wait 15 minutes OR advance system time
- [ ] Try to perform action

**Expected**:
- Session token invalid
- Redirected to login or error page
- Cannot access tenant data
- Session marked as expired

#### 4. End Session Early
- [ ] Click "End Impersonation"
- [ ] Confirm

**Expected**:
- Session `ended_at` timestamp set
- Token invalidated
- Return to Dev Admin view
- All actions logged

#### 5. Review Impersonation Logs
- [ ] Go to Dev Admin → Audit
- [ ] Filter by `is_impersonation: true`
- [ ] View session details

**Expected**:
- All actions visible
- Timestamps correct
- Reason documented
- IP and user agent logged

---

## 📋 Test 4: Feature Flags End-to-End

### Prerequisites
- Dev Admin access
- Test tenant with specific plan

### Steps

#### 1. Disable Module via Feature Flag
- [ ] Login as Dev Admin
- [ ] Find tenant with "Projects" feature
- [ ] Create feature override
- [ ] Set "PROJECTS" = disabled
- [ ] Save

**Expected**:
- Frontend: Projects menu hidden
- Backend: API calls return `FEATURE_DISABLED`
- User sees upgrade prompt if trying to access

#### 2. Enable Beta Feature
- [ ] Find tenant without "AI_CHAT"
- [ ] Create override: "AI_CHAT" = enabled
- [ ] Set expiration: 7 days
- [ ] Reason: "Beta tester"

**Expected**:
- AI Chat menu appears
- User can access AI features
- Expiration countdown shown (optional)

#### 3. Expiration Handling
- [ ] Advance time past expiration OR wait
- [ ] Tenant tries to access feature

**Expected**:
- Feature automatically disabled
- Override marked as expired
- Feature removed from menu
- User sees "Feature expired" message

#### 4. Plan Upgrade Includes Features
- [ ] Tenant on Free plan (no CRM)
- [ ] Upgrade to Pro plan (includes CRM)
- [ ] Login as tenant

**Expected**:
- CRM menu immediately visible
- CRM features accessible
- No override needed
- Plan features resolved correctly

---

## 📋 Test 5: RBAC and Permissions

### Prerequisites
- Tenant with multiple users
- Different roles configured

### Steps

#### 1. Create User with Limited Permissions
- [ ] Login as tenant admin
- [ ] Go to Settings → Users
- [ ] Invite new user: "viewer@example.com"
- [ ] Assign role: "Viewer"
- [ ] Viewer role has: `WORK_VIEW` only

**Expected**:
- User created
- Role assigned
- Email sent (if configured)

#### 2. Test Viewer Permissions
- [ ] Login as viewer@example.com
- [ ] Try to view projects (should work)
- [ ] Try to create project (should fail)
- [ ] Try to delete project (should fail)

**Expected**:
- View works: ✅ Success
- Create work: ❌ `PERMISSION_DENIED`
- Delete work: ❌ `PERMISSION_DENIED`
- UI hides create/delete buttons

#### 3. Upgrade Permissions
- [ ] Login as admin
- [ ] Change viewer role to "Manager"
- [ ] Manager has: `WORK_VIEW`, `WORK_CREATE`, `WORK_UPDATE`

**Expected**:
- Permissions cache invalidated
- Viewer can now create/update
- Still cannot delete
- UI shows create/edit buttons

#### 4. Admin Wildcard Permission
- [ ] Create "Admin" role
- [ ] Assign permission: `*`
- [ ] Assign to user

**Expected**:
- User can perform ANY action
- All features accessible
- All buttons visible
- Bypasses permission checks

---

## ✅ Success Criteria

Each test should verify:

### Security
- [ ] No cross-tenant data access
- [ ] Permissions enforced at API level
- [ ] Feature flags enforced at API level
- [ ] Subscription status blocks access correctly
- [ ] Impersonation is fully logged

### Functionality
- [ ] All features work as expected
- [ ] UI updates reflect backend state
- [ ] Error messages are user-friendly
- [ ] Navigation is intuitive

### Performance
- [ ] Page loads < 3s
- [ ] API responses < 1s
- [ ] No memory leaks
- [ ] Caching works (permissions, features)

### Audit
- [ ] All critical actions logged
- [ ] Timestamps accurate
- [ ] TraceIds present
- [ ] Can correlate logs

---

## 🐛 Common Issues

### Issue: Feature not appearing after override
**Check**:
- Override not expired
- Frontend cache cleared
- `/me` endpoint returns feature

### Issue: Permission denied despite having permission
**Check**:
- Cache invalidated after role change
- User has role assigned
- Role has permission
- Permission key matches

### Issue: Impersonation session won't start
**Check**:
- SaaS user has admin role
- Tenant exists and is active
- Session not already active
- JWT secret configured

---

## 📊 Test Execution Tracking

| Test | Status | Date | Tester | Notes |
|------|--------|------|--------|-------|
| Signup → Trial → Upgrade | ⏳ | | | |
| Dev Admin Management | ⏳ | | | |
| Support Impersonation | ⏳ | | | |
| Feature Flags E2E | ⏳ | | | |
| RBAC Permissions | ⏳ | | | |

Legend: ⏳ Pending, ✅ Pass, ❌ Fail
