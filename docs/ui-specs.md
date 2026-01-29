# SkillSphere UI Component Specifications

This document defines the visual standards, variations, and interaction behaviors for the core SkillSphere component library. Use these specs to ensure consistency across the application.

---

## 🎨 Global Design Tokens
The system is built on a high-contrast dark palette to provide a premium, depth-heavy experience.
- **Deep Background**: `#020202`
- **Primary Accent**: `#9D50FF` (Purple)
- **Base Border**: `#28282C`
- **Elevated Card**: `#0F0F12`

---

## 1. Button
The primary action element for the platform.

| Variant | Normal State | Hover State | Interaction |
| :--- | :--- | :--- | :--- |
| **Primary** | Solid Purple background, White text. | 10% brightness increase. | Scales down to `0.98`. |
| **Glow** | Persistent purple outer glow. | Intensive shadow expansion. | High-impact feedback. |
| **Secondary** | Semi-dark grey fill with subtle border. | Light grey tint overlay (`8%`). | Standard focus ring. |
| **Outline** | Transparent with 2px grey border. | Border shifts to 50% Purple. | Sharp border highlight. |
| **White** | High-contrast White, Black text. | Slight darkening (90% white). | Subtle shadow-sm boost. |
| **Ghost** | Completely transparent. | Subtle white mist (`5%` opacity). | Text fades in. |

---

## 2. Input Field
Optimized for data entry and search.

- **Normal**: Dark background (`#121215`) with a subtle grey border. Icons appear in Muted Grey.
- **Focus**: The border shifts to **Primary Purple** (50% opacity), a subtle outer ring appears, and **internal icons turn purple** to indicate activity.
- **Disabled**: 50% opacity, `not-allowed` cursor.

---

## 3. Card
The fundamental container for all content blocks.

| Variant | Visual Properties | State Change |
| :--- | :--- | :--- |
| **Default** | Subtle border (`#28282C/50`), deep dark fill. | Static container. |
| **Glass** | Frost effect: 2px White/20 border + 24px backdrop blur. | Premium depth; blurs background elements. |
| **Glow** | Purple-tinted border (`Primary/40`) with resting aura. | Massive purple shadow expansion on hover. |

---

## 4. Badge / Tag
Used for status, categories, and small metadata.

- **Primary**: Solid purple background. Highest priority.
- **Status Variants**: (Success, Warning, Info, Error)
  - Features a **colored border at 30% opacity**.
  - 10% background fill of the same color.
  - This 2-layer approach ensures the status is recognizable even on pure black backgrounds.
- **Outline**: Thin grey line, low-profile metadata.

---

## 5. Dropdown Menu
A premium glassmorphic overlay for contextual actions.

- **Background**: Uses high-intensity backdrop blur (24px) and a semi-transparent base (`.glass` utility).
- **Items**: Features `rounded-lg` selection states with a subtle `white/10` background on focus.
- **Separators**: Clean theme-aware lines to group related actions.
- **Micro-animations**: Smooth zoom-in and fade effects on open (`data-[state=open]`).

---

## 6. Checkbox
Custom-styled for the SkillSphere theme.

- **Unchecked**: Dark input box with a consistent grey border.
- **Checked**: Transitions smoothly to a solid Primary Purple fill with a sharp white checkmark.
- **Variants (Shape)**:
  - **Square**: Perfectly sharp corners (`rounded-xs`) for a high-precision technical look.
  - **Circle**: A circular variant (`rounded-full`) for profile settings or modern signup flows.
- **Interaction**: Focus ring surrounds the entire box for accessibility.

---

## 7. Avatar
User representation component.

- **Structure**: Consists of a root container (`Avatar`), an image (`AvatarImage`), and a fallback (`AvatarFallback`).
- **Visuals**: Circular shape with a built-in `overflow-hidden` property.
- **Refinement**: Featured in the demo with a `ring-2 ring-primary/20` to provide consistent depth when placed inside cards.

---

## 8. Separator
Layout dividers that respect the theme's depth.

- **Horizontal/Vertical**: Uses the `--border` token to create clean divisions without adding visual noise.
- **Integration**: Designed to blend into both `default` and `glass` card backgrounds.
