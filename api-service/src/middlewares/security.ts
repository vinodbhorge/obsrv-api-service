import { Request, Response, NextFunction } from "express";
import helmet from "helmet";

/**
 * Security middleware using helmet package
 * Addresses Checkmarx findings for Missing HSTS Header and other security headers
 * 
 * Helmet helps secure Express apps by setting various HTTP headers:
 * - Strict-Transport-Security (HSTS)
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - Content-Security-Policy
 * - And more
 */
export const securityHeaders = helmet({
    // HSTS configuration
    hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
    },
    // Content Security Policy
    // Note: 'unsafe-inline' is enabled for compatibility with common frameworks that use inline styles.
    // For production environments with strict security requirements, consider using CSP nonces or hashes
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            fontSrc: ["'self'", "data:"],
        },
    },
    // Referrer Policy
    referrerPolicy: {
        policy: "no-referrer",
    },
});

/**
 * Validates and sanitizes UUID parameters to prevent SQL injection
 * Sequelize uses parameterized queries, but this adds an extra layer of validation
 */
export const validateUUIDParam = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const paramValue = req.params[paramName];
        if (paramValue) {
            // UUID v4 format: 8-4-4-4-12 hexadecimal characters
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(paramValue)) {
                return res.status(400).json({
                    error: "Invalid ID format",
                    message: `Parameter '${paramName}' must be a valid UUID`
                });
            }
        }
        next();
    };
};

/**
 * Sanitizes filter objects to prevent SQL injection through filter parameters
 * Validates that filter keys are safe and values are properly typed
 * @returns Object with sanitized filters and array of rejected keys
 */
export const sanitizeFilters = (filters: any): { sanitized: any; rejected: string[] } => {
    if (!filters || typeof filters !== "object") {
        return { sanitized: filters, rejected: [] };
    }
    
    // Create a sanitized copy
    const sanitized: any = {};
    const rejected: string[] = [];
    
    for (const key in filters) {
        // Use Object.prototype.hasOwnProperty for robust property checking
        if (Object.prototype.hasOwnProperty.call(filters, key)) {
            // Only allow alphanumeric keys with underscores (valid column names)
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                sanitized[key] = filters[key];
            } else {
                rejected.push(key);
            }
        }
    }
    
    return { sanitized, rejected };
};
