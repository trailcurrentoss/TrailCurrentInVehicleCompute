const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCODING = 'hex';

function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    if (key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    return Buffer.from(key, ENCODING);
}

/**
 * Encrypt plaintext using AES-256-CBC
 * @param {string} plaintext - Text to encrypt
 * @returns {Object} Object with encrypted and iv properties
 */
function encrypt(plaintext) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    return {
        encrypted,
        iv: iv.toString(ENCODING)
    };
}

/**
 * Decrypt ciphertext using AES-256-CBC
 * @param {string} encrypted - Encrypted text
 * @param {string} iv - Initialization vector
 * @returns {string} Decrypted plaintext
 */
function decrypt(encrypted, iv) {
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, ENCODING));

    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

module.exports = { encrypt, decrypt };
