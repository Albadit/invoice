/**
 * Comprehensive Tailwind CSS v4 utility class list for Monaco IntelliSense.
 *
 * Classes are organised by category so the completion provider can show
 * meaningful detail labels.  Only the most commonly-used utilities are
 * listed — the set is large enough for real-world invoice template work
 * without bloating the bundle.
 */

export interface TailwindEntry {
  name: string;
  detail: string;
}

// ── helpers to expand numeric scales ────────────────────────────────

const SPACING = [
  '0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8',
  '9', '10', '11', '12', '14', '16', '20', '24', '28', '32', '36', '40',
  '44', '48', '52', '56', '60', '64', '72', '80', '96', 'px', 'auto',
];

const FRACTIONS = ['1/2', '1/3', '2/3', '1/4', '2/4', '3/4', '1/5', '2/5', '3/5', '4/5', '1/6', '5/6', 'full'];

const COLORS = [
  'inherit', 'current', 'transparent', 'black', 'white',
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
];

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function expand(prefix: string, values: string[], detail: string): TailwindEntry[] {
  return values.map(v => ({ name: `${prefix}-${v}`, detail }));
}

function expandColors(prefix: string, detail: string): TailwindEntry[] {
  const out: TailwindEntry[] = [];
  for (const c of COLORS) {
    if (['inherit', 'current', 'transparent', 'black', 'white'].includes(c)) {
      out.push({ name: `${prefix}-${c}`, detail });
    } else {
      for (const s of SHADES) {
        out.push({ name: `${prefix}-${c}-${s}`, detail });
      }
    }
  }
  return out;
}

// ── static utilities ────────────────────────────────────────────────

const LAYOUT: TailwindEntry[] = [
  // Display
  ...'block inline-block inline flex inline-flex grid inline-grid table inline-table table-caption table-cell table-column table-column-group table-footer-group table-header-group table-row-group table-row hidden contents flow-root list-item'
    .split(' ').map(n => ({ name: n, detail: 'Display' })),
  // Position
  ...'static fixed absolute relative sticky'
    .split(' ').map(n => ({ name: n, detail: 'Position' })),
  // Float
  ...'float-left float-right float-none float-start float-end'
    .split(' ').map(n => ({ name: n, detail: 'Float' })),
  // Clear
  ...'clear-left clear-right clear-both clear-none clear-start clear-end'
    .split(' ').map(n => ({ name: n, detail: 'Clear' })),
  // Overflow
  ...'overflow-auto overflow-hidden overflow-visible overflow-scroll overflow-clip overflow-x-auto overflow-x-hidden overflow-x-clip overflow-x-visible overflow-x-scroll overflow-y-auto overflow-y-hidden overflow-y-clip overflow-y-visible overflow-y-scroll'
    .split(' ').map(n => ({ name: n, detail: 'Overflow' })),
  // Overscroll
  ...'overscroll-auto overscroll-contain overscroll-none overscroll-x-auto overscroll-x-contain overscroll-x-none overscroll-y-auto overscroll-y-contain overscroll-y-none'
    .split(' ').map(n => ({ name: n, detail: 'Overscroll Behavior' })),
  // Object fit
  ...'object-contain object-cover object-fill object-none object-scale-down'
    .split(' ').map(n => ({ name: n, detail: 'Object Fit' })),
  // Object position
  ...'object-bottom object-center object-left object-left-bottom object-left-top object-right object-right-bottom object-right-top object-top'
    .split(' ').map(n => ({ name: n, detail: 'Object Position' })),
  // Box sizing
  { name: 'box-border', detail: 'Box Sizing' },
  { name: 'box-content', detail: 'Box Sizing' },
  // Isolation
  { name: 'isolate', detail: 'Isolation' },
  { name: 'isolation-auto', detail: 'Isolation' },
  // Table layout
  { name: 'table-auto', detail: 'Table Layout' },
  { name: 'table-fixed', detail: 'Table Layout' },
  // Border collapse
  { name: 'border-collapse', detail: 'Border Collapse' },
  { name: 'border-separate', detail: 'Border Collapse' },
  // Caption side
  { name: 'caption-top', detail: 'Caption Side' },
  { name: 'caption-bottom', detail: 'Caption Side' },
];

const FLEXBOX: TailwindEntry[] = [
  // Direction
  ...'flex-row flex-row-reverse flex-col flex-col-reverse'
    .split(' ').map(n => ({ name: n, detail: 'Flex Direction' })),
  // Wrap
  ...'flex-wrap flex-wrap-reverse flex-nowrap'
    .split(' ').map(n => ({ name: n, detail: 'Flex Wrap' })),
  // Grow / Shrink
  ...'flex-1 flex-auto flex-initial flex-none grow grow-0 shrink shrink-0'
    .split(' ').map(n => ({ name: n, detail: 'Flex' })),
  // Align
  ...'items-start items-end items-center items-baseline items-stretch'
    .split(' ').map(n => ({ name: n, detail: 'Align Items' })),
  ...'self-auto self-start self-end self-center self-stretch self-baseline'
    .split(' ').map(n => ({ name: n, detail: 'Align Self' })),
  // Justify
  ...'justify-normal justify-start justify-end justify-center justify-between justify-around justify-evenly justify-stretch'
    .split(' ').map(n => ({ name: n, detail: 'Justify Content' })),
  ...'justify-items-start justify-items-end justify-items-center justify-items-stretch'
    .split(' ').map(n => ({ name: n, detail: 'Justify Items' })),
  ...'justify-self-auto justify-self-start justify-self-end justify-self-center justify-self-stretch'
    .split(' ').map(n => ({ name: n, detail: 'Justify Self' })),
  // Content alignment
  ...'content-normal content-center content-start content-end content-between content-around content-evenly content-baseline content-stretch'
    .split(' ').map(n => ({ name: n, detail: 'Align Content' })),
  // Place
  ...'place-content-center place-content-start place-content-end place-content-between place-content-around place-content-evenly place-content-baseline place-content-stretch'
    .split(' ').map(n => ({ name: n, detail: 'Place Content' })),
  ...'place-items-start place-items-end place-items-center place-items-baseline place-items-stretch'
    .split(' ').map(n => ({ name: n, detail: 'Place Items' })),
];

const GRID: TailwindEntry[] = [
  // Cols / Rows
  ...[1,2,3,4,5,6,7,8,9,10,11,12,'none','subgrid'].map(v => ({ name: `grid-cols-${v}`, detail: 'Grid Columns' })),
  ...[1,2,3,4,5,6,'none','subgrid'].map(v => ({ name: `grid-rows-${v}`, detail: 'Grid Rows' })),
  // Span
  ...[1,2,3,4,5,6,7,8,9,10,11,12,'full'].map(v => ({ name: `col-span-${v}`, detail: 'Grid Column Span' })),
  { name: 'col-auto', detail: 'Grid Column' },
  ...[1,2,3,4,5,6,'full'].map(v => ({ name: `row-span-${v}`, detail: 'Grid Row Span' })),
  { name: 'row-auto', detail: 'Grid Row' },
  // Start / End
  ...[1,2,3,4,5,6,7,8,9,10,11,12,13,'auto'].map(v => ({ name: `col-start-${v}`, detail: 'Grid Column Start' })),
  ...[1,2,3,4,5,6,7,8,9,10,11,12,13,'auto'].map(v => ({ name: `col-end-${v}`, detail: 'Grid Column End' })),
  ...[1,2,3,4,5,6,7,'auto'].map(v => ({ name: `row-start-${v}`, detail: 'Grid Row Start' })),
  ...[1,2,3,4,5,6,7,'auto'].map(v => ({ name: `row-end-${v}`, detail: 'Grid Row End' })),
  // Auto flow
  ...'grid-flow-row grid-flow-col grid-flow-dense grid-flow-row-dense grid-flow-col-dense'
    .split(' ').map(n => ({ name: n, detail: 'Grid Auto Flow' })),
];

const TYPOGRAPHY: TailwindEntry[] = [
  // Size
  ...'text-xs text-sm text-base text-lg text-xl text-2xl text-3xl text-4xl text-5xl text-6xl text-7xl text-8xl text-9xl'
    .split(' ').map(n => ({ name: n, detail: 'Font Size' })),
  // Weight
  ...'font-thin font-extralight font-light font-normal font-medium font-semibold font-bold font-extrabold font-black'
    .split(' ').map(n => ({ name: n, detail: 'Font Weight' })),
  // Family
  ...'font-sans font-serif font-mono'
    .split(' ').map(n => ({ name: n, detail: 'Font Family' })),
  // Style
  ...'italic not-italic'
    .split(' ').map(n => ({ name: n, detail: 'Font Style' })),
  // Alignment
  ...'text-left text-center text-right text-justify text-start text-end'
    .split(' ').map(n => ({ name: n, detail: 'Text Align' })),
  // Decoration
  ...'underline overline line-through no-underline'
    .split(' ').map(n => ({ name: n, detail: 'Text Decoration' })),
  // Transform
  ...'uppercase lowercase capitalize normal-case'
    .split(' ').map(n => ({ name: n, detail: 'Text Transform' })),
  // Leading
  ...'leading-none leading-tight leading-snug leading-normal leading-relaxed leading-loose'
    .split(' ').map(n => ({ name: n, detail: 'Line Height' })),
  ...expand('leading', ['3', '4', '5', '6', '7', '8', '9', '10'], 'Line Height'),
  // Tracking
  ...'tracking-tighter tracking-tight tracking-normal tracking-wide tracking-wider tracking-widest'
    .split(' ').map(n => ({ name: n, detail: 'Letter Spacing' })),
  // Whitespace
  ...'whitespace-normal whitespace-nowrap whitespace-pre whitespace-pre-line whitespace-pre-wrap whitespace-break-spaces'
    .split(' ').map(n => ({ name: n, detail: 'Whitespace' })),
  // Word break
  ...'break-normal break-words break-all break-keep'
    .split(' ').map(n => ({ name: n, detail: 'Word Break' })),
  // Truncate
  { name: 'truncate', detail: 'Text Overflow' },
  { name: 'text-ellipsis', detail: 'Text Overflow' },
  { name: 'text-clip', detail: 'Text Overflow' },
  // List style
  ...'list-none list-disc list-decimal list-inside list-outside'
    .split(' ').map(n => ({ name: n, detail: 'List Style' })),
  // Vertical align
  ...'align-baseline align-top align-middle align-bottom align-text-top align-text-bottom align-sub align-super'
    .split(' ').map(n => ({ name: n, detail: 'Vertical Align' })),
  // Text wrap
  ...'text-wrap text-nowrap text-balance text-pretty'
    .split(' ').map(n => ({ name: n, detail: 'Text Wrap' })),
  // Hyphens
  ...'hyphens-none hyphens-manual hyphens-auto'
    .split(' ').map(n => ({ name: n, detail: 'Hyphens' })),
  // Font smoothing
  { name: 'antialiased', detail: 'Font Smoothing' },
  { name: 'subpixel-antialiased', detail: 'Font Smoothing' },
  // Text decoration style
  ...'decoration-solid decoration-double decoration-dotted decoration-dashed decoration-wavy'
    .split(' ').map(n => ({ name: n, detail: 'Text Decoration Style' })),
  // Text decoration thickness
  ...'decoration-auto decoration-from-font decoration-0 decoration-1 decoration-2 decoration-4 decoration-8'
    .split(' ').map(n => ({ name: n, detail: 'Text Decoration Thickness' })),
  // Underline offset
  ...'underline-offset-auto underline-offset-0 underline-offset-1 underline-offset-2 underline-offset-4 underline-offset-8'
    .split(' ').map(n => ({ name: n, detail: 'Underline Offset' })),
  // Text indent
  ...expand('indent', SPACING, 'Text Indent'),
  // Line clamp
  ...[1, 2, 3, 4, 5, 6, 'none'].map(v => ({ name: `line-clamp-${v}`, detail: 'Line Clamp' })),
  // Content
  { name: 'content-none', detail: 'Content' },
];

const BORDERS: TailwindEntry[] = [
  ...'border border-0 border-1 border-2 border-4 border-8'
    .split(' ').map(n => ({ name: n, detail: 'Border Width' })),
  ...'border-t border-r border-b border-l border-x border-y'
    .split(' ').map(n => ({ name: n, detail: 'Border Width' })),
  ...'border-t-0 border-r-0 border-b-0 border-l-0 border-t-2 border-r-2 border-b-2 border-l-2'
    .split(' ').map(n => ({ name: n, detail: 'Border Width' })),
  ...'border-solid border-dashed border-dotted border-double border-hidden border-none'
    .split(' ').map(n => ({ name: n, detail: 'Border Style' })),
  // Radius
  ...'rounded-none rounded-sm rounded rounded-md rounded-lg rounded-xl rounded-2xl rounded-3xl rounded-full'
    .split(' ').map(n => ({ name: n, detail: 'Border Radius' })),
  ...'rounded-t-none rounded-r-none rounded-b-none rounded-l-none rounded-t-sm rounded-r-sm rounded-b-sm rounded-l-sm rounded-t rounded-r rounded-b rounded-l rounded-t-md rounded-r-md rounded-b-md rounded-l-md rounded-t-lg rounded-r-lg rounded-b-lg rounded-l-lg rounded-t-xl rounded-r-xl rounded-b-xl rounded-l-xl rounded-t-full rounded-r-full rounded-b-full rounded-l-full'
    .split(' ').map(n => ({ name: n, detail: 'Border Radius' })),
  // Divide
  ...'divide-x divide-y divide-x-0 divide-y-0 divide-x-2 divide-y-2 divide-solid divide-dashed divide-dotted divide-none'
    .split(' ').map(n => ({ name: n, detail: 'Divide' })),
  // Ring
  ...'ring ring-0 ring-1 ring-2 ring-4 ring-8 ring-inset'
    .split(' ').map(n => ({ name: n, detail: 'Ring' })),
  // Outline
  ...'outline-none outline outline-dashed outline-dotted outline-0 outline-1 outline-2 outline-4 outline-8 outline-offset-0 outline-offset-1 outline-offset-2 outline-offset-4 outline-offset-8'
    .split(' ').map(n => ({ name: n, detail: 'Outline' })),
];

const EFFECTS: TailwindEntry[] = [
  // Shadow
  ...'shadow-sm shadow shadow-md shadow-lg shadow-xl shadow-2xl shadow-inner shadow-none'
    .split(' ').map(n => ({ name: n, detail: 'Box Shadow' })),
  // Opacity
  ...'opacity-0 opacity-5 opacity-10 opacity-15 opacity-20 opacity-25 opacity-30 opacity-35 opacity-40 opacity-45 opacity-50 opacity-55 opacity-60 opacity-65 opacity-70 opacity-75 opacity-80 opacity-85 opacity-90 opacity-95 opacity-100'
    .split(' ').map(n => ({ name: n, detail: 'Opacity' })),
  // Mix blend
  ...'mix-blend-normal mix-blend-multiply mix-blend-screen mix-blend-overlay mix-blend-darken mix-blend-lighten mix-blend-color-dodge mix-blend-color-burn mix-blend-hard-light mix-blend-soft-light mix-blend-difference mix-blend-exclusion mix-blend-hue mix-blend-saturation mix-blend-color mix-blend-luminosity mix-blend-plus-darker mix-blend-plus-lighter'
    .split(' ').map(n => ({ name: n, detail: 'Mix Blend Mode' })),
  // Background blend
  ...'bg-blend-normal bg-blend-multiply bg-blend-screen bg-blend-overlay bg-blend-darken bg-blend-lighten bg-blend-color-dodge bg-blend-color-burn bg-blend-hard-light bg-blend-soft-light bg-blend-difference bg-blend-exclusion bg-blend-hue bg-blend-saturation bg-blend-color bg-blend-luminosity'
    .split(' ').map(n => ({ name: n, detail: 'Background Blend Mode' })),
  // Backdrop blur
  ...'backdrop-blur-none backdrop-blur-xs backdrop-blur-sm backdrop-blur backdrop-blur-md backdrop-blur-lg backdrop-blur-xl backdrop-blur-2xl backdrop-blur-3xl'
    .split(' ').map(n => ({ name: n, detail: 'Backdrop Blur' })),
  // Backdrop brightness
  ...[0, 50, 75, 90, 95, 100, 105, 110, 125, 150, 200].map(v => ({ name: `backdrop-brightness-${v}`, detail: 'Backdrop Brightness' })),
  // Backdrop contrast
  ...[0, 50, 75, 100, 125, 150, 200].map(v => ({ name: `backdrop-contrast-${v}`, detail: 'Backdrop Contrast' })),
  // Backdrop grayscale
  ...'backdrop-grayscale backdrop-grayscale-0'.split(' ').map(n => ({ name: n, detail: 'Backdrop Grayscale' })),
  ...[25, 50, 75, 100].map(v => ({ name: `backdrop-grayscale-${v}`, detail: 'Backdrop Grayscale' })),
  // Backdrop hue-rotate
  ...[0, 15, 30, 60, 90, 180].map(v => ({ name: `backdrop-hue-rotate-${v}`, detail: 'Backdrop Hue Rotate' })),
  // Backdrop invert
  ...'backdrop-invert backdrop-invert-0'.split(' ').map(n => ({ name: n, detail: 'Backdrop Invert' })),
  ...[20, 40, 60, 80, 100].map(v => ({ name: `backdrop-invert-${v}`, detail: 'Backdrop Invert' })),
  // Backdrop opacity
  ...[0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100].map(v => ({ name: `backdrop-opacity-${v}`, detail: 'Backdrop Opacity' })),
  // Backdrop saturate
  ...[0, 50, 100, 150, 200].map(v => ({ name: `backdrop-saturate-${v}`, detail: 'Backdrop Saturate' })),
  // Backdrop sepia
  ...'backdrop-sepia backdrop-sepia-0'.split(' ').map(n => ({ name: n, detail: 'Backdrop Sepia' })),
  ...[25, 50, 75, 100].map(v => ({ name: `backdrop-sepia-${v}`, detail: 'Backdrop Sepia' })),
];

const FILTERS: TailwindEntry[] = [
  // Blur
  ...'blur-none blur-xs blur-sm blur-md blur-lg blur-xl blur-2xl blur-3xl'
    .split(' ').map(n => ({ name: n, detail: 'Blur' })),
  // Brightness
  ...[0, 50, 75, 90, 95, 100, 105, 110, 125, 150, 200].map(v => ({ name: `brightness-${v}`, detail: 'Brightness' })),
  // Contrast
  ...[0, 50, 75, 100, 125, 150, 200].map(v => ({ name: `contrast-${v}`, detail: 'Contrast' })),
  // Drop shadow
  ...'drop-shadow-xs drop-shadow-sm drop-shadow-md drop-shadow-lg drop-shadow-xl drop-shadow-2xl drop-shadow-none'
    .split(' ').map(n => ({ name: n, detail: 'Drop Shadow' })),
  // Grayscale
  { name: 'grayscale', detail: 'Grayscale' },
  ...[0, 25, 50, 75, 100].map(v => ({ name: `grayscale-${v}`, detail: 'Grayscale' })),
  // Hue rotate
  ...[0, 15, 30, 60, 90, 180, 270].map(v => ({ name: `hue-rotate-${v}`, detail: 'Hue Rotate' })),
  // Invert
  { name: 'invert', detail: 'Invert' },
  ...[0, 20, 40, 60, 80, 100].map(v => ({ name: `invert-${v}`, detail: 'Invert' })),
  // Saturate
  ...[0, 50, 100, 150, 200].map(v => ({ name: `saturate-${v}`, detail: 'Saturate' })),
  // Sepia
  { name: 'sepia', detail: 'Sepia' },
  ...[0, 25, 50, 75, 100].map(v => ({ name: `sepia-${v}`, detail: 'Sepia' })),
];

const TRANSITIONS: TailwindEntry[] = [
  ...'transition-none transition-all transition transition-colors transition-opacity transition-shadow transition-transform'
    .split(' ').map(n => ({ name: n, detail: 'Transition Property' })),
  ...'duration-75 duration-100 duration-150 duration-200 duration-300 duration-500 duration-700 duration-1000'
    .split(' ').map(n => ({ name: n, detail: 'Duration' })),
  ...'ease-linear ease-in ease-out ease-in-out'
    .split(' ').map(n => ({ name: n, detail: 'Timing Function' })),
  ...'delay-0 delay-75 delay-100 delay-150 delay-200 delay-300 delay-500 delay-700 delay-1000'
    .split(' ').map(n => ({ name: n, detail: 'Delay' })),
];

const TRANSFORMS: TailwindEntry[] = [
  { name: 'transform', detail: 'Transform' },
  { name: 'transform-gpu', detail: 'Transform' },
  { name: 'transform-none', detail: 'Transform' },
  ...'scale-0 scale-50 scale-75 scale-90 scale-95 scale-100 scale-105 scale-110 scale-125 scale-150'
    .split(' ').map(n => ({ name: n, detail: 'Scale' })),
  ...'scale-x-0 scale-x-50 scale-x-75 scale-x-90 scale-x-95 scale-x-100 scale-x-105 scale-x-110 scale-x-125 scale-x-150'
    .split(' ').map(n => ({ name: n, detail: 'Scale X' })),
  ...'scale-y-0 scale-y-50 scale-y-75 scale-y-90 scale-y-95 scale-y-100 scale-y-105 scale-y-110 scale-y-125 scale-y-150'
    .split(' ').map(n => ({ name: n, detail: 'Scale Y' })),
  ...'rotate-0 rotate-1 rotate-2 rotate-3 rotate-6 rotate-12 rotate-45 rotate-90 rotate-180'
    .split(' ').map(n => ({ name: n, detail: 'Rotate' })),
  // Translate
  ...expand('translate-x', SPACING, 'Translate X'),
  ...expand('translate-x', FRACTIONS, 'Translate X'),
  ...expand('translate-y', SPACING, 'Translate Y'),
  ...expand('translate-y', FRACTIONS, 'Translate Y'),
  // Skew
  ...[0, 1, 2, 3, 6, 12].map(v => ({ name: `skew-x-${v}`, detail: 'Skew X' })),
  ...[0, 1, 2, 3, 6, 12].map(v => ({ name: `skew-y-${v}`, detail: 'Skew Y' })),
  ...'origin-center origin-top origin-top-right origin-right origin-bottom-right origin-bottom origin-bottom-left origin-left origin-top-left'
    .split(' ').map(n => ({ name: n, detail: 'Transform Origin' })),
];

const INTERACTIVITY: TailwindEntry[] = [
  ...'cursor-auto cursor-default cursor-pointer cursor-wait cursor-text cursor-move cursor-help cursor-not-allowed cursor-none cursor-grab cursor-grabbing'
    .split(' ').map(n => ({ name: n, detail: 'Cursor' })),
  ...'select-none select-text select-all select-auto'
    .split(' ').map(n => ({ name: n, detail: 'User Select' })),
  ...'pointer-events-none pointer-events-auto'
    .split(' ').map(n => ({ name: n, detail: 'Pointer Events' })),
  ...'resize-none resize resize-x resize-y'
    .split(' ').map(n => ({ name: n, detail: 'Resize' })),
  ...'scroll-auto scroll-smooth'
    .split(' ').map(n => ({ name: n, detail: 'Scroll Behavior' })),
  ...'snap-start snap-end snap-center snap-align-none snap-normal snap-always snap-none snap-x snap-y snap-both snap-mandatory snap-proximity'
    .split(' ').map(n => ({ name: n, detail: 'Scroll Snap' })),
  ...'touch-auto touch-none touch-pan-x touch-pan-left touch-pan-right touch-pan-y touch-pan-up touch-pan-down touch-pinch-zoom touch-manipulation'
    .split(' ').map(n => ({ name: n, detail: 'Touch Action' })),
  ...'appearance-none appearance-auto'
    .split(' ').map(n => ({ name: n, detail: 'Appearance' })),
];

const MISC: TailwindEntry[] = [
  // Visibility
  ...'visible invisible collapse'
    .split(' ').map(n => ({ name: n, detail: 'Visibility' })),
  // Z-index
  ...'z-0 z-10 z-20 z-30 z-40 z-50 z-auto'
    .split(' ').map(n => ({ name: n, detail: 'Z-Index' })),
  // Aspect ratio
  ...'aspect-auto aspect-square aspect-video'
    .split(' ').map(n => ({ name: n, detail: 'Aspect Ratio' })),
  // Container
  { name: 'container', detail: 'Container' },
  // Screen reader
  { name: 'sr-only', detail: 'Accessibility' },
  { name: 'not-sr-only', detail: 'Accessibility' },
  // Columns
  ...'columns-1 columns-2 columns-3 columns-4 columns-5 columns-6 columns-7 columns-8 columns-9 columns-10 columns-11 columns-12 columns-auto columns-3xs columns-2xs columns-xs columns-sm columns-md columns-lg columns-xl columns-2xl columns-3xl columns-4xl columns-5xl columns-6xl columns-7xl'
    .split(' ').map(n => ({ name: n, detail: 'Columns' })),
  // Break
  ...'break-after-auto break-after-avoid break-after-all break-after-avoid-page break-after-page break-after-left break-after-right break-after-column break-before-auto break-before-avoid break-before-all break-before-avoid-page break-before-page break-before-left break-before-right break-before-column break-inside-auto break-inside-avoid break-inside-avoid-page break-inside-avoid-column'
    .split(' ').map(n => ({ name: n, detail: 'Break' })),
  // Will change
  ...'will-change-auto will-change-scroll will-change-contents will-change-transform'
    .split(' ').map(n => ({ name: n, detail: 'Will Change' })),
  // Animate
  ...'animate-none animate-spin animate-ping animate-pulse animate-bounce'
    .split(' ').map(n => ({ name: n, detail: 'Animation' })),
  // SVG stroke width
  ...'stroke-0 stroke-1 stroke-2'
    .split(' ').map(n => ({ name: n, detail: 'Stroke Width' })),
  // Forced color adjust
  ...'forced-color-adjust-auto forced-color-adjust-none'
    .split(' ').map(n => ({ name: n, detail: 'Forced Color Adjust' })),
  // Ring offset
  ...'ring-offset-0 ring-offset-1 ring-offset-2 ring-offset-4 ring-offset-8'
    .split(' ').map(n => ({ name: n, detail: 'Ring Offset Width' })),
  // Border spacing
  ...expand('border-spacing', SPACING, 'Border Spacing'),
  ...expand('border-spacing-x', SPACING, 'Border Spacing X'),
  ...expand('border-spacing-y', SPACING, 'Border Spacing Y'),
];

// ── Build the full list ────────────────────────────────────────────

export const TAILWIND_CLASSES: TailwindEntry[] = [
  ...LAYOUT,
  ...FLEXBOX,
  ...GRID,
  ...TYPOGRAPHY,
  ...BORDERS,
  ...EFFECTS,
  ...FILTERS,
  ...TRANSITIONS,
  ...TRANSFORMS,
  ...INTERACTIVITY,
  ...MISC,
  // Spacing utilities (padding, margin, gap, inset, top/right/bottom/left)
  ...expand('p', SPACING, 'Padding'),
  ...expand('px', SPACING, 'Padding X'),
  ...expand('py', SPACING, 'Padding Y'),
  ...expand('pt', SPACING, 'Padding Top'),
  ...expand('pr', SPACING, 'Padding Right'),
  ...expand('pb', SPACING, 'Padding Bottom'),
  ...expand('pl', SPACING, 'Padding Left'),
  ...expand('m', SPACING, 'Margin'),
  ...expand('mx', SPACING, 'Margin X'),
  ...expand('my', SPACING, 'Margin Y'),
  ...expand('mt', SPACING, 'Margin Top'),
  ...expand('mr', SPACING, 'Margin Right'),
  ...expand('mb', SPACING, 'Margin Bottom'),
  ...expand('ml', SPACING, 'Margin Left'),
  ...expand('gap', SPACING, 'Gap'),
  ...expand('gap-x', SPACING, 'Column Gap'),
  ...expand('gap-y', SPACING, 'Row Gap'),
  ...expand('space-x', SPACING, 'Space Between X'),
  ...expand('space-y', SPACING, 'Space Between Y'),
  // Inset / top / right / bottom / left
  ...expand('inset', SPACING, 'Inset'),
  ...expand('inset-x', SPACING, 'Inset X'),
  ...expand('inset-y', SPACING, 'Inset Y'),
  ...expand('top', SPACING, 'Top'),
  ...expand('right', SPACING, 'Right'),
  ...expand('bottom', SPACING, 'Bottom'),
  ...expand('left', SPACING, 'Left'),
  // Sizing
  ...expand('w', SPACING, 'Width'),
  ...expand('w', FRACTIONS, 'Width'),
  ...['w-screen', 'w-min', 'w-max', 'w-fit'].map(n => ({ name: n, detail: 'Width' })),
  ...expand('min-w', ['0', 'full', 'min', 'max', 'fit'], 'Min Width'),
  ...expand('max-w', ['0', 'none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full', 'min', 'max', 'fit', 'prose', 'screen-sm', 'screen-md', 'screen-lg', 'screen-xl', 'screen-2xl'], 'Max Width'),
  ...expand('h', SPACING, 'Height'),
  ...expand('h', FRACTIONS, 'Height'),
  ...['h-screen', 'h-min', 'h-max', 'h-fit', 'h-svh', 'h-lvh', 'h-dvh'].map(n => ({ name: n, detail: 'Height' })),
  ...expand('min-h', ['0', 'full', 'screen', 'min', 'max', 'fit', 'svh', 'lvh', 'dvh'], 'Min Height'),
  ...expand('max-h', ['0', 'full', 'screen', 'min', 'max', 'fit', 'svh', 'lvh', 'dvh'], 'Max Height'),
  ...expand('size', SPACING, 'Size (w+h)'),
  // Colors
  ...expandColors('text', 'Text Color'),
  ...expandColors('bg', 'Background Color'),
  ...expandColors('border', 'Border Color'),
  ...expandColors('ring', 'Ring Color'),
  ...expandColors('divide', 'Divide Color'),
  ...expandColors('outline', 'Outline Color'),
  ...expandColors('decoration', 'Text Decoration Color'),
  ...expandColors('accent', 'Accent Color'),
  ...expandColors('fill', 'Fill'),
  ...expandColors('stroke', 'Stroke'),
  ...expandColors('shadow', 'Box Shadow Color'),
  ...expandColors('placeholder', 'Placeholder Color'),
  // Background
  ...'bg-fixed bg-local bg-scroll bg-clip-border bg-clip-padding bg-clip-content bg-clip-text bg-repeat bg-no-repeat bg-repeat-x bg-repeat-y bg-repeat-round bg-repeat-space bg-auto bg-cover bg-contain bg-center bg-top bg-right bg-bottom bg-left bg-right-top bg-right-bottom bg-left-top bg-left-bottom bg-none'
    .split(' ').map(n => ({ name: n, detail: 'Background' })),
  // Gradient
  ...'bg-gradient-to-t bg-gradient-to-tr bg-gradient-to-r bg-gradient-to-br bg-gradient-to-b bg-gradient-to-bl bg-gradient-to-l bg-gradient-to-tl'
    .split(' ').map(n => ({ name: n, detail: 'Gradient Direction' })),
  ...expandColors('from', 'Gradient From'),
  ...expandColors('via', 'Gradient Via'),
  ...expandColors('to', 'Gradient To'),
  // Scroll margin
  ...expand('scroll-m', SPACING, 'Scroll Margin'),
  ...expand('scroll-mx', SPACING, 'Scroll Margin X'),
  ...expand('scroll-my', SPACING, 'Scroll Margin Y'),
  ...expand('scroll-mt', SPACING, 'Scroll Margin Top'),
  ...expand('scroll-mr', SPACING, 'Scroll Margin Right'),
  ...expand('scroll-mb', SPACING, 'Scroll Margin Bottom'),
  ...expand('scroll-ml', SPACING, 'Scroll Margin Left'),
  // Scroll padding
  ...expand('scroll-p', SPACING, 'Scroll Padding'),
  ...expand('scroll-px', SPACING, 'Scroll Padding X'),
  ...expand('scroll-py', SPACING, 'Scroll Padding Y'),
  ...expand('scroll-pt', SPACING, 'Scroll Padding Top'),
  ...expand('scroll-pr', SPACING, 'Scroll Padding Right'),
  ...expand('scroll-pb', SPACING, 'Scroll Padding Bottom'),
  ...expand('scroll-pl', SPACING, 'Scroll Padding Left'),
  // Caret color
  ...expandColors('caret', 'Caret Color'),
  // Ring offset color
  ...expandColors('ring-offset', 'Ring Offset Color'),
  // Drop shadow colors
  ...expandColors('drop-shadow', 'Drop Shadow Color'),
];

/** Fast Set for O(1) Tailwind class existence checks. */
export const TAILWIND_CLASS_SET = new Set(TAILWIND_CLASSES.map(c => c.name));

/** Map from class name → category detail for quick lookup. */
const CLASS_DETAIL_MAP = new Map(TAILWIND_CLASSES.map(c => [c.name, c.detail]));

// ── Spacing scale mapping → CSS rem values ─────────────────────────

const SPACING_MAP: Record<string, string> = {
  '0': '0px', '0.5': '0.125rem /* 2px */', '1': '0.25rem /* 4px */',
  '1.5': '0.375rem /* 6px */', '2': '0.5rem /* 8px */', '2.5': '0.625rem /* 10px */',
  '3': '0.75rem /* 12px */', '3.5': '0.875rem /* 14px */', '4': '1rem /* 16px */',
  '5': '1.25rem /* 20px */', '6': '1.5rem /* 24px */', '7': '1.75rem /* 28px */',
  '8': '2rem /* 32px */', '9': '2.25rem /* 36px */', '10': '2.5rem /* 40px */',
  '11': '2.75rem /* 44px */', '12': '3rem /* 48px */', '14': '3.5rem /* 56px */',
  '16': '4rem /* 64px */', '20': '5rem /* 80px */', '24': '6rem /* 96px */',
  '28': '7rem /* 112px */', '32': '8rem /* 128px */', '36': '9rem /* 144px */',
  '40': '10rem /* 160px */', '44': '11rem /* 176px */', '48': '12rem /* 192px */',
  '52': '13rem /* 208px */', '56': '14rem /* 224px */', '60': '15rem /* 240px */',
  '64': '16rem /* 256px */', '72': '18rem /* 288px */', '80': '20rem /* 320px */',
  '96': '24rem /* 384px */', 'px': '1px', 'auto': 'auto',
  'full': '100%', '1/2': '50%', '1/3': '33.333333%', '2/3': '66.666667%',
  '1/4': '25%', '2/4': '50%', '3/4': '75%',
  '1/5': '20%', '2/5': '40%', '3/5': '60%', '4/5': '80%',
  '1/6': '16.666667%', '5/6': '83.333333%',
  'screen': '100vw', 'svh': '100svh', 'lvh': '100lvh', 'dvh': '100dvh',
  'min': 'min-content', 'max': 'max-content', 'fit': 'fit-content',
};

// ── Static CSS resolution map ──────────────────────────────────────

const STATIC_CSS: Record<string, string> = {
  // Display
  'block': 'display: block;', 'inline-block': 'display: inline-block;',
  'inline': 'display: inline;', 'flex': 'display: flex;',
  'inline-flex': 'display: inline-flex;', 'grid': 'display: grid;',
  'inline-grid': 'display: inline-grid;', 'table': 'display: table;',
  'hidden': 'display: none;', 'contents': 'display: contents;',
  'flow-root': 'display: flow-root;', 'list-item': 'display: list-item;',
  // Position
  'static': 'position: static;', 'fixed': 'position: fixed;',
  'absolute': 'position: absolute;', 'relative': 'position: relative;',
  'sticky': 'position: sticky;',
  // Flex direction
  'flex-row': 'flex-direction: row;', 'flex-row-reverse': 'flex-direction: row-reverse;',
  'flex-col': 'flex-direction: column;', 'flex-col-reverse': 'flex-direction: column-reverse;',
  // Flex wrap
  'flex-wrap': 'flex-wrap: wrap;', 'flex-wrap-reverse': 'flex-wrap: wrap-reverse;',
  'flex-nowrap': 'flex-wrap: nowrap;',
  // Flex sizing
  'flex-1': 'flex: 1 1 0%;', 'flex-auto': 'flex: 1 1 auto;',
  'flex-initial': 'flex: 0 1 auto;', 'flex-none': 'flex: none;',
  'grow': 'flex-grow: 1;', 'grow-0': 'flex-grow: 0;',
  'shrink': 'flex-shrink: 1;', 'shrink-0': 'flex-shrink: 0;',
  // Align items
  'items-start': 'align-items: flex-start;', 'items-end': 'align-items: flex-end;',
  'items-center': 'align-items: center;', 'items-baseline': 'align-items: baseline;',
  'items-stretch': 'align-items: stretch;',
  // Justify content
  'justify-normal': 'justify-content: normal;', 'justify-start': 'justify-content: flex-start;',
  'justify-end': 'justify-content: flex-end;', 'justify-center': 'justify-content: center;',
  'justify-between': 'justify-content: space-between;', 'justify-around': 'justify-content: space-around;',
  'justify-evenly': 'justify-content: space-evenly;', 'justify-stretch': 'justify-content: stretch;',
  // Self
  'self-auto': 'align-self: auto;', 'self-start': 'align-self: flex-start;',
  'self-end': 'align-self: flex-end;', 'self-center': 'align-self: center;',
  'self-stretch': 'align-self: stretch;', 'self-baseline': 'align-self: baseline;',
  // Visibility
  'visible': 'visibility: visible;', 'invisible': 'visibility: hidden;',
  'collapse': 'visibility: collapse;',
  // Overflow
  'overflow-auto': 'overflow: auto;', 'overflow-hidden': 'overflow: hidden;',
  'overflow-visible': 'overflow: visible;', 'overflow-scroll': 'overflow: scroll;',
  'overflow-x-auto': 'overflow-x: auto;', 'overflow-x-hidden': 'overflow-x: hidden;',
  'overflow-y-auto': 'overflow-y: auto;', 'overflow-y-hidden': 'overflow-y: hidden;',
  // Box sizing
  'box-border': 'box-sizing: border-box;', 'box-content': 'box-sizing: content-box;',
  // Object fit
  'object-contain': 'object-fit: contain;', 'object-cover': 'object-fit: cover;',
  'object-fill': 'object-fit: fill;', 'object-none': 'object-fit: none;',
  'object-scale-down': 'object-fit: scale-down;',
  // Font size
  'text-xs': 'font-size: 0.75rem /* 12px */; line-height: 1rem /* 16px */;',
  'text-sm': 'font-size: 0.875rem /* 14px */; line-height: 1.25rem /* 20px */;',
  'text-base': 'font-size: 1rem /* 16px */; line-height: 1.5rem /* 24px */;',
  'text-lg': 'font-size: 1.125rem /* 18px */; line-height: 1.75rem /* 28px */;',
  'text-xl': 'font-size: 1.25rem /* 20px */; line-height: 1.75rem /* 28px */;',
  'text-2xl': 'font-size: 1.5rem /* 24px */; line-height: 2rem /* 32px */;',
  'text-3xl': 'font-size: 1.875rem /* 30px */; line-height: 2.25rem /* 36px */;',
  'text-4xl': 'font-size: 2.25rem /* 36px */; line-height: 2.5rem /* 40px */;',
  'text-5xl': 'font-size: 3rem /* 48px */; line-height: 1;',
  'text-6xl': 'font-size: 3.75rem /* 60px */; line-height: 1;',
  'text-7xl': 'font-size: 4.5rem /* 72px */; line-height: 1;',
  'text-8xl': 'font-size: 6rem /* 96px */; line-height: 1;',
  'text-9xl': 'font-size: 8rem /* 128px */; line-height: 1;',
  // Font weight
  'font-thin': 'font-weight: 100;', 'font-extralight': 'font-weight: 200;',
  'font-light': 'font-weight: 300;', 'font-normal': 'font-weight: 400;',
  'font-medium': 'font-weight: 500;', 'font-semibold': 'font-weight: 600;',
  'font-bold': 'font-weight: 700;', 'font-extrabold': 'font-weight: 800;',
  'font-black': 'font-weight: 900;',
  // Font family
  'font-sans': "font-family: ui-sans-serif, system-ui, sans-serif;",
  'font-serif': "font-family: ui-serif, Georgia, serif;",
  'font-mono': "font-family: ui-monospace, monospace;",
  // Font style
  'italic': 'font-style: italic;', 'not-italic': 'font-style: normal;',
  // Text align
  'text-left': 'text-align: left;', 'text-center': 'text-align: center;',
  'text-right': 'text-align: right;', 'text-justify': 'text-align: justify;',
  'text-start': 'text-align: start;', 'text-end': 'text-align: end;',
  // Text decoration
  'underline': 'text-decoration-line: underline;', 'overline': 'text-decoration-line: overline;',
  'line-through': 'text-decoration-line: line-through;', 'no-underline': 'text-decoration-line: none;',
  // Text transform
  'uppercase': 'text-transform: uppercase;', 'lowercase': 'text-transform: lowercase;',
  'capitalize': 'text-transform: capitalize;', 'normal-case': 'text-transform: none;',
  // Line height
  'leading-none': 'line-height: 1;', 'leading-tight': 'line-height: 1.25;',
  'leading-snug': 'line-height: 1.375;', 'leading-normal': 'line-height: 1.5;',
  'leading-relaxed': 'line-height: 1.625;', 'leading-loose': 'line-height: 2;',
  // Letter spacing
  'tracking-tighter': 'letter-spacing: -0.05em;', 'tracking-tight': 'letter-spacing: -0.025em;',
  'tracking-normal': 'letter-spacing: 0em;', 'tracking-wide': 'letter-spacing: 0.025em;',
  'tracking-wider': 'letter-spacing: 0.05em;', 'tracking-widest': 'letter-spacing: 0.1em;',
  // Whitespace
  'whitespace-normal': 'white-space: normal;', 'whitespace-nowrap': 'white-space: nowrap;',
  'whitespace-pre': 'white-space: pre;', 'whitespace-pre-line': 'white-space: pre-line;',
  'whitespace-pre-wrap': 'white-space: pre-wrap;', 'whitespace-break-spaces': 'white-space: break-spaces;',
  // Word break
  'break-normal': 'overflow-wrap: normal; word-break: normal;',
  'break-words': 'overflow-wrap: break-word;', 'break-all': 'word-break: break-all;',
  'break-keep': 'word-break: keep-all;',
  // Text overflow
  'truncate': 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;',
  'text-ellipsis': 'text-overflow: ellipsis;', 'text-clip': 'text-overflow: clip;',
  // Border style
  'border-solid': 'border-style: solid;', 'border-dashed': 'border-style: dashed;',
  'border-dotted': 'border-style: dotted;', 'border-double': 'border-style: double;',
  'border-hidden': 'border-style: hidden;', 'border-none': 'border-style: none;',
  // Border width
  'border': 'border-width: 1px;', 'border-0': 'border-width: 0px;',
  'border-1': 'border-width: 1px;', 'border-2': 'border-width: 2px;',
  'border-4': 'border-width: 4px;', 'border-8': 'border-width: 8px;',
  'border-t': 'border-top-width: 1px;', 'border-r': 'border-right-width: 1px;',
  'border-b': 'border-bottom-width: 1px;', 'border-l': 'border-left-width: 1px;',
  'border-x': 'border-left-width: 1px; border-right-width: 1px;',
  'border-y': 'border-top-width: 1px; border-bottom-width: 1px;',
  // Border radius
  'rounded-none': 'border-radius: 0px;', 'rounded-sm': 'border-radius: 0.125rem /* 2px */;',
  'rounded': 'border-radius: 0.25rem /* 4px */;', 'rounded-md': 'border-radius: 0.375rem /* 6px */;',
  'rounded-lg': 'border-radius: 0.5rem /* 8px */;', 'rounded-xl': 'border-radius: 0.75rem /* 12px */;',
  'rounded-2xl': 'border-radius: 1rem /* 16px */;', 'rounded-3xl': 'border-radius: 1.5rem /* 24px */;',
  'rounded-full': 'border-radius: 9999px;',
  // Shadow
  'shadow-sm': 'box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);',
  'shadow': 'box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);',
  'shadow-md': 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);',
  'shadow-lg': 'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);',
  'shadow-xl': 'box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);',
  'shadow-2xl': 'box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);',
  'shadow-inner': 'box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);', 'shadow-none': 'box-shadow: 0 0 #0000;',
  // Container
  'container': 'width: 100%; (responsive max-width)',
  // Cursor
  'cursor-auto': 'cursor: auto;', 'cursor-default': 'cursor: default;',
  'cursor-pointer': 'cursor: pointer;', 'cursor-wait': 'cursor: wait;',
  'cursor-text': 'cursor: text;', 'cursor-move': 'cursor: move;',
  'cursor-help': 'cursor: help;', 'cursor-not-allowed': 'cursor: not-allowed;',
  'cursor-none': 'cursor: none;', 'cursor-grab': 'cursor: grab;',
  'cursor-grabbing': 'cursor: grabbing;',
  // User select
  'select-none': 'user-select: none;', 'select-text': 'user-select: text;',
  'select-all': 'user-select: all;', 'select-auto': 'user-select: auto;',
  // Pointer events
  'pointer-events-none': 'pointer-events: none;', 'pointer-events-auto': 'pointer-events: auto;',
  // Transitions
  'transition-none': 'transition-property: none;',
  'transition-all': 'transition-property: all; duration: 150ms; timing: cubic-bezier(0.4, 0, 0.2, 1);',
  'transition': 'transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter; duration: 150ms;',
  'transition-colors': 'transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; duration: 150ms;',
  'transition-opacity': 'transition-property: opacity; duration: 150ms;',
  'transition-shadow': 'transition-property: box-shadow; duration: 150ms;',
  'transition-transform': 'transition-property: transform; duration: 150ms;',
  // Transform
  'transform': 'transform: (enabled);', 'transform-gpu': 'transform: translateZ(0) (GPU accelerated);',
  'transform-none': 'transform: none;',
  // Aspect ratio
  'aspect-auto': 'aspect-ratio: auto;', 'aspect-square': 'aspect-ratio: 1 / 1;',
  'aspect-video': 'aspect-ratio: 16 / 9;',
  // Accessibility
  'sr-only': 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;',
  'not-sr-only': 'position: static; width: auto; height: auto; padding: 0; margin: 0; overflow: visible; clip: auto; white-space: normal;',
  // List style
  'list-none': 'list-style-type: none;', 'list-disc': 'list-style-type: disc;',
  'list-decimal': 'list-style-type: decimal;',
  'list-inside': 'list-style-position: inside;', 'list-outside': 'list-style-position: outside;',
  // Table display
  'inline-table': 'display: inline-table;', 'table-caption': 'display: table-caption;',
  'table-cell': 'display: table-cell;', 'table-column': 'display: table-column;',
  'table-column-group': 'display: table-column-group;', 'table-footer-group': 'display: table-footer-group;',
  'table-header-group': 'display: table-header-group;', 'table-row-group': 'display: table-row-group;',
  'table-row': 'display: table-row;',
  // Table layout
  'table-auto': 'table-layout: auto;', 'table-fixed': 'table-layout: fixed;',
  // Border collapse
  'border-collapse': 'border-collapse: collapse;', 'border-separate': 'border-collapse: separate;',
  // Caption side
  'caption-top': 'caption-side: top;', 'caption-bottom': 'caption-side: bottom;',
  // Float
  'float-left': 'float: left;', 'float-right': 'float: right;', 'float-none': 'float: none;',
  'float-start': 'float: inline-start;', 'float-end': 'float: inline-end;',
  // Clear
  'clear-left': 'clear: left;', 'clear-right': 'clear: right;',
  'clear-both': 'clear: both;', 'clear-none': 'clear: none;',
  'clear-start': 'clear: inline-start;', 'clear-end': 'clear: inline-end;',
  // Overscroll
  'overscroll-auto': 'overscroll-behavior: auto;', 'overscroll-contain': 'overscroll-behavior: contain;',
  'overscroll-none': 'overscroll-behavior: none;',
  'overscroll-x-auto': 'overscroll-behavior-x: auto;', 'overscroll-x-contain': 'overscroll-behavior-x: contain;',
  'overscroll-x-none': 'overscroll-behavior-x: none;',
  'overscroll-y-auto': 'overscroll-behavior-y: auto;', 'overscroll-y-contain': 'overscroll-behavior-y: contain;',
  'overscroll-y-none': 'overscroll-behavior-y: none;',
  // Overflow extensions
  'overflow-clip': 'overflow: clip;', 'overflow-x-clip': 'overflow-x: clip;',
  'overflow-y-clip': 'overflow-y: clip;', 'overflow-x-visible': 'overflow-x: visible;',
  'overflow-x-scroll': 'overflow-x: scroll;', 'overflow-y-visible': 'overflow-y: visible;',
  'overflow-y-scroll': 'overflow-y: scroll;',
  // Object position
  'object-bottom': 'object-position: bottom;', 'object-center': 'object-position: center;',
  'object-left': 'object-position: left;', 'object-left-bottom': 'object-position: left bottom;',
  'object-left-top': 'object-position: left top;', 'object-right': 'object-position: right;',
  'object-right-bottom': 'object-position: right bottom;', 'object-right-top': 'object-position: right top;',
  'object-top': 'object-position: top;',
  // Text wrap
  'text-wrap': 'text-wrap: wrap;', 'text-nowrap': 'text-wrap: nowrap;',
  'text-balance': 'text-wrap: balance;', 'text-pretty': 'text-wrap: pretty;',
  // Hyphens
  'hyphens-none': 'hyphens: none;', 'hyphens-manual': 'hyphens: manual;', 'hyphens-auto': 'hyphens: auto;',
  // Font smoothing
  'antialiased': '-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;',
  'subpixel-antialiased': '-webkit-font-smoothing: auto; -moz-osx-font-smoothing: auto;',
  // Text decoration style
  'decoration-solid': 'text-decoration-style: solid;', 'decoration-double': 'text-decoration-style: double;',
  'decoration-dotted': 'text-decoration-style: dotted;', 'decoration-dashed': 'text-decoration-style: dashed;',
  'decoration-wavy': 'text-decoration-style: wavy;',
  // Text decoration thickness
  'decoration-auto': 'text-decoration-thickness: auto;', 'decoration-from-font': 'text-decoration-thickness: from-font;',
  'decoration-0': 'text-decoration-thickness: 0px;', 'decoration-1': 'text-decoration-thickness: 1px;',
  'decoration-2': 'text-decoration-thickness: 2px;', 'decoration-4': 'text-decoration-thickness: 4px;',
  'decoration-8': 'text-decoration-thickness: 8px;',
  // Underline offset
  'underline-offset-auto': 'text-underline-offset: auto;', 'underline-offset-0': 'text-underline-offset: 0px;',
  'underline-offset-1': 'text-underline-offset: 1px;', 'underline-offset-2': 'text-underline-offset: 2px;',
  'underline-offset-4': 'text-underline-offset: 4px;', 'underline-offset-8': 'text-underline-offset: 8px;',
  // Content
  'content-none': "content: none;",
  // Mix blend (extended)
  'mix-blend-darken': 'mix-blend-mode: darken;', 'mix-blend-lighten': 'mix-blend-mode: lighten;',
  'mix-blend-color-dodge': 'mix-blend-mode: color-dodge;', 'mix-blend-color-burn': 'mix-blend-mode: color-burn;',
  'mix-blend-hard-light': 'mix-blend-mode: hard-light;', 'mix-blend-soft-light': 'mix-blend-mode: soft-light;',
  'mix-blend-difference': 'mix-blend-mode: difference;', 'mix-blend-exclusion': 'mix-blend-mode: exclusion;',
  'mix-blend-hue': 'mix-blend-mode: hue;', 'mix-blend-saturation': 'mix-blend-mode: saturation;',
  'mix-blend-color': 'mix-blend-mode: color;', 'mix-blend-luminosity': 'mix-blend-mode: luminosity;',
  'mix-blend-plus-darker': 'mix-blend-mode: plus-darker;', 'mix-blend-plus-lighter': 'mix-blend-mode: plus-lighter;',
  'mix-blend-normal': 'mix-blend-mode: normal;', 'mix-blend-multiply': 'mix-blend-mode: multiply;',
  'mix-blend-screen': 'mix-blend-mode: screen;', 'mix-blend-overlay': 'mix-blend-mode: overlay;',
  // Background blend
  'bg-blend-normal': 'background-blend-mode: normal;', 'bg-blend-multiply': 'background-blend-mode: multiply;',
  'bg-blend-screen': 'background-blend-mode: screen;', 'bg-blend-overlay': 'background-blend-mode: overlay;',
  'bg-blend-darken': 'background-blend-mode: darken;', 'bg-blend-lighten': 'background-blend-mode: lighten;',
  'bg-blend-color-dodge': 'background-blend-mode: color-dodge;', 'bg-blend-color-burn': 'background-blend-mode: color-burn;',
  'bg-blend-hard-light': 'background-blend-mode: hard-light;', 'bg-blend-soft-light': 'background-blend-mode: soft-light;',
  'bg-blend-difference': 'background-blend-mode: difference;', 'bg-blend-exclusion': 'background-blend-mode: exclusion;',
  'bg-blend-hue': 'background-blend-mode: hue;', 'bg-blend-saturation': 'background-blend-mode: saturation;',
  'bg-blend-color': 'background-blend-mode: color;', 'bg-blend-luminosity': 'background-blend-mode: luminosity;',
  // Will change
  'will-change-auto': 'will-change: auto;', 'will-change-scroll': 'will-change: scroll-position;',
  'will-change-contents': 'will-change: contents;', 'will-change-transform': 'will-change: transform;',
  // Animation
  'animate-none': 'animation: none;', 'animate-spin': 'animation: spin 1s linear infinite;',
  'animate-ping': 'animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;',
  'animate-pulse': 'animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;',
  'animate-bounce': 'animation: bounce 1s infinite;',
  // SVG stroke width
  'stroke-0': 'stroke-width: 0;', 'stroke-1': 'stroke-width: 1;', 'stroke-2': 'stroke-width: 2;',
  // Forced color adjust
  'forced-color-adjust-auto': 'forced-color-adjust: auto;', 'forced-color-adjust-none': 'forced-color-adjust: none;',
  // Filters (static)
  'blur-none': 'filter: ;', 'blur-xs': 'filter: blur(4px);',
  'blur-sm': 'filter: blur(8px);', 'blur-md': 'filter: blur(12px);',
  'blur-lg': 'filter: blur(16px);', 'blur-xl': 'filter: blur(24px);',
  'blur-2xl': 'filter: blur(40px);', 'blur-3xl': 'filter: blur(64px);',
  'grayscale': 'filter: grayscale(100%);', 'invert': 'filter: invert(100%);',
  'sepia': 'filter: sepia(100%);',
  // Drop shadow
  'drop-shadow-xs': 'filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.05));',
  'drop-shadow-sm': 'filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.15));',
  'drop-shadow-md': 'filter: drop-shadow(0 3px 3px rgb(0 0 0 / 0.12));',
  'drop-shadow-lg': 'filter: drop-shadow(0 4px 4px rgb(0 0 0 / 0.15));',
  'drop-shadow-xl': 'filter: drop-shadow(0 9px 7px rgb(0 0 0 / 0.1));',
  'drop-shadow-2xl': 'filter: drop-shadow(0 25px 25px rgb(0 0 0 / 0.15));',
  'drop-shadow-none': 'filter: drop-shadow(0 0 #0000);',
  // Backdrop (static)
  'backdrop-blur-none': 'backdrop-filter: ;', 'backdrop-blur-xs': 'backdrop-filter: blur(4px);',
  'backdrop-blur-sm': 'backdrop-filter: blur(8px);', 'backdrop-blur': 'backdrop-filter: blur(8px);',
  'backdrop-blur-md': 'backdrop-filter: blur(12px);', 'backdrop-blur-lg': 'backdrop-filter: blur(16px);',
  'backdrop-blur-xl': 'backdrop-filter: blur(24px);', 'backdrop-blur-2xl': 'backdrop-filter: blur(40px);',
  'backdrop-blur-3xl': 'backdrop-filter: blur(64px);',
  'backdrop-grayscale': 'backdrop-filter: grayscale(100%);', 'backdrop-grayscale-0': 'backdrop-filter: grayscale(0%);',
  'backdrop-invert': 'backdrop-filter: invert(100%);', 'backdrop-invert-0': 'backdrop-filter: invert(0%);',
  'backdrop-sepia': 'backdrop-filter: sepia(100%);', 'backdrop-sepia-0': 'backdrop-filter: sepia(0%);',
  // Ring offset
  'ring-offset-0': '--tw-ring-offset-width: 0px;', 'ring-offset-1': '--tw-ring-offset-width: 1px;',
  'ring-offset-2': '--tw-ring-offset-width: 2px;', 'ring-offset-4': '--tw-ring-offset-width: 4px;',
  'ring-offset-8': '--tw-ring-offset-width: 8px;',
};

// ── Pattern-based CSS resolver for dynamic utilities ────────────────

const SPACING_PROPS: Record<string, string> = {
  'p': 'padding', 'px': 'padding-left; padding-right', 'py': 'padding-top; padding-bottom',
  'pt': 'padding-top', 'pr': 'padding-right', 'pb': 'padding-bottom', 'pl': 'padding-left',
  'm': 'margin', 'mx': 'margin-left; margin-right', 'my': 'margin-top; margin-bottom',
  'mt': 'margin-top', 'mr': 'margin-right', 'mb': 'margin-bottom', 'ml': 'margin-left',
  'gap': 'gap', 'gap-x': 'column-gap', 'gap-y': 'row-gap',
  'space-x': '> * + * { margin-left', 'space-y': '> * + * { margin-top',
  'inset': 'inset', 'inset-x': 'left; right', 'inset-y': 'top; bottom',
  'top': 'top', 'right': 'right', 'bottom': 'bottom', 'left': 'left',
  'w': 'width', 'h': 'height', 'size': 'width; height',
  'min-w': 'min-width', 'max-w': 'max-width', 'min-h': 'min-height', 'max-h': 'max-height',
  'scroll-m': 'scroll-margin', 'scroll-mx': 'scroll-margin-left; scroll-margin-right',
  'scroll-my': 'scroll-margin-top; scroll-margin-bottom',
  'scroll-mt': 'scroll-margin-top', 'scroll-mr': 'scroll-margin-right',
  'scroll-mb': 'scroll-margin-bottom', 'scroll-ml': 'scroll-margin-left',
  'scroll-p': 'scroll-padding', 'scroll-px': 'scroll-padding-left; scroll-padding-right',
  'scroll-py': 'scroll-padding-top; scroll-padding-bottom',
  'scroll-pt': 'scroll-padding-top', 'scroll-pr': 'scroll-padding-right',
  'scroll-pb': 'scroll-padding-bottom', 'scroll-pl': 'scroll-padding-left',
  'translate-x': 'translate', 'translate-y': 'translate',
  'indent': 'text-indent',
  'border-spacing': 'border-spacing', 'border-spacing-x': 'border-spacing (x)',
  'border-spacing-y': 'border-spacing (y)',
};

const MAX_W_VALUES: Record<string, string> = {
  '0': '0rem', 'none': 'none', 'xs': '20rem /* 320px */', 'sm': '24rem /* 384px */',
  'md': '28rem /* 448px */', 'lg': '32rem /* 512px */', 'xl': '36rem /* 576px */',
  '2xl': '42rem /* 672px */', '3xl': '48rem /* 768px */', '4xl': '56rem /* 896px */',
  '5xl': '64rem /* 1024px */', '6xl': '72rem /* 1152px */', '7xl': '80rem /* 1280px */',
  'full': '100%', 'min': 'min-content', 'max': 'max-content', 'fit': 'fit-content',
  'prose': '65ch',
  'screen-sm': '640px', 'screen-md': '768px', 'screen-lg': '1024px',
  'screen-xl': '1280px', 'screen-2xl': '1536px',
};

/**
 * Resolve a Tailwind class name to its actual CSS.
 * Returns `null` if the class is not recognized.
 */
export function resolveTailwindCSS(className: string): string | null {
  // Strip responsive / state prefixes for lookup (e.g., sm:, hover:, dark:)
  const base = className.replace(/^(?:sm|md|lg|xl|2xl|hover|focus|active|disabled|dark|first|last|odd|even|group-hover|focus-within|focus-visible|placeholder|before|after|print|checked|required|invalid|valid|visited|empty|target|open|motion-safe|motion-reduce|portrait|landscape|ltr|rtl|file|marker|selection|backdrop|contrast-more|contrast-less|max-sm|max-md|max-lg|max-xl|max-2xl):/, '');

  // 1. Static lookup
  if (STATIC_CSS[base]) return STATIC_CSS[base];

  // 2. Opacity  opacity-{n}
  const opacityMatch = base.match(/^opacity-(\d+)$/);
  if (opacityMatch) return `opacity: ${Number(opacityMatch[1]) / 100};`;

  // 3. Z-index  z-{n|auto}
  const zMatch = base.match(/^z-(\d+|auto)$/);
  if (zMatch) return `z-index: ${zMatch[1]};`;

  // 4. Duration  duration-{n}
  const durMatch = base.match(/^duration-(\d+)$/);
  if (durMatch) return `transition-duration: ${durMatch[1]}ms;`;

  // 5. Delay  delay-{n}
  const delayMatch = base.match(/^delay-(\d+)$/);
  if (delayMatch) return `transition-delay: ${delayMatch[1]}ms;`;

  // 6. Scale  scale-{n}
  const scaleMatch = base.match(/^scale-(\d+)$/);
  if (scaleMatch) return `transform: scale(${Number(scaleMatch[1]) / 100});`;

  // 7. Rotate  rotate-{n}
  const rotMatch = base.match(/^rotate-(\d+)$/);
  if (rotMatch) return `transform: rotate(${rotMatch[1]}deg);`;

  // 8. Grid cols/rows  grid-cols-{n}  grid-rows-{n}
  const gridColMatch = base.match(/^grid-cols-(\d+)$/);
  if (gridColMatch) return `grid-template-columns: repeat(${gridColMatch[1]}, minmax(0, 1fr));`;
  const gridRowMatch = base.match(/^grid-rows-(\d+)$/);
  if (gridRowMatch) return `grid-template-rows: repeat(${gridRowMatch[1]}, minmax(0, 1fr));`;

  // 9. Col/row span  col-span-{n}  row-span-{n}
  const colSpanMatch = base.match(/^col-span-(\d+|full)$/);
  if (colSpanMatch) return colSpanMatch[1] === 'full' ? 'grid-column: 1 / -1;' : `grid-column: span ${colSpanMatch[1]} / span ${colSpanMatch[1]};`;
  const rowSpanMatch = base.match(/^row-span-(\d+|full)$/);
  if (rowSpanMatch) return rowSpanMatch[1] === 'full' ? 'grid-row: 1 / -1;' : `grid-row: span ${rowSpanMatch[1]} / span ${rowSpanMatch[1]};`;

  // 10. Columns  columns-{n}
  const colsMatch = base.match(/^columns-(\d+|auto)$/);
  if (colsMatch) return `columns: ${colsMatch[1]};`;

  // 11. Leading (line-height) with number  leading-{n}
  const leadingMatch = base.match(/^leading-(\d+)$/);
  if (leadingMatch) {
    const val = SPACING_MAP[leadingMatch[1]];
    return val ? `line-height: ${val};` : null;
  }

  // 12. Spacing utilities (p, m, gap, w, h, inset, etc.)
  // Try longest prefix first
  const spacingPrefixes = Object.keys(SPACING_PROPS).sort((a, b) => b.length - a.length);
  for (const prefix of spacingPrefixes) {
    if (base.startsWith(prefix + '-')) {
      const val = base.slice(prefix.length + 1);
      const prop = SPACING_PROPS[prefix];
      // max-w has special named values
      if (prefix === 'max-w' && MAX_W_VALUES[val]) return `${prop}: ${MAX_W_VALUES[val]};`;
      const resolved = SPACING_MAP[val];
      if (resolved) return `${prop}: ${resolved};`;
    }
  }

  // 13. Color utilities (text-, bg-, border-, ring-, etc. with color-shade)
  const colorPrefixes: Record<string, string> = {
    'text': 'color', 'bg': 'background-color', 'border': 'border-color',
    'ring': '--tw-ring-color', 'divide': 'border-color', 'outline': 'outline-color',
    'decoration': 'text-decoration-color', 'accent': 'accent-color',
    'fill': 'fill', 'stroke': 'stroke', 'shadow': '--tw-shadow-color',
    'placeholder': 'color', 'from': '--tw-gradient-from', 'via': '--tw-gradient-via',
    'to': '--tw-gradient-to', 'caret': 'caret-color', 'ring-offset': '--tw-ring-offset-color',
    'drop-shadow': '--tw-drop-shadow-color',
  };
  for (const [pre, prop] of Object.entries(colorPrefixes)) {
    if (base.startsWith(pre + '-')) {
      const rest = base.slice(pre.length + 1);
      if (['inherit', 'current', 'transparent', 'black', 'white'].includes(rest)) {
        const colorVal: Record<string, string> = {
          'inherit': 'inherit', 'current': 'currentColor',
          'transparent': 'transparent', 'black': '#000', 'white': '#fff',
        };
        return `${prop}: ${colorVal[rest]};`;
      }
      // color-shade pattern
      const colorShadeMatch = rest.match(/^(\w+)-(\d+)$/);
      if (colorShadeMatch) {
        return `${prop}: ${colorShadeMatch[1]}-${colorShadeMatch[2]}; /* Tailwind color */`;
      }
    }
  }

  // 14. Filter utilities  brightness-{n}, contrast-{n}, saturate-{n}, grayscale-{n}, invert-{n}, sepia-{n}, hue-rotate-{n}
  const filterPatterns: [RegExp, string, (n: string) => string][] = [
    [/^brightness-(\d+)$/, 'filter', n => `brightness(${n}%)`],
    [/^contrast-(\d+)$/, 'filter', n => `contrast(${n}%)`],
    [/^saturate-(\d+)$/, 'filter', n => `saturate(${n}%)`],
    [/^grayscale-(\d+)$/, 'filter', n => `grayscale(${n}%)`],
    [/^invert-(\d+)$/, 'filter', n => `invert(${n}%)`],
    [/^sepia-(\d+)$/, 'filter', n => `sepia(${n}%)`],
    [/^hue-rotate-(\d+)$/, 'filter', n => `hue-rotate(${n}deg)`],
    [/^backdrop-brightness-(\d+)$/, 'backdrop-filter', n => `brightness(${n}%)`],
    [/^backdrop-contrast-(\d+)$/, 'backdrop-filter', n => `contrast(${n}%)`],
    [/^backdrop-saturate-(\d+)$/, 'backdrop-filter', n => `saturate(${n}%)`],
    [/^backdrop-grayscale-(\d+)$/, 'backdrop-filter', n => `grayscale(${n}%)`],
    [/^backdrop-invert-(\d+)$/, 'backdrop-filter', n => `invert(${n}%)`],
    [/^backdrop-sepia-(\d+)$/, 'backdrop-filter', n => `sepia(${n}%)`],
    [/^backdrop-hue-rotate-(\d+)$/, 'backdrop-filter', n => `hue-rotate(${n}deg)`],
    [/^backdrop-opacity-(\d+)$/, 'backdrop-filter', n => `opacity(${Number(n) / 100})`],
  ];
  for (const [re, prop, fn] of filterPatterns) {
    const m = base.match(re);
    if (m) return `${prop}: ${fn(m[1])};`;
  }

  // 15. Translate  translate-x-{v}, translate-y-{v}
  const translateMatch = base.match(/^translate-([xy])-(.+)$/);
  if (translateMatch) {
    const axis = translateMatch[1];
    const val = SPACING_MAP[translateMatch[2]];
    if (val) return `transform: translate${axis.toUpperCase()}(${val});`;
  }

  // 16. Skew  skew-x-{n}, skew-y-{n}
  const skewMatch = base.match(/^skew-([xy])-(\d+)$/);
  if (skewMatch) return `transform: skew${skewMatch[1].toUpperCase()}(${skewMatch[2]}deg);`;

  // 17. Scale X/Y  scale-x-{n}, scale-y-{n}
  const scaleXYMatch = base.match(/^scale-([xy])-(\d+)$/);
  if (scaleXYMatch) return `transform: scale${scaleXYMatch[1].toUpperCase()}(${Number(scaleXYMatch[2]) / 100});`;

  // 18. Line clamp  line-clamp-{n}
  const lineClampMatch = base.match(/^line-clamp-(\d+|none)$/);
  if (lineClampMatch) {
    if (lineClampMatch[1] === 'none') return 'overflow: visible; display: block; -webkit-box-orient: horizontal; -webkit-line-clamp: none;';
    return `overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${lineClampMatch[1]};`;
  }

  // 19. Category fallback from detail map
  const detail = CLASS_DETAIL_MAP.get(base);
  if (detail) return `/* ${detail} */`;

  return null;
}
