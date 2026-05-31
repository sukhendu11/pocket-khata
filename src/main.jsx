import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// [REMINDERS] Notification permission request — kept for future implementation
// import { requestNotificationPermission } from './notifications';
// requestNotificationPermission();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
