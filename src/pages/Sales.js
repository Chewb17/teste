import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './Sales.css'; // Adicione um arquivo CSS para estilos personalizados

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Função para formatar a data como DD/MM/AA
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'; // Retorna N/A se a data não existir
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parts[0].slice(-2); // Pega os últimos 2 dígitos do ano
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
  }
  try {
    const date = new Date(dateString + 'T00:00:00'); // Adiciona T00:00:00 para tratar como local
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexado
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch (e) {
    return 'Data Inválida';
  }
};

function Sales() {
  const [sales, setSales] = useState([]);
  const [newSale, setNewSale] = useState({
    product_line: '',
    value: '',
    discount_percent: '',
    payment_term: '',
    buyer: '',
    sale_date: '', // Novo campo para a data da venda
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [totalCommissions, setTotalCommissions] = useState(0);

  // Função para buscar vendas do backend
  const fetchSales = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("Token não encontrado, redirecionando para login.");
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sales/`, {
        headers: { Authorization: `Token ${token}` },
      });

      console.log('Dados recebidos do backend no GET /api/sales/:', res.data);
      const updatedSales = res.data.map((sale) => ({
        ...sale,
        payment_dates: sale.payment_dates && sale.payment_dates.length > 0
          ? sale.payment_dates
          : calculatePaymentDates(sale.value, sale.payment_term, sale.product_line, sale.discount_percent, sale.sale_date),
      }));

      setSales(updatedSales);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error.response ? error.response.data : error.message);
      if (error.response && error.response.status === 401) {
        alert('Sessão expirada ou token inválido. Por favor, faça login novamente.');
        localStorage.removeItem('token');
      } else {
        alert('Erro ao carregar vendas. Tente novamente mais tarde.');
      }
    }
  }, []);

  // Função para calcular as datas de pagamento
  const calculatePaymentDates = (value, paymentTerm, productLine, discountPercent, saleDateString) => {
    const numericPaymentTerm = Number(paymentTerm);
    let installments = numericPaymentTerm > 0 ? Math.ceil(numericPaymentTerm / 30) : 1;
    if ([0, 7, 14, 28, 56].includes(numericPaymentTerm)) {
      installments = 1;
    }
    const installmentValue = parseFloat(value) / installments;
    const commissionRate = calculateCommissionRate(productLine, discountPercent);
    const paymentDates = [];

    const baseDate = saleDateString ? new Date(saleDateString + 'T00:00:00') : new Date();
    if (!saleDateString) {
      baseDate.setHours(0, 0, 0, 0);
    }

    for (let i = 0; i < installments; i++) {
      const paymentDate = new Date(baseDate);

      if (numericPaymentTerm === 0) {
      } else if (numericPaymentTerm === 7) {
        paymentDate.setDate(baseDate.getDate() + 7);
      } else if (numericPaymentTerm === 14) {
        paymentDate.setDate(baseDate.getDate() + 14);
      } else if (numericPaymentTerm === 28) {
        paymentDate.setDate(baseDate.getDate() + 28);
      } else if (numericPaymentTerm === 56) {
        paymentDate.setDate(baseDate.getDate() + 56);
      } else {
        paymentDate.setDate(baseDate.getDate() + (i + 1) * 30);
      }

      paymentDates.push({
        month: numericPaymentTerm === 0 ? 0 : ([7, 14, 28, 56].includes(numericPaymentTerm) ? numericPaymentTerm : (i + 1) * 30),
        value: installmentValue,
        commission: installmentValue * commissionRate,
        paymentDate: paymentDate.toLocaleDateString('pt-BR'),
        billed: false,
      });
    }
    return paymentDates;
  };

  const calculateCommissionRate = (productLine, discountPercent) => {
    const discount = Number(discountPercent);
    if (productLine === 'racoes') {
      if (discount === 0) return 0.03;
      if (discount > 0 && discount <= 10) return 0.02;
    } else if (productLine === 'pet') {
      if (discount === 0) return 0.10;
      if (discount > 0 && discount <= 2) return 0.09;
      if (discount > 2 && discount <= 4) return 0.08;
    } else {
      if (discount === 0) return 0.10;
      if (discount > 0 && discount <= 2) return 0.09;
      if (discount > 2 && discount <= 4) return 0.08;
    }
    return 0;
  };

  const addSale = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Usuário não autenticado. Faça login para adicionar vendas.");
      return;
    }

    const saleDateToUse = newSale.sale_date || new Date().toISOString().split('T')[0];

    if (!newSale.product_line || !newSale.value || newSale.payment_term === '' || !newSale.buyer) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (isNaN(parseFloat(newSale.value)) || parseFloat(newSale.value) <= 0) {
      alert("O valor da venda deve ser um número positivo.");
      return;
    }
    if (newSale.discount_percent !== '' && (isNaN(parseFloat(newSale.discount_percent)) || parseFloat(newSale.discount_percent) < 0 || parseFloat(newSale.discount_percent) > 100)) {
      alert("O percentual de desconto deve ser um número entre 0 e 100.");
      return;
    }

    try {
      const payment_dates = calculatePaymentDates(
        newSale.value,
        newSale.payment_term,
        newSale.product_line,
        newSale.discount_percent,
        saleDateToUse
      );

      const saleData = {
        ...newSale,
        value: parseFloat(newSale.value),
        discount_percent: newSale.discount_percent === '' ? 0 : parseFloat(newSale.discount_percent),
        payment_term: parseInt(newSale.payment_term, 10),
        sale_date: saleDateToUse,
        payment_dates,
      };

      console.log('Dados enviados ao backend no POST /api/sales/:', saleData);

      const res = await axios.post(
        `${API_BASE_URL}/api/sales/`,
        saleData,
        { headers: { Authorization: `Token ${token}` } }
      );

      console.log('Resposta do backend após adicionar venda:', res.data);
      fetchSales();
      setNewSale({ product_line: '', value: '', discount_percent: '', payment_term: '', buyer: '', sale_date: '' });
      alert('Venda adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar venda:', error.response ? error.response.data : error.message);
      alert(`Erro ao adicionar venda: ${error.response && error.response.data && typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : (error.response ? error.response.data : error.message)}`);
    }
  };

  const deleteSale = async (id) => {
    if (!window.confirm('Deseja realmente apagar esta venda?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_BASE_URL}/api/sales/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      setSales(sales.filter((sale) => sale.id !== id));
      alert('Venda deletada com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar venda:', error.response ? error.response.data : error.message);
      alert('Erro ao deletar venda.');
    }
  };

  const toggleBilled = async (saleId, paymentIndex) => {
    const token = localStorage.getItem('token');
    const saleToUpdate = sales.find(s => s.id === saleId);
    if (!saleToUpdate) return;

    const paymentToUpdate = saleToUpdate.payment_dates[paymentIndex];
    const newBilledStatus = !paymentToUpdate.billed;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/sales/update-payment-status/`,
        { sale_id: saleId, payment_index: paymentIndex, billed: newBilledStatus },
        { headers: { Authorization: `Token ${token}` } }
      );
      setSales(prevSales => prevSales.map(s => s.id === saleId ? response.data : s));
    } catch (error) {
      console.error('Erro ao atualizar status de faturamento:', error.response ? error.response.data : error.message);
      alert('Erro ao atualizar status de faturamento.');
    }
  };

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let currentTotalCommissions = 0;
    sales.forEach(sale => {
      if (Array.isArray(sale.payment_dates)) {
        sale.payment_dates.forEach(pd => {
          const paymentDateParts = pd.paymentDate.split('/');
          const paymentDay = parseInt(paymentDateParts[0], 10);
          const paymentMonth = parseInt(paymentDateParts[1], 10);
          const paymentYear = parseInt(paymentDateParts[2], 10);

          if (paymentYear === year && paymentMonth === month) {
            currentTotalCommissions += parseFloat(pd.commission) || 0;
          }
        });
      }
    });
    setTotalCommissions(currentTotalCommissions);
  }, [sales, selectedMonth]);

  return (
    <div className="sales-container">
      <h2>Gerenciamento de Vendas</h2>

      <form onSubmit={addSale} className="sales-form">
        <div className="form-row">
          <div className="form-group">
            <label>Data da Venda:</label>
            <input
              type="date"
              value={newSale.sale_date}
              onChange={(e) => setNewSale({ ...newSale, sale_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Linha de Produto:</label>
            <select
              value={newSale.product_line}
              onChange={(e) => setNewSale({ ...newSale, product_line: e.target.value })}
              required
            >
              <option value="">Selecione</option>
              <option value="pet">Pet</option>
              <option value="racoes">Rações</option>
              <option value="medicamentos">Medicamentos</option>
              <option value="vacinas">Vacinas</option>
              <option value="geral">Geral</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Valor (R$):</label>
            <input
              type="number"
              step="0.01"
              value={newSale.value}
              onChange={(e) => setNewSale({ ...newSale, value: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Desconto (%):</label>
            <input
              type="number"
              step="0.01"
              value={newSale.discount_percent}
              onChange={(e) => setNewSale({ ...newSale, discount_percent: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Prazo de Pagamento:</label>
            <select
              value={newSale.payment_term}
              onChange={(e) => setNewSale({ ...newSale, payment_term: e.target.value })}
              required
            >
              <option value="">Selecione</option>
              <option value="0">À vista</option>
              <option value="7">7 dias</option>
              <option value="14">14 dias</option>
              <option value="28">28 dias</option>
              <option value="30">30 dias</option>
              <option value="56">56 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="120">120 dias</option>
            </select>
          </div>
          <div className="form-group">
            <label>Comprador:</label>
            <input
              type="text"
              value={newSale.buyer}
              onChange={(e) => setNewSale({ ...newSale, buyer: e.target.value })}
              required
            />
          </div>
        </div>
        <button type="submit" className="add-button">Adicionar Venda</button>
      </form>

      <div className="filter-commission-container">
        <div className="form-group">
          <label>Selecione o mês para ver a comissão total:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          />
        </div>
        <div className="total-commission">
          <strong>Comissão Total para {selectedMonth}: R$ {totalCommissions.toFixed(2)}</strong>
        </div>
      </div>

      <h3>Vendas Registradas</h3>
      <div className="sales-table-container">
        <table className="sales-table">
          <thead>
            <tr>
              <th>Data da Venda</th>
              <th>Linha de Produto</th>
              <th>Valor (R$)</th>
              <th>Desconto (%)</th>
              <th>Prazo</th>
              <th>Comprador</th>
              <th>Datas de Pagamento / Comissão (Parcela)</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{formatDate(sale.sale_date)}</td>
                <td>{sale.product_line}</td>
                <td>{parseFloat(sale.value).toFixed(2)}</td>
                <td>{parseFloat(sale.discount_percent).toFixed(2)}</td>
                <td>{sale.payment_term === 0 ? "À vista" : `${sale.payment_term} dias`}</td>
                <td>{sale.buyer}</td>
                <td>
                  <ul>
                    {Array.isArray(sale.payment_dates) && sale.payment_dates.map((pd, index) => (
                      <li key={index} className={pd.billed ? 'billed' : ''}>
                        {pd.paymentDate} - R$ {parseFloat(pd.value).toFixed(2)}
                        (Comissão: R$ {parseFloat(pd.commission).toFixed(2)})
                        <button onClick={() => toggleBilled(sale.id, index)} className={`toggle-billed-button ${pd.billed ? 'billed-active' : ''}`}>
                          {pd.billed ? 'Desfaturar' : 'Faturar'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <button onClick={() => deleteSale(sale.id)} className="delete-button">Deletar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Sales;
