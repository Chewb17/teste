import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // 1. Importar useNavigate

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL; // Pega a variável de ambiente

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // 2. Inicializar useNavigate

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      // Certifique-se de que a URL está correta aqui
      const response = await axios.post(`${API_BASE_URL}/api/login/`, { // OU /api/auth/token/ ou o endpoint correto
        username,
        password,
      });
      // Lógica de sucesso no login (ex: salvar token, redirecionar)
      console.log('Login bem-sucedido:', response.data);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token); // Exemplo
        alert('Login bem-sucedido!'); // Opcional: dar feedback ao usuário
        navigate('/sales'); // 3. Redirecionar para /sales
      } else {
        // Caso o backend não retorne um token mesmo com status 200
        console.error('Token não recebido do backend.');
        alert('Erro no login: Token não recebido.');
      }
    } catch (error) {
      console.error('Erro no login:', error.response ? error.response.data : error.message);
      // Tratar erro de login
      let errorMessage = 'Erro ao tentar fazer login. Tente novamente.';
      if (error.response) {
        // Se o backend retornar uma mensagem de erro específica
        if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
        } else if (error.response.data && error.response.data.detail) {
            errorMessage = error.response.data.detail;
        } else if (error.response.data && error.response.data.non_field_errors) {
            errorMessage = error.response.data.non_field_errors.join(' ');
        }
      } else if (error.message === "Network Error" && !API_BASE_URL) {
        errorMessage = "Erro de configuração: A URL da API não está definida.";
        console.error("Variável de ambiente REACT_APP_API_BASE_URL não está definida ou acessível no build do frontend.");
      }
      alert(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Usuário"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <br />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <br />
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
