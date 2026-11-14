document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cadastroForm');
    const button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!name || !email || !password) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        const passwordLength = [...password].length;
        if (passwordLength < 15 || passwordLength > 128) {
            alert('A senha deve ter de 15 a 128 caracteres; espaços são permitidos.');
            return;
        }

        button.disabled = true;
        button.textContent = 'Cadastrando...';

        try {
            const response = await fetch('/api/cadastro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: name, email, password })
            });
            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                window.location.href = '/login';
            } else {
                alert(`Erro no cadastro: ${result.message}`);
            }
        } catch (error) {
            console.error('Erro de conexão ou requisição:', error);
            alert('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
        } finally {
            button.disabled = false;
            button.textContent = 'Cadastrar';
        }
    });
});