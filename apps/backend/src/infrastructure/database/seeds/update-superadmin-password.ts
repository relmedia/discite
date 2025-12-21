import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../entities/user.entity';

export async function updateSuperadminPassword(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(UserEntity);

  const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'ariel@relmedia.no';
  const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Prestastubben4@';

  console.log('🔐 Updating superadmin password...');

  // Find the superadmin user
  const superadmin = await userRepository.findOne({
    where: { email: SUPERADMIN_EMAIL },
  });

  if (!superadmin) {
    console.error('❌ Superadmin not found with email:', SUPERADMIN_EMAIL);
    return;
  }

  // Hash the new password
  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

  // Update the password
  await userRepository.update(
    { email: SUPERADMIN_EMAIL },
    { passwordHash }
  );

  console.log('✅ Superadmin password updated successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:', SUPERADMIN_EMAIL);
  console.log('🔑 New Password:', SUPERADMIN_PASSWORD);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
