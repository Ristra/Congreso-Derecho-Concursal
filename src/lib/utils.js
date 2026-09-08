export function generaPassword(long = 8){
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$'
  let password = '';
  for (let i=0;i<long;i++){
    password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return password;
}