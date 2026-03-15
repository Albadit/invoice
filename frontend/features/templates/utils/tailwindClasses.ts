/**
 * Tailwind CSS v4 dynamic IntelliSense for Monaco Editor.
 *
 * NO hardcoded class lists — completions are generated dynamically from:
 *   1. STATIC_CSS keys (the hover CSS reference map)
 *   2. Pattern-based generators for spacing / color utilities
 *
 * Validation is handled by the browser-based Tailwind v4 runtime
 * (`@tailwindcss/browser`), so we never reject unknown classes.
 */

// ── Spacing scale mapping → CSS rem values ─────────────────────────

const SPACING_MAP_STATIC: Record<string, string> = {
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

/**
 * Resolve a spacing value to CSS. In Tailwind v4 any integer/decimal is valid
 * via `calc(var(--spacing) * N)` where --spacing defaults to 0.25rem.
 */
function resolveSpacing(val: string): string | null {
  if (SPACING_MAP_STATIC[val]) return SPACING_MAP_STATIC[val];
  // Tailwind v4: any positive number is valid (integer or decimal)
  if (/^\d+(\.\d+)?$/.test(val)) {
    const n = Number(val);
    const rem = n * 0.25;
    const px = n * 4;
    return `${rem}rem /* ${px}px */`;
  }
  return null;
}

// ── Static CSS resolution map (used for hover + autocomplete) ──────

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

// Pre-compute keys once
const STATIC_CSS_KEYS = Object.keys(STATIC_CSS);

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

// ── Dynamic completion generator ────────────────────────────────────

const COLORS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
];
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

const COLOR_PREFIXES: Record<string, string> = {
  'text': 'Text Color', 'bg': 'Background Color', 'border': 'Border Color',
  'ring': 'Ring Color', 'divide': 'Divide Color', 'outline': 'Outline Color',
  'decoration': 'Decoration Color', 'accent': 'Accent Color',
  'fill': 'Fill', 'stroke': 'Stroke', 'shadow': 'Shadow Color',
  'from': 'Gradient From', 'via': 'Gradient Via', 'to': 'Gradient To',
  'caret': 'Caret Color', 'placeholder': 'Placeholder Color',
};

const SPACING_LABELS: Record<string, string> = {
  'p': 'Padding', 'px': 'Padding X', 'py': 'Padding Y',
  'pt': 'Padding Top', 'pr': 'Padding Right', 'pb': 'Padding Bottom', 'pl': 'Padding Left',
  'm': 'Margin', 'mx': 'Margin X', 'my': 'Margin Y',
  'mt': 'Margin Top', 'mr': 'Margin Right', 'mb': 'Margin Bottom', 'ml': 'Margin Left',
  'gap': 'Gap', 'gap-x': 'Column Gap', 'gap-y': 'Row Gap',
  'w': 'Width', 'h': 'Height', 'size': 'Size',
  'inset': 'Inset', 'top': 'Top', 'right': 'Right', 'bottom': 'Bottom', 'left': 'Left',
  'min-w': 'Min Width', 'max-w': 'Max Width', 'min-h': 'Min Height', 'max-h': 'Max Height',
};
const COMMON_SPACING = Object.keys(SPACING_MAP_STATIC);

/**
 * Generate Tailwind completions dynamically based on what the user is typing.
 * Returns `{ name, detail }` items capped at 200 for performance.
 */
export function generateCompletions(typed: string): { name: string; detail: string }[] {
  const results: { name: string; detail: string }[] = [];
  const lower = typed.toLowerCase();
  const cap = 200;

  // 1. Static classes from the CSS reference map
  for (const key of STATIC_CSS_KEYS) {
    if (results.length >= cap) return results;
    if (!lower || key.startsWith(lower) || key.includes(lower)) {
      results.push({ name: key, detail: STATIC_CSS[key] });
    }
  }

  // 2. Spacing utilities — only generate when typed prefix matches
  const spacingPrefixes = Object.keys(SPACING_LABELS).sort((a, b) => b.length - a.length);
  for (const prefix of spacingPrefixes) {
    if (results.length >= cap) return results;
    const prefixDash = prefix + '-';
    if (!lower || lower.startsWith(prefixDash) || prefixDash.startsWith(lower)) {
      for (const val of COMMON_SPACING) {
        if (results.length >= cap) return results;
        const name = `${prefix}-${val}`;
        if (!lower || name.startsWith(lower)) {
          results.push({ name, detail: SPACING_LABELS[prefix] });
        }
      }
    }
  }

  // 3. Color utilities — only generate when typed prefix matches
  const colorPrefixes = Object.keys(COLOR_PREFIXES).sort((a, b) => b.length - a.length);
  for (const prefix of colorPrefixes) {
    if (results.length >= cap) return results;
    const prefixDash = prefix + '-';
    if (!lower || lower.startsWith(prefixDash) || prefixDash.startsWith(lower)) {
      // Named colors first
      for (const special of ['inherit', 'current', 'transparent', 'black', 'white']) {
        if (results.length >= cap) return results;
        const name = `${prefix}-${special}`;
        if (!lower || name.startsWith(lower)) {
          results.push({ name, detail: COLOR_PREFIXES[prefix] });
        }
      }
      // Color-shade combos
      for (const color of COLORS) {
        if (results.length >= cap) return results;
        const colorPrefix = `${prefix}-${color}`;
        if (!lower || lower.startsWith(colorPrefix) || colorPrefix.startsWith(lower)) {
          for (const shade of SHADES) {
            if (results.length >= cap) return results;
            const name = `${colorPrefix}-${shade}`;
            if (!lower || name.startsWith(lower)) {
              results.push({ name, detail: COLOR_PREFIXES[prefix] });
            }
          }
        }
      }
    }
  }

  return results;
}

// ── Pattern-based CSS resolver (hover provider) ─────────────────────

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
    const val = resolveSpacing(leadingMatch[1]);
    return val ? `line-height: ${val};` : null;
  }

  // 12. Spacing utilities (p, m, gap, w, h, inset, etc.)
  const spacingPrefixes = Object.keys(SPACING_PROPS).sort((a, b) => b.length - a.length);
  for (const prefix of spacingPrefixes) {
    if (base.startsWith(prefix + '-')) {
      const val = base.slice(prefix.length + 1);
      const prop = SPACING_PROPS[prefix];
      if (prefix === 'max-w' && MAX_W_VALUES[val]) return `${prop}: ${MAX_W_VALUES[val]};`;
      const resolved = resolveSpacing(val);
      if (resolved) return `${prop}: ${resolved};`;
    }
  }

  // 13. Color utilities (text-, bg-, border-, ring-, etc. with color-shade)
  const colorProps: Record<string, string> = {
    'text': 'color', 'bg': 'background-color', 'border': 'border-color',
    'ring': '--tw-ring-color', 'divide': 'border-color', 'outline': 'outline-color',
    'decoration': 'text-decoration-color', 'accent': 'accent-color',
    'fill': 'fill', 'stroke': 'stroke', 'shadow': '--tw-shadow-color',
    'placeholder': 'color', 'from': '--tw-gradient-from', 'via': '--tw-gradient-via',
    'to': '--tw-gradient-to', 'caret': 'caret-color', 'ring-offset': '--tw-ring-offset-color',
    'drop-shadow': '--tw-drop-shadow-color',
  };
  for (const [pre, prop] of Object.entries(colorProps)) {
    if (base.startsWith(pre + '-')) {
      const rest = base.slice(pre.length + 1);
      if (['inherit', 'current', 'transparent', 'black', 'white'].includes(rest)) {
        const colorVal: Record<string, string> = {
          'inherit': 'inherit', 'current': 'currentColor',
          'transparent': 'transparent', 'black': '#000', 'white': '#fff',
        };
        return `${prop}: ${colorVal[rest]};`;
      }
      const colorShadeMatch = rest.match(/^(\w+)-(\d+)$/);
      if (colorShadeMatch) {
        return `${prop}: ${colorShadeMatch[1]}-${colorShadeMatch[2]}; /* Tailwind color */`;
      }
    }
  }

  // 14. Filter utilities
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
  ];
  for (const [re, prop, fn] of filterPatterns) {
    const m = base.match(re);
    if (m) return `${prop}: ${fn(m[1])};`;
  }

  // 15. Translate  translate-x-{v}, translate-y-{v}
  const translateMatch = base.match(/^translate-([xy])-(.+)$/);
  if (translateMatch) {
    const axis = translateMatch[1];
    const val = resolveSpacing(translateMatch[2]);
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

  return null;
}
