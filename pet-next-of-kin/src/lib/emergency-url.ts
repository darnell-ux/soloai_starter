export function getEmergencyPageUrl(slug: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/e/${slug}`;
  }
  return `/e/${slug}`;
}
