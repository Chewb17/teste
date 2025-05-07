import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL; // Pega a variável de ambiente

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
      localStorage.setItem('token', response.data.token); // Exemplo
    } catch (error) {
      console.error('Erro no login:', error.response ? error.response.data : error.message);
      // Tratar erro de login
      if (error.message === "Network Error" && !API_BASE_URL) {
        console.error("Variável de ambiente REACT_APP_API_BASE_URL não está definida ou acessível no build do frontend.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Usuário"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <br />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
