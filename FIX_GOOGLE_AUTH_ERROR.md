# Fix Google Authentication Errors

## Common Errors and Solutions

### Error 1: `auth/unauthorized-domain`
**Cause**: Your deployment domain is not authorized in Firebase.

### Error 2: `The requested action is invalid`
**Cause**: Google Sign-In provider is not properly enabled in Firebase Console.

### Error 3: `auth/operation-not-allowed`
**Cause**: Google Sign-In method is disabled in Firebase.

### Error 4: `Requests from referer are blocked` (403 Forbidden)
**Cause**: Firebase API key has referrer restrictions blocking your domains.
**THIS IS YOUR CURRENT ERROR!**

---

## IMMEDIATE FIX - Remove API Key Restrictions 🔑

**Do this FIRST to fix the "403 Forbidden" error:**

1. Go to [Google Cloud Console API Credentials](https://console.cloud.google.com/apis/credentials)
2. Select project: **unlock-the-lab-workshop**
3. Under **API Keys**, find the key starting with "AIzaSyC..." (your Browser key)
4. Click on the key name to edit it
5. Under **Application restrictions**:
   - **IMPORTANT**: For Firebase web apps, choose **"None"**
   - Firebase web API keys are designed to be public and unrestricted
6. Under **API restrictions**: Make sure it's set to **"Don't restrict key"** or includes the necessary APIs
7. Click **Save**
8. **Wait 5 minutes** for changes to propagate
9. Try signing in again

**Why this is safe**: Firebase web API keys are meant to be public. Security is enforced through Firebase Security Rules and Authentication, NOT through API key restrictions.

---

## Complete Fix (5 minutes)

Follow **ALL** these steps in order:

### Step 1: Enable Google Sign-In Provider ⚡ (DO THIS FIRST!)

**This is THE MOST IMPORTANT STEP - if this isn't done, you'll get "The requested action is invalid"**

1. Go to [Firebase Console](https://console.firebase.google.com/project/unlock-the-lab-workshop/authentication/providers)
2. Select project: **unlock-the-lab-workshop**
3. Click **Authentication** in left sidebar
4. Click **Sign-in method** tab
5. Find **Google** in the providers list - **IT MUST SAY "Enabled"**
6. If it says "Disabled", click on **Google**
7. **Toggle "Enable" to ON** ← CRITICAL!
8. **IMPORTANT**: Enter a support email (your email)
9. Click **Save**
10. **VERIFY**: The Google provider should now show "Enabled" status

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

### Step 3: Configure OAuth Consent Screen (REQUIRED) ✅

**This step is REQUIRED to fix the "Unable to verify that the app domain is authorized" error!**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **unlock-the-lab-workshop**
3. Left menu → **APIs & Services** → **OAuth consent screen**
4. If it says "Not configured":
   - Click **Configure Consent Screen**
   - Choose **External** user type
   - Click **Create**
5. Fill in required fields:
   - **App name**: "Unlock the Lab"
   - **User support email**: (your email)
   - **App homepage**: Leave blank or add later after verification
   - **Privacy policy URL**: Leave blank (optional for testing)
   - **Developer contact**: (your email)
6. **CRITICAL - Add Authorized Domains**:
   - Scroll down to **Authorized domains** section
   - Click **+ ADD DOMAIN** for each:
     ```
     unlock-the-lab.web.app
     unlock-the-lab-workshop.firebaseapp.com
     ```
   - Add your specific Firebase hosting domains
7. Click **Save and Continue**
8. **Scopes page**: Just click **Save and Continue** (skip)
9. **Test users page** (CRITICAL - don't skip this!): 
   - If you don't see a "Test users" page, you're already past it - click **EDIT APP** at the top of the OAuth consent screen page
   - Navigate through the steps until you see "Test users"
   - Click **+ ADD USERS**
   - Add YOUR email address (the one you'll use to sign in)
   - Click **Add**
   - Click **Save and Continue**
10. Click **Back to Dashboard**
11. **IMPORTANT**: On the main OAuth consent screen page:
    - Publishing status should say "Testing" 
    - Under "Test users", you should see your email listed
    - If you don't see test users listed, click **EDIT APP** and go to step 9

### Step 3b: Verify OAuth Client Credentials 🔑

**If you're still getting "The requested action is invalid", check this:**

1. Still in Google Cloud Console
2. Go to **APIs & Services** → **Credentials** (left menu)
3. Under **OAuth 2.0 Client IDs**, you should see a Web client (auto-created by Firebase)
4. Click on the client name to view details
5. Under **Authorized JavaScript origins**, verify these are listed:
   ```
   https://unlock-the-lab-workshop.firebaseapp.com
   https://unlock-the-lab.web.app
   ```
6. Under **Authorized redirect URIs**, verify this is listed:
   ```
   https://unlock-the-lab-workshop.firebaseapp.com/__/auth/handler
   ```
7. If any are missing, click **ADD URI** and add them
8. Click **Save**

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
