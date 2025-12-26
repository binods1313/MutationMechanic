# MutationMechanic Backend

This is the backend server for the MutationMechanic project, providing database persistence, user management, and collaboration features for the genomics analysis platform.

## Features

- **Database Persistence**: PostgreSQL database with Prisma ORM for all analysis data
- **User Management**: User accounts and preferences
- **Analysis Storage**: Persist variant analysis, structural predictions, and clinical interpretations
- **Collaboration**: Sharing and commenting on analyses
- **History Tracking**: Maintain analysis history with detailed records
- **Splicing Analysis**: Specialized storage for splicing predictions
- **Protein Structures**: Store 3D protein structure data (PDB format)

## Tech Stack

- **Runtime**: Node.js with Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Language**: TypeScript
- **API**: RESTful endpoints

## Prerequisites

- Node.js 18 or higher
- PostgreSQL database (local or remote)
- npm or yarn package manager

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (copy `.env.example` to `.env`):
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/mutationmechanic"
FRONTEND_URL="http://localhost:3000"
PORT=5000
```

3. Generate Prisma client:
```bash
npm run db:generate
```

4. Push database schema:
```bash
npm run db:push
```

## Running the Server

- **Development**: `npm run dev` (with auto-restart)
- **Production**: `npm run build && npm start`

## API Endpoints

- `GET /api/health` - Health check (returns JSON with app and database status)

## Testing

The backend includes a comprehensive test suite using Jest and Supertest.

1. **Run all tests**:
```bash
npm test
```

2. **Unit Tests**:
- `tests/unit/logger.test.ts`: Verifies secure logging and redaction.
- `tests/unit/health.test.ts`: Verifies health check status logic.

3. **Integration Tests**:
- `tests/integration/api.test.ts`: Verifies core API endpoints for Users and Analyses.
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user details
- `POST /api/analyses` - Create analysis
- `GET /api/analyses` - Get user analyses
- `GET /api/analyses/:id` - Get specific analysis
- `POST /api/history` - Create history record
- `GET /api/history/:userId` - Get user history
- `POST /api/splicing` - Create splicing analysis
- `POST /api/share` - Share analysis
- `POST /api/comments` - Add comment
- `GET /api/comments/:analysisId` - Get comments for analysis

## Database Schema

The Prisma schema includes models for:
- Users
- Analyses (variant analysis data)
- History records
- Splicing analyses
- Shared access
- Comments
- User preferences
- Protein structures