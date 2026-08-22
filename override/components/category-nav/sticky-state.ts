export function setStickyState(host: HTMLElement | null, stuck: boolean, onChange: () => void): void {
  if (!host) return;
  const changed = host.classList.contains('sc-is-stuck') !== stuck;
  host.classList.toggle('sc-is-stuck', stuck);
  if (changed) onChange();
}
