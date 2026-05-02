import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import daisyui from 'daisyui';

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
				brand: {
					DEFAULT: '#1d4ed8',
					foreground: '#f8fafc',
					muted: '#64748b',
					contrast: '#0f172a'
				},
				surface: {
					DEFAULT: '#ffffff',
					elevated: '#f8fafc',
					muted: '#f1f5f9'
				}
			},
			fontFamily: {
				sans: [
					'ui-sans-serif',
					'system-ui',
					'-apple-system',
					'Segoe UI',
					'Roboto',
					'Helvetica Neue',
					'Arial',
					'Noto Sans',
					'sans-serif'
				]
			},
			fontSize: {
				'display-xs': ['1.25rem', { lineHeight: '1.75rem' }],
				'display-sm': ['1.5rem', { lineHeight: '2rem' }],
				'display-md': ['1.875rem', { lineHeight: '2.25rem' }],
				'display-lg': ['2.25rem', { lineHeight: '2.5rem' }]
			},
			boxShadow: {
				focus: '0 0 0 3px rgba(29, 78, 216, 0.35)'
			}
		}
	},
	plugins: [forms, typography, daisyui],
	daisyui: {
		themes: ['light', 'dark'],
		darkTheme: 'dark',
		logs: false
	}
};
