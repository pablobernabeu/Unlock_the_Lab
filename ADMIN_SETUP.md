# Admin Panel Setup Guide

## Creating an Admin User

To access the admin panel at `admin.html`, you need to create an admin user in Firebase Authentication:

### Steps:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **unlock-the-lab-workshop**
3. Click **Authentication** in the left menu
4. Click **Get Started** (if this is your first time)
5. Click **Users** tab
6. Click **Add User**
7. Enter:
   - **Email:** your email address
   - **Password:** a secure password
8. Click **Add User**

## Accessing the Admin Panel

1. Navigate to: `https://unlock-the-lab.web.app/admin.html` (or your domain)
2. Login with the email and password you created
3. You can now:
   - View active sessions count
   - See total ratings and leaderboard entries
   - Stop all active sessions (forces users to restart)

## Admin Functions

### Stop All Active Sessions
- Clears all active participant data
- Forces users to start new sessions
- **Does NOT delete** ratings or leaderboard data
- Useful for:
  - Ending a workshop session
  - Clearing test data during development
  - Resetting participant counts

## Security Note

The admin panel uses Firebase Authentication. Only users you manually add to Firebase Authentication can access it.

## Troubleshooting

### "Login failed: Firebase: Error (auth/...)"

Common errors:
- **auth/wrong-password** - Incorrect password
- **auth/user-not-found** - Email not registered in Firebase Auth
- **auth/too-many-requests** - Too many failed attempts, wait a few minutes

### Can't access admin.html

Make sure:
1. The file is deployed (check GitHub Actions)
2. Firebase hosting includes the admin.html file
3. You're using the correct URL

### "Permission denied" when stopping sessions

Check Firebase Database Rules - the admin user needs write access to `/active`:

```json
{
  "rules": {
    "active": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```
