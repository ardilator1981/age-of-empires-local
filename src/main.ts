import './styles.css';
import { App } from './app/App';
import { isTouchDevice } from './core/constants';

// Interfaz táctil (también se activa con el primer toque en dispositivos híbridos)
if (isTouchDevice()) document.documentElement.classList.add('touch');

new App();
