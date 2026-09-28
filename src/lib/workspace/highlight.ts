export type TokenKind = 'keyword' | 'number' | 'string' | 'comment' | 'call' | 'text';
export interface Token {
	kind: TokenKind;
	text: string;
}

const KEYWORDS = new Set([
	'from',
	'import',
	'for',
	'in',
	'if',
	'elif',
	'else',
	'while',
	'def',
	'return',
	'pass',
	'and',
	'or',
	'not',
	'True',
	'False',
	'None',
	'break',
	'continue'
]);

const TOKEN =
	/(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)|([\s\S])/g;

export function tokenizeLine(line: string): Token[] {
	const tokens: Token[] = [];
	const push = (kind: TokenKind, text: string) => {
		const last = tokens[tokens.length - 1];
		if (kind === 'text' && last?.kind === 'text') last.text += text;
		else tokens.push({ kind, text });
	};
	for (const m of line.matchAll(TOKEN)) {
		if (m[1]) push('comment', m[1]);
		else if (m[2]) push('string', m[2]);
		else if (m[3]) push('number', m[3]);
		else if (m[4]) push(KEYWORDS.has(m[4]) ? 'keyword' : 'call', m[4]);
		else if (m[5]) push(KEYWORDS.has(m[5]) ? 'keyword' : 'text', m[5]);
		else push('text', m[6]);
	}
	return tokens;
}
