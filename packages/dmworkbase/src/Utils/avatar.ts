export function getFirstChar(name: string): string {
  if (!name) return '?';
  let ch: string;
  if (typeof (Intl as any)?.Segmenter === 'function') {
    const segmenter = new (Intl as any).Segmenter(undefined, {
      granularity: 'grapheme',
    });
    const first = segmenter.segment(name)[Symbol.iterator]().next();
    ch = first.done ? '' : first.value.segment;
  } else {
    ch = Array.from(name)[0] ?? '';
  }
  if (!ch) return '?';
  if (/^[a-zA-Z0-9]$/.test(ch)) return ch.toUpperCase();
  return ch;
}

export function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1},65%,55%), hsl(${h2},65%,45%))`;
}
