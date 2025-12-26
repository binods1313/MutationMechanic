# Backend Enhancements: Health, Logging, and Testing

This document details the improvements made to backend reliability, observability, and test coverage.

## Environment Variables

The backend requires the following environment variables. Create a `.env` file in the `backend/` directory based on the example below:

```env
# Database connection (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Server Port
PORT=5000

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"

# Log Configuration
# Levels: debug, info, warn, error
LOG_LEVEL="info"
# Set to "true" to see all logs including sensitive data redaction bypass
DEBUG="false"
```

## Health Endpoint

The `/api/health` endpoint provides a JSON objective status of the application and its database connectivity.

**Path:** `/api/health`  
**Method:** `GET`  
**Response Format:**
```json
{
  "app": "ok",
  "db": "ok",
  "timestamp": "2025-12-20T21:10:53.175Z"
}
```
Possible `db` values:
- `ok`: Database is reachable and queryable.
- `unavailable`: Database connection failed or query timed out.

## Testing

The project uses Jest with ESM support for unit and integration testing.

### Running Tests Locally

Navigate to the `backend/` directory and run:

```bash
npm test
```

### Test Coverage

1. **Unit Tests (`tests/unit/`)**:
   - `logger.test.ts`: Verifies log levels, environment gating, and automatic sensitive data redaction.
   - `health.test.ts`: Verifies the health check logic by mocking database states.

2. **Integration Tests (`tests/integration/`)**:
   - `api.test.ts`: Verifies that core endpoints (`/api/users/:id`, `/api/analyses/:id`) return consistent JSON objects for both success and error cases.

## Logging Utility

The internal logger (`src/utils/logger.ts`) is designed for security and modern environment usage:
- **Redaction**: In production, sensitive keys like `password`, `token`, and `apikey` are automatically redacted from objects.
- **Levels**: Supports `debug`, `info`, `warn`, and `error`.
- **Filtering**: Logs are filtered based on the `LOG_LEVEL` environment variable.
