const express = require('express');
const { pool } = require('../db');
const { sendPaymentApprovedMessage } = require('../notifier');

const router = express.Router();

// Nuevo GET para traer datos del turno
router.get('/payments/:appointmentId', async (req, res) => {
  const { appointmentId } = req.params;
  const appointmentIdInt = parseInt(appointmentId, 10);

  if (isNaN(appointmentIdInt)) {
    return res.status(400).json({ error: 'Invalid appointmentId' });
  }

  try {
    const result = await pool.query(
      'SELECT payment_id, amount, status FROM payments WHERE appointment_id = $1',
      [appointmentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const payment = result.rows[0];
    res.json({ appointmentId, paymentId: payment.payment_id, amount: payment.amount, status: payment.status });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST para pagar, usando appointmentId
router.post('/pay', async (req, res) => {
  const { appointmentId } = req.body;

  if (!appointmentId) {
    return res.status(400).json({ error: 'appointmentId is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE payments SET status = $1 WHERE appointment_id = $2 RETURNING payment_id',
      ['paid', appointmentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const paymentId = result.rows[0].payment_id;

    // Enviar evento payment-approved
    await sendPaymentApprovedMessage(paymentId, appointmentId);

    res.status(200).json({ message: 'Payment successful', appointmentId });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
