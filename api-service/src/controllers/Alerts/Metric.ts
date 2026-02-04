import _ from "lodash";
import { Request, Response, NextFunction } from "express";
import { ResponseHandler } from "../../helpers/ResponseHandler";
import { Metrics } from "../../models/Metric";
import httpStatus from "http-status";
import errorResponse from "http-errors";
import { updateTelemetryAuditEvent } from "../../services/telemetry";
import { sanitizeFilters } from "../../middlewares/security";

const telemetryObject = { type: "metric", ver: "1.0.0" };

/**
 * Validates UUID format to prevent SQL injection
 * Note: Sequelize uses parameterized queries, this is defense in depth
 */
const validateUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

const createMetricHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { component } = req.body;
        const metricsBody = await Metrics.create({ ...(req.body), component: component });
        updateTelemetryAuditEvent({ request: req, object: { id: metricsBody?.dataValues?.id, ...telemetryObject } });
        ResponseHandler.successResponse(req, res, { status: httpStatus.OK, data: { id: metricsBody.dataValues.id } });
    } catch (error: any) {
        let errorMessage = _.get(error, "message")
        if (_.get(error, "name") == "SequelizeUniqueConstraintError") {
            errorMessage = _.get(error, "parent.detail")
        }
        next(errorResponse((httpStatus.INTERNAL_SERVER_ERROR, { message: errorMessage })))
    }
}

const listMetricsHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { limit, filters, offset } = _.get(req.body, "request") || {};
        // Sanitize filters to prevent SQL injection through filter parameters
        const sanitizedFilters = filters ? sanitizeFilters(filters) : undefined;
        // Sequelize automatically parameterizes this query, safe from SQL injection
        const metricsPayload = await Metrics.findAll({ limit: limit, offset: offset, ...(sanitizedFilters && { where: sanitizedFilters }) });
        ResponseHandler.successResponse(req, res, { status: httpStatus.OK, data: { metrics: metricsPayload, count: metricsPayload.length } });
    } catch (error) {
        const errorMessage = _.get(error, "message")
        next(errorResponse((httpStatus.INTERNAL_SERVER_ERROR, { message: errorMessage })))
    }
}

const updateMetricHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        // Input validation to prevent SQL injection - defense in depth
        if (!validateUUID(id)) {
            return next({ message: "Invalid ID format", statusCode: httpStatus.BAD_REQUEST });
        }
        const toUpdatePayload = req.body;
        const { component } = toUpdatePayload;
        const isEmpty = _.isEmpty(toUpdatePayload);
        if (isEmpty) throw new Error("Failed to update record");
        // Sequelize automatically parameterizes this query, safe from SQL injection
        const record = await Metrics.findOne({ where: { id } });
        if (!record) throw new Error(httpStatus[httpStatus.NOT_FOUND]);
        updateTelemetryAuditEvent({ request: req, object: { id, ...telemetryObject }, currentRecord: record })
        await Metrics.update({ ...toUpdatePayload, ...(component) && { component: _.toLower(component) } }, {
            where: { id }
        });
        ResponseHandler.successResponse(req, res, { status: httpStatus.OK, data: { id } });
    } catch (error) {
        let errorMessage = _.get(error, "message")
        if (_.get(error, "name") == "SequelizeUniqueConstraintError") {
            errorMessage = _.get(error, "parent.detail")
        }
        next(errorResponse((httpStatus.INTERNAL_SERVER_ERROR, { message: errorMessage })))
    }
}

const deleteMetricHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        // Input validation to prevent SQL injection - defense in depth
        if (!validateUUID(id)) {
            return next({ message: "Invalid ID format", statusCode: httpStatus.BAD_REQUEST });
        }
        // Sequelize automatically parameterizes this query, safe from SQL injection
        const record = await Metrics.findOne({ where: { id } });
        if (!record) throw new Error(httpStatus[httpStatus.NOT_FOUND]);
        await record.destroy();
        ResponseHandler.successResponse(req, res, { status: httpStatus.OK, data: { id } });
    } catch (error) {
        const errorMessage = _.get(error, "message")
        next(errorResponse((httpStatus.INTERNAL_SERVER_ERROR, { message: errorMessage })))
    }
}

const deleteMultipleMetricHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { filters } = req.body;
        if (!filters) throw new Error("Failed to update record");
        // Sanitize filters to prevent SQL injection through filter parameters
        const sanitizedFilters = sanitizeFilters(filters);
        // Sequelize automatically parameterizes this query, safe from SQL injection
        await Metrics.destroy({ where: sanitizedFilters });
        ResponseHandler.successResponse(req, res, { status: httpStatus.OK, data: {} });
    } catch (error) {
        const errorMessage = _.get(error, "message")
        next(errorResponse((httpStatus.INTERNAL_SERVER_ERROR, { message: errorMessage })))
    }
}

export default { createMetricHandler, listMetricsHandler, updateMetricHandler, deleteMetricHandler, deleteMultipleMetricHandler };