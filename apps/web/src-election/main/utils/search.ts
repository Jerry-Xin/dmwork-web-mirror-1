export function getRandomSid() {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 6);
}
