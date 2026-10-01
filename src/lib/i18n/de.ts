export const de = {
	app: {
		name: 'CodingLab',
		drone: 'Drohne',
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
		go: "Los geht's!",
		duo: 'Zu zweit spielen',
		duoHint: 'Einer tippt, einer sagt an – nach jeder Mission tauscht ihr.'
	},
	duo: {
		taps: (n: number) => `Spieler ${n} tippt`,
		says: (n: number) => `Spieler ${n} sagt an`,
		swap: 'Jetzt tauscht ihr!',
		start: 'Los geht’s zu zweit!'
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
			'Du steuerst hier echte Maschinen.',
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
	replay: {
		qrTitle: 'Scanne deinen Flug fürs Handy',
		title: 'Dein Flug bei CodingLab – HTL Villach',
		subtitle: 'So bist du mit deiner Drohne geflogen.',
		loading: 'Flug wird geladen …',
		missing: 'Hier ist kein Flug zu sehen. Scanne den QR-Code am Ende deines Besuchs nochmal.',
		home: 'Zuhause weiterprogrammieren',
		biber: 'Biber der Informatik – knifflige Rätsel zum Mitmachen',
		school: 'Mehr über die HTL Villach',
		replay: 'Nochmal abspielen',
		admin: 'Web-Version für den Flug zum Mitnehmen (QR-Code)',
		adminHint: 'Adresse, unter der die Web-Version liegt – leer lassen zum Ausschalten'
	},
	wall: {
		title: 'CodingLab – HTL Villach',
		subtitle: 'Programmier eine Drohne – gleich hier am Stand!',
		today: 'Heute geflogene Missionen',
		flight: 'Flug des Tages',
		example: 'Beispielflug',
		by: (name: string) => `geflogen von ${name}`,
		empty: 'Heute ist noch niemand geflogen – sei die Nummer 1!',
		admin: 'Wanddisplay (nur Zuschauen, keine Eingabe)'
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
		eventCode: 'Event-Code (auf allen Stationen gleich)',
		eventHint: 'Ohne Event-Code tauschen die Stationen keine Ergebnisse aus.',
		idleSeconds: 'Zurücksetzen nach Sekunden ohne Eingabe',
		fullscreen: 'Vollbild (Kiosk-Modus)',
		sound: 'Töne (Einrasten, Abheben, Geschafft)',
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
		updates: 'Updates',
		version: (v: string) => `Version ${v}`,
		checkUpdate: 'Nach Updates suchen',
		noUpdate: 'Die App ist aktuell.',
		updateUnreachable: 'Update-Server nicht erreichbar. Internet prüfen.',
		updateFound: (v: string) => `Update ${v} verfügbar.`,
		installUpdate: 'Update installieren',
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
		minutes: (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`,
		place: (n: number) => `Platz ${n}`,
		flown: (n: number) => `Heute: ${n} ${n === 1 ? 'Mission' : 'Missionen'} geflogen`
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
		deleteConfirm: 'Wirklich? Nochmal tippen. Andere Stationen schicken ihre Einträge wieder.',
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
		editNumber: 'Tippe auf eine Zahl. Dann kannst du sie ändern.',
		fresh: 'Neu!',
		guessAsk: 'Wo landet die Drohne? Tippe auf ein Feld!',
		guessSkip: 'Einfach starten',
		guessRight: 'Richtig vorhergesagt – du denkst wie ein Programmierer!',
		guessWrong: 'Die Drohne ist woanders gelandet als getippt. Schau, wo sie abbiegt!',
		step: 'Schritt für Schritt',
		nextStep: 'Nächster Schritt',
		flyRest: 'Rest fliegen',
		fixed: 'Fehler gefunden und repariert – wie echte Programmierer!',
		parentTip: 'Für Erwachsene',
		help: 'Hilfe',
		helpComing: 'Hilfe kommt!'
	},
	supervisor: {
		title: 'Betreuung',
		enterPin: 'PIN für die Betreuung',
		showSolution: 'Lösung zeigen',
		solutionHint: 'Zählt nicht für Sterne.',
		orderBlocks: 'Blöcke zum Ordnen',
		orderHint: 'Die Lösung gemischt. Höchstens 2 Sterne.',
		withSolution: 'Mit der Lösung geschafft. Probier die nächste Mission selbst!',
		goTo: 'Zu Mission …',
		clearHelp: 'Hilferuf beenden',
		nextVisitor: 'Nächster Besucher',
		nextConfirm: 'Wirklich? Nochmal tippen.',
		close: 'Schließen',
		helpOn: 'Hilfe wurde gerufen.',
		mission: (id: string, title: string) => `Mission ${id} · ${title}`,
		overview: 'Übersicht am Handy',
		overviewHint:
			'Mit dem Handy im selben Netz scannen. Zeigt alle Stationen, Hilferufe und wer schon lange an einer Mission sitzt.',
		overviewNeeds:
			'Für die Übersicht am Handy: Event-Code eintragen und speichern (Austausch muss an sein).',
		overviewNoAddress: 'Keine Netzwerk-Adresse gefunden. Ist die Station im Netz?'
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
		// The drone speaks for itself and takes the blame: kids read cold errors as their failure.
		edge: 'Hoppla! Hier hört die Karte auf – da konnte ich nicht weiter.',
		building: 'Autsch! Ich bin gegen ein Haus geflogen.',
		notFlying: 'Ich stehe noch am Boden – ich muss zuerst abheben.',
		alreadyFlying: 'Ich fliege doch schon!',
		noParcel: 'Ich habe hier kein Paket gefunden.',
		notCarrying: 'Ich habe gar kein Paket dabei.',
		wrongDropSpot: 'Hier ist kein Abgabeplatz für mein Paket.',
		badNumber: 'Mit dieser Zahl kann ich nichts anfangen.',
		unknownCommand: 'Diesen Befehl kenne ich nicht.',
		tooManySteps: 'Mir wird schwindlig – ich fliege endlos im Kreis!',
		// Block programs cannot loop forever, so a timeout is a slow computer, not the child's fault.
		timeout: 'Die Drohne hat zu lange gebraucht. Probier es nochmal!'
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
		stillFlying: 'Fast! Ich schwebe noch – sag mir, dass ich landen soll.',
		missed: 'Knapp daneben – ich bin nicht am Ziel gelandet. Probier es nochmal!',
		/** Which block it was, so the child knows where to look. */
		blame: (n: number, block: string) => `Das war Block ${n}: „${block}“.`
	}
};

/** Contract for every language file (en.ts is added after UP6 and must satisfy this type). */
export type Messages = typeof de;
export const t: Messages = de;
export type StopCode = keyof Messages['stops'];
