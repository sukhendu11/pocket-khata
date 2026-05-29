import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker, registerPeriodicSync } from './notifications';

// Register service worker for notifications & offline caching
registerServiceWorker().then(() => {
  // Also register periodic background sync (progressive enhancement — Chrome only)
  registerPeriodicSync();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
