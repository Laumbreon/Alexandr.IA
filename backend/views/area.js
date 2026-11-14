const identity = document.getElementById('identidade');
const message = document.getElementById('mensagem');
const logout = document.getElementById('sair');

async function showIdentity() {
  try {
    const response = await fetch('/api/me', { cache: 'no-store' });
    if (response.status === 401) { window.location.assign('/login'); return; }
    if (!response.ok) throw new Error();
    const user = await response.json();
    identity.textContent = user.nome + ' — ' + user.email + ' — ' + user.perfil;
  } catch {
    identity.textContent = 'Não foi possível consultar a identidade.';
  }
}

logout.addEventListener('click', async () => {
  logout.disabled = true;
  try {
    const tokenResponse = await fetch('/api/csrf', { cache: 'no-store' });
    if (!tokenResponse.ok) throw new Error();
    const { csrfToken } = await tokenResponse.json();
    const response = await fetch('/logout', {
      method: 'POST', headers: { 'X-CSRF-Token': csrfToken },
    });
    if (!response.ok) throw new Error();
    window.location.assign('/login');
  } catch {
    message.textContent = 'Não foi possível sair. Tente novamente.';
    logout.disabled = false;
  }
});

showIdentity();
