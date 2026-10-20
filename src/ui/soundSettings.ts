import type { AudioManager } from '../audio/AudioManager';

/** Controles de sonido (volúmenes y silencio), compartidos por los menús de escritorio y la interfaz móvil. */

const SLIDERS: [kind: 'master' | 'music' | 'effects' | 'alerts', label: string][] = [
  ['master', 'General'], ['music', 'Música'], ['effects', 'Efectos'], ['alerts', 'Alertas'],
];

const muteLabel = (a: AudioManager) => (a.settings.muted ? '🔇 Sonido desactivado' : '🔊 Sonido activado');

/** `mobile`: filas para la rejilla `.m-set` de los ajustes móviles; si no, bloque compacto para los menús. */
export function soundControlsHtml(a: AudioManager, mobile: boolean): string {
  const range = (kind: string, v: number) => `<input type="range" min="0" max="100" step="1" value="${Math.round(v * 100)}" data-snd="${kind}" aria-label="Volumen ${kind}">`;
  if (mobile) {
    return `<label>Sonido</label><div class="m-seg"><button class="${a.settings.muted ? '' : 'on'}" data-snd-mute>${muteLabel(a)}</button></div>`
      + SLIDERS.map(([k, l]) => `<label>${l}</label>${range(k, a.settings[k])}`).join('');
  }
  return `<div class="sound-set">
      <button class="small" data-snd-mute>${muteLabel(a)}</button>
      ${SLIDERS.map(([k, l]) => `<label>${l}</label>${range(k, a.settings[k])}`).join('')}
    </div>`;
}

/** Engancha los controles creados con `soundControlsHtml`. `onChange`: al cambiar el silencio (para refrescar botones). */
export function bindSoundControls(root: ParentNode, a: AudioManager, onChange?: () => void) {
  root.querySelectorAll<HTMLInputElement>('[data-snd]').forEach(el => {
    const kind = el.dataset.snd as 'master' | 'music' | 'effects' | 'alerts';
    el.addEventListener('input', () => {
      a.setVolume(kind, Number(el.value) / 100);
      onChange?.();
    });
    // Al soltar el control de efectos o alertas, una muestra para oír cómo queda
    if (kind === 'effects' || kind === 'alerts') el.addEventListener('change', () => a.preview(kind));
  });
  root.querySelectorAll<HTMLButtonElement>('[data-snd-mute]').forEach(b => {
    b.addEventListener('click', () => {
      a.toggleMute();
      b.textContent = muteLabel(a);
      b.classList.toggle('on', !a.settings.muted);
      onChange?.();
    });
  });
}
