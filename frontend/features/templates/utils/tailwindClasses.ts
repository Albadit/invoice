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
  ...'block inline-block inline flex inline-flex grid inline-grid table hidden contents flow-root list-item'
    .split(' ').map(n => ({ name: n, detail: 'Display' })),
  // Position
  ...'static fixed absolute relative sticky'
    .split(' ').map(n => ({ name: n, detail: 'Position' })),
  // Overflow
  ...'overflow-auto overflow-hidden overflow-visible overflow-scroll overflow-x-auto overflow-x-hidden overflow-y-auto overflow-y-hidden'
    .split(' ').map(n => ({ name: n, detail: 'Overflow' })),
  // Object fit
  ...'object-contain object-cover object-fill object-none object-scale-down'
    .split(' ').map(n => ({ name: n, detail: 'Object Fit' })),
  // Box sizing
  { name: 'box-border', detail: 'Box Sizing' },
  { name: 'box-content', detail: 'Box Sizing' },
  // Isolation
  { name: 'isolate', detail: 'Isolation' },
  { name: 'isolation-auto', detail: 'Isolation' },
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
  ...'mix-blend-normal mix-blend-multiply mix-blend-screen mix-blend-overlay'
    .split(' ').map(n => ({ name: n, detail: 'Mix Blend Mode' })),
  // Backdrop blur
  ...'backdrop-blur-none backdrop-blur-sm backdrop-blur backdrop-blur-md backdrop-blur-lg backdrop-blur-xl backdrop-blur-2xl backdrop-blur-3xl'
    .split(' ').map(n => ({ name: n, detail: 'Backdrop Blur' })),
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
  ...'rotate-0 rotate-1 rotate-2 rotate-3 rotate-6 rotate-12 rotate-45 rotate-90 rotate-180'
    .split(' ').map(n => ({ name: n, detail: 'Rotate' })),
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
  ...'columns-1 columns-2 columns-3 columns-4 columns-5 columns-6 columns-7 columns-8 columns-9 columns-10 columns-11 columns-12 columns-auto'
    .split(' ').map(n => ({ name: n, detail: 'Columns' })),
  // Break
  ...'break-after-auto break-after-avoid break-after-page break-before-auto break-before-avoid break-before-page break-inside-auto break-inside-avoid break-inside-avoid-page'
    .split(' ').map(n => ({ name: n, detail: 'Break' })),
];

// ── Build the full list ────────────────────────────────────────────

export const TAILWIND_CLASSES: TailwindEntry[] = [
  ...LAYOUT,
  ...FLEXBOX,
  ...GRID,
  ...TYPOGRAPHY,
  ...BORDERS,
  ...EFFECTS,
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
];
