import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Importe o arquivo CSS que vamos criar

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/api/login/`, {
        username,
        password,
      });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        // Removendo o alert para um fluxo mais limpo, o redirecionamento é suficiente
        // alert('Login bem-sucedido!'); 
        navigate('/sales');
      } else {
        console.error('Token não recebido do backend.');
        alert('Erro no login: Token não recebido.');
      }
    } catch (error) {
      console.error('Erro no login:', error.response ? error.response.data : error.message);
      let errorMessage = 'Erro ao tentar fazer login. Tente novamente.';
      if (error.response) {
        if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
        } else if (error.response.data && error.response.data.detail) {
            errorMessage = error.response.data.detail;
        } else if (error.response.data && error.response.data.non_field_errors) {
            errorMessage = error.response.data.non_field_errors.join(' ');
        } else if (error.response.status === 401) {
            errorMessage = 'Usuário ou senha inválidos.';
        }
      } else if (error.message === "Network Error" && !API_BASE_URL) {
        errorMessage = "Erro de configuração: A URL da API não está definida.";
        console.error("Variável de ambiente REACT_APP_API_BASE_URL não está definida ou acessível no build do frontend.");
      }
      alert(errorMessage);
    }
  };

  return (
    <div className="login-page-container"> {/* Container para centralizar na página */}
      <div className="login-form-container">
        <form onSubmit={handleSubmit} className="login-form">
          <h2>Acesse sua Conta</h2>
          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <input
              id="username"
              type="text"
              placeholder="Digite seu usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-button">Entrar</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
