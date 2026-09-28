import { t } from '$lib/i18n/de';
import type { PyError } from '$lib/sim/result';

const MESSAGES: Record<string, string> = t.pyErrors;

export function friendlyPyError(e: unknown): PyError {
	const raw = e instanceof Error ? e.message : String(e);
	const type =
		(e as { type?: string }).type ?? /(\w+(?:Error|Exception))\b/.exec(raw)?.[1] ?? 'Error';
	const lines = [...raw.matchAll(/File "<mission>", line (\d+)/g)];
	const line = lines.length > 0 ? Number(lines[lines.length - 1][1]) : null;
	return { type, line, message: MESSAGES[type] ?? t.pyErrors.default };
}
