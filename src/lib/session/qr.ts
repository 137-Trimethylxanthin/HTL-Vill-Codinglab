import QRCode from 'qrcode';

export function qrDataUrl(text: string): Promise<string> {
	return QRCode.toDataURL(text, {
		margin: 1,
		width: 512,
		errorCorrectionLevel: 'M',
		color: { dark: '#0f172a', light: '#ffffff' }
	});
}
