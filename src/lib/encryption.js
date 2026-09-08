// src/lib/encryption.js

const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

const IV_LENGTH = 16;

function encrypt(text) {
    if (text === null || text === undefined) return null;

    const textString = String(text);

    if (textString.length === 0) return null;

    // Generar un IV aleatorio para este cifrado
    const iv = crypto.randomBytes(IV_LENGTH);
    // crear el cipher con AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    // Cifrar el texto
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Obtener el tag de autenticación
    const authTag = cipher.getAuthTag().toString('hex');
    // Devolver ID, tag, texto cifrado, todo junto. La DB almacenará este string
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText) {
    if (!encryptedText) return null;

    // Dividir string en sus partes
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Formato de texto cifrado inválido');
    }
    // Convertir a buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    // Crear el decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    // Decifrar
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = {encrypt, decrypt}; 