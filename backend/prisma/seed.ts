import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const email = 'admin@licitanalytics.com';
  const plainPassword = 'Admin@2026!';

  const hashed = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Administrador',
      email,
      password: hashed,
      role: UserRole.ADMIN,
    },
  });

  console.log(`✅ Usuário criado: ${user.email} (${user.role})`);
  console.log(`   Senha inicial : ${plainPassword}`);
  console.log('');
  console.log('⚠️  Altere a senha após o primeiro login.');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
