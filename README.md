# Unlock the Lab Workshop

A web-based application for teaching critical evaluation of scientific research through interactive peer assessment.

## Overview

Unlock the Lab is an educational tool designed to develop science literacy by training participants to evaluate research quality using evidence-based criteria. The application presents fictional research scenarios and challenges users to predict peer consensus on research quality, creating an engaging environment for learning to distinguish rigorous science from sensationalized claims.

### Educational Objectives

- Develop critical thinking skills for evaluating scientific claims
- Understand research quality indicators (methodology, data transparency, publication practices)
- Recognize barriers to accessing scientific knowledge (paywalls, predatory publishing)
- Practice objective assessment independent of headline framing
- Build consensus evaluation skills through peer comparison

## Features

### Core Functionality

- **Interactive Workshop Flow**: Guided progression through educational content, evaluation rubric, and 48 fictional research scenarios
- **Dual Assessment System**: Participants rate both research quality (1-7 scale) and predict peer consensus
- **Real-time Leaderboard**: Rankings based on prediction accuracy with 24-hour and all-time views (top 200)
- **Live Analytics Dashboard**: Public visualisation of aggregate ratings, participant statistics, and study-level metrics with 95% confidence intervals
- **Anonymous Participation**: Automatic assignment of unique usernames (e.g., "Cheerful Penguin") for data privacy
- **Comprehensive Glossary**: 21 scientific terms with accessible definitions, available throughout the activity

### Technical Capabilities

- Real-time data synchronisation via Firebase Realtime Database
- Responsive design for desktop and mobile devices
- Interactive data visualisations using Chart.js
- Session timeout management (30-minute initial limit, extendable to 2 hours)
- Active participant tracking (60-second activity window)
- Percentage-based scoring system (0-100% per study, aggregate score)

### Administrative Tools

- Email/password authentication for admin access
- Session management controls (end all active sessions)
- Firebase usage monitoring (concurrent connections, storage, session count)
- Study detail modals with paper information and DOI links
- Sortable statistics table with colour-coded metrics

## Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Chart.js 4.4.0 (data visualisation)
- Vite 5.4.21 (build tool)

### Backend
- Firebase Realtime Database (data storage and synchronisation)
- Firebase Authentication (admin access control)
- Firebase Hosting (deployment)

### Data Structure
```
/ratings/{sessionId}/{studyId} - Individual study ratings
/active/{sessionId} - Active participant timestamps
/leaderboard/{sessionId} - Completed session scores
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project with Realtime Database and Authentication enabled

### Setup

1. Clone the repository:
```bash
git clone https://github.com/pablobernabeu/Unlock_the_Lab.git
cd Unlock_the_Lab
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Realtime Database and Email/Password Authentication
   - Copy your Firebase configuration to `firebase-config.js`

4. Run development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

6. Deploy to Firebase:
```bash
firebase deploy --only hosting
```

## Usage

### For Participants

1. Navigate to the application URL
2. Review the educational content, glossary, and rubric
3. Evaluate 48 research scenarios by rating quality (1-7) and predicting peer ratings
4. Receive immediate feedback on prediction accuracy
5. View final score and leaderboard position upon completion

### For Facilitators/Admins

1. Access admin panel via the Admin link (bottom right corner)
2. Sign in with configured email and password
3. Monitor real-time participant activity and Firebase usage
4. Manage active sessions as needed
5. View detailed analytics on the public dashboard

## Scoring System

- **Per-Study Score**: `100 - |predicted_rating - actual_average| × 12` (capped at 0-100)
- **Aggregate Score**: Sum of all 48 study scores
- **Percentage Display**: `(total_score / (num_studies × 100)) × 100`
- **Leaderboard Ranking**: Based on aggregate score, top 200 displayed

## Data Management

### Privacy Considerations

- No demographic data or personally identifiable information collected
- Anonymous usernames auto-generated and validated for uniqueness
- Session IDs used as primary identifiers
- All data fully anonymized for research purposes

## Project Structure

```
/
├── index.html          # Main application entry point
├── dashboard.html      # Public analytics dashboard
├── admin.html          # Admin login page
├── app.js              # Core application logic
├── styles.css          # Global styles
├── firebase-config.js  # Firebase configuration
├── glossary.json       # Scientific terminology definitions
├── rubric.json         # Evaluation criteria
├── papers.json         # Research scenario data
└── public/
    └── unlock-lab-icon.svg  # Application logo
```

## Contributing

Contributions are welcome through GitHub issues and pull requests. Areas for enhancement include:

- Additional research scenarios
- Localisation/internationalisation
- Accessibility improvements (WCAG compliance)
- Mobile experience optimisation
- Analytics export functionality

See the [issues page](https://github.com/pablobernabeu/Unlock_the_Lab/issues) for current development priorities.

## Licence

This project is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) - free to use with attribution.

## Author

Dr Pablo Bernabeu  
Department of Education, University of Oxford

## Acknowledgements

- Workshop design based on peer assessment pedagogy
- Fictional research scenarios created for educational purposes
- Open source libraries: Chart.js, Vite, Firebase SDK

## Version History

- **v1.0** (2026-02): Initial release with 48 scenarios, real-time leaderboard, and analytics dashboard

## Support

For questions, issues, or feature requests, please use the [GitHub issue tracker](https://github.com/pablobernabeu/Unlock_the_Lab/issues).
