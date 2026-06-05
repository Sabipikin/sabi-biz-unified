const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const businessService = require('../src/services/businessService');
const logger = require('../src/config/logger');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  args.forEach(arg => {
    if (!arg.startsWith('--')) return;
    const [key, value] = arg.slice(2).split('=');
    options[key] = value === undefined ? true : value;
  });
  return options;
}

function usage() {
  console.log('Usage: node scripts/check-whatsapp-milestone.js --userId=<USER_ID> --customerId=<CUSTOMER_ID> [--type=birthday|anniversary] [--send]');
  console.log('Example: node scripts/check-whatsapp-milestone.js --userId=1 --customerId=123 --type=birthday --send');
}

async function main() {
  const options = parseArgs();
  const userId = options.userId || process.env.WHATSAPP_CHECK_USER_ID;
  const customerId = options.customerId || process.env.WHATSAPP_CHECK_CUSTOMER_ID;
  const milestoneType = (options.type || 'birthday').toLowerCase();
  const shouldSend = options.send === true || options.send === 'true' || options.send === '1';

  if (!userId || !customerId) {
    usage();
    process.exit(1);
  }

  if (!['birthday', 'anniversary'].includes(milestoneType)) {
    console.error('Invalid milestone type. Use birthday or anniversary.');
    process.exit(1);
  }

  try {
    console.log('Checking milestone generation for user', userId, 'customer', customerId, 'type', milestoneType);
    const customer = await businessService.getCustomerById(userId, customerId);
    if (!customer) {
      console.error('Customer not found for this user/customer combination.');
      process.exit(1);
    }

    const messageResult = await businessService.generateMilestoneMessage(userId, customerId, milestoneType);
    console.log('Generated message preview:');
    console.log('-----------------------------------');
    console.log(messageResult.message_text);
    console.log('-----------------------------------');
    console.log('Recipient:', customer.phone || 'No phone on customer record');
    console.log('Next milestone date:', messageResult.target_date);

    if (shouldSend) {
      if (!customer.phone) {
        console.error('Customer has no phone number; send aborted.');
        process.exit(1);
      }
      console.log('Sending milestone message...');
      const sendResult = await businessService.sendMilestoneMessage(userId, customerId, milestoneType, messageResult.message_text);
      console.log('Send result:', sendResult);
      console.log('If the environment is configured with WhatsApp credentials, the message was enqueued/sent.');
    } else {
      console.log('Send mode not enabled. Add --send to actually dispatch the message.');
    }

    process.exit(0);
  } catch (error) {
    logger.error('WhatsApp milestone check failed:', error);
    console.error('WhatsApp milestone runtime check failed:', error.message || error);
    process.exit(1);
  }
}

main();
