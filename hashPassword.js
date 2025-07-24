// hashPassword.js

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Por favor, proporciona una contraseña como argumento.');
  console.log('Ejemplo: node hashPassword.js miClaveSegura');
  process.exit(1);
}

const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error al hashear la contraseña:', err);
    process.exit(1);
  }
  console.log('Contraseña en texto plano:', password);
  console.log('Hash generado:', hash);
  console.log('\nCopia el hash y úsalo en tu consulta SQL:');
  console.log(`UPDATE users SET password = '${hash}' WHERE email = 'tu_email@ejemplo.com';`);
});


