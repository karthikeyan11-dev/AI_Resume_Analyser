import prisma from './src/config/database';

async function cleanup() {
  // Delete all failed resumes
  const deleted = await prisma.resume.deleteMany({
    where: { status: 'FAILED' }
  });
  
  console.log('Deleted', deleted.count, 'failed resumes');
  
  await prisma.$disconnect();
}

cleanup();
