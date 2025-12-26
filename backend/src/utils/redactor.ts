/**
 * Redacts sensitive PII and clinical data from objects
 */
export const redactSensitive = (data: any): any => {
    if (!data || typeof data !== 'object') return data;

    const redacted = structuredClone(data);

    // Recursive redaction for nested objects
    const redactInternal = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;

        // Redact PII fields
        if (obj.name && typeof obj.name === 'string') obj.name = '[REDACTED]';
        if (obj.email && typeof obj.email === 'string') obj.email = '[REDACTED]';
        if (obj.ipAddress && typeof obj.ipAddress === 'string') obj.ipAddress = 'xxx.xxx.xxx.xxx';

        // Redact sensitive clinical data (e.g. MRN)
        if (obj.patientId && typeof obj.patientId === 'string' && obj.patientId.startsWith('MRN-')) {
            obj.patientId = `${obj.patientId.slice(0, 4)}****`;
        }

        // Process nested objects/arrays
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                redactInternal(obj[key]);
            }
        }
    };

    redactInternal(redacted);
    return redacted;
};

/**
 * Creates an audit log entry with redacted data
 */
export const auditAction = async (
    prisma: any,
    action: string,
    entityId: string,
    entityType: string,
    oldValues?: any,
    newValues?: any,
    userId?: string
) => {
    try {
        const auditData = {
            action,
            entityId,
            entityType: entityType.charAt(0).toUpperCase() + entityType.slice(1).replace(/s$/, ''), // variant -> Variant
            oldValues: oldValues ? redactSensitive(oldValues) : null,
            newValues: newValues ? redactSensitive(newValues) : null,
            userId
        };

        await prisma.auditLog.create({ data: auditData });
    } catch (error) {
        // We don't want audit logging failures to crash the main request
        console.error('Audit Log Failure:', error);
    }
};
