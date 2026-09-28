export const de = {
	app: {
		name: 'CodingLab',
		loading: 'Drohne startet …',
		loadFailed: 'Python konnte nicht geladen werden. Bitte App neu starten.'
	},
	workspace: {
		palette: 'Befehle',
		program: 'Dein Programm',
		python: 'Python',
		start: 'Start',
		reset: 'Zurück',
		emptyProgram: 'Tippe auf einen Befehl, um ihn hinzuzufügen.',
		remove: 'Entfernen',
		more: 'Mehr',
		less: 'Weniger',
		success: 'Geschafft!',
		full: 'Dein Programm ist voll.'
	},
	blocks: {
		takeoff: 'Abheben',
		land: 'Landen',
		forward: 'Vorwärts',
		turn_left: 'Links drehen',
		turn_right: 'Rechts drehen',
		pick_up: 'Paket nehmen',
		drop: 'Paket abgeben',
		photo: 'Foto',
		repeat: 'Wiederhole',
		if_obstacle: 'Wenn Hindernis'
	},
	stage: {
		label: 'Karte mit Drohne'
	},
	stops: {
		edge: 'Hoppla – hier ist die Karte zu Ende!',
		building: 'Autsch! Da steht ein Gebäude.',
		notFlying: 'Die Drohne muss zuerst abheben.',
		alreadyFlying: 'Die Drohne fliegt schon.',
		noParcel: 'Hier liegt kein Paket.',
		notCarrying: 'Du hast kein Paket dabei.',
		wrongDropSpot: 'Hier ist kein Abgabeplatz.',
		badNumber: 'Diese Zahl passt hier nicht.',
		unknownCommand: 'Diesen Befehl kennt die Drohne nicht.',
		tooManySteps: 'Deine Drohne fliegt endlos im Kreis!',
		timeout: 'Dein Programm läuft zu lange.'
	},
	pyErrors: {
		SyntaxError: 'Da stimmt die Schreibweise nicht.',
		IndentationError: 'Die Einrückung passt nicht.',
		NameError: 'Diesen Namen kenne ich nicht.',
		TypeError: 'Ein Befehl hat einen falschen Wert bekommen.',
		ZeroDivisionError: 'Durch 0 teilen geht nicht.',
		default: 'Da ist etwas schiefgelaufen.'
	},
	outcome: {
		stillFlying: 'Fast! Vergiss nicht zu landen.',
		missed: 'Knapp daneben – versuch es nochmal.'
	}
};

/** Contract for every language file (en.ts is added after UP6 and must satisfy this type). */
export type Messages = typeof de;
export const t: Messages = de;
export type StopCode = keyof Messages['stops'];
