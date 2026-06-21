import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
// daisyui (v5) is registered in src/app.css via @plugin "daisyui" + the "dossier" theme.

/** @type {import('tailwindcss').Config} */
export default {
	// Dark: align Tailwind `dark:` with DaisyUI `data-theme="dark"`. RTL: use logical properties; html[dir] from i18n.
	darkMode: ['selector', '[data-theme="dark"]'],
	content: ['./src/**/*.{html,js,svelte,ts}'],
	safelist: [
		{ pattern: /^btn-(xs|sm|md|lg)$/ },
		{ pattern: /^btn-(primary|secondary|ghost|outline|link)$/ },
		{ pattern: /^badge-(primary|secondary|accent|neutral)$/ },
		{ pattern: /^alert-(info|success|warning|error)$/ },
		{ pattern: /^loading-(spinner|dots|ring|ball)$/ }
	],
	theme: {
		extend: {
			screens: {
				xs: '475px',
				'3xl': '1920px'
			},
			colors: {
				// Field-dossier named palette (canonical). Mirror in src/app.css + the dossier DaisyUI theme.
				paper: '#ece7da',
				'paper-2': '#e3dcc9',
				ink: '#211f1a',
				olive: '#54583e',
				'olive-deep': '#3a3d2a',
				'stamp-red': '#a33028',
				'stamp-deep': '#832720',
				muted: '#6e6c5b',
				hairline: '#c9c2ae',
				brand: {
					DEFAULT: '#a33028', // stamp-red
					foreground: '#ece7da', // paper
					muted: '#6e6c5b', // muted
					contrast: '#211f1a' // ink
				},
				surface: {
					DEFAULT: '#ece7da', // paper
					elevated: '#e3dcc9', // paper-2
					muted: '#c9c2ae' // hairline
				}
			},
			fontFamily: {
				sans: [
					'IBM Plex Sans',
					'ui-sans-serif',
					'system-ui',
					'-apple-system',
					'Segoe UI',
					'Roboto',
					'Helvetica Neue',
					'Arial',
					'Noto Sans',
					'sans-serif'
				],
				mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
				serif: ['IBM Plex Serif', 'Georgia', 'serif']
			},
			fontSize: {
				'display-xs': ['1.25rem', { lineHeight: '1.75rem' }],
				'display-sm': ['1.5rem', { lineHeight: '2rem' }],
				'display-md': ['1.875rem', { lineHeight: '2.25rem' }],
				'display-lg': ['2.25rem', { lineHeight: '2.5rem' }]
			},
			boxShadow: {
				focus: '0 0 0 3px rgba(163, 48, 40, 0.35)'
			}
		}
	},
	plugins: [forms, typography]
};
