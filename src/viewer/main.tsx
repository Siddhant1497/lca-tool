import React from 'react';
import ReactDOM from 'react-dom/client';
import { readPayload } from '../utils/share';
import { initialTheme, UiProvider } from '../context/UiContext';
import ViewerApp from './ViewerApp';
import '../index.css';

document.documentElement.dataset.theme = initialTheme();
const payload = readPayload();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UiProvider>
      {payload ? <ViewerApp payload={payload} /> : (
        <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
          <h2>SustainHub client view template</h2>
          <p>This file is a template. Create a client dashboard from SustainHub → Client sharing.</p>
        </div>
      )}
    </UiProvider>
  </React.StrictMode>,
);
