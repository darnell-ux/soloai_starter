module.exports = ({ env }) => ({
	upload: {
		config: {
			sizeLimit: 5 * 1024 * 1024
		}
	},
	// Email via SMTP relay (Brevo). Credentials come from env — set SMTP_USERNAME
	// and SMTP_PASSWORD in .env from the Brevo SMTP dashboard. Until they are set,
	// Strapi boots fine but email send is a no-op/failure (Strapi email is not on
	// the critical path for this deployment).
	email: {
		config: {
			provider: 'nodemailer',
			providerOptions: {
				host: env('SMTP_HOST', 'smtp-relay.brevo.com'),
				port: env.int('SMTP_PORT', 587),
				secure: false,
				auth: {
					user: env('SMTP_USERNAME'),
					pass: env('SMTP_PASSWORD')
				}
			},
			settings: {
				defaultFrom: env('SMTP_FROM', 'no-reply@taxnexusapp.com'),
				defaultReplyTo: env('SMTP_REPLY_TO', 'no-reply@taxnexusapp.com')
			}
		}
	}
});
