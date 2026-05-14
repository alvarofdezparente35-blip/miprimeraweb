// Generar hash bcrypt para la contraseña de administrador
// Uso: node scripts/hash-password.js "mi-contraseña"
// Luego copia el hash al .env: ADMIN_PASSWORD_HASH=$2b$12$...

import { hash, compare } from 'bcrypt';

const password = process.argv[2];
if (!password) {
  console.error('Uso: npx tsx scripts/hash-password.js "contraseña"');
  process.exit(1);
}

const hashed = await hash(password, 12);
console.log('\nHash generado. Copia esto a tu .env:');
console.log(`ADMIN_PASSWORD_HASH=${hashed}`);
console.log('\n(Reemplaza ADMIN_PASSWORD por ADMIN_PASSWORD_HASH)');

// Verificación
const match = await compare(password, hashed);
console.log(`\nVerificación: ${match ? '✓ OK' : '✗ FALLÓ'}`);
