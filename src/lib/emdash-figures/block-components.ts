/**
 * Site-side renderers for the Figures plugin's Portable Text block types.
 *
 * EmDash auto-merges this `blockComponents` map into <PortableText> via the
 * plugin's `componentsEntry`. The map keys MUST match the block `_type`s
 * declared in plugin.ts. Each component receives the block as `Astro.props.node`.
 */
import Mermaid from './Mermaid.astro';
import MermaidCode from './MermaidCode.astro';
import FigureSvg from './FigureSvg.astro';

export const blockComponents = {
  code: MermaidCode,
  mermaid: Mermaid,
  figureSvg: FigureSvg,
};
