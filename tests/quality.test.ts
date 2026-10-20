import { describe, expect, it } from 'vitest';
import { QualityManager } from '../src/render/quality';

function feed(q: QualityManager, fps: number, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / fps) q.frame(1 / fps);
}

describe('calidad automática', () => {
  it('baja un nivel si los FPS se quedan por debajo de 30 y vuelve a subir si sobran', () => {
    let changes = 0;
    const q = new QualityManager('auto', false, true, () => changes++);
    expect(q.level).toBe('medium');
    feed(q, 20, 4);
    expect(q.level).toBe('low');
    feed(q, 20, 4);
    expect(q.level).toBe('low');
    // Sube un nivel cada vez, y no antes de 20 s desde el último cambio (para no oscilar)
    feed(q, 60, 25);
    expect(q.level).toBe('medium');
    expect(changes).toBe(2);
    feed(q, 60, 25);
    expect(q.level).toBe('high');
  });

  it('con calidad fija no cambia sola; el ahorro de batería limita a 30 FPS y quita efectos', () => {
    const q = new QualityManager('high', false, false, () => {});
    feed(q, 15, 5);
    expect(q.level).toBe('high');
    q.set('high', true);
    expect(q.fpsCap).toBe(30);
    expect(q.profile.shadows).toBe(false);
    expect(q.profile.maxDpr).toBeLessThanOrEqual(1.25);
    q.set('auto', true);
    feed(q, 30, 30);
    expect(q.level).not.toBe('high');
  });
});
