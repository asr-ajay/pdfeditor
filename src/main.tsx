import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PDFProvider } from './contexts/PDFContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PDFProvider>
      <App />
    </PDFProvider>
  </StrictMode>,
);
