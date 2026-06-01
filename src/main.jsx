import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BUILD_VERSION } from './db.js'
import { reconcileBuildVersion } from './reconcileBuildVersion.js'

// [REMINDERS] Notification permission request — kept for future implementation
// import { requestNotificationPermission } from './notifications';
// requestNotificationPermission();

// Run version reconciliation BEFORE React renders.
// Extracted to reconcileBuildVersion.js for testability.
reconcileBuildVersion(BUILD_VERSION);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
