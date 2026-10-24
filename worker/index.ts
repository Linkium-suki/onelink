import { Hono } from 'hono';
import type { AppEnv } from './types';
import { apiRoutes } from './routes/api';
import { handleShareGet, handleSharePost } from './routes/share';
import { htmlResponse } from './lib/http';
import { renderErrorPage, renderNotFoundPage } from './pages/views';

const app = new Hono<AppEnv>();

app.route('/api', apiRoutes);
app.get('/:code', handleShareGet);
app.post('/:code', handleSharePost);

app.notFound((c) => htmlResponse(renderNotFoundPage(), 404));

app.onError((error, c) => {
	console.error('Unhandled error:', error);
	if (c.req.path.startsWith('/api/')) {
		return c.json({ error: '服务器内部错误。' }, 500);
	}
	return htmlResponse(renderErrorPage(), 500);
});

export default app;
