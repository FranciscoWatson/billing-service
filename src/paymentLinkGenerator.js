
function generatePaymentLink(appointmentId) {
    const link = `${process.env.FRONT_PAYMENT_URL}/${appointmentId}`;
    return { appointmentId, link };
  }

module.exports = { generatePaymentLink };
