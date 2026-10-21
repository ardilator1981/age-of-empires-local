import { artMode } from './assets';
import { Sheet } from './spriteSheet';

/**
 * Hojas de imágenes que no son de una unidad ni de un edificio: decoración del suelo, proyectiles,
 * escombros e iconos. Se cargan la primera vez que se piden; si no existen, el motor sigue con su
 * dibujo por código sin avisar (son opcionales).
 */
const props = new Map<string, Sheet | null>();

/** Hoja de public/sprites/<carpeta>/<id>.json, o null si no hay arte (o con ?arte=no). */
export function prop(folder: string, id: string): Sheet | null {
  const key = `${folder}/${id}`;
  let s = props.get(key);
  if (s === undefined) {
    s = typeof document === 'undefined' || artMode() === 'no' ? null : new Sheet(`sprites/${key}.json`, 'resource', true);
    props.set(key, s);
  }
  return s && s.ready ? s : null;
}
