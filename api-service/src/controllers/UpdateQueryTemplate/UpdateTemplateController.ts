import { Request, Response } from "express";
import * as _ from "lodash"
import { schemaValidation } from "../../services/ValidationService";
import validationSchema from "./UpdateTemplateValidationSchema.json";
import { ResponseHandler } from "../../helpers/ResponseHandler";
import { getQueryTemplate } from "../../services/QueryTemplateService";
import { QueryTemplate } from "../../models/QueryTemplate";
import { validateTemplate } from "../CreateQueryTemplate/QueryTemplateValidator";
import { config } from "../../configs/Config";
import logger from "../../logger";
const apiId = "api.query.template.update";
const requiredVariables = _.get(config, "template_config.template_required_variables");

/**
 * Validates template ID format to prevent SQL injection
 * Note: Sequelize uses parameterized queries, this is defense in depth
 */
const validateTemplateId = (id: string): boolean => {
    // Template IDs should be alphanumeric with underscores and hyphens
    const templateIdRegex = /^[a-zA-Z0-9_-]+$/;
    return templateIdRegex.test(id) && id.length <= 255;
};

export const updateQueryTemplate = async (req: Request, res: Response) => {
    const requestBody = req.body;
    const templateId = _.get(req, "params.templateId");
    try {
        // Input validation to prevent SQL injection - defense in depth
        if (!validateTemplateId(templateId)) {
            // Log only identifiers, not the full request body to avoid exposing sensitive data
            logger.error({ apiId, resmsgid: _.get(res, "resmsgid"), templateId, message: "Invalid template ID format", code: "QUERY_TEMPLATE_INVALID_INPUT" })
            return ResponseHandler.errorResponse({ message: "Invalid template ID format", statusCode: 400, errCode: "BAD_REQUEST", code: "QUERY_TEMPLATE_INVALID_INPUT" }, req, res);
        }
        
        const msgid = _.get(req, "body.params.msgid");
        const resmsgid = _.get(res, "resmsgid");
        const isValidSchema = schemaValidation(requestBody, validationSchema);

        if (!isValidSchema?.isValid) {
            if (_.includes(isValidSchema.message, "template_name")) {
                _.set(isValidSchema, "message", "Template name should contain alphanumeric characters and single space between characters")
            }
            // Log only identifiers, not the full request body to avoid exposing sensitive data
            logger.error({ apiId, msgid, resmsgid, templateId, message: isValidSchema?.message, code: "QUERY_TEMPLATE_INVALID_INPUT" })
            return ResponseHandler.errorResponse({ message: isValidSchema?.message, statusCode: 400, errCode: "BAD_REQUEST", code: "QUERY_TEMPLATE_INVALID_INPUT" }, req, res);
        }

        const isTemplateExists = await getQueryTemplate(templateId)
        if (isTemplateExists === null) {
            // Log only identifiers, not the full request body to avoid exposing sensitive data
            logger.error({ apiId, resmsgid, templateId, message: `Template ${templateId} does not exists`, code: "QUERY_TEMPLATE_NOT_EXISTS" })
            return ResponseHandler.errorResponse({ message: `Template ${templateId} does not exists`, statusCode: 404, errCode: "NOT_FOUND", code: "QUERY_TEMPLATE_NOT_EXISTS" }, req, res);
        }

        const { validTemplate } = await validateTemplate(requestBody);
        if (!validTemplate) {
            // Log only identifiers, not the full request body to avoid exposing sensitive data
            logger.error({ apiId, msgid, resmsgid, templateId, message: `Invalid template provided, A template should consist of variables ${requiredVariables} and type of json,sql`, code: "QUERY_TEMPLATE_INVALID_INPUT" })
            return ResponseHandler.errorResponse({ statusCode: 400, message: `Invalid template provided, A template should consist of variables ${requiredVariables} and type of json,sql`, errCode: "BAD_REQUEST", code: "QUERY_TEMPLATE_INVALID_INPUT" }, req, res)
        }
        const userID = (req as any)?.userID;
        requestBody.request.updated_by = userID;
        // Sequelize automatically parameterizes this query, safe from SQL injection
        await QueryTemplate.update(requestBody?.request, { where: { template_id: templateId } })
        // Log only identifiers, not the full request body to avoid exposing sensitive data
        logger.info({ apiId, msgid, resmsgid, templateId, message: `Query template updated successfully` })
        ResponseHandler.successResponse(req, res, { status: 200, data: { message: "Query template updated successfully", templateId } });
    }
    catch (error) {
        // Log only identifiers, not the full request body to avoid exposing sensitive data
        logger.error({ error, apiId, templateId, resmsgid: _.get(res, "resmsgid"), code: "QUERY_TEMPLATE_UPDATE_FAILED", message: "Failed to update query template" })
        ResponseHandler.errorResponse({ code: "QUERY_TEMPLATE_UPDATE_FAILED", message: "Failed to update query template" }, req, res);
    }
}

