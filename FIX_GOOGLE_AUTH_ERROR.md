# Fix Google Authentication Error

## Error: `auth/unauthorized-domain`

This error occurs when trying to login to the admin panel because your deployment domain is not authorized in Firebase.

## Quick Fix (2 minutes)

1. **Go to Firebase Console**: https://console.firebase.google.com/

2. **Select your project**: **unlock-the-lab-workshop**

3. **Navigate to Authentication**:
   - Left sidebar → **Authentication**
   - Click **Settings** tab
   - Click **Authorized domains**

4. **Add your domain(s)**:
   - Click **Add domain**
   - Add each of these:
     ```
     unlock-the-lab.web.app
     unlock-the-lab-workshop.web.app
     localhost
     ```
   - If using GitHub Pages, also add:
     ```
     pablobernabeu.github.io
     ```

5. **Click Save**

6. **Test**: Refresh your admin page and try logging in with Google again

---

## What This Does

Firebase Authentication only works from authorized domains to prevent unauthorized use of your auth system. By adding your deployment domains, you're telling Firebase "it's okay for users to authenticate from these websites."

**Note**: `localhost` is usually pre-authorized for development, but production domains must be added manually.

---

## Already Added?

If you've already added the domains and still see the error:

1. Check you're accessing the site from the exact domain you authorized
2. Clear your browser cache
3. Try in an incognito/private window
4. Verify the domain exactly matches (no typos, http vs https, www vs non-www)

---

After fixing this, your Google Sign-In button on the admin panel will work perfectly!
