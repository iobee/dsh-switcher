'use strict';
window.StatusStudy = {
  styles: new Map(),
  register(style) {
    if (!style.id || typeof style.draw !== 'function') throw new Error('Invalid motion style');
    this.styles.set(style.id, style);
  }
};
