import type { Cost, Order, Pt } from '../core/types';

export type EntityKind = 'unit' | 'building' | 'resource';

export interface QueueItem {
  kind: 'unit' | 'tech';
  id: string;
  /** Duración total en segundos. */
  time: number;
  /** 0..1 */
  progress: number;
  cost: Cost;
}

export interface Rally { x: number; y: number; targetId?: number }

/**
 * Una entidad del mundo. Para mantenerlo simple todas comparten la misma clase;
 * los campos que no aplican a un tipo simplemente no se usan.
 * Coordenadas en casillas (float). Para edificios y recursos (x, y) es el centro.
 */
export class Entity {
  x = 0;
  y = 0;
  /** Posición del tick anterior (para interpolar el render). */
  px = 0;
  py = 0;
  hp = 1;
  maxHp = 1;
  dead = false;
  radius = 0.22;

  // --- unidades
  order: Order | null = null;
  path: Pt[] = [];
  pathFor = 0;
  nextRepath = 0;
  /** Segundos sin avanzar pese a tener camino. */
  stuck = 0;
  /** Objetivo marcado como inalcanzable hasta cierto instante (evita recalcular A*). */
  unreachableFor = 0;
  unreachableUntil = 0;
  carry: { type: string; amount: number } | null = null;
  cooldown = 0;
  facing = 1;
  moving = false;
  working = false;
  attackAnim = 0;
  scanAt = 0;

  // --- edificios y recursos (huella en casillas)
  tx = 0;
  ty = 0;
  size = 1;
  complete = true;
  progress = 1;
  queue: QueueItem[] = [];
  rally: Rally | null = null;

  // --- recolectable (nodos de recurso y granjas)
  resType: string | null = null;
  amount = 0;
  initialAmount = 0;
  gatherRate = 0;

  variant = Math.random();
  lastHitAt = -999;
  /** Almacén libre para mods. */
  data: Record<string, any> = {};

  constructor(
    public id: number,
    public kind: EntityKind,
    public defId: string,
    public owner: number,
  ) {}
}
