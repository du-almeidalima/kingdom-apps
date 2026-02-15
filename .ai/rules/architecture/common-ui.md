---
applyTo:
  - "libs/common-ui/**"
instruction: "Apply when working in libs/common-ui library."
---

# Common-UI Library Guidelines

## Purpose
Shared, reusable UI components. **NO application-specific logic**.

## When to Add Here
✅ Generic UI components (buttons, cards, dialogs)
✅ Reusable directives
✅ Shared state (e.g., auth-user)
✅ UI utilities

❌ Application-specific components
❌ Business logic
❌ Feature-specific components
❌ Domain models

## Component Design
```typescript
@Component({
  selector: 'kui-button', // kui- prefix
  standalone: true,
  // ...
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Output() clicked = new EventEmitter<void>();
}
```

## Exports
All public APIs must be exported from `libs/common-ui/src/index.ts`.
