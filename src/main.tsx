import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initClientApi } from './services/clientStorage';

// Initialize 100% in-browser client API & localStorage database
// This eliminates HTTP 405 Method Not Allowed errors on static hosts like Vercel
initClientApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

