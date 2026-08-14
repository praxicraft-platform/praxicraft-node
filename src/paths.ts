export function pathSegment(value: string, label = "id"): string {
  if (value == null) {
    throw new Error(`${label} is required`);
  }
  const text = String(value).trim();
  if (!text) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return encodeURIComponent(text);
}
