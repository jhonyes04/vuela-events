import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import App from './App.tsx';
import './config';
import './index.css';

// './config' valida VITE_GOOGLE_CLIENT_ID al arrancar: si falta, falla con un mensaje claro.

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <TooltipProvider>
                    <App />
                </TooltipProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
);
