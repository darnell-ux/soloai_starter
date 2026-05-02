/** Soft limits aligned with common SERP and social previews */
export const META_TITLE_MAX = 60;
export const META_DESCRIPTION_MAX = 160;

export function clampTitle(s: string, max = META_TITLE_MAX): string {
	if (s.length <= max) return s;
	return s.slice(0, max).trim();
}

export function clampDescription(s: string, max = META_DESCRIPTION_MAX): string {
	if (s.length <= max) return s;
	return s.slice(0, max).trim();
}
