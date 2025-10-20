import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface OnboardingState {
  step: 'select_role' | 'enter_dob' | 'teacher_setup' | 'complete';
  selectedRole?: 'Teacher' | 'Student';
  dateOfBirth?: {
    year: string;
    month: string;
    day: string;
  };
  timestamp?: number; // When this state was saved
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingStateService {
  private readonly STORAGE_KEY = 'onboardingState';

  constructor(private router: Router) {}

  /**
   * Get the current onboarding state from localStorage
   */
  getState(): OnboardingState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error reading onboarding state:', error);
      this.clearState();
    }
    return null;
  }

  /**
   * Save the onboarding state to localStorage
   */
  saveState(state: OnboardingState): void {
    try {
      const stateWithTimestamp = {
        ...state,
        timestamp: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateWithTimestamp));
      console.log('Onboarding state saved:', stateWithTimestamp);
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  }

  /**
   * Update specific fields in the onboarding state
   */
  updateState(updates: Partial<OnboardingState>): void {
    const currentState = this.getState() || { step: 'select_role' };
    const newState = { ...currentState, ...updates };
    this.saveState(newState);
  }

  /**
   * Clear the onboarding state from localStorage
   */
  clearState(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('Onboarding state cleared');
  }

  /**
   * Save role selection
   */
  saveRoleSelection(role: 'Teacher' | 'Student'): void {
    if (role === 'Student') {
      this.saveState({
        step: 'enter_dob',
        selectedRole: role
      });
    } else {
      this.saveState({
        step: 'teacher_setup',
        selectedRole: role
      });
    }
  }

  /**
   * Save date of birth
   */
  saveDateOfBirth(year: string, month: string, day: string): void {
    this.updateState({
      step: 'complete',
      dateOfBirth: { year, month, day }
    });
  }

  /**
   * Navigate to the appropriate page based on onboarding state
   */
  navigateBasedOnState(): boolean {
    const state = this.getState();
    
    if (!state) {
      // No onboarding state, stay on current page
      return false;
    }

    console.log('Navigating based on onboarding state:', state);

    switch (state.step) {
      case 'select_role':
        this.router.navigate(['/account-type']);
        return true;
      
      case 'enter_dob':
        // User selected Student but hasn't entered DOB yet
        this.router.navigate(['/account-type']); // Will show DOB form
        return true;
      
      case 'teacher_setup':
        // User selected Teacher, go to teacher dashboard
        this.router.navigate(['/teacher']);
        return true;
      
      case 'complete':
        // Onboarding complete, clear state and proceed normally
        this.clearState();
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Check if user has selected a role
   */
  hasSelectedRole(): boolean {
    const state = this.getState();
    return !!state?.selectedRole;
  }

  /**
   * Get the selected role
   */
  getSelectedRole(): 'Teacher' | 'Student' | null {
    const state = this.getState();
    return state?.selectedRole || null;
  }

  /**
   * Check if user needs to enter date of birth
   */
  needsDateOfBirth(): boolean {
    const state = this.getState();
    return state?.step === 'enter_dob' && state?.selectedRole === 'Student';
  }

  /**
   * Mark onboarding as complete
   */
  markComplete(): void {
    this.updateState({ step: 'complete' });
  }
}

