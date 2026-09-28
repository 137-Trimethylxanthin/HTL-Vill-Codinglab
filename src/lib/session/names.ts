const ADJECTIVES = [
	'Flinke',
	'Mutige',
	'Schlaue',
	'Wilde',
	'Coole',
	'Schnelle',
	'Fröhliche',
	'Tapfere'
];
const NOUNS = ['Hummel', 'Möwe', 'Rakete', 'Libelle', 'Schwalbe', 'Drohne', 'Eule', 'Biene'];

export const MAX_NAME = 16;

const pick = <T>(list: T[], rng: () => number) =>
	list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

export function randomPilotName(rng: () => number = Math.random): string {
	return `${pick(ADJECTIVES, rng)} ${pick(NOUNS, rng)}`;
}

export function sanitizeName(raw: string): string {
	return raw
		.replace(/[^A-Za-zÄÖÜäöüß \-]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, MAX_NAME)
		.trim();
}
