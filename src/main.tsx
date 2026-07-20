import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LCAProvider } from './context/LCAContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LCAProvider>
      <App />
    </LCAProvider>
  </React.StrictMode>,
);
