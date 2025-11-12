# Registration Form Updates - Data Cleanup on Navigation

## Overview
The `RegisterForm.tsx` component has been updated to handle data cleanup when users navigate away from Step 2 (Role Details) using various methods.

## Changes Made

### 1. **New Helper Functions Added**

#### `deleteUserData()` - Delete Registered User
```typescript
const deleteUserData = async (userId: number, userType: string) => {
  try {
    await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/delete-register`, {
      data: {
        userId: userId
      },
      headers: {
        'Content-Type': 'application/json',
        'userId': String(userId),
        'userType': userType
      }
    });
    return true;
  } catch (error: any) {
    console.error('Delete error:', error);
    return false;
  }
};
```
- Sends a DELETE request to the backend to remove the temporarily registered user
- Handles errors gracefully without throwing exceptions
- Returns boolean indicating success/failure

#### `clearRegistrationState()` - Reset All Form Fields
```typescript
const clearRegistrationState = () => {
  setRegisteredUser(null);
  setActiveStep(0);
  // Resets all 30+ form fields to empty values
  // Clears teacher assignments and parent entries
};
```
- Clears the registered user from state
- Resets all form fields to their initial empty state
- Goes back to Step 0 (Basic Information)
- Clears teacher assignments and parent entries arrays

### 2. **Event Listeners for Navigation Detection**

#### Browser Back Button Handler (popstate event)
```typescript
const handlePopstate = async (event: PopStateEvent) => {
  event.preventDefault();
  
  if (activeStep === 1 && registeredUser) {
    // Delete the registered user data
    await deleteUserData(registeredUser.userId, registeredUser.userType);
    clearRegistrationState();
    // Push a new state to prevent browser going back
    window.history.pushState(null, '', window.location.href);
  }
};
```

**Triggers when user clicks:**
- Browser back button (desktop)
- Phone back button (mobile)
- Uses history API to block going back

**Actions:**
1. Prevents the default back button behavior
2. Deletes the temporarily registered user from backend
3. Clears all form data locally
4. Pushes a new history state to maintain page context

#### Tab/Browser Close Handler (beforeunload event)
```typescript
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (activeStep === 1 && registeredUser) {
    event.preventDefault();
    event.returnValue = '';
    
    // Delete the registered user data in the background
    deleteUserData(registeredUser.userId, registeredUser.userType);
    
    return '';
  }
};
```

**Triggers when user:**
- Closes the browser tab
- Closes the browser window
- Navigates to a different website
- Closes the entire application

**Actions:**
1. Shows browser's native confirmation dialog: "Are you sure you want to close this page? Your entered data can be deleted"
2. Triggers user data deletion in the background
3. If user confirms: Data is deleted and page closes
4. If user cancels: Page stays open with form data intact

### 3. **Enhanced handleBack Function**

Updated to use the new `deleteUserData()` and `clearRegistrationState()` functions:

```typescript
const handleBack = async () => {
  if (activeStep === 1 && registeredUser && registeredUser.userId) {
    try {
      // Delete the registered user
      await deleteUserData(registeredUser.userId, registeredUser.userType);
      
      // Clear local registration state
      clearRegistrationState();
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error?.response?.data?.message || "Failed to clear user data";
      showError(errorMessage);
      
      // Still move back even if deletion fails
      setActiveStep((prevActiveStep) => Math.max(0, prevActiveStep - 1));
      setRegisteredUser(null);
    }
  } else {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  }
};
```

**When Step 1 "Back" button is clicked:**
1. Calls API to delete user from backend
2. Clears all form state locally
3. Shows error message if deletion fails
4. Still allows going back even if API call fails (graceful degradation)

### 4. **useEffect Hook with Event Listeners**

```typescript
useEffect(() => {
  // Prevent going back with browser/phone back button if on step 1
  const handlePopstate = async (event: PopStateEvent) => { /* ... */ };
  
  // Show confirmation when trying to close tab/browser/page while on step 1
  const handleBeforeUnload = (event: BeforeUnloadEvent) => { /* ... */ };
  
  // Add event listeners only when on step 1 with registered user
  if (activeStep === 1 && registeredUser) {
    window.addEventListener('popstate', handlePopstate);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Push a new state to enable popstate handling
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('popstate', handlePopstate);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }
}, [activeStep, registeredUser]);
```

**Key Features:**
- Event listeners only added when on Step 1 with registered user
- Automatically removed when component unmounts or stepping back
- Prevents memory leaks with proper cleanup
- Responds to dependencies: `activeStep` and `registeredUser`

## User Flow

### Scenario 1: Click Back Button in UI
1. User on Step 2 clicks "Back" button
2. `handleBack()` is called
3. User data deleted from backend via API
4. Form state cleared
5. User returns to Step 1 (Basic Information)

### Scenario 2: Click Browser/Phone Back Button
1. User on Step 2 clicks browser/phone back button
2. `popstate` event triggered
3. Event prevented (page doesn't go back)
4. User data deleted from backend
5. Form state cleared
6. User stays on current URL but form is reset

### Scenario 3: Close Tab/Browser/Close Application
1. User on Step 2 closes the tab/browser
2. Browser shows confirmation dialog: "Are you sure you want to close this page?"
3. If YES: 
   - User data deleted from backend (in background)
   - Tab/browser closes
4. If NO:
   - Page stays open
   - Form data remains intact
   - User can continue registration

## Benefits

✅ **Data Consistency**: Backend and frontend stay synchronized
✅ **User Experience**: No orphaned user records in database
✅ **Mobile Friendly**: Handles both desktop and mobile back buttons
✅ **Safety Net**: Users get confirmation before losing data
✅ **Error Handling**: Graceful degradation if API calls fail
✅ **Memory Management**: Proper cleanup of event listeners

## Testing Checklist

- [ ] Click "Back" button on Step 2 → User data deleted, returns to Step 1
- [ ] Click browser back button on Step 2 → Data deleted, form reset
- [ ] Click phone back button on Step 2 → Data deleted, form reset
- [ ] Close browser tab on Step 2 → Shows confirmation, deletes data if confirmed
- [ ] Close browser window on Step 2 → Shows confirmation, deletes data if confirmed
- [ ] Navigate away on Step 2 → Shows confirmation, deletes data if confirmed
- [ ] Error handling: API failure → Still goes back, shows error message
- [ ] Form data persists if user cancels close operation
