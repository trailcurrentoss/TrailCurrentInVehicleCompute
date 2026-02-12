const bcrypt = require('bcryptjs');

// Auto-generate bcrypt hash from plain password in environment
const adminPassword = process.env.NODE_RED_ADMIN_PASSWORD;
if (!adminPassword) {
    throw new Error('NODE_RED_ADMIN_PASSWORD environment variable must be set');
}
const hashedPassword = bcrypt.hashSync(adminPassword, 8);

module.exports = {
    httpAdminRoot: "/",
    httpNodeRoot: "/api",
    credentialSecret: process.env.CREDENTIAL_SECRET,
    adminAuth: {
        type: "credentials",
        users: [
        {
            username: process.env.NODE_RED_ADMIN_USER,
            password: hashedPassword,
            permissions: "*"
        }
    ]
}
}