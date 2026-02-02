# Workshop Data Backups

This directory contains automated backups of Firebase Realtime Database data.

## Files

- `ratings.json` - All participant ratings for each paper
- `leaderboard.json` - Top scores from each session
- `active.json` - Currently active participants (updates every 30s)
- `backup-info.json` - Timestamp of last backup

## Troubleshooting Backup Issues

If the backup workflow runs but no data appears in this folder, it's likely because Firebase requires authentication to read the data.

### Solution: Enable Public Reads in Firebase

Since all workshop data is anonymized (no personal information), you can safely enable public read access:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `unlock-the-lab-workshop`
3. Navigate to: **Realtime Database** → **Rules** tab
4. Update the rules to allow public reads:

```json
{
  "rules": {
    "ratings": {
      ".read": true,
      ".write": "auth != null"
    },
    "leaderboard": {
      ".read": true,
      ".write": "auth != null"
    },
    "active": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

5. Click **Publish**

This allows anyone to read the data (which is safe since it's anonymized workshop data), but only authenticated users in your app can write new ratings.

### Alternative: Authenticated Backup

If you prefer to keep data private, you can use the authenticated backup workflow (`backup-ratings-auth.yml`):

1. Get your Firebase Web API Key from: Firebase Console → Project Settings → General
2. Add it as a GitHub secret: Repository Settings → Secrets → Actions → New secret
   - Name: `FIREBASE_API_KEY`
   - Value: Your API key
3. In `.github/workflows/`, rename or disable `backup-ratings.yml` and enable `backup-ratings-auth.yml`

## Backup Schedule

Data is automatically backed up:
- Daily at midnight UTC
- Can be manually triggered from GitHub Actions tab

## Data Structure

### ratings.json
```json
{
  "STUDY-001": {
    "session123": 4.5,
    "session456": 3.2
  }
}
```

### leaderboard.json
```json
{
  "session123": {
    "name": "Participant Name",
    "score": 580,
    "timestamp": 1234567890
  }
}
```

### active.json
```json
{
  "session123": {
    "timestamp": 1234567890
  }
}
```
