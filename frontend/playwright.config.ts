import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para las pruebas E2E de la pantalla `position`.
 *
 * Requisitos previos (no gestionados por esta config):
 *  - Base de datos PostgreSQL levantada (docker-compose up -d) y con seed aplicado.
 *  - Backend corriendo en http://localhost:3010 (cd backend && npm run dev).
 *
 * El `webServer` de abajo arranca automáticamente SOLO el frontend (npm start).
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Los tests mutan estado compartido en el backend (mover una tarjeta se
  // persiste), por lo que se ejecutan en serie para evitar interferencias.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    // Captura de trazas/screenshots/vídeo solo cuando algo falla, para depurar.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Arranca el frontend de React automáticamente antes de correr los tests.
  // El backend y la base de datos deben estar levantados manualmente (ver arriba).
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // CRA abre el navegador y trata los warnings como errores por defecto; lo evitamos.
    env: {
      BROWSER: 'none',
      CI: 'true',
    },
  },
});
