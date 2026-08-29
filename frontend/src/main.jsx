import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';
import { AppStateProvider } from './context/AppStateContext.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppStateProvider>
      <App />
    </AppStateProvider>
  </React.StrictMode>
);
