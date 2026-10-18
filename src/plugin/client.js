window.__ModuleLoader__.load({
  id: 'dsh-switcher',
  factory(require) {
    const React = require('react');
    const { createPortal } = require('react-dom');
    /* BUILD_CORE */
    /* BUILD_MOTION */
    /* BUILD_HOST */
    /* BUILD_KEYBOARD */
    /* BUILD_VIEW */
    /* BUILD_CSS */
    const inject = ['slots', 'sidebarRight', 'sessions', 'uiWorkspace', 'uiSession', 'conversation', 'workspaces', 'theme'];
    function apply(ctx) {
      function Panel() {
        const anchor = React.useRef(null);
        React.useEffect(() => {
          const style = document.createElement('style'); style.dataset.dshSwitcher = 'true'; style.textContent = SWITCHER_CSS; document.head.append(style);
          const host = createHostAdapter(ctx);
          const mounted = mountSwitcher(anchor.current, host);
          return () => { mounted.destroy(); host.destroy(); style.remove(); };
        }, []);
        return createPortal(React.createElement('div', { ref: anchor, 'data-dsh-switcher-root': '' }), document.body);
      }
      ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'dsh-switcher', order: 1000 }, Panel)), 'dsh-switcher: overlay');
    }
    return { inject, apply };
  },
});
