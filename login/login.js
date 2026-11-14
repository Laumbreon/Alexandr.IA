document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const button = loginForm.querySelector('button[type="submit"]');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        button.disabled = true;
        button.textContent = 'Entrando...';

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (data.success) {
                window.location.href = data.redirect;
            } else {
                alert(data.message || 'E-mail ou senha incorretos. Tente novamente.');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            alert('Erro de conexão. Tente novamente.');
        } finally {
            button.disabled = false;
            button.textContent = 'Entrar';
        }
    });
});