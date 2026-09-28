export const de = {
	app: {
		name: 'CodingLab',
		loading: 'Drohne startet …',
		loadFailed: 'Python konnte nicht geladen werden. Bitte App neu starten.'
	},
	attract: {
		school: 'HTL Villach',
		title: 'Programmier eine Drohne!',
		subtitle: 'Mit echtem Python. Ganz ohne Tippen.',
		tap: 'Tippe zum Starten'
	},
	pilot: {
		title: 'Wie heißt du?',
		placeholder: 'Dein Name',
		random: 'Anderer Name',
		own: 'Eigener Name',
		space: 'Leerzeichen',
		delete: 'Löschen',
		done: 'Fertig',
		go: "Los geht's!"
	},
	map: {
		pilot: 'Pilot',
		finish: 'Fertig',
		levels: ['Level 1 · Befehle', 'Level 2 · Schleifen', 'Level 3 · Sensoren']
	},
	complete: {
		perfect: 'Perfekt!',
		great: 'Super gemacht!',
		done: 'Geschafft!',
		next: 'Nächste Mission',
		map: 'Zur Karte',
		promoTitle: 'An der HTL Villach',
		promo: [
			'Du lernst, echte Maschinen zu steuern.',
			'Hier baust du Roboter, Apps und Spiele.',
			'Sensoren, Drohnen, Elektronik: Das ist dein Alltag hier.'
		]
	},
	finale: {
		title: (name: string) => `Super, ${name}!`,
		solved: (count: number) =>
			`Du hast ${count} ${count === 1 ? 'Mission' : 'Missionen'} geschafft.`,
		qrTitle: 'Mehr über die HTL Villach',
		qrHint: 'Scanne den Code mit deinem Handy.',
		again: 'Nächster Pilot'
	},
	idle: {
		title: 'Bist du noch da?',
		continue: 'Ja, weiter!'
	},
	admin: {
		title: 'Admin',
		setupTitle: 'Admin-PIN festlegen',
		setupHint: 'Diese PIN schützt die Einstellungen. 4 bis 8 Ziffern.',
		confirmTitle: 'PIN wiederholen',
		enterTitle: 'Admin-PIN eingeben',
		mismatch: 'Die PINs sind verschieden. Nochmal.',
		ok: 'OK',
		station: 'Station',
		stationName: 'Name der Station',
		eventCode: 'Event-Code (optional)',
		idleSeconds: 'Zurücksetzen nach Sekunden ohne Eingabe',
		missions: 'Missionen',
		qrUrl: 'Link im QR-Code',
		mail: 'E-Mail',
		smtpHost: 'SMTP-Server',
		smtpPort: 'Port',
		smtpStarttls: 'STARTTLS verwenden',
		smtpUser: 'Benutzername',
		smtpPassword: 'Passwort',
		smtpPasswordSet: 'Passwort gespeichert – leer lassen zum Behalten',
		smtpFrom: 'Absender (z. B. CodingLab <lab@htl-villach.at>)',
		testTo: 'Test-Mail an',
		testSend: 'Test-Mail senden',
		testOk: 'Test-Mail wurde gesendet.',
		emails: 'Gespeicherte E-Mails',
		emailsCount: (n: number) => `${n} Adresse${n === 1 ? '' : 'n'} mit Einwilligung`,
		export: 'Als CSV exportieren',
		exported: (path: string) => `Gespeichert: ${path}`,
		deleteAll: 'Alle löschen',
		deleteConfirm: 'Wirklich alle löschen? Nochmal tippen.',
		deleted: (n: number) => `${n} gelöscht.`,
		changePin: 'PIN ändern',
		newPin: 'Neue PIN',
		save: 'Speichern',
		saved: 'Gespeichert.',
		close: 'Schließen',
		wrongPin: 'Die PIN stimmt nicht.',
		webHint: 'Browser-Version: E-Mail und Zertifikat gibt es nur in der App.'
	},
	certificate: {
		button: 'Zertifikat speichern',
		saved: 'Gespeichert! Frag am Stand nach dem Ausdruck.',
		failed: 'Das Zertifikat ging nicht. Frag bitte am Stand.'
	},
	email: {
		button: 'Per E-Mail senden',
		title: 'Deine E-Mail-Adresse',
		consent: 'Die HTL Villach darf mir Infos schicken.',
		send: 'Senden',
		cancel: 'Abbrechen',
		sending: 'Wird gesendet …',
		sent: 'Gesendet! Schau in dein Postfach.',
		invalid: 'Diese Adresse stimmt nicht.',
		failed: 'Senden ging nicht. Frag bitte am Stand.'
	},
	leaderboard: {
		button: 'Bestenliste',
		title: 'Bestenliste von heute',
		empty: 'Du bist heute die Nummer 1!',
		you: 'Du',
		close: 'Schließen',
		minutes: (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`
	},
	logbook: {
		title: 'Logbuch',
		visitors: (n: number, finished: number) => `${n} Besuche, ${finished} bis zum Ende`,
		perDay: 'Pro Tag',
		perYear: 'Pro Jahr',
		perMission: 'Missionen',
		missionRow: (m: {
			id: string;
			attempts: number;
			solved: number;
			avgStars: number;
			avgSeconds: number;
		}) =>
			`${m.id}: ${m.solved}/${m.attempts} geschafft · Ø ${m.avgStars} Sterne · Ø ${m.avgSeconds} s`,
		dropOff: 'Hier hören Besucher auf',
		peers: 'Stationen im Netz',
		noPeers: 'Keine anderen Stationen gefunden.',
		peerRow: (name: string, address: string, ok: boolean) =>
			`${name || '?'} · ${address} · ${ok ? 'verbunden' : 'wartet'}`,
		retention: 'Namen löschen nach Tagen',
		manualPeers: 'Stationen von Hand (IP[:Port], mit Komma)',
		export: 'Verlauf als CSV exportieren',
		delete: 'Verlauf dieser Station löschen',
		deleteConfirm: 'Wirklich? Nochmal tippen. Andere Stationen behalten ihre Kopie.',
		deleted: (n: number) => `${n} Einträge gelöscht.`
	},
	workspace: {
		palette: 'Befehle',
		program: 'Dein Programm',
		python: 'Python',
		showProgram: 'Blöcke',
		showPython: 'Python',
		start: 'Start',
		stop: 'Stopp',
		speed: 'Schneller',
		reset: 'Zurück',
		back: 'Karte',
		skip: 'Überspringen',
		emptyProgram: 'Tippe oder zieh einen Befehl hierher.',
		remove: 'Entfernen',
		more: 'Mehr',
		less: 'Weniger',
		success: 'Geschafft!',
		full: 'Dein Programm ist voll. Lösch einen Block.',
		else: 'sonst',
		dropHere: 'Hier hineinziehen',
		trashHint: 'Zieh Blöcke hierher. Dann sind sie weg.',
		next: 'Weiter',
		prevMission: 'Vorige Mission',
		nextMission: 'Nächste Mission',
		editNumber: 'Tippe auf eine Zahl. Dann kannst du sie ändern.'
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
	coach: {
		ask: 'Hilf mir'
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
		timeout: 'Deine Drohne fliegt endlos im Kreis!'
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
		missed: 'Knapp daneben. Probier es nochmal.'
	}
};

/** Contract for every language file (en.ts is added after UP6 and must satisfy this type). */
export type Messages = typeof de;
export const t: Messages = de;
export type StopCode = keyof Messages['stops'];
