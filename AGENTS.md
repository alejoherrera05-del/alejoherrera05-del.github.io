# Mobile Prototype Agent Guide

## Prototype Instructions

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Keep `App` composed around `PhoneFrame` -> `KeyboardProvider`, with `StatusBar`, app content, `HomeIndicator`, and `KeyboardDock` mounted inside the phone frame. `StatusBar` and the iOS home indicator are overlaid device chrome. When the Android keyboard is closed, the app viewport reserves the protected navigation-bar region instead of painting behind it. When the Android keyboard is open, preserve the current full-screen keyboard layout: its asset includes the IME navigation strip and the separate black navigation bar is hidden. iOS screens continue to paint behind the home-indicator area and own their safe-area content padding.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve the device picker's intentionally lightweight Codex styling in the top-right corner: its trigger wrapper is borderless and transparent, its trigger sizes to content, and its right-aligned menu uses the compact 3px inset plus the specified hairline and elevation shadow layers. Keep the prototype root and default app screen white.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.

## Sistema Alejandro — decisiones duraderas

- Mantener la arquitectura y las secciones de las dos imágenes de referencia del usuario; no reemplazarlas con flujos improvisados.
- La navegación principal es: Inicio, Entreno, Nutrición, Progreso y Perfil. El análisis IA semanal puede abrirse desde el sistema personal.
- Hidratación debe permitir configurar el objetivo diario en litros y marcar individualmente botellas visibles con check; cada botella representa exactamente 1 litro.
- No incluir seguimiento del sueño ni copy relacionado con sueño.
- La identidad visual propia debe ser plana, geométrica y contemporánea; evitar logos 3D, biseles, metal, vidrio y efectos pasados de moda.
- El icono de Sistema Alejandro se usa como logo de entrada, favicon, Apple touch icon e icono instalable.
- El acabado debe sentirse iOS: jerarquía limpia, controles táctiles claros, grupos visuales sobrios, desenfoque contenido y microdetalles discretos.
- La fidelidad no es solo visual: el flujo principal debe registrar series con peso, repeticiones y RPE, conservar historial y alimentar métricas de progreso.
- Progreso debe incluir medidas actuales, historial por periodo, fotos por vista y comparación entre dos fechas.
- Mantener una biblioteca amplia y buscable de ejercicios por grupo muscular, patrón y equipo; cada ejercicio debe tener un activo PNG propio o explícitamente asignado.
- Las recomendaciones de coaching deben exponer datos utilizados, ventana temporal, regla o evidencia y nivel de confianza; nunca mostrar consejos generados sin trazabilidad.
- La planificación de entrenamiento se organiza de lunes a viernes y se conserva por día. Al comenzar una nueva semana, ofrecer reutilizar la rutina anterior o empezar vacía.
- Todo ejercicio agregado comienza con 4 series; la progresión prioriza completar el rango con técnica y RPE controlado antes de aumentar carga.
- El objetivo principal es hipertrofia mediante estímulo, adaptación y recuperación; no presentar “romper el músculo” como objetivo fisiológico.
- La tipografía secundaria debe seguir siendo legible en iPhone; evitar etiquetas críticas por debajo de 10 px.
- Medidas debe incluir una guía PNG anatómica visible con puntos de cuello, pecho, cintura, brazo, muslo y pantorrilla.
- El análisis semanal usa OpenAI desde un backend o Apps Script, nunca desde el navegador, y debe conservar una salida local basada en reglas cuando la conexión no esté disponible.
- La base de conocimiento del coach debe estar versionada, citar fuentes primarias o revisiones y devolver fuerza de evidencia, URL y fecha; una respuesta sin trazabilidad no se presenta como análisis científico.
- Farmacología deportiva, anabólicos, SARMs y péptidos se cubren solo con educación y reducción de daño. Nunca generar ciclos, dosis, PCT, stacks, instrucciones de inyección o reconstitución, fuentes de compra ni evasión de controles.
- Las comparativas de progreso deben permitir elegir dos fechas e integrar medidas, sesiones, unidades y deltas. Los PDF deben incluir período, matrices legibles, datos usados, interpretación, confianza, fuentes y límites de seguridad.
- No presentar datos de demostración como si fueran registros de Alejandro. Sin datos reales, mostrar un estado vacío y explicar qué debe registrar.
- Hidratación, suplementos, mediciones, fotos, sesiones terminadas y entrenamientos en curso deben persistir; los registros diarios se separan por fecha local.
- Cada entrenamiento conserva todas sus series por ejercicio y sesión. Un entrenamiento sin ninguna serie completada no puede finalizarse.
- Toda sincronización remota fallida debe quedar en una cola local visible, con reintento manual, exportación de respaldo y restauración.
- Las fotos se conservan localmente y en Drive. El análisis visual con IA requiere consentimiento visible por comparación y solo envía las dos copias comprimidas seleccionadas; ese permiso no se conserva.
- Los planes de entrenamiento deben comenzar vacíos. Solo ofrecer “usar la semana pasada” cuando exista una semana real creada por Alejandro; nunca precargar una rutina de demostración.
- Las fotos de progreso usan una estrategia híbrida: copia inmediata local para funcionar sin señal y respaldo automático del archivo completo en Google Drive. Recomprímelas a JPEG, máximo 1600 px, calidad aproximada 82 %, sin EXIF. Solo pueden enviarse a la IA con consentimiento por comparación.
- En Drive, organizar fotos, respaldos e informes en `APP Alejandro GYM`, por categoría y carpeta mensual. Mostrar en la app si una foto está pendiente o respaldada.
- El arranque debe precargar y validar los recursos esenciales con una barra visible hasta 100 %. Tras la primera preparación, las siguientes aperturas usan la caché versionada y solo muestran una transición breve.
- El perfil permite editar nombre, altura, peso objetivo, objetivo principal y descanso predeterminado. Altura, peso, series, repeticiones y RPE usan teclado numérico.
- Los objetivos se revisan semanalmente: la IA propone una meta pequeña, un reto medible, su criterio de éxito, una fecha de revisión y confianza basada únicamente en datos reales.
- El registro admite biseries/superseries entre ejercicios de la rutina y debe permitir alternar con un solo toque, sin perder los valores ingresados.
- RPE siempre incluye una explicación visible basada en repeticiones en reserva; los descansos son configurables y ajustables en pasos rápidos de 15 segundos.
- El historial de entrenamiento debe filtrar y paginar resultados para no montar cientos de sesiones al navegar.
- La portada de carga usa una imagen fotográfica de Alejandro como identidad: conservar sus facciones reales, sin traje, con una estética contemporánea de disciplina, poder sereno y dedicación; evitar modelos genéricos, cosplay romano y musculatura exagerada.
- Las frases de la pantalla de carga deben permanecer visibles alrededor de seis segundos para poder leerse con calma.
- El botón `Entrar` no debe existir visualmente durante la precarga; aparece únicamente cuando los recursos han llegado al 100 % y la aplicación está lista.
- La portada debe mostrar a Alejandro desde la cabeza hasta, como mínimo, la cintura; evitar un primer plano dominado únicamente por el rostro. Mantener el título en el cuarto superior y reservar la zona inferior para frase, progreso y acción con separación regular.
- En retratos generados de Alejandro, rostro, cuello, brazos y manos deben compartir tono, temperatura, grano, nitidez y dirección de luz. Evitar piel plástica, musculatura sintética, simetría perfecta y cualquier transición que parezca un montaje.
- Cuando Alejandro marque un rostro como aprobado, conservarlo sin reinterpretarlo ni volver a iluminarlo. Las correcciones posteriores de piel deben limitarse a las zonas solicitadas, por ejemplo desde debajo de la mandíbula hacia el cuerpo.
- Si un montaje corporal no preserva bien la identidad, volver a generar la fotografía desde la referencia facial original en lugar de encadenar correcciones. Comunicar fuerza estoica mediante postura, mirada, ropa y luz coherente; evitar grandes áreas de piel artificial y musculatura inventada.
- Explicar RPE con lenguaje cotidiano: el número representa cuántas repeticiones más sentía Alejandro que podía hacer con buena técnica. Mostrar ejemplos directos (10 = ninguna, 9 = una, 8 = dos, 7 = tres) y orientar 8–9 como rango habitual para hipertrofia, sin abusar del 10.
- Las filas de ejercicios del plan diario deben permitir deslizar hacia la izquierda para revelar una acción roja `Eliminar`, siguiendo el patrón de iOS. El gesto no debe borrar por sí solo: Alejandro confirma tocando la acción revelada.
- La versión pública debe renderizar la app directamente a pantalla completa. El selector de dispositivo, el bisel, el cursor simulado y cualquier marco de iPhone pertenecen únicamente a herramientas de revisión y nunca deben ser visibles para el usuario final.
- El arranque prioriza la portada y el icono. Las ilustraciones de ejercicios se descargan progresivamente en segundo plano, sin bloquear el botón de entrada, y deben estar optimizadas para móvil.
- La biblioteca muestra resultados en bloques de 10 con un final visible. No montar decenas de ejercicios en una lista aparentemente infinita.
- Priorizar legibilidad real en iPhone: títulos de tarjeta alrededor de 16 px, texto funcional de 12–14 px, campos numéricos de 16 px y objetivos táctiles de al menos 44 px. Es preferible usar más scroll vertical que comprimir la información.
- La versión pública no usa el rebote sintético del prototipo. El desplazamiento debe sentirse estable y el gesto horizontal de las filas de rutina debe ceder correctamente al borrado estilo iOS.
