import dotenv from 'dotenv';
import { connectDB } from '../src/lib/mongodb.js';
import { createReminder } from '../src/services/reminder-scheduler.js';

// Load environment variables
dotenv.config();

const PHONE_NUMBER = '+917018224197';
const USER_ID = 'user_test_123';

async function generateDummyReminders() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    console.log('📝 Generating dummy reminders...\n');

    const reminders = [
      {
        what: 'Take KALLA KHATTA morning medicine',
        time: '12:08 PM',
        frequency: 'daily'
      },
      {
        what: 'Take evening medicine',
        time: '8:00 PM',
        frequency: 'daily'
      },
      {
        what: 'Doctor appointment reminder',
        time: '2:00 PM',
        frequency: 'once'
      },
      {
        what: 'Exercise routine',
        time: '6:00 AM',
        frequency: 'daily'
      },
      {
        what: 'Weekly health checkup',
        time: '10:00 AM',
        frequency: 'weekly'
      },
      {
        what: 'Take vitamin supplements',
        time: 'after dinner',
        frequency: 'daily'
      },
      {
        what: 'Blood pressure check',
        time: '7:00 PM',
        frequency: 'twice a day'
      },
      {
        what: 'Monthly medication refill',
        time: '11:00 AM',
        frequency: 'monthly'
      }
    ];

    const createdReminders = [];

    for (const reminder of reminders) {
      try {
        const created = await createReminder(
          PHONE_NUMBER,
          reminder.what,
          reminder.time,
          reminder.frequency,
          USER_ID
        );
        createdReminders.push(created);
        console.log(`✅ Created: ${reminder.what} at ${reminder.time} (${reminder.frequency})`);
        console.log(`   Next call: ${new Date(created.nextCallTime).toLocaleString()}`);
        console.log(`   ID: ${created.id}\n`);
      } catch (error) {
        console.error(`❌ Failed to create reminder "${reminder.what}":`, error.message);
      }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Successfully created ${createdReminders.length} reminder(s)`);
    console.log(`📱 Phone Number: ${PHONE_NUMBER}`);
    console.log(`👤 User ID: ${USER_ID}`);
    console.log('═══════════════════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating reminders:', error);
    process.exit(1);
  }
}

generateDummyReminders();

