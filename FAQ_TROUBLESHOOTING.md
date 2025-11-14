# FAQ & Troubleshooting Guide

## Frequently Asked Questions

### 1. How does the back button data deletion work?

**Q: When I click the "Back" button on Step 2, what happens to my data?**

A: 
1. Your entered data is sent to the backend for deletion
2. The user record created during Step 1 is permanently removed
3. All form fields are cleared locally
4. You return to Step 1 with an empty form
5. You can start a new registration

---

### 2. Why do I see a confirmation dialog when closing the tab?

**Q: Why is a dialog asking if I want to close the page?**

A:
- This is a browser safety feature
- It appears because the page detected that you have unsaved/incomplete data
- The message: "Are you sure you want to close this page?"
- This is the browser's native dialog (not custom)
- If you click YES: Page closes and your data is deleted
- If you click NO: Page stays open and you can continue

---

### 3. What happens if I click "NO" on the confirmation dialog?

**Q: If I click NO, will my form data be preserved?**

A:
- YES! Your form data is completely preserved
- All fields you filled remain intact
- You can continue with the registration
- No data is deleted when you click NO
- You can try again to complete the form

---

### 4. Does this work on mobile phones?

**Q: Will this work the same way on my mobile phone?**

A:
- YES, fully supported on mobile
- Works with:
  - Chrome for Android
  - Safari for iOS
  - Firefox Mobile
  - All modern mobile browsers
- Phone back button behavior:
  - ✅ Deletes data
  - ✅ Resets form
  - ✅ Shows same behavior as desktop

---

### 5. What if my internet connection drops?

**Q: What happens if my network fails when I click back?**

A:
- Backend delete request will fail
- Frontend still goes back to Step 1
- Error message shows: "Failed to clear user data"
- Form data is still cleared locally
- No data is lost on your device
- Your incomplete registration might remain in the system (rare case)

---

### 6. Can I go back to Step 1 and keep my data?

**Q: Is there a way to save my Step 1 data temporarily?**

A:
- Currently: NO
- When you go back from Step 2, all data is deleted
- This is by design to:
  - Prevent orphaned records
  - Keep database clean
  - Ensure data consistency
- Future enhancement: Could add "Save Draft" feature

---

### 7. How long does data stay in the system?

**Q: If I complete Step 1 but don't finish Step 2, how long is my data kept?**

A:
- Data is kept until:
  - ✅ You complete full registration (moved to permanent)
  - ✅ You click "Back" (deleted immediately)
  - ✅ You close the browser/tab (deleted)
  - ✅ Session expires (depends on backend)
- There's no automatic timeout deletion
- Backend may have auto-cleanup (check with admin)

---

### 8. Is my data encrypted during deletion?

**Q: Is my data safe when being deleted?**

A:
- Delete happens over HTTPS (encrypted connection)
- Backend receives delete request with your User ID
- Backend physically removes the record from database
- Multiple layers of security (if configured)
- Check with your admin for security details

---

### 9. Can an admin recover deleted registration data?

**Q: If I accidentally deleted my registration, can admin recover it?**

A:
- Depends on backend configuration
- Database backups: Might be recoverable
- Contact admin to check recovery options
- Best practice: Complete registration fully without closing tabs

---

### 10. Why are there 4 different ways to delete data?

**Q: What's the difference between back button, browser back, closing tab, and navigating away?**

A:
| Method | User Action | Result |
|--------|-------------|--------|
| Back Button | Click "Back" in form | Immediate delete, return to Step 1 |
| Browser Back | Click ← button | Delete, form reset |
| Close Tab | X button or Cmd+W | Confirmation → Delete |
| Navigate Away | Type new URL | Confirmation → Delete |

All methods ensure data is deleted to prevent orphaned records.

---

## Troubleshooting Guide

### Problem 1: Back Button Not Working

**Issue: When I click the "Back" button, nothing happens**

**Solutions:**
1. ✅ Check browser console for errors (F12 → Console)
2. ✅ Verify you're on Step 2 with data
3. ✅ Try clearing browser cache (Ctrl+Shift+Delete)
4. ✅ Refresh the page and try again
5. ✅ Try a different browser
6. ✅ Check if backend API is running

**Network Check:**
- Open DevTools (F12)
- Go to Network tab
- Click Back button
- Look for DELETE request to `/api/delete-register`
- Should show 200 (success) or error status

---

### Problem 2: Form Data Not Clearing

**Issue: After clicking back, the form fields are not empty**

**Solutions:**
1. ✅ Wait 2-3 seconds for API response
2. ✅ Check if you got an error message
3. ✅ Try refreshing the page
4. ✅ Clear browser cache
5. ✅ Check browser DevTools console for errors

**What to check:**
```
DevTools → Console → Look for error messages
DevTools → Application → Look at LocalStorage/SessionStorage
DevTools → Network → Check DELETE request response
```

---

### Problem 3: Confirmation Dialog Not Appearing

**Issue: No dialog appears when closing the tab/browser**

**Possible Causes:**
1. ❌ You're on Step 1 (not Step 2) - Listeners only active on Step 2
2. ❌ Browser has popup suppression - Allow popups
3. ❌ Private/Incognito mode - Try normal mode
4. ❌ Browser extensions blocking - Disable temporarily

**Solutions:**
1. ✅ Verify you're on Step 2 with registered user
2. ✅ Check browser settings allow popups
3. ✅ Try normal (non-private) browsing
4. ✅ Disable browser extensions
5. ✅ Try a different browser

---

### Problem 4: Getting "Failed to clear user data" Error

**Issue: Error message when clicking back**

**Causes:**
- Backend API not responding
- Network connection failed
- User ID not in database
- API endpoint not working

**Solutions:**
1. ✅ Check internet connection
2. ✅ Verify backend server is running
3. ✅ Check API URL is correct
4. ✅ Try again after few seconds
5. ✅ Contact admin if error persists

**Workaround:**
- Error message shows but you still go back to Step 1
- Form data is still cleared on your device
- No data loss occurs

---

### Problem 5: Different Behavior on Desktop vs Mobile

**Issue: Back button behaves differently on phone vs desktop**

**Expected Behavior:**
- Desktop: Back button goes back, phone back does same
- Mobile: Both should behave identically

**Solutions:**
1. ✅ Verify phone has internet connection
2. ✅ Try clearing mobile browser cache
3. ✅ Restart mobile browser app
4. ✅ Try WiFi instead of mobile data
5. ✅ Try different mobile browser

**Note:**
- Phone back button might use system navigation instead of browser
- Behavior should still be same (data deletion)

---

### Problem 6: Data Not Being Deleted on Backend

**Issue: You see "deletion successful" but data still in database**

**Causes:**
- API response says success but backend didn't delete
- Database connection issue
- Wrong User ID being sent

**Solutions:**
1. ✅ Contact admin to check database
2. ✅ Check backend logs for errors
3. ✅ Verify API is configured correctly
4. ✅ Check database permissions

**Debug Steps:**
```
1. Open DevTools → Network tab
2. Click back button
3. Look for DELETE /api/delete-register request
4. Check request headers (userId, userType)
5. Check response status (200 = success)
6. Check response body for error message
```

---

### Problem 7: Page Refreshing Unexpectedly

**Issue: Page refreshes when you click back**

**Causes:**
- Browser back actually navigating back
- History state not properly set
- Conflicting JavaScript

**Solutions:**
1. ✅ Check if page URL changed (it shouldn't)
2. ✅ Try different browser
3. ✅ Disable browser extensions
4. ✅ Clear browser cache
5. ✅ Check browser console for errors

---

### Problem 8: Lost Connection When Closing Browser

**Issue: Data deletion happens but you can't see the confirmation**

**Possible Reason:**
- Browser closing so fast it doesn't show confirmation
- This is expected behavior
- Delete still happens in background

**Note:**
- If window closes immediately, deletion still processes
- Server receives and processes delete request
- Data is deleted even though you don't see confirmation

---

### Problem 9: Multiple Deletion Attempts

**Issue: Clicking back multiple times creates multiple deletion requests**

**This shouldn't happen because:**
- ✅ Once you click back, Step 2 is left
- ✅ Event listeners are removed on Step 1
- ✅ No more delete requests will be made

**If it happens:**
- First delete succeeds (user removed)
- Subsequent requests fail safely (user already deleted)
- No duplicate deletions or errors

---

### Problem 10: Can't Complete Registration After Going Back

**Issue: After going back and restarting, registration doesn't work**

**Causes:**
- Previous user record fully deleted
- Starting fresh with new User ID
- This is expected

**Solutions:**
1. ✅ Fill Step 1 completely again
2. ✅ Click Next (new User ID will be created)
3. ✅ Complete Step 2 (role details)
4. ✅ Sign up successfully

**Note:**
- Going back and restarting is completely normal
- Each attempt gets a new User ID
- No issues with multiple attempts

---

## Performance Tips

### Optimize Back Button Performance

1. **Reduce form complexity**
   - Don't add unnecessary fields
   - Current fields are optimized

2. **Optimize API response**
   - Backend delete should be fast
   - Ask admin to check database performance

3. **Network optimization**
   - Use stable internet connection
   - WiFi is faster than mobile data

---

## Best Practices

### DO ✅

```
✅ Complete registration fully without closing tabs
✅ Use stable internet connection
✅ If going back, start fresh
✅ Fill all required fields carefully
✅ Use different passwords for security
✅ Contact admin if persistent errors occur
✅ Allow confirmation dialogs to appear
✅ Read error messages when they appear
```

### DON'T ❌

```
❌ Don't close tabs while on Step 2 unless necessary
❌ Don't disable browser safety features
❌ Don't ignore confirmation dialogs
❌ Don't use unstable internet
❌ Don't expect data to persist after going back
❌ Don't share your User ID with others
❌ Don't block network requests in DevTools
```

---

## When to Contact Admin

```
Contact admin if:

1. ❌ Back button doesn't work at all
2. ❌ Persistent "Failed to clear user data" errors
3. ❌ Data not being deleted (verified in database)
4. ❌ Multiple orphaned records in database
5. ❌ Backend API consistently not responding
6. ❌ Same issue on multiple devices/browsers
7. ❌ Registration can't be completed
8. ❌ Unusual database behavior
```

**Provide these details to admin:**
- Device type (desktop/mobile)
- Browser name and version
- Error message (if any)
- Steps to reproduce
- Screenshots (if possible)
- Network conditions

---

## Quick Fixes

### Clear Browser Cache
```
Chrome: Ctrl+Shift+Delete
Firefox: Ctrl+Shift+Delete
Safari: Cmd+Shift+Delete (or Settings)
Edge: Ctrl+Shift+Delete
```

### Open Developer Console
```
Chrome/Firefox/Edge: F12 or Ctrl+Shift+I
Safari: Cmd+Option+I (enable first in settings)
```

### Check Network Requests
```
1. Open DevTools (F12)
2. Go to Network tab
3. Click back button
4. Look for DELETE request
5. Check status: 200 (success) or 4xx/5xx (error)
```

### View Error Messages
```
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Screenshot or copy the error
5. Share with admin
```

---

## Summary

| Issue | Solution | Time |
|-------|----------|:----:|
| Back not working | Check DevTools Console | 2 min |
| Form not clearing | Refresh page | 1 min |
| No confirmation | Try different browser | 5 min |
| Error message | Wait & retry | 2 min |
| Mobile issues | Use WiFi | 2 min |
| Still having issues | Contact admin | - |

---

**Need more help?** 
- Check documentation in project root
- Review implementation files
- Contact your system administrator
