# Unlock the Lab - Workshop Web Application

A Firebase-powered web application for interactive science literacy workshops. Participants rate research papers and compare their assessments with others in real-time.

## Features

- **Mobile-First Design**: Optimized for smartphones and tablets
- **Individual Participation**: Each participant uses their own device
- **Real-Time Ratings**: See how your assessment compares to the group average instantly
- **Educational Content**: Built-in glossary and rating rubric accessible anytime
- **Progressive Flow**: Guided experience from welcome to completion
- **Firebase Integration**: Real-time database for collaborative rating

## Setup Instructions

### Prerequisites

- A Firebase account (free tier is sufficient)
- A web hosting service (Firebase Hosting, GitHub Pages, Netlify, etc.)
- Basic text editor

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "unlock-the-lab-workshop")
4. Disable Google Analytics (optional for this project)
5. Click "Create project"

### Step 2: Set Up Realtime Database

1. In your Firebase project, go to "Build" → "Realtime Database"
2. Click "Create Database"
3. Select a location (choose closest to your workshop location)
4. Start in **test mode** for development (set rules for production later)
5. Click "Enable"

### Step 3: Get Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (`</>`) to create a web app
4. Register your app with a nickname (e.g., "Workshop App")
5. Copy the `firebaseConfig` object shown
6. Open `firebase-config.js` in this project
7. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

### Step 4: Configure Database Rules (Important!)

For development/testing:
1. Go to Realtime Database → Rules
2. Use these rules (allows read/write for testing):

```json
{
  "rules": {
    "ratings": {
      ".read": true,
      ".write": true
    }
  }
}
```

For production (more secure):
```json
{
  "rules": {
    "ratings": {
      "$paperId": {
        ".read": true,
        "$sessionId": {
          ".write": "!data.exists()",
          ".validate": "newData.hasChildren(['rating', 'timestamp'])"
        }
      }
    }
  }
}
```

This prevents users from changing ratings after submission.

### Step 5: Customize Content (Optional)

You can customize the workshop content by editing these JSON files:

- **`papers.json`**: Add, remove, or modify research papers
- **`glossary.json`**: Add or edit glossary terms
- **`rubric.json`**: Modify the rating criteria

Each paper in `papers.json` should have:
- `id`: Unique identifier (e.g., "STUDY-001")
- `headline`: The paper's headline
- `access`: Description of how accessible the paper is
- `overview`: Brief overview of the study
- `methods`: Description of methodology and data
- `conclusion`: The paper's conclusions
- `source`: Where the paper is published

### Step 6: Deploy the Application

#### Option A: Firebase Hosting (Recommended)

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project folder:
```bash
firebase init hosting
```
- Select your Firebase project
- Set public directory as current directory (`.`)
- Configure as single-page app: No
- Don't overwrite existing files

4. Deploy:
```bash
firebase deploy --only hosting
```

5. Your app will be live at: `https://your-project.firebaseapp.com`

#### Option B: GitHub Pages

1. Create a new GitHub repository
2. Push all files to the repository
3. Go to repository Settings → Pages
4. Select branch (usually `main`) and folder (`/root`)
5. Save and wait for deployment
6. Access at: `https://yourusername.github.io/repository-name`

#### Option C: Netlify

1. Go to [Netlify](https://www.netlify.com/)
2. Drag and drop your project folder
3. Your site will be deployed instantly
4. Optionally configure custom domain

### Step 7: Test the Application

1. Open the deployed URL on your mobile phone
2. Go through the complete flow:
   - Welcome page
   - Glossary and rubric page
   - Rate at least one paper
   - Check that results show your rating and average
3. Open in a second device/browser and rate the same paper
4. Verify that the average updates in real-time

## Usage During Workshop

### Before the Workshop

1. Test the application thoroughly
2. Create a short URL (using bit.ly, QR code, etc.) for easy access
3. Ensure stable internet connection at venue
4. Have backup plan (printed materials) in case of technical issues

### During the Workshop

1. Display the URL or QR code prominently
2. Give participants 2-3 minutes to read the welcome and guide pages
3. Let participants work at their own pace
4. Remind participants they can access glossary/rubric anytime (📖 button)
5. Monitor the Firebase Realtime Database to see participation rates

### After the Workshop

1. Go to Firebase Console → Realtime Database
2. Export the data (JSON) for analysis
3. Optional: Clear the database before the next workshop session
4. Review the data to see which papers had most agreement/disagreement

## Resetting Data Between Sessions

To clear ratings between workshop sessions:

1. Go to Firebase Console → Realtime Database
2. Find the "ratings" node
3. Click the ⋮ menu → Delete
4. Confirm deletion

Or use Firebase CLI:
```bash
firebase database:remove /ratings
```

## Troubleshooting

### Ratings Not Saving
- Check Firebase Console → Realtime Database rules
- Verify internet connection
- Check browser console for errors
- Ensure `firebase-config.js` has correct credentials

### Average Not Updating
- Check that multiple devices are rating the same paper ID
- Verify database rules allow reading
- Check browser console for JavaScript errors

### Mobile Display Issues
- Ensure viewport meta tag is present in HTML
- Test on various screen sizes
- Check CSS media queries

### Database Permission Errors
- Review database rules in Firebase Console
- Temporarily use test mode rules for debugging
- Check that timestamps are being set correctly

## File Structure

```
unlock-the-lab-workshop/
├── index.html              # Main HTML structure
├── styles.css              # All styling and responsive design
├── app.js                  # Application logic and Firebase integration
├── firebase-config.js      # Firebase configuration (CUSTOMIZE THIS!)
├── papers.json             # Research paper data
├── glossary.json           # Glossary terms
├── rubric.json             # Rating criteria
├── README.md               # Original workshop description
├── Licence.md              # License information
└── SETUP.md                # This file
```

## Customization Tips

### Adding More Papers
Edit `papers.json` and add new objects following the existing structure. The app will automatically create pages for all papers.

### Changing Colors
Edit CSS variables in `styles.css`:
```css
:root {
    --primary-color: #2563eb;  /* Main blue color */
    --secondary-color: #10b981; /* Green for success */
    /* ... other colors ... */
}
```

### Modifying Text
- Welcome message: Edit `index.html` → `#page-welcome`
- Final message: Edit `index.html` → `#page-final`
- Instructions: Edit the HTML content directly

### Analytics
Add Google Analytics or similar by including tracking code in `index.html` before `</body>`.

## Privacy & Data

- Each participant gets a random session ID
- No personal information is collected
- Only ratings and timestamps are stored
- Consider adding privacy notice if required by your institution

## Support & Contributions

For issues or questions:
1. Check troubleshooting section above
2. Review Firebase documentation
3. Check browser console for specific error messages

## License

See `Licence.md` for license information.

---

**Ready to Run Your Workshop?**

1. ✅ Firebase project created
2. ✅ `firebase-config.js` updated with your credentials
3. ✅ Application deployed
4. ✅ Tested on mobile device
5. ✅ QR code or short URL ready

You're all set! Good luck with your workshop! 🔬✨
