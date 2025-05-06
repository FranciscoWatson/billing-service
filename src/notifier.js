const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({ region: process.env.AWS_REGION });

async function sendPaymentApprovedMessage(paymentId, appointmentId) {
  const command = new PublishCommand({
    TopicArn: process.env.SNS_BILLING_TOPIC_ARN,
    Subject: 'payment-approved',
    Message: JSON.stringify({
      eventType: 'payment-approved',
      data: {
        paymentId,
        appointmentId,
      },
    }),
  });

  await snsClient.send(command);
  console.log('✅ Sent payment-approved event for appointment:', appointmentId);
}

module.exports = { sendPaymentApprovedMessage };
