# Registration Flow Diagram

## Complete Registration Process with Data Cleanup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REGISTRATION PAGE FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

                            START
                              │
                              ▼
                    ┌──────────────────┐
                    │   STEP 1         │
                    │ Basic Info Form  │
                    └──────────────────┘
                              │
                    (Fill in all fields)
                              │
                              ▼
                    ┌──────────────────┐
                    │   Click "Next"   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────────────────────────┐
                    │  API: POST /user-register            │
                    │  Backend creates temporary user      │
                    │  Returns: { userId, userType }       │
                    └──────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   STEP 2         │
                    │ Role Details     │
                    │ (Teacher/Student │
                    │  /Parent)        │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
       ┌────────────▼─────────┐  ┌──────▼──────────────┐
       │   USER NAVIGATES     │  │  User Completes    │
       │   AWAY FROM STEP 2   │  │  Form & Signs Up   │
       └──────────────────────┘  └───────────────────┘
                    │                   │
       ┌────────────┴─────────────────┬─┴─────┐
       │                              │       │
       ▼                              │       ▼
    4 Ways                            │   (Continue to
                                      │    Submission)
                                      │
                                      ▼
                                 ┌──────────────┐
                                 │ USER LOGGED  │
                                 │ IN & ACTIVE  │
                                 └──────────────┘

```

## Data Cleanup Triggers (4 Ways)

```
STEP 2: ROLE DETAILS (User ID Exists in Backend)
      │
      ├─→ WAY 1: Click "Back" Button (UI)
      │   │
      │   ├─→ handleBack() Called
      │   ├─→ deleteUserData(userId, userType)
      │   │   └─→ DELETE /api/delete-register
      │   ├─→ clearRegistrationState()
      │   └─→ Reset to STEP 1
      │
      ├─→ WAY 2: Click Browser/Phone Back Button
      │   │
      │   ├─→ popstate Event Triggered
      │   ├─→ event.preventDefault()
      │   ├─→ deleteUserData(userId, userType)
      │   │   └─→ DELETE /api/delete-register
      │   ├─→ clearRegistrationState()
      │   ├─→ window.history.pushState()
      │   └─→ Form Reset (Stay on Step 2)
      │
      ├─→ WAY 3: Close Tab/Browser
      │   │
      │   ├─→ beforeunload Event Triggered
      │   ├─→ Browser Shows Confirmation:
      │   │   "Are you sure you want to close this page?
      │   │    Your entered data can be deleted"
      │   │
      │   ├─→ IF YES:
      │   │   ├─→ deleteUserData() [Background]
      │   │   └─→ Close Tab/Browser
      │   │
      │   └─→ IF NO:
      │       └─→ Stay on Page (No Action)
      │
      └─→ WAY 4: Navigate to Different Website
          │
          ├─→ beforeunload Event Triggered
          ├─→ Browser Shows Confirmation:
          │   "Are you sure you want to leave this site?"
          │
          ├─→ IF YES:
          │   ├─→ deleteUserData() [Background]
          │   └─→ Navigate Away
          │
          └─→ IF NO:
              └─→ Stay on Page (No Action)
```

## Event Listener Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│  COMPONENT MOUNTED                                      │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
        User on Step 0 or 1?
           NO listeners registered
                      │
        User moves to Step 2 + User ID exists
                      │
                      ▼
     ✅ EVENT LISTENERS ACTIVATED ✅
     │
     ├─→ window.addEventListener('popstate', ...)
     ├─→ window.addEventListener('beforeunload', ...)
     └─→ window.history.pushState()
                      │
                      ▼
        User navigates away OR clicks back?
                      │
        YES → Delete User → Clear Form
                      │
                      ▼
        Back to Step 1 or before?
                      │
                      ▼
     ✅ EVENT LISTENERS CLEANED UP ✅
     │
     ├─→ window.removeEventListener('popstate', ...)
     └─→ window.removeEventListener('beforeunload', ...)
                      │
                      ▼
        No memory leaks ✅
```

## Data Flow: Backend vs Frontend

```
┌─────────────────┐              ┌──────────────────┐
│    FRONTEND     │              │     BACKEND      │
│   (ReactJS)     │              │   (Database)     │
└─────────────────┘              └──────────────────┘
        │                                 │
        │  POST /user-register            │
        ├────────────────────────────────→│
        │  {name, email, password, ...}   │
        │                                 │
        │  {userId: 123, userType: ...}   │
        │←────────────────────────────────┤
        │                                 │
    [STEP 2]                          [Temp User 123]
        │                                 │
    [User navigates away]                 │
        │                                 │
        │  DELETE /api/delete-register    │
        ├────────────────────────────────→│
        │  {userId: 123}                  │
        │                                 │
        │  {success: true}                │
        │←────────────────────────────────┤
        │                                 │
    [Form cleared]                    [User 123 deleted]
    [Reset to Step 1]                 [No orphan record]
        │                                 │
```

## State Management

```
STEP 1 STATE (Basic Information):
┌──────────────────────────────────┐
│ activeStep: 0                    │
│ registeredUser: null             │
│ name: "..."                      │
│ email: "..."                     │
│ password: "..."                  │
│ ... (other fields filled)        │
│ teacherAssignments: []           │
│ parentEntries: []                │
└──────────────────────────────────┘

                ▼ Click Next
        (API creates user)
                ▼

STEP 2 STATE (Role Details):
┌──────────────────────────────────┐
│ activeStep: 1 ✅ EVENT LISTENERS │
│ registeredUser: {                │
│   userId: 123,                   │
│   userType: "Teacher"            │ ← Triggers listeners
│ }                                │
│ name: "John..."                  │
│ email: "john@..."                │
│ ... (previous fields retained)   │
│ teacherGrades: ["Grade 10"]      │
│ subjects: ["Math"]               │
│ ... (role-specific fields)       │
└──────────────────────────────────┘

     ▼ User navigates away
(Delete user from backend)
     ▼

CLEARED STATE (Back to Step 1):
┌──────────────────────────────────┐
│ activeStep: 0 ❌ NO LISTENERS    │
│ registeredUser: null             │
│ name: ""                         │
│ email: ""                        │
│ password: ""                     │
│ ... (all fields cleared)         │
│ teacherAssignments: []           │
│ parentEntries: []                │
└──────────────────────────────────┘
```

## Error Handling Flow

```
                    Click Back/Navigate Away
                              │
                              ▼
                    ┌─────────────────────┐
                    │ deleteUserData()    │
                    │ API DELETE request  │
                    └─────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
                    ▼                    ▼
              SUCCESS ✅           ERROR ❌
                    │                    │
                    ▼                    ▼
            clearRegistrationState()  Log error
                    │                 Show error msg
                    │                    │
                    ▼                    ▼
            Go to Step 1         Still go to Step 1
            (Clean)              (Keep local state clean)
                    │                    │
                    └────────┬───────────┘
                             ▼
                    User experience maintained
                    (Always goes back)
```

## Browser Confirmation Dialog

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│    ⚠️  Are you sure?                                   │
│                                                        │
│    Are you sure you want to leave this page?          │
│    Your entered data can be deleted.                  │
│                                                        │
│                    [Leave Page]  [Stay]               │
│                                                        │
└────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
    Delete User              Page Stays Open
    Backend: DELETE          No action taken
    Frontend: Clear Form     User can continue
    Close Tab/Navigate
```

## Mobile vs Desktop Behavior

```
DESKTOP BROWSER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────┐
│ Back Button → Data Deleted, Form Reset          │
│ Close Tab (Cmd+W) → Confirmation → Delete       │
│ Close Browser (Cmd+Q) → Confirmation → Delete   │
│ Navigate Away (New URL) → Confirmation → Delete │
└─────────────────────────────────────────────────┘

MOBILE BROWSER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────┐
│ Back Button → Data Deleted, Form Reset          │
│ System Back Gesture → Data Deleted, Form Reset  │
│ Close App → Confirmation → Delete               │
│ Home Button + Exit → Confirmation → Delete      │
└─────────────────────────────────────────────────┘
```

## Summary

✅ **4 Navigation Methods Handled:**
  1. Back button in UI
  2. Browser/Phone back button
  3. Close Tab/Browser
  4. Navigate away / Different site

✅ **Automatic Data Cleanup:**
  - User deleted from backend
  - Form cleared
  - State reset
  - No orphaned records

✅ **User Confirmation:**
  - Browser's native dialog shown
  - User can cancel if they want to stay

✅ **Error Resilience:**
  - Still goes back even if API fails
  - Error messages shown when appropriate
