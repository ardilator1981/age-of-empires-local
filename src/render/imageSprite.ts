import type { SpriteFn } from '../core/types';

export interface ImageSpriteOptions {
  /** Tamaño con el que se dibuja la imagen a zoom 1 (píxeles). */
  width: number;
  height: number;
  /** Punto de la imagen que coincide con los pies de la unidad / centro del edificio. */
  anchorX: number;
  anchorY: number;
  /** Voltear horizontalmente cuando la unidad mira a la izquierda. */
  flip?: boolean;
}

/**
 * Crea un sprite a partir de una imagen (PNG, SVG...). Útil para sustituir los
 * dibujos procedurales por arte propio. Pon la imagen en `public/` y usa su ruta:
 *
 *   reg.addSprite('mi-caballero', imageSprite('/sprites/caballero.png', { width: 48, height: 48, anchorX: 24, anchorY: 44, flip: true }));
 */
export function imageSprite(url: string, o: ImageSpriteOptions): SpriteFn {
  if (typeof Image === 'undefined') return () => {}; // simulación sin navegador
  const img = new Image();
  img.src = url;
  return s => {
    if (!img.complete || !img.naturalWidth) return;
    const { ctx, x, y, z } = s;
    const flip = o.flip && (s.entity?.facing ?? 1) < 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -z : z, z);
    ctx.drawImage(img, -o.anchorX, -o.anchorY, o.width, o.height);
    ctx.restore();
  };
}
