import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './Sales.css'; // Adicione um arquivo CSS para estilos personalizados
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale, // Necessário se estiver usando Chart.js v3+ com escalas, embora não diretamente para Pie
  LinearScale    // Mesmo que acima
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
);

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
    // Tenta criar a data mesmo se o formato não for YYYY-MM-DD inicialmente
    // Adiciona T00:00:00 para evitar problemas de fuso horário que podem mudar o dia
    const date = new Date(dateString + 'T00:00:00Z'); // Usar Z para UTC e evitar deslocamentos de fuso
    if (isNaN(date.getTime())) { // Verifica se a data é válida
        // Se a data original já estiver no formato DD/MM/YY ou similar, tenta usar diretamente
        // Isso é um fallback, o ideal é que o backend sempre envie YYYY-MM-DD
        const directParts = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        if (directParts) {
            const day = String(directParts[1]).padStart(2, '0');
            const month = String(directParts[2]).padStart(2, '0');
            const year = String(directParts[3]).length === 4 ? directParts[3].slice(-2) : directParts[3];
            return `${day}/${month}/${year}`;
        }
        return 'Data Inválida';
    }
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Mês é 0-indexado
    const year = String(date.getUTCFullYear()).slice(-2);
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
    sale_date: '',
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [commissionChartData, setCommissionChartData] = useState(null);

  const fetchSales = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("Token não encontrado.");
      // Idealmente, redirecionar para a página de login ou mostrar uma mensagem mais clara.
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sales/`, {
        headers: { Authorization: `Token ${token}` },
      });

      console.log('Dados recebidos do backend no GET /api/sales/:', res.data);
      const updatedSales = res.data.map((sale) => ({
        ...sale,
        // Garante que payment_dates seja sempre um array
        payment_dates: Array.isArray(sale.payment_dates) && sale.payment_dates.length > 0
          ? sale.payment_dates
          : calculatePaymentDates(sale.value, sale.payment_term, sale.product_line, sale.discount_percent, sale.sale_date),
      }));

      setSales(updatedSales);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error.response ? error.response.data : error.message);
      if (error.response && error.response.status === 401) {
        alert('Sessão expirada ou token inválido. Por favor, faça login novamente.');
        localStorage.removeItem('token'); // Limpar token inválido
        // window.location.href = '/login'; // Exemplo de redirecionamento
      } else {
        alert('Erro ao carregar vendas. Tente novamente mais tarde.');
      }
    }
  }, []);

  const calculatePaymentDates = (value, paymentTerm, productLine, discountPercent, saleDateString) => {
    const numericPaymentTerm = Number(paymentTerm);
    let installments = 1; // Padrão para à vista ou prazos curtos

    if (numericPaymentTerm >= 30) { // Apenas calcula múltiplas parcelas para prazos de 30 dias ou mais
        installments = Math.ceil(numericPaymentTerm / 30);
    }

    const installmentValue = parseFloat(value) / installments;
    const commissionRate = calculateCommissionRate(productLine, discountPercent);
    const paymentDates = [];

    // Usa a data da venda como base, ou a data atual se não fornecida
    const baseDate = saleDateString ? new Date(saleDateString + 'T00:00:00Z') : new Date();
     if (!saleDateString) { // Se não houver data da venda, zera as horas para evitar problemas de fuso
        baseDate.setUTCHours(0, 0, 0, 0);
    }


    for (let i = 0; i < installments; i++) {
      const paymentDate = new Date(baseDate);

      if (numericPaymentTerm === 0) { // À vista
        // A data de pagamento é a própria data da venda (baseDate)
      } else if (numericPaymentTerm === 7) {
        paymentDate.setUTCDate(baseDate.getUTCDate() + 7);
      } else if (numericPaymentTerm === 14) {
        paymentDate.setUTCDate(baseDate.getUTCDate() + 14);
      } else if (numericPaymentTerm === 28) {
        paymentDate.setUTCDate(baseDate.getUTCDate() + 28);
      } else if (numericPaymentTerm === 56) {
        paymentDate.setUTCDate(baseDate.getUTCDate() + 56);
      } else { // Para prazos em múltiplos de 30 dias (30, 60, 90, etc.)
        paymentDate.setUTCDate(baseDate.getUTCDate() + (i + 1) * 30);
      }

      paymentDates.push({
        // 'month' aqui parece ser mais um identificador do prazo da parcela do que o mês do calendário
        month: numericPaymentTerm === 0 ? 0 : ([7, 14, 28, 56].includes(numericPaymentTerm) ? numericPaymentTerm : (i + 1) * 30),
        value: installmentValue,
        commission: installmentValue * commissionRate,
        paymentDate: paymentDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
        billed: false, // Por padrão, novas parcelas não são faturadas
      });
    }
    return paymentDates;
  };

  const calculateCommissionRate = (productLine, discountPercent) => {
    const discount = Number(discountPercent);
    if (productLine === 'racoes') {
      if (discount === 0) {
        return 0.03;
      } else if (discount > 0 && discount <= 10) {
        return 0.02;
      }
    } else {
      if (discount === 0) {
        return 0.10;
      } else if (discount > 0 && discount <= 2) {
        return 0.09;
      } else if (discount > 2 && discount <= 4) {
        return 0.08;
      } else if (discount > 4 && discount <= 6) {
        return 0.07;
      } else if (discount > 6 && discount <= 8) {
        return 0.06;
      } else if (discount > 8 && discount <= 10) {
        return 0.05;
      } else if (discount > 10 && discount <= 12) {
        return 0.04;
      } else if (discount > 12 && discount <= 14) {
        return 0.03;
      } else if (discount > 14) {
        return 0.02;
      }
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
    const discountValue = newSale.discount_percent === '' ? 0 : parseFloat(newSale.discount_percent);
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      alert("O percentual de desconto deve ser um número entre 0 e 100.");
      return;
    }

    try {
      const payment_dates = calculatePaymentDates(
        newSale.value,
        newSale.payment_term,
        newSale.product_line,
        discountValue, // Usar o valor já parseado
        saleDateToUse
      );

      const saleData = {
        ...newSale,
        value: parseFloat(newSale.value),
        discount_percent: discountValue,
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
      fetchSales(); // Recarrega todas as vendas para refletir a nova e as calculadas no backend
      setNewSale({ product_line: '', value: '', discount_percent: '', payment_term: '', buyer: '', sale_date: '' });
      alert('Venda adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar venda:', error.response ? error.response.data : error.message);
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      alert(`Erro ao adicionar venda: ${errorMessage}`);
    }
  };

  const deleteSale = async (id) => {
    if (!window.confirm('Deseja realmente apagar esta venda?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_BASE_URL}/api/sales/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      // Atualiza o estado local removendo a venda deletada
      setSales(prevSales => prevSales.filter((sale) => sale.id !== id));
      alert('Venda deletada com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar venda:', error.response ? error.response.data : error.message);
      alert('Erro ao deletar venda.');
    }
  };

  const toggleBilled = async (saleId, paymentIndex) => {
    const token = localStorage.getItem('token');
    const saleToUpdate = sales.find(s => s.id === saleId);
    if (!saleToUpdate || !Array.isArray(saleToUpdate.payment_dates) || paymentIndex < 0 || paymentIndex >= saleToUpdate.payment_dates.length) {
        console.error('Venda ou índice de pagamento inválido para toggleBilled');
        return;
    }

    const paymentToUpdate = saleToUpdate.payment_dates[paymentIndex];
    const newBilledStatus = !paymentToUpdate.billed;

    try {
      // A API espera 'sale_id', 'payment_index', 'billed'
      const response = await axios.post(`${API_BASE_URL}/api/sales/update-payment-status/`,
        { sale_id: saleId, payment_index: paymentIndex, billed: newBilledStatus },
        { headers: { Authorization: `Token ${token}` } }
      );
      // O backend deve retornar a venda atualizada completa
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
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
    let currentMonthCommission = 0;
    let futureMonthsCommission = 0;

    sales.forEach(sale => {
      if (Array.isArray(sale.payment_dates)) {
        sale.payment_dates.forEach(pd => {
          if (typeof pd.paymentDate === 'string' && pd.commission) {
            const paymentDateParts = pd.paymentDate.split('/');
            if (paymentDateParts.length === 3) {
              const paymentDay = parseInt(paymentDateParts[0], 10);
              const paymentMonth = parseInt(paymentDateParts[1], 10);
              let paymentYear = parseInt(paymentDateParts[2], 10);
              if (paymentYear < 100) {
                paymentYear += (paymentYear > 50 ? 1900 : 2000);
              }

              const commissionValue = parseFloat(pd.commission) || 0;

              // Calcula comissão faturada do mês selecionado
              if (pd.billed && paymentYear === selectedYear && paymentMonth === selectedMonthNum) {
                currentMonthCommission += commissionValue;
              }

              // Calcula comissão de meses futuros (após o mês selecionado)
              // Considera todas as parcelas (faturadas ou não)
              if (paymentYear > selectedYear || (paymentYear === selectedYear && paymentMonth > selectedMonthNum)) {
                futureMonthsCommission += commissionValue;
              }
            }
          }
        });
      }
    });
    setTotalCommissions(currentMonthCommission);

    // Prepara dados para o gráfico de pizza
    if (currentMonthCommission > 0 || futureMonthsCommission > 0) {
      setCommissionChartData({
        labels: ['Comissão Faturada do Mês', 'Comissão de Meses Futuros (A Receber)'],
        datasets: [
          {
            label: 'Distribuição de Comissões',
            data: [currentMonthCommission, futureMonthsCommission],
            backgroundColor: [
              'rgba(75, 192, 192, 0.7)', // Verde/Azul para comissão do mês
              'rgba(255, 159, 64, 0.7)', // Laranja para comissão futura
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 159, 64, 1)',
            ],
            borderWidth: 1,
          },
        ],
      });
    } else {
      setCommissionChartData(null); // Reseta o gráfico se não houver dados
    }
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
              <option value="aditivo">Aditivo</option>
              <option value="aqua">Aqua</option>
              <option value="aves">Aves</option>
              <option value="pet">Pet</option>
              <option value="ruminantes">Ruminantes</option>
              <option value="suinos">Suínos</option>
              <option value="revenda">Revenda</option>
              <option value="racoes">Rações Vaccinar</option>
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
          <label>Selecione o mês para ver a comissão:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          />
        </div>
        <div className="total-commission">
          <strong>Comissão Total Faturada para {selectedMonth}:</strong>
          <span>R$ {totalCommissions.toFixed(2)}</span>
        </div>
      </div>

      {/* Seção do Gráfico */}
      {commissionChartData && (
        <div className="commission-chart-container">
          <h3>Distribuição de Comissões</h3>
          <div className="chart-wrapper">
            <Pie data={commissionChartData} />
          </div>
        </div>
      )}

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
                        <span> {/* Envolver o texto */}
                          {formatDate(pd.paymentDate)} - R$ {parseFloat(pd.value).toFixed(2)}
                          (Comissão: R$ {parseFloat(pd.commission).toFixed(2)})
                        </span>
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