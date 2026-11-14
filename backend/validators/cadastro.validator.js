function invalid(message) {
  throw Object.assign(new Error(message), { status: 400 });
}

function validateCadastro(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Envie um objeto JSON válido.');
  const allowed = ['nome', 'email', 'password', 'confirm_password', 'ra', 'curso'];
  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    invalid('O cadastro contém campos não permitidos.');
  }
  function text(key, max, optional = false) {
    if (optional && (body[key] === undefined || body[key] === null)) return null;
    if (typeof body[key] !== 'string' || body[key].length > max ||
        body[key].includes(String.fromCharCode(0))) invalid('Campo inválido: ' + key + '.');
    const value = body[key].trim();
    if (!value) {
      if (optional) return null;
      invalid('Preencha o campo ' + key + '.');
    }
    return value;
  }
  const nome = text('nome', 200);
  const email = text('email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) invalid('Informe um e-mail válido.');
  const password = body.password;
  // Não aplicar trim ou normalização à senha: espaços fazem parte do segredo.
  if (typeof password !== 'string' || password.length > 256 ||
      [...password].length < 15 || [...password].length > 128) {
    invalid('A senha deve ter de 15 a 128 caracteres; espaços são permitidos.');
  }
  if (body.confirm_password !== undefined && body.confirm_password !== password) {
    invalid('A confirmação de senha não confere.');
  }
  return { nome, email, password, ra: text('ra', 50, true), curso: text('curso', 200, true) };
}

module.exports = { validateCadastro };
