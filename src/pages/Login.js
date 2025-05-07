import { useState } from 'react';
import axios from 'axios';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    try {
      const res = await axios.post(
        'http://127.0.0.1:8000/api/login/',
        { username, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      localStorage.setItem('token', res.data.token);
      window.location.href = '/sales';
    } catch (error) {
      console.error('Erro no login:', error.response?.data || error.message);
      alert('Login inválido');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Login</h2>
      <input placeholder="Usuário" value={username} onChange={e => setUsername(e.target.value)} /><br />
      <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} /><br />
      <button onClick={login}>Entrar</button>
    </div>
  );
}

export default Login;

const fetchSales = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get('http://127.0.0.1:8000/api/sales/', {
      headers: {
        Authorization: `Token ${token}`,
      },
    });
    console.log(res.data);
  } catch (error) {
    console.error('Erro ao buscar vendas:', error.response?.data || error.message);
  }
};

fetchSales();
