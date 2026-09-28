import { describe, expect, it } from 'vitest';
import { qrDataUrl } from './qr';

describe('qrDataUrl', () => {
	it('encodes a URL as a PNG data URL', async () => {
		const url = await qrDataUrl('https://www.htl-villach.at');
		expect(url.startsWith('data:image/png;base64,')).toBe(true);
		expect(url.length).toBeGreaterThan(200);
	});
});
