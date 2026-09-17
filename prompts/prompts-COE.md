# Prompts utilizados — COE (Christofher Ontiveros Espino)

Lista ordenada de los prompts usados con la IA (Claude / Claude Code) para
resolver el ejercicio de pruebas E2E con Playwright sobre la pantalla `position`.
Están redactados buscando claridad, contexto y un resultado concreto, y reflejan
la iteración real que llevó a la solución final.

---

1. Antes de escribir o modificar nada, analiza el README para entender el
   objetivo del ejercicio: qué se debe probar en la pantalla `position`, los
   escenarios a cubrir, las convenciones (selectores `data-testid`, doble
   validación UI + backend, evitar datos frágiles) y los criterios de
   evaluación. No apliques cambios todavía; solo confirma que el contexto queda
   claro.

2. Explora el código real del proyecto —el frontend de la pantalla `position`
   (tablero Kanban y drag & drop), el servicio de candidatos y el endpoint del
   backend que actualiza la fase— para entender cómo funciona de verdad. Con esos
   hallazgos diseña un plan de implementación paso a paso para las pruebas E2E con
   Playwright, y documenta explícitamente cualquier discrepancia entre lo que
   dice el README (ruta, endpoint, nombres de fases, `data-testid` sugeridos) y lo
   que existe en el repositorio.

3. Implementa las pruebas siguiendo el plan y respetando las buenas prácticas del
   README: localiza los elementos con selectores estables `data-testid`; usa
   nombres de prueba descriptivos que expresen el escenario y el resultado
   esperado; aplica doble validación en el cambio de fase (que la tarjeta se vea
   en la nueva columna y que se dispare la petición `PUT /candidates/:id` con el
   cuerpo correcto y respuesta exitosa); y procura que las pruebas no dependan de
   valores fijos escritos a mano, de modo que se puedan volver a ejecutar sin
   romperse aunque cambien los datos. No hagas ningún commit hasta que yo pueda
   probarlo en local.

4. Levanta el stack completo (base de datos, backend y frontend) y ejecuta las
   pruebas para verificar de punta a punta que ambos escenarios pasan. Si algún
   test falla, distingue si la causa está en la prueba, en la aplicación o en el
   entorno, explícame el porqué y corrígelo antes de continuar.

5. Quiero ver las pruebas ejecutándose visualmente en el navegador. Explícame las
   diferencias entre el modo headed y el modo UI de Playwright e indícame cómo
   lanzarlas para observar, paso a paso, la carga de la página y el arrastre de la
   tarjeta entre columnas.

6. Al ejecutar las pruebas en mi entorno de Windows (PowerShell) fallan: primero
   por la sintaxis de los comandos y después porque los tests no pasan aunque a ti
   sí. Revisa cada error, distingue si la causa está en el shell, en la
   instalación de Playwright o en los tests, explícame la causa raíz y guíame con
   los pasos concretos para resolverlo en mi máquina.

7. Antes de hacer commit, repasa conmigo todos los cambios que hubo que aplicar
   sobre el código original —los atributos `data-testid` añadidos a los
   componentes, el ajuste en la carga del tablero (cargar las fases antes que los
   candidatos) y las decisiones de diseño de las pruebas (independientes del
   estado de la base de datos y con restauración del tablero)— justificando por
   qué eran necesarios y confirmando que no alteran el comportamiento esperado de
   la aplicación.

---

## Nota de trazabilidad — exploración asistida

Para el punto 2, la exploración del código se realizó con un agente de solo
lectura al que se le pidió mapear, con archivo:línea: la estructura del tablero
Kanban y la librería de drag & drop, los `data-testid` existentes, la ruta real
de la pantalla, el método/URL/cuerpo reales del endpoint de actualización, los
datos del seed y toda discrepancia entre el README y el repositorio.
