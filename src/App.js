import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Sales from './pages/Sales';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/sales" element={<Sales />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
