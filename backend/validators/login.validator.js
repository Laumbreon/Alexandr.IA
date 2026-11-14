function validateLogin(body) {
  const invalid = () => {
    throw Object.assign(new Error('Informe e-mail e senha válidos.'), { status: 400 });
  };
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some((key) => !['email', 'password'].includes(key))) invalid();
  if (typeof body.email !== 'string' || body.email.length > 254) invalid();
  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.includes(String.fromCharCode(0))) invalid();
  // Login não muda senhas e permite verificar contas anteriores à política de cadastro.
  if (typeof body.password !== 'string' || !body.password ||
      body.password.length > 256 || [...body.password].length > 128) invalid();
  return { email, password: body.password };
}

module.exports = { validateLogin };
