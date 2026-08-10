---
name: QuickTools Core
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#424656'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#727687'
  outline-variant: '#c2c6d8'
  surface-tint: '#0054d6'
  primary: '#0050cb'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#b3c5ff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#a33200'
  on-tertiary: '#ffffff'
  tertiary-container: '#cc4204'
  on-tertiary-container: '#fff6f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832600'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code:
    fontFamily: jetbrainsMono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is engineered for a high-utility SaaS environment that prioritizes speed, clarity, and professional reliability. The aesthetic is rooted in **Minimalism** with a focus on functional elegance. It aims to reduce cognitive load by utilizing expansive whitespace and a disciplined structural grid.

The personality is "The Precise Assistant": capable, unobtrusive, and exceptionally organized. The visual language avoids decorative flourishes like gradients or organic textures, instead relying on mathematical precision, generous tracking, and systematic iconography to guide the user. The goal is to evoke a sense of immediate efficiency and calm control.

## Colors
The palette is dominated by a high-contrast relationship between deep slate text and a stark white canvas. The **Vibrant Blue** primary color is reserved strictly for interactive elements, primary actions, and critical state indicators to maintain its psychological impact.

For Dark Mode, the #1F2937 surface becomes the primary background, with the UI layering upwards using lighter slate tones (#374151) to indicate elevation. Accents remain consistent across both modes to ensure brand recognition, while functional neutrals (success, warning, error) follow a desaturated professional profile to avoid clashing with the primary blue.

## Typography
This design system utilizes **Inter** for all UI roles to ensure maximum legibility and a systematic, technical feel. A strict hierarchy is enforced through weight distribution and increased tracking on smaller labels.

- **Headlines:** Use Semi-Bold (600) with slight negative letter-spacing to appear tighter and more "designed."
- **Body:** Use a standard weight with generous line height (1.5x) to facilitate scanning of technical documentation and utility settings.
- **Labels:** Small caps or increased tracking (0.05em) are used for metadata and category headers to distinguish them from actionable text.
- **Monospace:** JetBrains Mono is used for any data strings, IDs, or code snippets within the platform to maintain the "utility" narrative.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a 12-column structure for desktop and a single-column stack for mobile. Spacing is strictly based on a 4px baseline grid to ensure mathematical harmony across all components.

- **Desktop (1280px+):** 24px margins, 24px gutters.
- **Tablet (768px - 1279px):** 16px margins, 16px gutters.
- **Mobile (<767px):** 16px margins, fixed vertical stack.

Vertical rhythm is maintained by using the `xl` (40px) or `2xl` (64px) units between major sections to emphasize the "High Whitespace" philosophy.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** supplemented by **Subtle Ambient Shadows**. The design system avoids heavy shadows to maintain its minimal profile.

- **Level 0 (Surface):** The main canvas (#F9FAFB).
- **Level 1 (Card/Nav):** White (#FFFFFF) with a `shadow-sm` (0 1px 3px 0 rgba(0, 0, 0, 0.1)).
- **Level 2 (Popovers/Modals):** White (#FFFFFF) with a `shadow-md` (0 4px 6px -1px rgba(0, 0, 0, 0.1)).

In dark mode, elevation is achieved by lightening the surface hex code rather than increasing shadow opacity, ensuring visibility remains high without "muddying" the interface.

## Shapes
The shape language is defined by large, friendly radii that soften the professional "utility" edges.

- **Standard Components:** 12px (`0.75rem`) for buttons, inputs, and small widgets.
- **Containers:** 16px (`1rem`) for primary cards and search interfaces.
- **Interactive Feedback:** Focus states use a 2px offset ring in the primary blue color, maintaining the component's corner radius.

## Components
- **Buttons:** Primary buttons are solid Blue (#0066FF) with white text. Secondary buttons use a subtle gray ghost style with text in Deep Slate. High internal padding (12px 24px).
- **Search Interface:** The focal point of the utility. A large, 16px rounded input field with a prominent search icon and a `shadow-sm`.
- **Cards:** White backgrounds, 16px rounded corners, and a 1px border (#E5E7EB) instead of heavy shadows.
- **Navigation:** A clean top-bar with a height of 64px. Links use `body-sm` with `label-md` for active states.
- **Chips/Tags:** Small 4px rounded shapes with desaturated backgrounds (e.g., light blue background with dark blue text) for categorization without competing with buttons.
- **Input Fields:** 1px border (#D1D5DB), focus state transitions to a 1px Blue border with a soft blue outer glow.
- **Iconography:** Use 24px stroke-based icons with a consistent 2px weight. Avoid solid fills unless indicating an active toggle state.