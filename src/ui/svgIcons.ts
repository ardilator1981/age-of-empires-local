/** Iconos de recursos dibujados en SVG (sustituyen a los emojis en la interfaz). */

const svg = (body: string) => `<svg class="ri" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

export const ICONS = {
  food: svg(`<path d="M14 3c4 0 7 3 7 7 0 5-6 9-11 9-2 0-3-1-3-3 0-5 3-13 7-13z" fill="#b3402a" stroke="#3a120a" stroke-width="1.2"/>
    <path d="M15 6c2 0 4 2 4 4" stroke="#ec9070" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M8 16l-4 3" stroke="#5a4a30" stroke-width="3.4" stroke-linecap="round"/><path d="M8 16l-4 3" stroke="#f2ead8" stroke-width="2" stroke-linecap="round"/>
    <circle cx="3.4" cy="20.4" r="1.7" fill="#f2ead8" stroke="#5a4a30" stroke-width=".8"/><circle cx="2.6" cy="18.2" r="1.5" fill="#f2ead8" stroke="#5a4a30" stroke-width=".8"/>`),
  wood: svg(`<g stroke="#3a2410" stroke-width="1"><rect x="2" y="13" width="16" height="6.5" rx="3.2" fill="#8b5a2b"/><rect x="5" y="6" width="16" height="6.5" rx="3.2" fill="#a06c36"/>
    <circle cx="17.5" cy="16.2" r="3.2" fill="#d9b07a"/><circle cx="20.5" cy="9.2" r="3.2" fill="#e6c08a"/></g>
    <circle cx="17.5" cy="16.2" r="1.3" fill="none" stroke="#a07040" stroke-width=".7"/><circle cx="20.5" cy="9.2" r="1.3" fill="none" stroke="#a07040" stroke-width=".7"/>`),
  gold: svg(`<g stroke="#6a4a08" stroke-width="1" stroke-linejoin="round"><path d="M2 19l3-6 6 1 2 5z" fill="#e0ac18"/><path d="M10 19l2-7 7-1 3 8z" fill="#f2c62e"/><path d="M6 12l3-7 6 1 1 6-5 1z" fill="#ffd94a"/></g>
    <path d="M9 8l2-1M14 13l2-1M5 16l1.5-1" stroke="#fff6c0" stroke-width="1.3" stroke-linecap="round"/>`),
  stone: svg(`<g stroke="#2e2e2e" stroke-width="1" stroke-linejoin="round"><path d="M2 19l3-7 6-1 3 8z" fill="#8a8a8a"/><path d="M10 19l3-8 7 0 2 8z" fill="#a4a4a4"/><path d="M6 11l3-6 6 0 2 6-6 1z" fill="#c2c2c2"/></g>
    <path d="M9 7h3M14 13h3" stroke="#f2f2f2" stroke-width="1.2" stroke-linecap="round"/>`),
  pop: svg(`<g stroke="#2a1a0a" stroke-width="1"><circle cx="9" cy="7" r="3.4" fill="#e6b98f"/><path d="M3 21c0-6 3-9 6-9s6 3 6 9z" fill="#4a7ac8"/>
    <circle cx="16" cy="8" r="3" fill="#d9a67a"/><path d="M12 21c0-5 2-8 4.5-8S21 16 21 21z" fill="#c84a3a"/></g>`),
};
