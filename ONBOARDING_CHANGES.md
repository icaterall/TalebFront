# Onboarding Flow - Local Storage Implementation

## Overview
The onboarding flow has been updated to save user progress locally (in localStorage) instead of immediately saving to the backend when a role is selected. This allows users to complete the onboarding process at their own pace, and their progress is preserved even if they close the browser or navigate away.

## Changes Made

### 1. New Service: `OnboardingStateService`
**Location:** `src/app/core/services/onboarding-state.service.ts`

This service manages the local onboarding state and provides the following functionality:

#### State Structure
```typescript
interface OnboardingState {
  step: 'select_role' | 'enter_dob' | 'teacher_setup' | 'complete';
  selectedRole?: 'Teacher' | 'Student';
  dateOfBirth?: {
    year: string;
    month: string;
    day: string;
  };
  timestamp?: number;
}
```

#### Key Methods
- `getState()`: Retrieves the current onboarding state from localStorage
- `saveState(state)`: Saves the complete onboarding state
- `updateState(updates)`: Updates specific fields in the state
- `clearState()`: Clears the onboarding state (called on logout)
- `saveRoleSelection(role)`: Saves the user's role choice
- `saveDateOfBirth(year, month, day)`: Saves the user's date of birth
- `navigateBasedOnState()`: Navigates to the appropriate page based on saved state

### 2. Updated Component: `AccountTypePageComponent`
**Location:** `src/app/features/account-type-page/account-type-page.component.ts`

#### Key Changes

**Role Selection (`choose` method)**
- **Before:** Called `authService.updateRole()` to save to backend immediately
- **After:** Calls `onboardingState.saveRoleSelection()` to save locally only

**State Restoration**
- Added `restoreOnboardingState()` method that runs on component initialization
- Automatically restores the DOB form if user was in the middle of entering their date of birth
- Preserves partially filled DOB fields

**Auto-Save Progress**
- Date of birth fields now auto-save as the user types
- Uses getter/setter properties to trigger saves on each field change
- Ensures no data loss if user navigates away

**Back Navigation**
- `goBack()` method now properly updates the state to return to role selection
- Clears DOB data when going back

**Logout**
- Updated to clear onboarding state when user logs out

### 3. Updated Service: `AuthService`
**Location:** `src/app/core/services/auth.service.ts`

#### Key Changes

**Post-Login Navigation (`postLoginNavigate` method)**
- Now checks for local onboarding state first before checking server-side state
- Prioritizes localStorage state during active onboarding
- Navigates user to the appropriate step based on their progress

**Helper Method**
- Added `getOnboardingStateFromStorage()` to read state directly from localStorage
- Avoids circular dependency with OnboardingStateService

**Logout**
- Now clears onboarding state from localStorage

### 4. Updated Guard: `OnboardingGuard`
**Location:** `src/app/core/guards/onboarding.guard.ts`

#### Key Changes

**State Checking**
- Now checks local onboarding state first
- Prevents users from skipping onboarding steps
- Redirects to appropriate page based on state:
  - `select_role`: Redirects to `/account-type`
  - `enter_dob`: Redirects to `/account-type` (shows DOB form)
  - `teacher_setup`: Redirects to `/teacher`

**Fallback**
- Falls back to server-side onboarding checks if no local state exists

## User Flow

### Student Onboarding
1. User selects "Student" role → Saved to localStorage
2. DOB form is shown automatically
3. User enters date of birth → Auto-saved as they type
4. User clicks "Continue" → Completes onboarding
5. State is marked as 'complete' and can be cleared on next login

### Teacher Onboarding
1. User selects "Teacher" role → Saved to localStorage
2. User is redirected to `/teacher` dashboard
3. State tracks that teacher setup is in progress
4. Can be completed later with additional teacher-specific setup

### Returning Users
- If user closes browser/navigates away during onboarding:
  - On return, they're taken directly to where they left off
  - Partial data (like DOB fields) is restored
  - Can continue from the same step

### Data Persistence
- All onboarding progress is stored in localStorage under key: `onboardingState`
- Includes timestamp of last save
- Cleared automatically on logout
- Cleared when onboarding is marked complete

## Benefits

1. **Improved User Experience**
   - Users can complete onboarding at their own pace
   - No data loss if they navigate away
   - Progress is preserved across sessions

2. **Reduced Backend Load**
   - Role selection doesn't hit the backend immediately
   - Fewer API calls during onboarding
   - Backend only updated when onboarding is complete

3. **Offline Resilience**
   - Onboarding can continue even with poor connectivity
   - Data is saved locally first
   - Can sync with backend when connection is restored

4. **Better State Management**
   - Clear separation between local and server state
   - Easy to track onboarding progress
   - Simpler debugging with localStorage inspection

## When Backend is Updated

When you're ready to save the onboarding data to the backend, you can:

1. Call the existing `authService.updateRole()` method with the stored role
2. Send the date of birth to the appropriate backend endpoint
3. Mark onboarding as complete by calling `onboardingState.markComplete()`
4. The state will be cleared on next login/navigation

Example:
```typescript
const state = this.onboardingState.getState();
if (state) {
  // Save role
  await this.authService.updateRole(state.selectedRole).toPromise();
  
  // Save DOB if exists
  if (state.dateOfBirth) {
    await this.apiService.updateDateOfBirth(state.dateOfBirth).toPromise();
  }
  
  // Mark complete
  this.onboardingState.markComplete();
}
```

## Testing Checklist

- [ ] Select "Student" role → DOB form appears
- [ ] Enter partial DOB → Close tab → Reopen → Data is restored
- [ ] Select "Teacher" role → Redirects to teacher dashboard
- [ ] Complete student onboarding → State is cleared
- [ ] Logout during onboarding → State is cleared
- [ ] Try to navigate to protected routes → Redirected back to onboarding
- [ ] Check localStorage for `onboardingState` key during onboarding
- [ ] Verify state is removed after completion/logout

## Future Enhancements

1. **Teacher Setup Page**: Create a dedicated teacher setup page at `/teacher/setup` for additional teacher-specific configuration
2. **Student Dashboard**: Create student-specific routes and dashboard
3. **Backend Sync**: Implement automatic sync of onboarding state to backend when complete
4. **Progress Indicator**: Add visual progress indicator showing onboarding steps
5. **State Expiry**: Add expiry time to onboarding state (e.g., 7 days)

