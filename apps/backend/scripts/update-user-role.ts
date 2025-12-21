import { DataSource } from 'typeorm';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'discite_db',
  });

  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Connected!\n');

    // Show all users
    const users = await AppDataSource.query(
      'SELECT id, email, name, role FROM users ORDER BY "createdAt" ASC'
    );

    console.log('Current users:');
    console.table(users);

    const email = await question('\nEnter the email of the user to update to SUPERADMIN: ');

    if (!email) {
      console.log('No email provided. Exiting...');
      process.exit(0);
    }

    // Update the user's role
    const result = await AppDataSource.query(
      `UPDATE users SET role = 'SUPERADMIN' WHERE email = $1 RETURNING id, email, name, role`,
      [email]
    );

    if (result.length === 0) {
      console.log(`\nNo user found with email: ${email}`);
    } else {
      console.log('\n✅ User updated successfully:');
      console.table(result);
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
