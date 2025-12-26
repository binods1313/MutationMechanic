import { logger } from '../../src/utils/logger.js';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Logger Utility', () => {

    let debugSpy: any;
    let infoSpy: any;
    let warnSpy: any;
    let errorSpy: any;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => { });
        infoSpy = jest.spyOn(console, 'info').mockImplementation(() => { });
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        originalEnv = { ...process.env };
        // Clear log related env vars for clean start
        delete process.env.LOG_LEVEL;
        delete process.env.DEBUG;
        delete process.env.ENABLE_TEST_LOGS;
    });

    afterEach(() => {
        debugSpy.mockRestore();
        infoSpy.mockRestore();
        warnSpy.mockRestore();
        errorSpy.mockRestore();
        process.env = originalEnv;
    });

    it('should not log by default in test environment', () => {
        process.env.NODE_ENV = 'test';
        logger.info('test');
        expect(infoSpy).not.toHaveBeenCalled();
    });

    it('should log if ENABLE_TEST_LOGS is set', () => {
        process.env.NODE_ENV = 'test';
        process.env.ENABLE_TEST_LOGS = 'true';
        logger.info('test');
        expect(infoSpy).toHaveBeenCalled();
    });

    it('should respect LOG_LEVEL=error (only log error)', () => {
        process.env.NODE_ENV = 'development';
        process.env.LOG_LEVEL = 'error';
        process.env.ENABLE_TEST_LOGS = 'true'; // Allow logging in tests

        logger.debug('test');
        logger.info('test');
        logger.warn('test');
        logger.error('test');

        expect(debugSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalled();
    });

    it('should redact sensitive information in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.LOG_LEVEL = 'debug';
        process.env.ENABLE_TEST_LOGS = 'true';

        const sensitiveData = {
            user: 'test',
            password: 'secret_password_123',
            token: 'abc-123-def',
            nested: {
                apiKey: 'key-999'
            }
        };

        logger.info('User login', sensitiveData);

        const callArgs = infoSpy.mock.calls[0];
        const loggedObject = callArgs[2];

        expect(loggedObject.password).toBe('[REDACTED]');
        expect(loggedObject.token).toBe('[REDACTED]');
        expect(loggedObject.nested.apiKey).toBe('[REDACTED]');
        expect(loggedObject.user).toBe('test');
    });

    it('should NOT redact if DEBUG=true even in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.DEBUG = 'true';
        process.env.ENABLE_TEST_LOGS = 'true';

        const sensitiveData = { password: '123' };
        logger.info(sensitiveData);

        const loggedObject = infoSpy.mock.calls[0][1];
        expect(loggedObject.password).toBe('123');
    });
});
