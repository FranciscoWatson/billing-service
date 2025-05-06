const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { generatePaymentLink } = require('./paymentLinkGenerator');
const { pool } = require('./db');

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const queueUrl = process.env.SQS_QUEUE_URL; // cola donde llegan los appointment-created

async function listenToQueue() {
  console.log('Listening to Billing SQS queue...');

  setInterval(async () => {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 5,
      });

      const response = await sqsClient.send(command);

      if (response.Messages) {
        for (const message of response.Messages) {
          const body = JSON.parse(message.Body);
          const event = JSON.parse(body.Message);

          console.log('Received appointment event:', event);

          if (event.eventType === 'appointment-created') {
            const { appointmentId } = event.data;
            const { link } = generatePaymentLink(appointmentId);

            // Guardar en PostgreSQL
            await pool.query(
                'INSERT INTO payments (appointment_id, amount, status) VALUES ($1, $2, $3)',
                [appointmentId, 20000, 'pending']
              );              

            console.log('✅ Generated payment link:', link);
          }

          await sqsClient.send(new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }));
        }
      }
    } catch (err) {
      console.error('Error processing SQS messages:', err);
    }
  }, 5000);
}

module.exports = { listenToQueue };
