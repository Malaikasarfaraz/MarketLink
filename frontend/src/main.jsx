import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { UXProvider } from './components/UX';

const root = document.getElementById('root');
if (!root) throw new Error('MarketLink root element was not found.');

createRoot(root).render(<UXProvider><App /></UXProvider>);
