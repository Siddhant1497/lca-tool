import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LCAProvider } from './context/LCAContext';
import { HubProvider } from './context/HubContext';
import { UiProvider, initialTheme } from './context/UiContext';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

document.documentElement.dataset.theme = initialTheme(); // before first paint → no theme flash

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UiProvider>
      <LCAProvider>
        <HubProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </HubProvider>
      </LCAProvider>
    </UiProvider>
  </React.StrictMode>,
);
