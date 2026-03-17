# Copilot Instructions for Obsrv API Service

## Project Overview

This is a monorepo with three independently deployable services:

- **api-service/** — TypeScript/Express REST API (primary service). Handles dataset CRUD, data ingestion, querying (Druid/Trino), connectors, query templates, alerts, and file operations. Runs on port 3000.
- **command-service/** — Python/FastAPI backend for orchestrating multi-step commands (dataset publishing, Flink job management, Druid ingestion, connector registration). Runs on port 8000.
- **system-rules-ingestor/** — Lightweight Node.js utility that ingests alerting rules into the system on startup.

The api-service delegates complex orchestration to the command-service via HTTP (configured in `command_service_config`).

## Build, Test, and Lint

All commands run from within the `api-service/` directory:

```sh
cd api-service
npm install
npm run start          # ts-node ./src/app.ts
npm run build          # tsc to dist/
npm run test           # requires .env.test to be sourced (uses mocha + nyc)
npm run actions:test   # same tests without sourcing .env.test (CI use)
npm run lint           # eslint for .ts files
npm run lint-fix       # eslint with --fix
```

Run a single test file:
```sh
cd api-service
source .env.test && npx mocha ./src/tests/<subfolder>/<TestFile>.spec.ts --exit
```

For the command-service (Python):
```sh
cd command-service
pip install -r requirements.txt
uvicorn src.routes:app --host 0.0.0.0 --port 8000
```

## Architecture Patterns

### API Request Flow

Every route follows this middleware chain:
```
setDataToRequestObject(apiId) → onRequest(entity) → telemetryAuditStart/telemetryLogStart → checkRBAC.handler() → controller
```

- `setDataToRequestObject` assigns the API identifier (e.g., `"api.datasets.create"`) and a UUID `resmsgid` onto the request/response objects.
- `onRequest` records Prometheus metrics by entity type (`Data_in`, `Data_out`, `Management`).
- Telemetry interceptors log audit/event data.
- `checkRBAC` enforces role-based access control (enabled by default via `is_RBAC_enabled`).

### Controller Structure

Each controller lives in its own folder under `src/controllers/<FeatureName>/` containing:
- The controller handler (default export, an async `(req, res)` function)
- A JSON Schema validation file (`*ValidationSchema.json`) validated via AJV through `schemaValidation()` from `services/ValidationService.ts`

Controllers validate input first, call service methods, then respond using `ResponseHandler.successResponse()` or throw `ObsrvError` (caught by `obsrvErrorHandler` middleware).

### Error Handling

Use `obsrvError()` factory from `src/types/ObsrvError.ts` to throw structured errors:
```ts
throw obsrvError(datasetId, "ERROR_CODE", "Human message", "HTTP_STATUS_NAME", 400)
```
These are caught by the `obsrvErrorHandler` Express error middleware and returned in the standard response envelope.

### Standard Response Envelope

All API responses follow this structure:
```json
{ "id": "api.datasets.create", "ver": "v2", "ts": "...", "params": { "status": "SUCCESS", "msgid": "...", "resmsgid": "..." }, "responseCode": "OK", "result": {} }
```
Error responses replace `result` with an `error` object containing `code`, `message`, and optionally `trace`.

### Database Access

- PostgreSQL via **Sequelize** ORM. Models in `src/models/` define tables (`Dataset`, `Datasource`, `DatasetDraft`, etc.).
- Connection config in `src/configs/ConnectionsConfig.ts` — credentials are base64-encoded in the format `username::base64(password)`.
- Query engines: **Druid** (native + SQL queries) and **Trino** for analytics.

### Configuration

All config is environment-variable driven via `src/configs/Config.ts`. No `.env` file is loaded at runtime — environment variables are expected to be set externally. The `.env.test` file is only sourced for test runs.

### Command Service (Python) Pattern

Commands implement the `ICommand` interface (`src/command/icommand.py`) with an `execute(command_payload, action)` method. Workflows are composed of sub-commands defined in `src/config/service_config.yml` (e.g., `PUBLISH_DATASET` chains `MAKE_DATASET_LIVE` → `SUBMIT_INGESTION_TASKS` → `STOP_PIPELINE_JOBS` → `START_PIPELINE_JOBS`).

## Code Conventions

- **Double quotes** for strings (enforced by ESLint, template literals allowed).
- **`@typescript-eslint/no-explicit-any`** is turned off — `any` is used liberally, especially for request objects and service method signatures.
- Unused function parameters prefixed with `_` (e.g., `_next: NextFunction`).
- Lodash (`_`) is used extensively for object manipulation (`_.get`, `_.set`, `_.merge`, `_.omit`, etc.).
- Sequelize models use `underscored: true` naming (snake_case columns).
- Cloud storage is abstracted in `src/services/CloudServices/` with provider-specific implementations for AWS S3, GCP, and Azure Blob.
- All routes are versioned under `/v2/` (v1 returns HTTP 410 Gone).
