import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Pruebas E2E de la pantalla `position` (tablero Kanban de candidatos).
 *
 * La app real usa:
 *  - Ruta:      /positions/:id            (probamos con la posición 1 del seed)
 *  - Endpoint:  PUT /candidates/:id        (plural) con body
 *               { applicationId: number, currentInterviewStep: number }
 *  - Columnas:  "Initial Screening" / "Technical Interview" / "Manager Interview"
 *  - Drag&Drop: react-beautiful-dnd  -> se dispara con TECLADO, no con dragTo()
 *
 * Diseño de las pruebas: son INDEPENDIENTES DEL ESTADO de la BD. El tablero se
 * persiste (mover una tarjeta escribe en el backend), así que en lugar de fijar
 * "qué candidato está en qué columna" se valida el estado real contra la API y
 * se elige dinámicamente la tarjeta a mover. Así el suite es re-ejecutable.
 */

const POSITION_ID = 1;
const POSITION_TITLE = 'Senior Full-Stack Engineer';
const API_BASE = 'http://localhost:3010';
const EXPECTED_STAGES = [
  'Initial Screening',
  'Technical Interview',
  'Manager Interview',
];

type ApiCandidate = {
  fullName: string;
  currentInterviewStep: string;
  candidateId: number;
  applicationId: number;
};

/** Localiza una columna de fase por el texto de su cabecera. */
function columnByTitle(page: Page, title: string): Locator {
  return page.locator('[data-testid^="stage-column-"]').filter({
    has: page.getByTestId('column-title').filter({ hasText: title }),
  });
}

/**
 * Mueve una tarjeta a la columna contigua (izquierda o derecha) con el teclado.
 *
 * react-beautiful-dnd expone cada tarjeta como drag handle enfocable:
 *   Space   -> levanta la tarjeta
 *   Arrow*  -> la mueve entre columnas (horizontal) o dentro (vertical)
 *   Space   -> la suelta
 * Se añaden esperas cortas porque la librería anima cada transición.
 */
async function moveCard(
  page: Page,
  card: Locator,
  direction: 'left' | 'right'
): Promise<void> {
  await card.scrollIntoViewIfNeeded();
  await card.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  await page.keyboard.press(direction === 'right' ? 'ArrowRight' : 'ArrowLeft');
  await page.waitForTimeout(400);
  await page.keyboard.press('Space');
  await page.waitForTimeout(600);
}

test.beforeEach(async ({ page }) => {
  await page.goto(`/positions/${POSITION_ID}`);
  // Esperamos a que el flujo (título) y los candidatos terminen de cargar.
  await expect(page.getByTestId('position-title')).not.toBeEmpty();
  await expect(
    page.locator('[data-testid^="candidate-card-"]').first()
  ).toBeVisible();
});

test.describe('Pantalla position - Escenario 1: carga de la página', () => {
  test('muestra el título de la posición, las columnas de fase y los candidatos en su columna', async ({
    page,
    request,
  }) => {
    // El título de la posición se muestra.
    await expect(page.getByTestId('position-title')).toHaveText(POSITION_TITLE);

    // Las columnas de fase del proceso están presentes.
    for (const stage of EXPECTED_STAGES) {
      await expect(columnByTitle(page, stage)).toBeVisible();
    }
    await expect(page.locator('[data-testid^="stage-column-"]')).toHaveCount(
      EXPECTED_STAGES.length
    );

    // Los candidatos aparecen en la columna correcta según su fase.
    // Data-driven: contrastamos la UI contra lo que devuelve el backend.
    const response = await request.get(
      `${API_BASE}/positions/${POSITION_ID}/candidates`
    );
    expect(response.ok()).toBeTruthy();
    const candidates: ApiCandidate[] = await response.json();
    expect(candidates.length).toBeGreaterThan(0);

    for (const candidate of candidates) {
      await expect(
        columnByTitle(page, candidate.currentInterviewStep).getByText(
          candidate.fullName
        )
      ).toBeVisible();
    }
  });
});

test.describe('Pantalla position - Escenario 2: cambio de fase (drag & drop)', () => {
  test('mueve un candidato a la fase siguiente y notifica al backend con PUT /candidates/:id', async ({
    page,
  }) => {
    const columns = page.locator('[data-testid^="stage-column-"]');
    const columnCount = await columns.count();

    // Elegimos dinámicamente una tarjeta movible. Preferimos moverla a la
    // derecha; si todas están ya en la última columna, la movemos a la
    // izquierda. Guardamos origen/destino para poder RESTAURAR el estado al
    // final y que el suite sea re-ejecutable (el tablero se persiste).
    let sourceIndex = -1;
    let targetIndex = -1;
    for (let i = 0; i < columnCount - 1; i++) {
      const cards = columns.nth(i).locator('[data-testid^="candidate-card-"]');
      if ((await cards.count()) > 0) {
        sourceIndex = i;
        targetIndex = i + 1;
        break;
      }
    }
    if (sourceIndex === -1) {
      for (let i = columnCount - 1; i > 0; i--) {
        const cards = columns.nth(i).locator('[data-testid^="candidate-card-"]');
        if ((await cards.count()) > 0) {
          sourceIndex = i;
          targetIndex = i - 1;
          break;
        }
      }
    }
    expect(
      sourceIndex,
      'Se esperaba al menos una tarjeta movible en el tablero'
    ).toBeGreaterThanOrEqual(0);

    const direction: 'left' | 'right' =
      targetIndex > sourceIndex ? 'right' : 'left';
    const sourceColumn = columns.nth(sourceIndex);
    const targetColumn = columns.nth(targetIndex);
    const card = sourceColumn
      .locator('[data-testid^="candidate-card-"]')
      .first();

    // id del candidato (sufijo del data-testid) e id de la fase destino
    // (sufijo del data-testid de la columna) para validar el body del PUT.
    const candidateTestId = await card.getAttribute('data-testid');
    const candidateId = candidateTestId!.replace('candidate-card-', '');

    const targetTestId = await targetColumn.getAttribute('data-testid');
    const targetStageId = Number(targetTestId!.replace('stage-column-', ''));

    // Preparamos la intercepción del PUT ANTES de disparar el drag.
    const putRequestPromise = page.waitForRequest(
      (req) => req.method() === 'PUT' && /\/candidates\/\d+/.test(req.url())
    );
    const putResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === 'PUT' && /\/candidates\/\d+/.test(res.url())
    );

    // Acción: arrastrar la tarjeta a la columna contigua.
    await moveCard(page, card, direction);

    // (a) Validación visual: la tarjeta aparece ahora en la columna destino
    //     y ya no está en la de origen.
    await expect(
      targetColumn.locator(`[data-testid="candidate-card-${candidateId}"]`)
    ).toBeVisible();
    await expect(
      sourceColumn.locator(`[data-testid="candidate-card-${candidateId}"]`)
    ).toHaveCount(0);

    // (b) Validación de backend: se disparó el PUT correcto.
    const putRequest = await putRequestPromise;
    expect(putRequest.url()).toContain(`/candidates/${candidateId}`);

    const body = putRequest.postDataJSON();
    expect(typeof body.applicationId).toBe('number');
    expect(body.currentInterviewStep).toBe(targetStageId);

    const putResponse = await putResponsePromise;
    expect(putResponse.ok()).toBeTruthy();
    expect(putResponse.status()).toBe(200);

    // Restauramos el tablero: devolvemos la tarjeta a su columna de origen
    // para que la prueba sea idempotente en ejecuciones sucesivas.
    const movedCard = targetColumn.locator(
      `[data-testid="candidate-card-${candidateId}"]`
    );
    await moveCard(page, movedCard, direction === 'right' ? 'left' : 'right');
    await expect(
      sourceColumn.locator(`[data-testid="candidate-card-${candidateId}"]`)
    ).toBeVisible();
  });
});
