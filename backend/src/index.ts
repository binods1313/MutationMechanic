import { app } from './server.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    logger.log(`MutationMechanic backend server running on port ${PORT}`);
    logger.log(`Health check: http://localhost:${PORT}/api/health`);
});
