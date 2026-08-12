# Theme token contract

**Status: Frozen seed contract for implementation**
**Scope: planning only; tokens are not present in production yet**

This file is the sole authority for theme token names and seed values. [../requirements.md](../requirements.md) owns behavior; [../technical-design.md](../technical-design.md) owns selector/runtime architecture; [../style-migration-matrix.md](../style-migration-matrix.md) identifies consumers.

Do not add, rename, or substitute a token during implementation without reviewing this contract, its contrast pairing, and every matrix consumer. A component must not introduce a one-off theme color merely because the nearest token is imperfect; stop and amend this contract first.

## Ownership and naming rules

- Generic reusable concepts use `--kui-*` and are declared in `libs/common-ui/src/lib/styles/base/_theme.scss`.
- Ministry Maps page, shell, role, territory, and work concepts use `--mm-*` and are declared in `apps/ministry-maps/src/styles/_theme.scss`.
- `common-ui` may never reference a `--mm-*` token or Ministry Maps model/state.
- Ministry Maps may alias generic values, but components consume the semantic name appropriate to their responsibility.
- Token names describe purpose, never palette (`green-500`), theme (`dark-text`), or a single component implementation (`card-grey`).
- State values are explicit. Do not evaluate `color.scale()`, `darken()`, `lighten()`, or color mixing against `var(...)` at a component call site.
- Alpha text values are intentional contracts and must be tested on their allowed surfaces.
- Literal `transparent` and `currentColor` remain valid CSS mechanisms; they are not theme colors and need no token when used semantically.

## Generic `--kui-*` tokens

### Canvas, surfaces, and shadows

| Contract token | Light seed | Dark seed | Intended use | Forbidden use |
|---|---|---|---|---|
| `--kui-color-canvas` | `#E7E6E4` | `#121212` | Document/body/app canvas and overscroll background. Also mirrored as browser `theme-color`. | Card, input, status badge, or action background. |
| `--kui-color-surface` | `#F8F8F8` | `#1E1E1E` | Cards, standard dialog content, grouped content. | Elevated controls/menus that need separation. |
| `--kui-color-surface-elevated` | `#FDFDFD` | `#27272A` | Inputs, selects, menus, popovers, raised content. | App shell or semantic status. |
| `--kui-color-surface-muted` | `#D1D0CE` | `#363332` | Neutral subdued regions and non-interactive selection containers. | Hover, disabled text, or status feedback. |
| `--kui-color-surface-hover` | `#E7E6E4` | `#3F3F46` | Neutral hover/pressed region for generic controls. | Primary action hover or persistent selection. |
| `--kui-color-surface-selected` | `#DCE8F7` | `#1E3A5F` | Persistent neutral selection with a non-color selected cue. | Domain assignment/status or focus ring. |
| `--kui-color-surface-inverse` | `#4D4947` | `#0F172A` | Generic inverse headers/regions. | Ministry Maps branded shell when `--mm-color-shell` applies. |
| `--kui-shadow-surface` | `0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)` | `0 8px 24px rgba(0, 0, 0, 0.55)` | Cards, menus, ordinary elevated surfaces. | Full-screen backdrop or focus state. |
| `--kui-shadow-dialog` | `0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)` | `0 16px 40px rgba(0, 0, 0, 0.65)` | Modal dialogs and highest generic elevation. | Cards or selection indication. |

### Text, icon, border, and focus

| Contract token | Light seed | Dark seed | Intended use | Required/forbidden pairing |
|---|---|---|---|---|
| `--kui-color-text` | `rgba(0, 0, 0, 0.87)` | `rgba(255, 255, 255, 0.87)` | Primary text and inheriting icons. | Use on canvas/surface/elevated; not on inverse/action/status surfaces. |
| `--kui-color-text-muted` | `rgba(0, 0, 0, 0.60)` | `rgba(255, 255, 255, 0.68)` | Secondary labels, captions, helper text. | Use on surface/elevated; not disabled content. |
| `--kui-color-text-disabled` | `rgba(0, 0, 0, 0.38)` | `rgba(255, 255, 255, 0.38)` | Disabled content only, paired with native/semantic disabled state. | Never essential instructions, placeholder, validation, status, or sole disabled cue. |
| `--kui-color-placeholder` | `rgba(0, 0, 0, 0.54)` | `rgba(255, 255, 255, 0.60)` | Input/textarea placeholder on elevated controls. | Labels, helper copy, or disabled text. |
| `--kui-color-on-inverse` | `#FDFDFD` | `#F8FAFC` | Text/icons on `--kui-color-surface-inverse`. | Ordinary light surfaces. |
| `--kui-color-border` | `#BAB7B5` | `#525252` | Decorative dividers and non-essential boundaries. | Sole boundary for controls that require `3:1`; use strong/focus there. |
| `--kui-color-border-strong` | `#615D5C` | `#78716C` | Meaningful control boundaries and emphasized separators. | Status meaning or focus-only indication. |
| `--kui-color-focus` | `#2563EB` | `#93C5FD` | `:focus-visible` outline/ring and focused control boundary. | Selected, active, or link text state. |
| `--kui-color-backdrop` | `rgba(0, 0, 0, 0.48)` | `rgba(0, 0, 0, 0.72)` | CDK/modal backdrop. | Surface tint, disabled state, or content overlay text. |
| `--kui-color-control-disabled` | `#D1D0CE` | `#363332` | Disabled input/select/button surface paired with native/semantic disabled state. | Selected, hover, status, or ordinary muted content. |
| `--kui-color-control-autofill` | `#E8F0FE` | `#243247` | Browser-autofilled control background; keep text token explicit. | Generic selected/status background. |

### Actions and links

| Contract token | Light seed | Dark seed | Intended use | Pairing |
|---|---|---|---|---|
| `--kui-color-action-primary` | `#2A4970` | `#60A5FA` | Primary action background or action-colored icon/text. | Background pairs with `--kui-color-on-action-primary`. |
| `--kui-color-action-primary-hover` | `#203A59` | `#93C5FD` | Enabled primary action hover. | Same on-action content token. |
| `--kui-color-action-primary-active` | `#182C45` | `#BFDBFE` | Enabled primary action pressed/active. | Same on-action content token. |
| `--kui-color-on-action-primary` | `#FDFDFD` | `#0F172A` | Text/icon/spinner on all primary action backgrounds. | Never use as ordinary surface text. |
| `--kui-color-link` | `#4171AE` | `#93C5FD` | Link text with underline or other non-color affordance. | Surface/elevated backgrounds only. |
| `--kui-color-link-hover` | `#315F98` | `#BFDBFE` | Link hover/active text; preserve underline/focus. | Not a button background. |

### Generic feedback families

Feedback families are generic application feedback, validation, Note, and Toaster semantics. They do not replace Ministry Maps business statuses merely because hues are similar.

| Family/token | Light seed | Dark seed | Intended use |
|---|---|---|---|
| `--kui-color-danger` | `#DC2727` | `#FCA5A5` | Error/destructive text and icons on ordinary surfaces. |
| `--kui-color-danger-surface` | `#FEE3E3` | `#4A1717` | Error/destructive feedback container. |
| `--kui-color-on-danger` | `#7F1F1F` | `#FEE2E2` | Content on danger surface. |
| `--kui-color-danger-border` | `#B91D1D` | `#F87171` | Error control/feedback boundary. |
| `--kui-color-success` | `#15803D` | `#86EFAC` | Success text and icons on ordinary surfaces. |
| `--kui-color-success-surface` | `#DCFCE7` | `#123524` | Success feedback container. |
| `--kui-color-on-success` | `#14532D` | `#DCFCE7` | Content on success surface. |
| `--kui-color-success-border` | `#15803D` | `#4ADE80` | Success feedback boundary. |
| `--kui-color-warning` | `#B45309` | `#FCD34D` | Warning text and icons on ordinary surfaces. |
| `--kui-color-warning-surface` | `#FEF3C7` | `#422006` | Warning feedback container. |
| `--kui-color-on-warning` | `#78350F` | `#FEF3C7` | Content on warning surface. |
| `--kui-color-warning-border` | `#B45309` | `#FBBF24` | Warning feedback boundary. |
| `--kui-color-info` | `#1D4ED8` | `#93C5FD` | Informational text and icons on ordinary surfaces. |
| `--kui-color-info-surface` | `#DBEAFE` | `#172554` | Informational feedback container. |
| `--kui-color-on-info` | `#1E3A8A` | `#DBEAFE` | Content on informational surface. |
| `--kui-color-info-border` | `#1D4ED8` | `#60A5FA` | Informational feedback boundary. |

## Ministry Maps `--mm-*` tokens

### App aliases and shell/profile contracts

| Contract token | Light seed | Dark seed | Intended use |
|---|---|---|---|
| `--mm-color-page` | `var(--kui-color-canvas)` → `#E7E6E4` | `var(--kui-color-canvas)` → `#121212` | Ministry Maps route canvas. |
| `--mm-color-shell` | `#166534` | `#0F2F27` | Main header/navigation shell background. |
| `--mm-color-shell-hover` | `#14532D` | `#17483C` | Enabled shell action hover/active region. |
| `--mm-color-shell-content` | `#F8FAFC` | `#F8FAFC` | Shell text/icons/logo foreground. |
| `--mm-color-profile-avatar` | `#166534` | `#34D399` | Profile/user-initial avatar background where app-owned. |
| `--mm-color-profile-avatar-content` | `#FDFDFD` | `#0F172A` | Initials/icon on profile avatar. |

Do not substitute `--kui-color-surface-inverse` for the shell merely because both are dark in light mode; the app shell is an app-owned identity surface. Generic Header consumers outside Ministry Maps continue to use generic contracts.

### Territory alert contracts

Each territory alert has a background/foreground/border trio. The visible label/icon remains mandatory; color is not the only cue. These alerts are not generic success/warning aliases even when seed values coincide.

| Business meaning | Contract tokens (`background`, `foreground`, `border`) | Light seeds | Dark seeds |
|---|---|---|---|
| Default/uncategorized | `--mm-color-territory-alert-default-background`; `--mm-color-territory-alert-default-foreground`; `--mm-color-territory-alert-default-border` | `#E7E6E4`; `#292524`; `#615D5C` | `#363332`; `#F5F5F4`; `#A8A29E` |
| Revisit | `--mm-color-territory-alert-revisit-background`; `--mm-color-territory-alert-revisit-foreground`; `--mm-color-territory-alert-revisit-border` | `#DCFCE7`; `#14532D`; `#15803D` | `#123524`; `#DCFCE7`; `#4ADE80` |
| Moved | `--mm-color-territory-alert-moved-background`; `--mm-color-territory-alert-moved-foreground`; `--mm-color-territory-alert-moved-border` | `#E0E7FF`; `#312E81`; `#4F46E5` | `#252350`; `#E0E7FF`; `#A5B4FC` |
| Stop visiting | `--mm-color-territory-alert-stop-visiting-background`; `--mm-color-territory-alert-stop-visiting-foreground`; `--mm-color-territory-alert-stop-visiting-border` | `#FEE3E3`; `#7F1F1F`; `#B91D1D` | `#4A1717`; `#FEE2E2`; `#F87171` |
| Bible student | `--mm-color-territory-alert-bible-student-background`; `--mm-color-territory-alert-bible-student-foreground`; `--mm-color-territory-alert-bible-student-border` | `#FFEDD5`; `#7C2D12`; `#C2410C` | `#431407`; `#FFEDD5`; `#FB923C` |

### Territory/work state contracts

Interactive status surfaces use five tokens per state: `background`, `foreground`, `border`, `hover`, and `selected`. Apply an icon, label, native checked state, or other structural cue in addition to color.

| Contract token | Light seed | Dark seed | Intended use |
|---|---|---|---|
| `--mm-color-work-available-background` | `#DCFCE7` | `#123524` | Available item/status base surface. |
| `--mm-color-work-available-foreground` | `#14532D` | `#DCFCE7` | Available label/icon. |
| `--mm-color-work-available-border` | `#15803D` | `#4ADE80` | Available boundary. |
| `--mm-color-work-available-hover` | `#BBF7D0` | `#17452D` | Available interactive hover/pressed surface. |
| `--mm-color-work-available-selected` | `#86EFAC` | `#1D5638` | Available selected surface with non-color cue. |
| `--mm-color-work-assigned-background` | `#DBEAFE` | `#172554` | Assigned item/status base surface. |
| `--mm-color-work-assigned-foreground` | `#1E3A8A` | `#DBEAFE` | Assigned label/icon. |
| `--mm-color-work-assigned-border` | `#2563EB` | `#60A5FA` | Assigned boundary. |
| `--mm-color-work-assigned-hover` | `#BFDBFE` | `#1E3A5F` | Assigned interactive hover/pressed surface. |
| `--mm-color-work-assigned-selected` | `#93C5FD` | `#244876` | Assigned selected surface with non-color cue. |
| `--mm-color-work-completed-background` | `#E7E6E4` | `#363332` | Completed item/status base surface. |
| `--mm-color-work-completed-foreground` | `#292524` | `#F5F5F4` | Completed label/icon. |
| `--mm-color-work-completed-border` | `#615D5C` | `#A8A29E` | Completed boundary. |
| `--mm-color-work-completed-hover` | `#D1D0CE` | `#44403C` | Completed interactive hover/pressed surface. |
| `--mm-color-work-completed-selected` | `#BAB7B5` | `#57534E` | Completed selected surface with non-color cue. |
| `--mm-color-work-attention-background` | `#FEF3C7` | `#422006` | Attention item/status base surface. |
| `--mm-color-work-attention-foreground` | `#78350F` | `#FEF3C7` | Attention label/icon. |
| `--mm-color-work-attention-border` | `#B45309` | `#FBBF24` | Attention boundary. |
| `--mm-color-work-attention-hover` | `#FDE68A` | `#54280A` | Attention interactive hover/pressed surface. |
| `--mm-color-work-attention-selected` | `#FCD34D` | `#713F12` | Attention selected surface with non-color cue. |
| `--mm-color-work-overdue-background` | `#FEE3E3` | `#4A1717` | Overdue/expired item/status base surface. |
| `--mm-color-work-overdue-foreground` | `#7F1F1F` | `#FEE2E2` | Overdue/expired label/icon. |
| `--mm-color-work-overdue-border` | `#B91D1D` | `#F87171` | Overdue/expired boundary. |
| `--mm-color-work-overdue-hover` | `#FECBCE` | `#5F1B1B` | Overdue/expired interactive hover/pressed surface. |
| `--mm-color-work-overdue-selected` | `#FCA5A5` | `#7F1F1F` | Overdue/expired selected surface with non-color cue. |

`--mm-color-work-assigned-background` is a contract; `--mm-color-work-blue` is forbidden. If current business logic uses a different state name, map it explicitly in the migration matrix before changing this contract—do not guess based on hue.

### User-role badge contracts

Role badges use `background`, `foreground`, and `border`; visible role text is mandatory.

| Contract token | Light seed | Dark seed | Intended use |
|---|---|---|---|
| `--mm-color-role-admin-background` | `#F8F8F8` | `#27272A` | Admin/app-admin badge surface. |
| `--mm-color-role-admin-foreground` | `#292524` | `#F5F5F4` | Admin/app-admin badge text. |
| `--mm-color-role-admin-border` | `#615D5C` | `#78716C` | Admin/app-admin badge boundary. |
| `--mm-color-role-publisher-background` | `#4D4947` | `#44403C` | Publisher/default badge surface. |
| `--mm-color-role-publisher-foreground` | `#FDFDFD` | `#FAFAF9` | Publisher/default badge text. |
| `--mm-color-role-publisher-border` | `#615D5C` | `#78716C` | Publisher/default badge boundary. |
| `--mm-color-role-elder-background` | `#DCFCE7` | `#123524` | Elder badge surface. |
| `--mm-color-role-elder-foreground` | `#14532D` | `#DCFCE7` | Elder badge text. |
| `--mm-color-role-elder-border` | `#15803D` | `#4ADE80` | Elder badge boundary. |
| `--mm-color-role-organizer-background` | `#DBEAFE` | `#172554` | Organizer badge surface. |
| `--mm-color-role-organizer-foreground` | `#1E3A8A` | `#DBEAFE` | Organizer badge text. |
| `--mm-color-role-organizer-border` | `#2563EB` | `#60A5FA` | Organizer badge boundary. |
| `--mm-color-role-superintendent-background` | `#FFEDD5` | `#431407` | Superintendent badge surface. |
| `--mm-color-role-superintendent-foreground` | `#7C2D12` | `#FFEDD5` | Superintendent badge text. |
| `--mm-color-role-superintendent-border` | `#C2410C` | `#FB923C` | Superintendent badge boundary. |

`APP_ADMIN` and `ADMIN` intentionally share the `role-admin` token family while retaining distinct visible role labels/business values.

## Contrast contract

Seed pairs were evaluated with the WCAG relative-luminance formula. These are target seed calculations, not a substitute for browser validation with actual opacity, typography, state layering, and forced/autofill behavior.

| Pair | Light ratio | Dark ratio | Requirement/use |
|---|---:|---:|---|
| Primary text on standard surface | `15.30:1` | `12.84:1` | Normal text. |
| Muted text on standard surface | `5.64:1` | `8.31:1` | Normal secondary text. |
| Placeholder on elevated surface | `4.57:1` | `6.31:1` | Placeholder text. |
| On-primary content on primary action | `9.03:1` | `7.02:1` | Button text/icon/spinner. |
| Link on standard surface | `4.71:1` | `9.24:1` | Normal link text plus non-color affordance. |
| Danger text on standard surface | `4.53:1` | `8.78:1` | Error/destructive text. |
| Success text on standard surface | `4.72:1` | `11.87:1` | Success text. |
| Warning text on standard surface | `4.73:1` | `11.56:1` | Warning text. |
| Feedback on matching feedback surface | minimum `8.15:1` | minimum `12.04:1` | Note/toast/validation containers. |
| On-inverse content on inverse surface | `8.75:1` | `17.06:1` | Generic inverse regions. |
| Autofill text on autofill surface | `14.37:1` | `10.20:1` | Browser autofill. |
| Shell content on app shell | `6.81:1` | `13.78:1` | Header/navigation content. |
| Profile avatar content on avatar | `7.01:1` | `9.29:1` | Initials/icon. |
| Domain foreground on base/selected state | minimum `5.22:1` | minimum `6.99:1` | Territory/work state text. |
| Role foreground on role background | minimum `8.18:1` | minimum `9.84:1` | Role badges. |

`--kui-color-text-disabled` intentionally calculates below `4.5:1` (`2.66:1` light, `3.54:1` dark) and is restricted to disabled controls/content exempt from ordinary text contrast. Disabled state must also be conveyed through native `disabled`, semantics, cursor/interaction behavior, and a meaningful boundary where needed. It must never carry essential information.

Validate focus and meaningful control boundaries at `3:1` against adjacent rendered colors. `--kui-color-border` is a decorative divider and is not approved as the sole meaningful control boundary; use `--kui-color-border-strong`, `--kui-color-focus`, or a semantic status border as applicable.

## Approved migration examples

### Generic surface

```scss
.card {
  color: var(--kui-color-text);
  background: var(--kui-color-surface);
  border-color: var(--kui-color-border);
  box-shadow: var(--kui-shadow-surface);
}
```

### Inheriting icon

```scss
.destructive-action {
  color: var(--kui-color-danger);
}
```

```html
<kui-icon fillColor="currentColor" />
```

Prefer removing the explicit input entirely when `IconComponent` defaults to `currentColor` and compatibility permits it.

### Generic feedback

```scss
.note--warning {
  color: var(--kui-color-on-warning);
  background: var(--kui-color-warning-surface);
  border-color: var(--kui-color-warning-border);
}
```

### Domain status

```scss
.territory-alert--moved {
  color: var(--mm-color-territory-alert-moved-foreground);
  background: var(--mm-color-territory-alert-moved-background);
  border-color: var(--mm-color-territory-alert-moved-border);
}
```

Do not replace this with `--kui-color-info-*`; “moved” is a business status, not generic informational feedback.

### Explicit interactive state

```scss
.work-option--assigned:hover {
  background: var(--mm-color-work-assigned-hover);
}

.work-option--assigned[aria-selected='true'] {
  background: var(--mm-color-work-assigned-selected);
}
```

Do not write `color.scale(var(--mm-color-work-assigned-background), ...)`.

## Forbidden patterns

- New rendered hex/rgb/named colors outside the two theme declaration files, the tiny mirrored head initializer metadata values, or a documented third-party/data API requirement.
- Palette-derived token names such as `--green-500`, `--dark-grey`, or `--light-card`.
- Ministry Maps tokens in `libs/common-ui`.
- Generic feedback tokens used to erase business meaning.
- `!important` theme overrides or external overrides of private `common-ui` selectors.
- Theme-specific component branches and widespread `dark:` utility classes.
- Global image/SVG inversion.
- Color-only status, selected, validation, or focus indication.
- Component-local color derivation from CSS variables.

## Token completion gate

Before a migration row may be marked `Done`:

- Every rendered color maps to a token in this file or has a recorded retain/false-positive reason.
- The relevant default, hover, active, selected, focus-visible, disabled, placeholder/autofill, validation, and overlay states use explicit contracts.
- Light and dark pairings pass the required browser contrast check.
- `system` has been checked at route level in both OS schemes.
- Generic files contain no `--mm-*` references.
- No unreviewed token has been added at a component call site.
