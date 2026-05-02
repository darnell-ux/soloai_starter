module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', env('JWT_SECRET', 'your-secret-key')),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'your-salt-here'),
  },
  transferToken: {
    salt: env('TRANSFER_TOKEN_SALT', 'your-salt-here'),
  },
});