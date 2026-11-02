import { papers, type PageDoc } from './model';
import type { PaperSurface } from './design';

/** Resolve old documents and custom page faces identically in every renderer. */
export function paperSurface(doc:PageDoc,side:'left'|'right'='left'):PaperSurface {
  return doc.surfaces?.[side] || doc.surfaces?.left || {
    color:papers[doc.paper],
    pattern:doc.texture==='dots'?'dots':doc.texture==='lines'?'lines':doc.texture==='plain'?'plain':'grain',
  };
}
