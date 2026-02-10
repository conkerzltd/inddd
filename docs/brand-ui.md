# inddd.com Brand UI Guide

## Brand Palette (Hex → HSL)

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| Primary Purple | #4910BC | 264 85% 40% | Buttons, links, focus rings |
| Deep Ink | #09102A | 228 67% 10% | Headings, foreground text |
| Dark Slate | #253238 | 197 21% 18% | Body/muted text |
| Soft Background | #F3F0FA | 258 50% 96% | App surface/background |
| White | #FFFFFF | 0 0% 100% | Cards, inputs, popovers |

## Spacing & Radius

- Border radius: 8px (0.5rem) — `--radius: 0.5rem`
- Card padding: 24px (p-6)
- Section gap: 16px (space-y-4)
- Container max-width: 1400px

## Shadows

- Cards: `shadow-sm` (subtle)
- Popovers/dropdowns: `shadow-md`

## Component Conventions

### Button
- **Primary**: `bg-primary text-primary-foreground` (purple)
- **Secondary**: `bg-secondary text-secondary-foreground` (neutral lavender)
- **Destructive**: Red, same pattern
- **Ghost/Outline**: Transparent, border on outline

### Input / Select / Textarea
- Background: white (`bg-background` on cards)
- Border: `border-input` (soft lavender-gray)
- Focus: `ring-ring` (purple ring, 2px)

### Card
- White surface on lavender background
- `shadow-sm`, `rounded-lg`, `border-border`

### Badge
- Default: primary purple
- Secondary: neutral
- Destructive: red

## Logo Assets

- `src/assets/logo-wordmark.png` — "inddd.com" text (Login, marketing)
- `src/assets/logo-symbol.png` — Abstract mark (app header icon)

## Typography

- Font family: Montserrat (sans), inherited from tailwind config
- Headings: bold (font-bold)
- Body: normal weight
