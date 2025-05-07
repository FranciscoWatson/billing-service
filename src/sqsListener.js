const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { generatePaymentLink } = require('./paymentLinkGenerator');
const { pool } = require('./db');

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const queueUrl = process.env.SQS_QUEUE_URL;

async function listenToQueue() {
  console.log('👂 Listening to Billing SQS queue...');

  setInterval(async () => {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 5,
        })
      );

      if (!response.Messages) {
        console.log('📭 No messages received.');
        return;
      }

      for (const message of response.Messages) {
        // --- Parseo robusto ---
        const body  = JSON.parse(message.Body);
        const event = body.Message ? JSON.parse(body.Message) : body;

        console.log('📚 Parsed event:', event);

        // --- Usá directamente el ID del turno ---
        const appointmentId = event.id;
        if (!appointmentId) {
          console.warn('⚠️ Event sin id, lo descarto.');
        } else {
          const { link } = generatePaymentLink(appointmentId);

          await pool.query(
            'INSERT INTO payments (appointment_id, amount, status) VALUES ($1, $2, $3)',
            [appointmentId, 20000, 'pending']
          );

          console.log(`💾 Insertado pago pendiente para cita ${appointmentId}`);
          console.log(`🔗 Link generado: ${link}`);
        }

        // --- Borrar el mensaje de la cola ---
        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          })
        );
        console.log('🗑️ Message deleted from queue.');
      }
    } catch (err) {
      console.error('🔥 Error processing SQS messages:', err);
    }
  }, 5000);
}

module.exports = { listenToQueue };
