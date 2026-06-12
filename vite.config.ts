import 'dotenv/config';
import './src/lib/server/env.bootstrap';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['url', 'cookie', 'baseLocale']
		})
	],
	server: {
		port: 5173,
		// Avoid IPv6-only bind on some hosts (curl http://127.0.0.1:PORT then fails while localhost works).
		host: '127.0.0.1'
	},
	css: {
		devSourcemap: true
	}
	// Build profiling: `vite build --profile` (first-paint / UX metrics: add web-vitals in app code when needed)
});
