export function securityHeaders(): Record<string, string> {
	return {
		'x-content-type-options': 'nosniff',
		'referrer-policy': 'strict-origin-when-cross-origin',
	};
}

export function htmlResponse(markup: string, status = 200): Response {
	return new Response(markup, {
		status,
		headers: {
			'content-type': 'text/html; charset=utf-8',
			...securityHeaders(),
			'content-security-policy': [
				"default-src 'self'",
				"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
				"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
				"img-src 'self' data:",
				"media-src 'self'",
				"object-src 'self'",
				"frame-src 'self'",
				"connect-src 'self'",
				"base-uri 'none'",
				"form-action 'self'",
				"frame-ancestors 'none'",
			].join('; '),
		},
	});
}
