# Design QA

## Evidence

- Source visual truth: `C:\Users\alejo\.codex\codex-remote-attachments\019faaad-a89b-7800-91e5-06f7eb06ae40\43FB2749-BE6B-4933-BD9A-4678BE0ADD65\1-Foto-1.jpg`
- Splash implementation: `C:\Users\alejo\Documents\Codex\2026-07-28\haremos-una-web-app-para-ios\mobile-app\qa-splash-flat-v2.png`
- Splash comparison: `C:\Users\alejo\Documents\Codex\2026-07-28\haremos-una-web-app-para-ios\mobile-app\qa-splash-flat-comparison.png`
- Hydration implementation: `C:\Users\alejo\Documents\Codex\2026-07-28\haremos-una-web-app-para-ios\mobile-app\qa-hydration-full-v2.png`
- Hydration comparison: `C:\Users\alejo\Documents\Codex\2026-07-28\haremos-una-web-app-para-ios\mobile-app\qa-hydration-comparison.png`
- Browser viewport: 1400 × 1200 CSS px at device scale factor 1.
- Phone screen: verified at 393 × 852 CSS px at 1:1 scale.
- Source image: 1230 × 1280 px. Matching phone regions were cropped and normalized to 393 × 852.
- Implementation screenshots: 1400 × 1200 px. The 393 × 852 app-owned screen was normalized against the matching source-phone region.
- States: initial entry screen and Nutrición → Hidratación with a 4 L objective.

## Full-view comparison

The splash preserves the reference hierarchy: restrained brand mark, wide Alejandro
wordmark, full-height athletic image, stoic statement and bottom pill CTA. The
replacement identity is intentionally flatter and more contemporary than the source
mark while preserving its scale and placement.

The hydration view follows the supplied habits screen: current consumption and goal,
four visible vessels, quick registration, daily habits and persistent five-item
navigation. Per the user's explicit rule, each vessel represents exactly 1 L and the
sleep row is omitted.

## Focused comparison

The combined comparisons make the logo, typography, image crop, bottle states,
progress values, goal controls, list density and safe-area treatment readable at the
same normalized screen size. No additional focused crop was required.

## Required fidelity surfaces

- Fonts and typography: iOS-like sans hierarchy remains compact and legible; the
  splash quote keeps the reference's editorial serif treatment and adds a clear author
  attribution.
- Spacing and layout rhythm: both screens preserve the reference's vertical structure,
  grouped cards, compact section gaps and large touch targets. The app content top
  padding was raised so headings clear the Dynamic Island and status indicators.
- Colors and visual tokens: graphite-black surfaces, white hierarchy, restrained
  violet accents and green completion states match the reference system.
- Image quality and asset fidelity: the generated full-resolution splash remains
  sharp; the new logo and reusable bottle are real PNG assets. Both custom identity
  assets use a flat visual language with no 3D bevels, metallic rendering or glow.
- Copy and content: the entry uses a verified Marco Aurelio principle from
  *Meditations* 10.16. Hydration uses a configurable liter objective, individual 1 L
  bottles, checks and quick-add actions. No sleep tracking remains.

## Interaction and console checks

- Verified the entry CTA opens the dashboard.
- Verified the five navigation targets are Inicio, Entreno, Nutrición, Progreso and
  Perfil.
- Verified Nutrición opens on Hidratación.
- Verified a bottle tap changes its pressed/completed state and updates progress from
  50% to 75%.
- Verified the daily target exposes decrease and increase controls.
- Verified supplement and hydration segmented controls are present.
- Browser console errors: none.
- Mobile runtime integrity: passed for all 28 protected files.
- Production build: passed.

## Comparison history

1. P1: the original letter-A treatment was visually dated and did not meet the user's
   flat iOS identity direction.
   - Fix: replaced it with a custom flat PNG monogram and used it in the splash,
     profile, favicon, Apple touch icon and install manifest.
   - Post-fix evidence: `qa-splash-flat-comparison.png`.
2. P1: hydration previously existed only as a quick-add card and did not reproduce the
   reference flow.
   - Fix: added a dedicated hydration screen with editable daily goal, individual
     checkable bottle tiles, quick-add controls and daily habits.
   - Post-fix evidence: `qa-hydration-comparison.png`.
3. P1: the first hydration capture placed the main heading too close to the status bar.
   - Fix: raised app-owned top padding from 64 px to 82 px.
   - Post-fix evidence: `qa-hydration-full-v2.png`.
4. Product rule update: initial portions were 500 ml.
   - Fix: migrated the model and UI so every bottle is exactly 1 L and a 4 L goal
     renders four bottles.
   - Post-fix evidence: `qa-hydration-comparison.png`.

## Follow-up polish

- P3: when Alejandro adds real progress photos, replace the current empty photo state
  with the reference's side-by-side comparison treatment.

final result: passed
