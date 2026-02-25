# feat: Implement Course Basic Information Form (Title, Description, Thumbnail)

Closes #49

## Summary

Implements the Create New Course page with basic course details, section management, and polished styling matching the Figma design.

## Changes

### `src/app/dashboard/courses/create/page.tsx`

- **Course Basic Info (top section)**: Thumbnail upload, course title, and course description fields in a two-column layout (thumbnail left, fields right, stacks on mobile)
- **Course Details (right column)**: Course amount, access type, skills tags, certification select, and file upload
- **Action Buttons**: "Publish for $50" (glow) and "Add to Draft" (secondary)
- **Sections Area**: Repeatable course sections with:
  - Video upload box (green-tinted background)
  - Lecture title (required) and Duration (required) fields
  - Note textarea (required)
  - Quiz (title + description)
  - Exercise and Assignment inputs
  - "+ ADD SECTION" button to add more sections
- **Styling**: Dedicated `sectionInputClass` for darker section-level inputs with subtle borders, clean dark card backgrounds, and proper spacing

### `src/components/ui/FileUpload.tsx`

- Reusable `FileUpload` component with `default`, `video`, and `compact` variants
- Supports drag-and-drop, file selection, and file removal
- Dotted border style with centered plus icon and label

## Screenshots

<!-- Add screenshots here -->

## Acceptance Criteria

- [x] Matches layout in Figma screenshot
- [x] Responsive — stacks vertically on mobile
- [x] Clean form structure with controlled inputs
- [x] Reusable `FileUpload` component with multiple variants
- [x] No backend integration (UI only)
