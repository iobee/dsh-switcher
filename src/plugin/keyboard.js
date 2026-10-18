// Keep the complete hold/release gesture in the document. DSH's native
// shortcut forwarding consumes Tab; on the tested host that also loses the
// subsequent Control keyup. Registering Ctrl+Tab there breaks this gesture.
export function installSwitcherKeyboard(target, controller, blocked = () => false) {
  const consume = event => { event.preventDefault(); event.stopImmediatePropagation(); };
  function down(event) {
    if (!controller.active) {
      if (controller.composing || event.isComposing || event.keyCode === 229 ||
          event.key !== 'Tab' || !event.ctrlKey || event.altKey || event.metaKey || blocked()) return;
      consume(event);
      if (!event.repeat) controller.begin(event.shiftKey ? -1 : 1);
      return;
    }
    if (event.isComposing || event.keyCode === 229) { controller.cancel(); return; }
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;
    consume(event);
    if (event.key === 'Escape') controller.cancel();
    else if (event.key === 'Enter') controller.commit();
    else if (event.key === 'Tab' || event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      if (!event.repeat) controller.begin(event.key === 'ArrowLeft' || event.shiftKey ? -1 : 1, controller.simulated);
    }
  }
  function up(event) {
    // Read the logical modifier state, independent of the physical key or
    // system remapping. Releasing one of two held Control keys keeps cycling.
    if (controller.active && !controller.simulated && !event.ctrlKey) {
      consume(event); controller.commit();
    }
  }
  const options = { capture: true };
  target.addEventListener('keydown', down, options);
  target.addEventListener('keyup', up, options);
  return () => {
    target.removeEventListener('keydown', down, options);
    target.removeEventListener('keyup', up, options);
  };
}
