import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Conversion de texto plano a hash
export async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

// Valida la contraseña al hacer login
export async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}