# DeePay Brand Color System

## Color Hierarchy

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| **Primary Dark** | Navy-950 | `#001A33` | Hero sections, dark backgrounds |
| **Primary** | Navy-900 | `#002B4D` | Header, nav, dark surfaces |
| **Accent / CTA** | Cerulean-500 | `#007BA7` | Buttons, links, interactive elements |
| **Highlight** | Gold-400 | `#FFC857` | Earnings, badges, callouts |
| **Body Text** | Neutral-800 | `#1F2937` | Primary text on light backgrounds |
| **Muted Text** | Neutral-600 | `#5C6B80` | Secondary/helper text |
| **Borders** | Neutral-200 | `#D6DCE5` | Cards, dividers, input borders |
| **Background** | Neutral-0 | `#FFFFFF` | Page background |

## Full Palette

### Navy (Primary Dark)
| Stop | Hex |
|------|-----|
| 950 | `#001A33` |
| 900 | `#002B4D` |
| 800 | `#003D66` |
| 700 | `#004F80` |
| 600 | `#006199` |
| 500 | `#0073B3` |
| 400 | `#3391C2` |
| 300 | `#66AFD1` |
| 200 | `#99CDE0` |
| 100 | `#CCEBF0` |
| 50  | `#E6F5FA` |

### Cerulean (Accent)
| Stop | Hex |
|------|-----|
| 700 | `#005F7F` |
| 600 | `#006D93` |
| 500 | `#007BA7` |
| 400 | `#339BC0` |
| 300 | `#66BAD8` |
| 200 | `#99D9EB` |
| 100 | `#C2E9F4` |
| 50  | `#E3F4FC` |

### Gold (Highlights)
| Stop | Hex |
|------|-----|
| 700 | `#B8860B` |
| 400 | `#FFC857` |
| 50  | `#FFF8E7` |

### Neutral
| Stop | Hex |
|------|-----|
| 900 | `#111827` |
| 800 | `#1F2937` |
| 700 | `#374151` |
| 600 | `#5C6B80` |
| 500 | `#6B7280` |
| 400 | `#9CA3AF` |
| 300 | `#BCC3CE` |
| 200 | `#D6DCE5` |
| 100 | `#EDF0F4` |
| 50  | `#F5F7FA` |
| 0   | `#FFFFFF` |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| Success | `#16A34A` | Approved states, positive amounts |
| Warning | `#F59E0B` | Pending states, caution |
| Error   | `#DC2626` | Rejected states, destructive actions |
| Info    | `#007BA7` | Informational (aliased to Cerulean-500) |

## Accessibility

- Body text (Neutral-800 `#1F2937`) on white: **12.6:1** contrast ratio (AAA)
- Muted text (Neutral-600 `#5C6B80`) on white: **5.2:1** contrast ratio (AA)
- Cerulean-500 (`#007BA7`) on white: **4.6:1** contrast ratio (AA for large text)
- Gold-400 (`#FFC857`) on Navy-950: **9.8:1** contrast ratio (AAA)
- White on Navy-950 (`#001A33`): **18.5:1** contrast ratio (AAA)

## Token Reference

CSS custom properties are defined in `src/app/globals.css` under `:root`.
Tailwind utility classes are available via `@theme inline` registration:

```
bg-navy-900       text-cerulean-500     border-gold-400
bg-neutral-50     text-neutral-800      border-neutral-200
bg-accent         text-muted            bg-success
```

## Design Principles

1. **Navy anchors trust** - dark sections use navy-950, never pure black
2. **Cerulean drives action** - all CTAs and interactive elements use cerulean-500
3. **Gold celebrates earnings** - payout amounts and achievement badges use gold-400
4. **Neutral carries content** - body text, borders, and backgrounds use the neutral scale
5. **Semantic colors are reserved** - green/amber/red only for status indicators
