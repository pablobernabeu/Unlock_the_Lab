# ⚠️ URGENT: Required Setup Steps

## Your app is currently **NOT WORKING** due to missing Firebase configuration.

Complete these 2 steps to fix the "PERMISSION_DENIED" error:

---

## ✅ Step 1: Fix Database Rules (2 minutes) - **CRITICAL**

**Problem:** All rating submissions fail with "PERMISSION_DENIED: Permission denied"

**Solution:**

1. Open: https://console.firebase.google.com/
2. Select: **unlock-the-lab-workshop**
3. Click: **Realtime Database** → **Rules** tab
4. **Replace everything with:**

```json
{
  "rules": {
    "ratings": {
      ".read": true,
      ".write": true
    },
    "leaderboard": {
      ".read": true,
      ".write": true
    },
    "active": {
      ".read": true,
      ".write": true
    }
  }
}
```

5. Click **Publish**

**Test:** Refresh `unlock-the-lab.web.app` and try rating a paper - it should work!

---

## ✅ Step 2: Create Admin User (1 minute)

**Problem:** You can't login to the admin panel at `/admin.html`

**Solution:**

1. Still in Firebase Console
2. Click: **Authentication** → **Users** tab
3. Click: **Add User**
4. Enter your email and a password (save these!)
5. Click: **Add User**

**Test:** Go to `unlock-the-lab.web.app/admin.html` and login with your credentials

---

## What's Fixed?

After completing both steps:

✅ Participants can submit ratings (no more PERMISSION_DENIED errors)  
✅ Scores and leaderboard update in real-time  
✅ You can access the admin panel to manage sessions  
✅ Data backup workflows will work

---

## Two Dashboards

Your app now has separate dashboards:

1. **Admin Panel** (`/admin.html`) - Private, requires login
   - Access: Welcome page → "Admin" link
   - Features: Stop all sessions, view session stats
   
2. **Public Dashboard** (`/dashboard.html`) - Public statistics
   - Access: Final results page → "View Live Dashboard"
   - Features: Charts, participant data

---

**See [FIREBASE_RULES.md](FIREBASE_RULES.md) and [ADMIN_SETUP.md](ADMIN_SETUP.md) for detailed documentation.**
