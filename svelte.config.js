import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// adapter-node produces a standalone Node server (build/index.js) for the Docker/VPS deploy.
		// Runtime env (PORT, HOST, ORIGIN, BODY_SIZE_LIMIT) is read by the adapter at start — see Dockerfile.app / docker-compose.yml.
		adapter: adapter()
	}
};

export default config;
