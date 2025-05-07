import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/sales/')
      .then(response => {
        setSales(response.data);
      })
      .catch(error => {
        console.error("There was an error fetching the sales data!", error);
      });
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <table>
        <thead>
          <tr>
            <th>Product Line</th>
            <th>Sale Value</th>
            <th>Discount %</th>
            <th>Commission</th>
          </tr>
        </thead>
        <tbody>
          {sales.map(sale => (
            <tr key={sale.id}>
              <td>{sale.product_line}</td>
              <td>{sale.sale_value}</td>
              <td>{sale.discount_percentage}</td>
              <td>{calculateCommission(sale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const calculateCommission = (sale) => {
  // Lógica de comissão aqui (baseada nos dados)
};

export default Dashboard;
