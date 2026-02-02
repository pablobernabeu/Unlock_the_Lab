# Fix Google Authentication Errors

## Common Errors and Solutions

### Error 1: `auth/unauthorized-domain`
**Cause**: Your deployment domain is not authorized in Firebase.

### Error 2: `The requested action is invalid`
**Cause**: Google Sign-In provider is not properly enabled in Firebase Console.

### Error 3: `auth/operation-not-allowed`
**Cause**: Google Sign-In method is disabled in Firebase.

---

## Complete Fix (5 minutes)

Follow **ALL** these steps in order:

### Step 1: Enable Google Sign-In Provider ⚡

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **unlock-the-lab-workshop**
3. Click **Authentication** in left sidebar
4. Click **Sign-in method** tab
5. Find **Google** in the providers list
6. Click on **Google**
7. **Toggle "Enable" to ON**
8. **IMPORTANT**: Enter a support email (your email)
9. Click **Save**

### Step 2: Add Authorized Domains 🌐

1. Still in **Authentication** section
2. Click **Settings** tab (top of page)
3. Scroll to **Authorized domains** section
4. Click **Add domain** for each of these:
   ```
   unlock-the-lab.web.app
   unlock-the-lab-workshop.web.app
   localhost
   ```
5. If using GitHub Pages:
   ```
   pablobernabeu.github.io
   ```

### Step 3: Verify OAuth Consent Screen (if needed) ✅

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **unlock-the-lab-workshop**
3. Left menu → **APIs & Services** → **OAuth consent screen**
4. If it says "Not configured":
   - Click **Configure Consent Screen**
   - Choose **External** user type
   - Fill in app name: "Unlock the Lab"
   - Add your email as support email
   - Click **Save and Continue**
5. Skip scopes and test users (just click Continue)
6. Click **Back to Dashboard**

### Step 4: Test 🧪

1. Clear browser cache or use incognito window
2. Go to your admin page: `https://unlock-the-lab.web.app/admin.html`
3. Click "Sign in with Google"
4. Should now work! ✅

---

## Still Having Issues?

### If popup is blocked:
- Allow popups for your site
- Or the app will automatically try redirect method

### If you see "This app isn't verified":
- This is normal for test apps
- Click "Advanced" → "Go to Unlock the Lab (unsafe)"
- This warning disappears when you publish your app properly

### If nothing works:
1. Check browser console (F12) for specific error messages
2. Verify you're accessing from one of the authorized domains
3. Make sure you completed ALL steps above
4. Try a different browser

---

## Checklist ✓

- [ ] Google Sign-In provider enabled in Firebase Console
- [ ] Support email added to Google provider
- [ ] All deployment domains added to Authorized domains
- [ ] OAuth consent screen configured (if prompted)
- [ ] Tested in incognito window

After completing all steps, Google Sign-In will work perfectly!
