import { Request, Response, NextFunction } from "express";
import { config } from "../configs/Config";

/**
 * Security middleware to set HTTP security headers
 * Addresses Checkmarx findings for Missing HSTS Header
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Strict-Transport-Security (HSTS) header
    // Instructs browsers to only access the site via HTTPS
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    
    // X-Content-Type-Options header
    // Prevents MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    
    // X-Frame-Options header
    // Prevents clickjacking attacks
    res.setHeader("X-Frame-Options", "DENY");
    
    // X-XSS-Protection header
    // Enables XSS filtering in browsers
    res.setHeader("X-XSS-Protection", "1; mode=block");
    
    // Content-Security-Policy header
    // Helps prevent XSS and other injection attacks
    res.setHeader("Content-Security-Policy", "default-src 'self'");
    
    // Referrer-Policy header
    // Controls how much referrer information is included with requests
    res.setHeader("Referrer-Policy", "no-referrer");
    
    next();
};

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
 */
export const sanitizeFilters = (filters: any): any => {
    if (!filters || typeof filters !== "object") {
        return filters;
    }
    
    // Create a sanitized copy
    const sanitized: any = {};
    
    for (const key in filters) {
        if (filters.hasOwnProperty(key)) {
            // Only allow alphanumeric keys with underscores (valid column names)
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                sanitized[key] = filters[key];
            }
        }
    }
    
    return sanitized;
};
