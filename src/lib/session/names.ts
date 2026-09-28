// Every adjective + noun pair must fit MAX_NAME (tested).
export const ADJECTIVES = [
	'Flinke',
	'Mutige',
	'Schlaue',
	'Wilde',
	'Coole',
	'Schnelle',
	'Frohe',
	'Tapfere'
];
export const NOUNS = ['Hummel', 'Möwe', 'Rakete', 'Libelle', 'Taube', 'Drohne', 'Eule', 'Biene'];

export const MAX_NAME = 16;

const pick = <T>(list: T[], rng: () => number) =>
	list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

export function randomPilotName(rng: () => number = Math.random): string {
	return `${pick(ADJECTIVES, rng)} ${pick(NOUNS, rng)}`;
}

export function sanitizeName(raw: string): string {
	const name = raw
		.replace(/[^A-Za-zÄÖÜäöüß -]/g, '')
		.replace(/\s+/g, ' ')
		.replace(/^[\s-]+|[\s-]+$/g, '')
		.slice(0, MAX_NAME)
		.replace(/[\s-]+$/g, '');
	// A name needs at least one letter ("----" is not a name).
	return /\p{L}/u.test(name) ? name : '';
}
