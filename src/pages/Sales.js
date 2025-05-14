import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './Sales.css'; // Adicione um arquivo CSS para estilos personalizados

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function Sales() {
  const [sales, setSales] = useState([]);
  const [newSale, setNewSale] = useState({
    product_line: '',
    value: '',
    discount_percent: '',
    payment_term: '', // Manter como string vazia ou um valor padrão numérico se preferir
    buyer: '', // <-- novo campo
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Função para buscar vendas do backend
  const fetchSales = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sales/`, { // <--- USANDO VARIÁVEL DE AMBIENTE
        headers: { Authorization: `Token ${token}` },
      });

      console.log('Dados recebidos do backend no GET /api/sales/:', res.data);

      // Atualiza as vendas e calcula as datas de pagamento se não existirem
      const updatedSales = res.data.map((sale) => ({
        ...sale,
        payment_dates: sale.payment_dates || calculatePaymentDates(sale.value, sale.payment_term, sale.product_line, sale.discount_percent),
      }));

      setSales(updatedSales);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      alert('Erro ao carregar vendas. Tente novamente mais tarde.');
    }
  }, []);

  // Função para calcular as datas de pagamento
  const calculatePaymentDates = (value, paymentTerm, productLine, discountPercent) => {
    const numericPaymentTerm = Number(paymentTerm); // Garante que paymentTerm é um número
    let installments = numericPaymentTerm > 0 ? numericPaymentTerm / 30 : 1; // Se à vista, considera 1 parcela
    if (numericPaymentTerm === 7 || numericPaymentTerm === 14 || numericPaymentTerm === 28 || numericPaymentTerm === 56) {
      installments = 1; // Prazos específicos que são pagamentos únicos
    }
    const installmentValue = value / installments; // Valor de cada parcela
    const commissionRate = calculateCommissionRate(productLine, discountPercent); // Calcula a taxa de comissão
    const paymentDates = [];
    const today = new Date(); // Data atual

    for (let i = 1; i <= installments; i++) {
      const paymentDate = new Date(today); // Clona a data atual
      // Define o dia do pagamento
      if (numericPaymentTerm === 0) { // À vista
        // Mantém a data atual ou adiciona um pequeno buffer se necessário, ex: D+1
        // Para este exemplo, vamos considerar a data atual para "À vista"
      } else if (numericPaymentTerm === 7) {
        paymentDate.setDate(today.getDate() + 7);
      } else if (numericPaymentTerm === 14) {
        paymentDate.setDate(today.getDate() + 14);
      } else if (numericPaymentTerm === 28) {
        paymentDate.setDate(today.getDate() + 28);
      } else if (numericPaymentTerm === 56) {
        paymentDate.setDate(today.getDate() + 56);
      } else { // Para 30, 60, 90, 120 dias (lógica de parcelas)
        paymentDate.setDate(today.getDate() + i * 30);
      }

      paymentDates.push({
        month: numericPaymentTerm === 0 ? 0 : (numericPaymentTerm > 0 && numericPaymentTerm < 30 ? numericPaymentTerm : i * 30), // Ajusta o "mês" para prazos menores que 30
        value: installmentValue,
        commission: installmentValue * commissionRate, // Calcula a comissão
        paymentDate: paymentDate.toLocaleDateString('pt-BR'), // Formata a data para exibição
        billed: false, // <-- novo campo
      });
    }

    return paymentDates;
  };

  // Função para calcular a taxa de comissão
  const calculateCommissionRate = (productLine, discountPercent) => {
    const discount = Number(discountPercent); // <-- converte para número
    if (productLine === 'racoes') {
      if (discount === 0) {
        return 0.03; // 3% para tabela cheia
      } else if (discount > 0 && discount <= 10) {
        return 0.02; // 2% para desconto de 0,01% a 10%
      }
    } else {
      if (discount === 0) {
        return 0.10; // 10% para tabela cheia
      } else if (discount > 0 && discount <= 2) {
        return 0.09; // 9% para desconto de 0,01% a 2%
      } else if (discount > 2 && discount <= 4) {
        return 0.08; // 8% para desconto de 2,01% a 4%
      } else if (discount > 4 && discount <= 6) {
        return 0.07; // 7% para desconto de 4,01% a 6%
      } else if (discount > 6 && discount <= 8) {
        return 0.06; // 6% para desconto de 6,01% a 8%
      } else if (discount > 8 && discount <= 10) {
        return 0.05; // 5% para desconto de 8,01% a 10%
      } else if (discount > 10 && discount <= 12) {
        return 0.04; // 4% para desconto de 10,01% a 12%
      } else if (discount > 12 && discount <= 14) {
        return 0.03; // 3% para desconto de 12,01% a 14%
      } else if (discount > 14) {
        return 0.02; // 2% para descontos acima de 14%
      }
    }
    return 0; // Caso não se aplique nenhuma regra
  };

  // Função para adicionar uma nova venda
  const addSale = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const payment_dates = calculatePaymentDates(
        newSale.value,
        newSale.payment_term,
        newSale.product_line,
        newSale.discount_percent
      );

      console.log('Dados enviados ao backend no POST /api/sales/:', { ...newSale, payment_dates });

      const res = await axios.post(
        `${API_BASE_URL}/api/sales/`, // <--- USANDO VARIÁVEL DE AMBIENTE
        { ...newSale, payment_dates },
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      console.log('Resposta do backend após adicionar venda:', res.data);

      setSales([...sales, res.data]);
      setNewSale({ product_line: '', value: '', discount_percent: '', payment_term: '', buyer: '' });
      alert('Venda adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar venda:', error.response?.data || error.message);
      alert('Erro ao adicionar venda. Verifique os dados e tente novamente.');
    }
  };

  // Função para deletar uma venda
  const deleteSale = async (id) => {
    if (!window.confirm('Deseja realmente apagar esta venda?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_BASE_URL}/api/sales/${id}/`, { // <--- USANDO VARIÁVEL DE AMBIENTE
        headers: { Authorization: `Token ${token}` },
      });
      setSales(sales.filter((sale) => sale.id !== id));
      alert('Venda deletada com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar venda:', error.response?.data || error.message);
      alert('Erro ao deletar venda. Verifique se você tem permissão ou tente novamente mais tarde.');
    }
  };

  // Função para calcular a comissão total
  const calculateTotalCommission = () => {
    return sales.reduce((total, sale) => {
      const paymentDatesArray = Array.isArray(sale.payment_dates) ? sale.payment_dates : [];
      const saleCommission = paymentDatesArray.reduce((sum, payment) => sum + (payment.commission || 0), 0);
      return total + saleCommission;
    }, 0);
  };

  // Função para calcular a comissão para o mês selecionado
  const calculateCommissionForSelectedMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let total = 0;
    sales.forEach(sale => {
      const paymentDatesArray = Array.isArray(sale.payment_dates) ? sale.payment_dates : [];
      paymentDatesArray.forEach(payment => {
        const [day, mon, yr] = payment.paymentDate.split('/').map(Number);
        if (yr === year && mon === month && payment.billed) {
          total += payment.commission || 0;
        }
      });
    });
    return total;
  };

  // Função para alternar o status de faturamento
  const toggleBilled = async (saleId, paymentIndex) => {
    const saleToUpdate = sales.find(s => s.id === saleId);
    if (!saleToUpdate) return;

    const updatedSale = {
      ...saleToUpdate,
      payment_dates: saleToUpdate.payment_dates.map((p, idx) =>
        idx === paymentIndex ? { ...p, billed: !p.billed } : p
      ),
    };

    const token = localStorage.getItem('token');
    try {
      await axios.patch( // ou PUT, dependendo da sua API
        `${API_BASE_URL}/api/sales/${saleId}/`, // <--- USANDO VARIÁVEL DE AMBIENTE
        { payment_dates: updatedSale.payment_dates }, // Envie apenas o que mudou ou o objeto completo
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      // Atualiza o estado local após sucesso
      setSales(sales.map(s => s.id === saleId ? updatedSale : s));
    } catch (error) {
      console.error('Erro ao atualizar status de faturamento:', error.response?.data || error.message);
      alert('Erro ao atualizar status de faturamento.');
    }
  };

  // Carrega as vendas ao montar o componente
  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Debug: Verifica o estado de sales
  useEffect(() => {
    console.log('Estado de sales atualizado:', sales);
  }, [sales]);

  return (
    <div className="sales-container">
      <h2 className="title">Minhas Vendas</h2>

      {/* Seletor de mês para cálculo da comissão */}
      <div className="form-group">
        <label>Selecione o mês de pagamento:</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        />
      </div>

      {/* Exibição da Comissão Total */}
      <div className="total-commission">
        <h3>Comissão a receber no salário de {(() => {
          const [year, month] = selectedMonth.split('-').map(Number);
          const nextMonth = month === 12 ? 1 : month + 1;
          const nextYear = month === 12 ? year + 1 : year;
          return `${String(nextMonth).padStart(2, '0')}/${nextYear}`;
        })()}:</h3>
        <p>R$ {calculateCommissionForSelectedMonth().toFixed(2)}</p>
      </div>

      {/* Formulário para adicionar vendas */}
      <form onSubmit={addSale} className="sales-form">
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
        <div className="form-group">
          <label>Valor:</label>
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
            required
          />
        </div>
        <div className="form-group">
          <label>Prazo de Pagamento (dias):</label>
          <select
            value={newSale.payment_term}
            onChange={(e) => setNewSale({ ...newSale, payment_term: e.target.value })} // e.target.value será string
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
            {/* Removido 150 e 180 dias conforme solicitado implicitamente pelas novas opções */}
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
        <button type="submit" className="add-button">
          Adicionar Venda
        </button>
      </form>

      {/* Lista de vendas */}
      <ul className="sales-list">
        {sales.map((sale) => (
          <li key={sale.id} className="sales-item">
            <p><strong>Linha de Produto:</strong> {sale.product_line}</p>
            <p><strong>Valor:</strong> R$ {parseFloat(sale.value).toFixed(2)}</p>
            <p><strong>Desconto (%):</strong> {sale.discount_percent}%</p>
            <p><strong>Comprador:</strong> {sale.buyer}</p>
            <p><strong>Datas de Pagamento:</strong></p>
            <ul>
              {(Array.isArray(sale.payment_dates) ? sale.payment_dates : []).map((payment, index) => (
                <li key={index}>
                  Data: {payment.paymentDate} - Valor: R$ {parseFloat(payment.value).toFixed(2)} - Comissão: R$ {parseFloat(payment.commission).toFixed(2)}
                  <label style={{ marginLeft: 10 }}>
                    <input
                      type="checkbox"
                      checked={!!payment.billed}
                      onChange={() => toggleBilled(sale.id, index)}
                    /> Faturado
                  </label>
                </li>
              ))}
            </ul>
            <button
              onClick={() => deleteSale(sale.id)}
              className="delete-button"
            >
              Apagar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sales;
