import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 3000,
        // Falla si el puerto está ocupado, en vez de saltar a otro:
        // otro puerto rompería el origen permitido y Google.
        strictPort: true,
        proxy: {
            '/api': 'http://localhost:3001',
        },
    },
    preview: {
        port: 3000,
        strictPort: true,
    },
    test: {
        // Solo lógica pura (fechas, calendario): no hace falta un DOM simulado.
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
