import type { CSSProperties } from 'react';
import { papers, type PageDoc } from './model';

/** The closed cover and open binding share the saved cover's material. */
export function bookStyle(cover: PageDoc): CSSProperties {
  return {
    '--book-cloth': cover.surfaces?.left.color || papers[cover.paper],
    '--book-weave': cover.surfaces?.left.pattern === 'linen' ? '.12' : '.045',
  } as CSSProperties;
}
