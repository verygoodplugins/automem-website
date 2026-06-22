/**
 * EmDash Figures plugin
 *
 * Adds two custom Portable Text block types to the EmDash editor:
 *   - `mermaid`    — a Mermaid diagram (flowchart, pie, sequence, xychart, …)
 *   - `figureSvg`  — raw inline SVG, for hand-built on-brand figures
 *
 * Native, trusted plugin: PT blocks ship build-time Astro renderers
 * (`componentsEntry`), so this can't be sandboxed or installed at runtime.
 * It is wired in astro.config.mjs as:
 *
 *   {
 *     id: 'emdash-plugin-figures',
 *     version: '0.1.0',
 *     entrypoint:      <this file>,                 // declares the editor blocks
 *     componentsEntry: <./block-components.ts>,     // exports `blockComponents`
 *   }
 *
 * Site-side renderers live in ./Mermaid.astro and ./FigureSvg.astro.
 */
import { definePlugin } from 'emdash';

export function createPlugin() {
  return definePlugin({
    id: 'emdash-plugin-figures',
    version: '0.1.0',
    admin: {
      portableTextBlocks: [
        {
          type: 'mermaid',
          label: 'Mermaid Diagram',
          icon: 'code',
          description: 'Flowcharts, pie, sequence, xychart — rendered from Mermaid source.',
          fields: [
            {
              type: 'text_input',
              action_id: 'code',
              label: 'Mermaid source',
              multiline: true,
              placeholder: 'pie showData\n  "Dogs" : 60\n  "Cats" : 40',
            },
            { type: 'text_input', action_id: 'caption', label: 'Caption (optional)' },
          ],
        },
        {
          type: 'figureSvg',
          label: 'Inline SVG / Figure',
          icon: 'code',
          description: 'Paste raw SVG markup for an on-brand inline, theme-able figure.',
          fields: [
            {
              type: 'text_input',
              action_id: 'svg',
              label: 'SVG markup',
              multiline: true,
              placeholder: '<svg viewBox="0 0 800 470">…</svg>',
            },
            { type: 'text_input', action_id: 'alt', label: 'Alt text (accessibility)' },
            { type: 'text_input', action_id: 'caption', label: 'Caption (optional)' },
          ],
        },
      ],
    },
  });
}

export default createPlugin;
