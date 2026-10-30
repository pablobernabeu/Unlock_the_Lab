# Unlock the Lab: data backups

This branch holds daily backups of the workshop's Firebase Realtime Database,
written by the 'Backup data' workflow (`.github/workflows/backup.yml` on `main`).
A commit is made only when the data has changed, so the history shows when
participants took part.

| File | Contents |
| --- | --- |
| `ratings.json` | Study ratings and predictions, by study and session |
| `leaderboard.json` | Leaderboard entries, by session |
| `rankings.json` | Criterion token allocations, by session |
| `sessions.json` | Session records, by session |
| `backup-info.json` | Time of the last backup that changed data, and record counts |

Keys are sorted so that diffs show only real changes. Presence data (`/active`) is
not backed up. Fields and legacy record shapes are described in
[docs/data.md](https://github.com/pablobernabeu/Unlock_the_Lab/blob/main/docs/data.md),
and restoring in
[docs/deployment.md](https://github.com/pablobernabeu/Unlock_the_Lab/blob/main/docs/deployment.md#backups-and-restoring),
on `main`.
