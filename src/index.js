// index.js or App.js (before BrowserRouter or Router)
window.__RR_FUTURE_FLAGS__ = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';


// --- Enable React Router v7 future flags ---
window.__RR__ = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
