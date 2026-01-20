/**
 * Database Seed Script
 * Creates sample data for development and testing
 */

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample users
  const passwordHash = await bcrypt.hash('Password123!', 12);

  // Create a candidate
  const candidate = await prisma.user.upsert({
    where: { email: 'candidate@example.com' },
    update: {},
    create: {
      email: 'candidate@example.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      role: 'CANDIDATE',
      phone: '+1234567890',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
    },
  });
  console.log('✅ Created candidate:', candidate.email);

  // Create a recruiter
  const recruiter = await prisma.user.upsert({
    where: { email: 'recruiter@example.com' },
    update: {},
    create: {
      email: 'recruiter@example.com',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'RECRUITER',
      phone: '+1987654321',
    },
  });
  console.log('✅ Created recruiter:', recruiter.email);

  // Create sample jobs
  const jobs = [
    {
      title: 'Senior Full Stack Developer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA (Remote)',
      salary: '$150,000 - $200,000',
      jobType: 'FULL_TIME',
      description: `We are looking for a Senior Full Stack Developer to join our team.

Requirements:
- 5+ years of experience in full-stack development
- Strong proficiency in React, Node.js, TypeScript
- Experience with PostgreSQL and Redis
- Familiarity with cloud platforms (AWS, GCP)
- Experience with Docker and Kubernetes
- Strong problem-solving skills

Nice to have:
- Experience with GraphQL
- Knowledge of machine learning concepts
- Open source contributions

Benefits:
- Competitive salary
- Health insurance
- Remote work flexibility
- Learning budget`,
    },
    {
      title: 'Machine Learning Engineer',
      company: 'AI Innovations Ltd.',
      location: 'New York, NY',
      salary: '$180,000 - $250,000',
      jobType: 'FULL_TIME',
      description: `Join our ML team to build cutting-edge AI solutions.

Requirements:
- MS/PhD in Computer Science or related field
- 3+ years of experience in ML/AI
- Proficiency in Python, TensorFlow, PyTorch
- Experience with NLP and computer vision
- Strong mathematical background

Nice to have:
- Publications in top ML conferences
- Experience with large language models
- Kubernetes and MLOps experience`,
    },
    {
      title: 'Frontend Developer',
      company: 'StartupXYZ',
      location: 'Austin, TX (Hybrid)',
      salary: '$100,000 - $140,000',
      jobType: 'FULL_TIME',
      description: `We need a talented Frontend Developer for our growing team.

Requirements:
- 3+ years of frontend development experience
- Expert in React and TypeScript
- Experience with state management (Redux, Zustand)
- CSS expertise (Tailwind, styled-components)
- Understanding of accessibility and performance

Benefits:
- Stock options
- Flexible hours
- Home office setup allowance`,
    },
  ];

  for (const jobData of jobs) {
    const job = await prisma.job.create({
      data: {
        ...jobData,
        recruiterId: recruiter.id,
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
    });
    console.log('✅ Created job:', job.title);
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('   Candidate: candidate@example.com / Password123!');
  console.log('   Recruiter: recruiter@example.com / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
