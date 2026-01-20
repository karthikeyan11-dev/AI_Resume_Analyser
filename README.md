# 🚀 AI Resume Analyzer Platform

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

**An AI-powered Resume & Job Matching Platform built for production**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [API Documentation](#-api-documentation) • [Architecture](#-architecture) • [Interview Guide](#-interview-talking-points)

</div>

---

## 📋 Overview

This is a **production-grade, interview-ready** full-stack application that leverages AI to:

- 📄 **Analyze resumes** with PDF parsing and GPT-4 powered extraction
- 🎯 **Match candidates to jobs** using semantic embeddings and cosine similarity
- 📊 **Generate ATS compatibility scores** with actionable improvement suggestions
- 🔍 **Identify skill gaps** and recommend learning paths
- 👥 **Support dual personas** - Candidates and Recruiters with role-based dashboards

---

## ✨ Features

### For Candidates
- **Resume Upload & Analysis**: Upload PDF resumes and get instant AI-powered analysis
- **ATS Score**: Get a 0-100 ATS compatibility score with specific issue identification
- **Skill Extraction**: Automatic extraction of skills, experience, and education
- **Job Matching**: Find jobs that match your profile with semantic matching
- **Skill Gap Analysis**: Identify missing skills and get personalized recommendations
- **Learning Paths**: Course and resource recommendations to improve your profile

### For Recruiters
- **Job Posting Management**: Create, edit, publish, and close job postings
- **AI Job Analysis**: Automatic extraction of requirements, skills, and keywords
- **Candidate Matching**: Find the best candidates for each position
- **Candidate Pipeline**: Shortlist, reject, and manage candidate applications
- **Analytics Dashboard**: Track job performance and candidate metrics

### Technical Features
- **JWT Authentication**: Secure access + refresh token system
- **Role-Based Access Control**: Candidate, Recruiter, and Admin roles
- **Background Processing**: BullMQ for async AI processing
- **Redis Caching**: Improved performance for frequently accessed data
- **Semantic Search**: OpenAI embeddings for intelligent matching
- **RESTful API**: Well-documented API with consistent responses

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Tailwind CSS** | Styling |
| **Zustand** | State Management |
| **React Query** | Data Fetching & Caching |
| **React Router** | Navigation |
| **Chart.js** | Data Visualization |
| **Lucide React** | Icons |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **Express.js** | Web Framework |
| **TypeScript** | Type Safety |
| **Prisma** | ORM |
| **PostgreSQL** | Database |
| **Redis** | Caching |
| **BullMQ** | Job Queue |
| **OpenAI API** | AI Processing |
| **JWT** | Authentication |
| **Zod** | Validation |

### DevOps
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Orchestration |
| **GitHub Actions** | CI/CD |
| **Winston** | Logging |

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL 14+
- Redis 7+
- OpenAI API Key
- npm or yarn

### Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-resume-analyzer.git
cd ai-resume-analyzer
```

#### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration:
# - DATABASE_URL: Your PostgreSQL connection string
# - OPENAI_API_KEY: Your OpenAI API key
# - JWT secrets: Generate secure random strings

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed the database (optional)
npm run db:seed

# Start development server
npm run dev
```

#### 3. Frontend Setup

```bash
# Navigate to frontend (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/v1
- **API Health**: http://localhost:5000/api/v1/health

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Demo Credentials

After running the seed script:

| Role | Email | Password |
|------|-------|----------|
| Candidate | candidate@example.com | Password123! |
| Recruiter | recruiter@example.com | Password123! |

---

## 📡 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout user |
| GET | `/api/v1/auth/me` | Get current user profile |
| PATCH | `/api/v1/auth/me` | Update profile |

### Resume Endpoints (Candidate)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/resumes` | Upload resume |
| GET | `/api/v1/resumes` | Get user's resumes |
| GET | `/api/v1/resumes/:id` | Get resume details |
| DELETE | `/api/v1/resumes/:id` | Delete resume |
| POST | `/api/v1/resumes/:id/reprocess` | Retry failed processing |

### Job Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/jobs/active` | Get active jobs (public) |
| POST | `/api/v1/jobs` | Create job (Recruiter) |
| GET | `/api/v1/jobs` | Get jobs |
| GET | `/api/v1/jobs/:id` | Get job details |
| PATCH | `/api/v1/jobs/:id` | Update job (Recruiter) |
| DELETE | `/api/v1/jobs/:id` | Delete job (Recruiter) |
| POST | `/api/v1/jobs/:id/publish` | Publish job (Recruiter) |

### Matching Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/matches/jobs/:resumeId` | Get matching jobs for resume |
| GET | `/api/v1/matches/candidates/:jobId` | Get matching candidates (Recruiter) |
| PATCH | `/api/v1/matches/:matchId/status` | Update match status (Recruiter) |
| GET | `/api/v1/matches/skill-gaps` | Get user's skill gaps |
| GET | `/api/v1/matches/recommendations` | Get recommendations |

### Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React Frontend                         │   │
│  │    ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐       │   │
│  │    │ Pages  │  │Components│ │ Store  │  │  API   │       │   │
│  │    └────────┘  └────────┘  └────────┘  └────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Express.js Server                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │   │
│  │  │  Routes  │  │Middleware│  │Controllers│  │ Services │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  PostgreSQL │      │    Redis    │      │  OpenAI API │
│  (Primary)  │      │  (Cache)    │      │    (AI)     │
└─────────────┘      └─────────────┘      └─────────────┘
         ▲                    ▲
         │                    │
         │              ┌─────────────┐
         └──────────────│   BullMQ    │
                        │  (Workers)  │
                        └─────────────┘
```

### Database Schema

```
┌─────────────────┐     ┌─────────────────┐
│      Users      │     │     Resumes     │
├─────────────────┤     ├─────────────────┤
│ id              │────<│ userId          │
│ email           │     │ fileName        │
│ passwordHash    │     │ fileUrl         │
│ firstName       │     │ rawText         │
│ lastName        │     │ status          │
│ role            │     └────────┬────────┘
└────────┬────────┘              │
         │              ┌────────▼────────┐
         │              │ ResumeAnalysis  │
         │              ├─────────────────┤
         │              │ skills          │
         │              │ skillsEmbedding │
         │              │ atsScore        │
         │              │ experienceLevel │
         │              └─────────────────┘
         │
         │     ┌─────────────────┐
         └────>│      Jobs       │
               ├─────────────────┤
               │ recruiterId     │
               │ title           │
               │ company         │
               │ description     │
               │ status          │
               └────────┬────────┘
                        │
               ┌────────▼────────┐
               │  JobAnalysis    │
               ├─────────────────┤
               │ requiredSkills  │
               │ skillsEmbedding │
               │ experienceLevel │
               └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│   MatchScores   │     │   SkillGaps     │
├─────────────────┤     ├─────────────────┤
│ resumeId        │     │ resumeId        │
│ jobId           │     │ jobId           │
│ overallScore    │     │ missingSkills   │
│ skillMatchScore │     │ learningPath    │
│ status          │     │ recommendations │
└─────────────────┘     └─────────────────┘
```

### Backend Clean Architecture

```
src/
├── config/          # Configuration and database clients
├── controllers/     # HTTP request handlers
├── middlewares/     # Auth, validation, error handling
├── routes/          # API route definitions
├── services/        # Business logic layer
├── jobs/            # Background job processors
├── utils/           # Helper functions and utilities
└── app.ts           # Application entry point
```

---

## 🎯 Interview Talking Points

### System Design Questions

**Q: How does the matching algorithm work?**
> The matching system uses OpenAI's text-embedding-3-small model to generate vector embeddings for both resume skills and job requirements. We then calculate cosine similarity between these vectors for semantic matching. The final score is a weighted combination of skill match (40%), experience (25%), education (15%), and keyword overlap (20%).

**Q: How do you handle scalability?**
> - **Async Processing**: AI operations are offloaded to BullMQ workers to prevent blocking HTTP requests
> - **Redis Caching**: Frequently accessed data is cached with appropriate TTLs
> - **Database Indexing**: Strategic indexes on frequently queried columns
> - **Pagination**: All list endpoints support pagination
> - **Connection Pooling**: Prisma manages database connection pooling

**Q: How is authentication handled?**
> We use a JWT-based system with access and refresh tokens. Access tokens expire in 15 minutes, while refresh tokens last 7 days. Refresh tokens are stored in the database and can be revoked. The system supports token rotation on refresh.

### Backend Engineering

**Q: Explain the AI integration architecture.**
> - System prompts ensure consistent JSON output from GPT-4
> - Response validation with fallback handling
> - Retry logic with exponential backoff for API failures
> - Structured extraction for skills, experience, and recommendations

**Q: How do you ensure data consistency?**
> - Prisma handles transactions for complex operations
> - Cascade deletes maintain referential integrity
> - Validation at both API and database levels
> - Proper error handling with rollback on failures

### Frontend Engineering

**Q: State management approach?**
> We use Zustand for global state (auth) and React Query for server state. This separation allows for optimistic updates, automatic caching, and background refetching while keeping the store lightweight.

**Q: Component architecture?**
> - Feature-based organization with pages and components
> - Reusable UI components with Tailwind utility classes
> - Custom hooks for shared logic
> - Protected routes with role-based rendering

---

## 📁 Project Structure

```
ai-resume-analyzer/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data
│   ├── src/
│   │   ├── config/          # Configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── middlewares/     # Express middlewares
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── jobs/            # Background workers
│   │   ├── utils/           # Utilities
│   │   └── app.ts           # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand stores
│   │   ├── App.tsx          # Main app
│   │   └── main.tsx         # Entry point
│   ├── Dockerfile
│   └── package.json
├── .github/
│   └── workflows/
│       └── ci.yml           # CI/CD pipeline
├── docker-compose.yml
└── README.md
```

---

## 🔒 Environment Variables

### Backend (.env)

```env
# Server
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/resume_analyzer

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OpenAI
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4-turbo-preview

# CORS
FRONTEND_URL=http://localhost:3000
```

---

## 📈 Future Improvements

- [ ] Real-time notifications with WebSockets
- [ ] Email notifications for matches
- [ ] Resume version history
- [ ] Bulk resume processing
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Multi-language support
- [ ] Mobile app

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) for GPT-4 and embeddings API
- [Prisma](https://prisma.io) for the excellent ORM
- [Tailwind CSS](https://tailwindcss.com) for utility-first styling
- [Lucide](https://lucide.dev) for beautiful icons

---

<div align="center">

**Built with ❤️ for the developer community**

[⬆ Back to Top](#-ai-resume-analyzer-platform)

</div>
