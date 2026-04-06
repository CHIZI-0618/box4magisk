export function ensureFieldVisible(target: HTMLElement) {
  const reveal = () => {
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const rect = target.getBoundingClientRect();
    const topSafe = 96;
    const bottomSafe = 20;

    if (rect.top < topSafe || rect.bottom > viewportHeight - bottomSafe) {
      target.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest',
      });
    }
  };

  requestAnimationFrame(reveal);
  window.setTimeout(reveal, 280);
}
