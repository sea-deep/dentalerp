/**
 * Anatomically-distinct SVG tooth path definitions for the dental odontogram.
 *
 * Each tooth type gets a unique crown outline, root outline, and 5-surface
 * zone paths (Mesial, Distal, Occlusal/Incisal, Buccal, Lingual).
 *
 * All paths are authored within a 60×90 viewBox.
 *   - Crown region:  y 0–40  (upper) or  y 50–90  (lower)
 *   - Root region:    y 40–90 (upper, roots point down toward gumline "below")
 *                     y 0–50  (lower, roots point up toward gumline "above")
 *
 * The five-surface diagram uses a nested-rectangle idiom where the viewBox is
 * 40×28 translated into the crown zone. The actual tooth outline wraps around it.
 */

export type ToothType =
  | 'central-incisor'
  | 'lateral-incisor'
  | 'canine'
  | 'first-premolar'
  | 'second-premolar'
  | 'first-molar'
  | 'second-molar'
  | 'third-molar'

/**
 * Map FDI tooth number to its morphological type.
 */
export function getToothType(fdiNumber: number): ToothType {
  const n = fdiNumber % 10 // unit digit encodes position in quadrant
  switch (n) {
    case 1:
      return 'central-incisor'
    case 2:
      return 'lateral-incisor'
    case 3:
      return 'canine'
    case 4:
      return 'first-premolar'
    case 5:
      return 'second-premolar'
    case 6:
      return 'first-molar'
    case 7:
      return 'second-molar'
    case 8:
      return 'third-molar'
    default:
      return 'first-molar'
  }
}

/**
 * Return a human-readable short type name (used in the dialog badge).
 */
export function getToothTypeName(fdiNumber: number): string {
  const t = getToothType(fdiNumber)
  const names: Record<ToothType, string> = {
    'central-incisor': 'Central Incisor',
    'lateral-incisor': 'Lateral Incisor',
    canine: 'Canine',
    'first-premolar': '1st Premolar',
    'second-premolar': '2nd Premolar',
    'first-molar': '1st Molar',
    'second-molar': '2nd Molar',
    'third-molar': '3rd Molar',
  }
  return names[t]
}

/* ------------------------------------------------------------------ */
/*  Crown silhouette outlines                                          */
/*  Each is a closed SVG `d` string drawn in a 60×40 coordinate space  */
/*  (will be translated into place by the renderer).                   */
/* ------------------------------------------------------------------ */

interface ToothShapeData {
  /** Crown outline (closed path, 60-wide × 40-tall local coords) */
  crownPath: string
  /** Crown width in local units — used for sizing the overall tooth cell */
  width: number
  /** Upper root(s) path(s). Drawn below the crown (y 0→50 in local space). */
  rootPathUpper: string
  /** Lower root(s) path(s). Drawn above the crown (y 0→50, mirrored). */
  rootPathLower: string
}

/**
 * Shape definitions per tooth type.
 *
 * Crown outlines are positioned in a 0,0 → width,40 local box.
 * Root outlines extend from the crown bottom (y=40) downward for upper teeth.
 * For lower teeth the renderer mirrors them vertically.
 */
export const TOOTH_SHAPES: Record<ToothType, ToothShapeData> = {
  /* ——— INCISORS ——— flat, shovel-shaped crowns, single root */
  'central-incisor': {
    width: 28,
    crownPath:
      'M 4 38 C 2 32, 2 10, 6 4 C 8 1, 12 0, 14 0 C 16 0, 20 1, 22 4 C 26 10, 26 32, 24 38 Z',
    rootPathUpper: 'M 8 0 C 9 14, 12 32, 14 42 C 16 32, 19 14, 20 0',
    rootPathLower: 'M 8 50 C 9 36, 12 18, 14 8 C 16 18, 19 36, 20 50',
  },
  'lateral-incisor': {
    width: 26,
    crownPath:
      'M 4 38 C 2 30, 3 10, 6 5 C 8 2, 11 0, 13 0 C 15 0, 18 2, 20 5 C 23 10, 24 30, 22 38 Z',
    rootPathUpper: 'M 8 0 C 9 14, 11 34, 13 44 C 15 34, 17 14, 18 0',
    rootPathLower: 'M 8 50 C 9 36, 11 16, 13 6 C 15 16, 17 36, 18 50',
  },

  /* ——— CANINE ——— pointed cusp, long single root */
  canine: {
    width: 28,
    crownPath:
      'M 4 38 C 2 30, 3 14, 6 8 C 8 4, 12 1, 14 0 C 16 1, 20 4, 22 8 C 25 14, 26 30, 24 38 Z',
    rootPathUpper: 'M 7 0 C 8 16, 12 38, 14 48 C 16 38, 20 16, 21 0',
    rootPathLower: 'M 7 50 C 8 34, 12 12, 14 2 C 16 12, 20 34, 21 50',
  },

  /* ——— PREMOLARS ——— wider, two cusps, single/bifurcated root */
  'first-premolar': {
    width: 32,
    crownPath:
      'M 3 38 C 2 28, 2 14, 5 6 C 7 2, 10 0, 12 0 L 14 2 L 16 0 C 18 0, 22 0, 24 2 L 26 0 L 28 2 C 30 6, 30 28, 29 38 Z',
    rootPathUpper:
      'M 10 0 C 11 12, 13 28, 14 40 C 15 28, 17 12, 18 0 M 14 0 C 15 12, 17 28, 18 40 C 19 28, 21 12, 22 0',
    rootPathLower:
      'M 10 50 C 11 38, 13 22, 14 10 C 15 22, 17 38, 18 50 M 14 50 C 15 38, 17 22, 18 10 C 19 22, 21 38, 22 50',
  },
  'second-premolar': {
    width: 32,
    crownPath:
      'M 3 38 C 2 26, 3 12, 5 5 C 7 2, 11 0, 14 0 L 16 2 L 18 0 C 21 0, 25 2, 27 5 C 29 12, 30 26, 29 38 Z',
    rootPathUpper: 'M 12 0 C 13 14, 15 34, 16 44 C 17 34, 19 14, 20 0',
    rootPathLower: 'M 12 50 C 13 36, 15 16, 16 6 C 17 16, 19 36, 20 50',
  },

  /* ——— MOLARS ——— broadest crowns, multiple roots */
  'first-molar': {
    width: 40,
    crownPath:
      'M 2 38 C 1 26, 2 10, 4 5 C 6 2, 9 0, 12 0 L 14 2 L 16 0 L 20 0 L 22 2 L 24 0 L 28 0 C 31 0, 34 2, 36 5 C 38 10, 39 26, 38 38 Z',
    rootPathUpper:
      'M 6 0 C 7 12, 10 28, 12 40 C 14 28, 15 12, 14 0 M 16 0 C 17 10, 19 22, 20 32 C 21 22, 23 10, 24 0 M 26 0 C 27 12, 30 28, 32 40 C 34 28, 35 12, 34 0',
    rootPathLower:
      'M 8 50 C 9 38, 12 22, 14 10 C 16 22, 17 38, 16 50 M 24 50 C 25 38, 28 22, 30 10 C 32 22, 33 38, 32 50',
  },
  'second-molar': {
    width: 38,
    crownPath:
      'M 2 38 C 1 26, 2 10, 5 5 C 7 2, 10 0, 13 0 L 15 2 L 17 0 L 21 0 L 23 2 L 25 0 C 28 0, 31 2, 33 5 C 36 10, 37 26, 36 38 Z',
    rootPathUpper:
      'M 7 0 C 8 12, 11 28, 13 40 C 15 28, 16 12, 15 0 M 17 0 C 18 10, 20 24, 21 34 C 22 24, 24 10, 25 0 M 25 0 C 26 12, 29 28, 31 40 C 33 28, 34 12, 33 0',
    rootPathLower:
      'M 8 50 C 9 38, 12 22, 14 10 C 16 22, 17 38, 16 50 M 22 50 C 23 38, 26 22, 28 10 C 30 22, 31 38, 30 50',
  },
  'third-molar': {
    width: 34,
    crownPath:
      'M 3 38 C 2 28, 3 12, 5 6 C 7 2, 10 0, 13 0 L 15 1 L 17 0 L 19 1 L 21 0 C 24 0, 27 2, 29 6 C 31 12, 32 28, 31 38 Z',
    rootPathUpper:
      'M 9 0 C 10 10, 13 24, 15 36 C 17 24, 18 14, 17 0 M 17 0 C 18 10, 21 24, 23 36 C 25 24, 26 10, 25 0',
    rootPathLower:
      'M 9 50 C 10 40, 13 26, 15 14 C 17 26, 18 36, 17 50 M 17 50 C 18 40, 21 26, 23 14 C 25 26, 26 40, 25 50',
  },
}

/* ------------------------------------------------------------------ */
/*  Arch positioning                                                   */
/*  Returns the (x, y, rotation) for each tooth along a parabolic arc  */
/* ------------------------------------------------------------------ */

export interface ToothPosition {
  x: number
  y: number
  rotation: number // degrees — positive = clockwise tilt for arch curvature
}

/**
 * Generate positions for 16 teeth along a parabolic arch.
 * Index 0 = rightmost molar (18/48), index 15 = leftmost molar (28/38).
 *
 * The arch is a parabola: y = a * (x - cx)^2 + yOffset
 * where cx = center, producing a U-shape.
 *
 * `flipY` inverts the parabola for the mandible.
 */
export function generateArchPositions(
  archWidth: number,
  archDepth: number,
  centerX: number,
  baseY: number,
  flipY: boolean,
  toothWidths: number[]
): ToothPosition[] {
  const positions: ToothPosition[] = []
  const count = toothWidths.length // 16

  // Compute total width to distribute teeth
  const gap = 2
  const totalTeethWidth = toothWidths.reduce((s, w) => s + w, 0) + (count - 1) * gap

  // Place teeth from left to right (index 0 = patient's right = viewer's left)
  let currentX = centerX - totalTeethWidth / 2

  for (let i = 0; i < count; i++) {
    const w = toothWidths[i]
    const toothCenterX = currentX + w / 2

    // Normalized position: -1 (left edge) to +1 (right edge)
    const t = (toothCenterX - centerX) / (totalTeethWidth / 2)

    // Parabolic curve: deeper at edges, shallower at center
    const yOffset = archDepth * t * t
    const y = flipY ? baseY - yOffset : baseY + yOffset

    // Rotation: teeth at the edges tilt outward following the arch
    const rotation = -t * 12 // max ±12 degrees at the ends

    positions.push({ x: toothCenterX - w / 2, y, rotation })
    currentX += w + gap
  }

  return positions
}
