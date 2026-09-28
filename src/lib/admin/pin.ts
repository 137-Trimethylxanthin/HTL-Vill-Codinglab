export const MAX_PIN = 8;

export function pressPinKey(value: string, key: string): string {
	if (key === 'back') return value.slice(0, -1);
	if (/^\d$/.test(key) && value.length < MAX_PIN) return value + key;
	return value;
}
