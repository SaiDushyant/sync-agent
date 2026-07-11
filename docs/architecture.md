# Architecture

## Overall Architecture
The Tally Sync Agent follows a modular, monolithic architecture designed for simplicity and maintainability. It runs as a background process that periodically fetches data from Tally, processes it, and sends it to a remote API.

## Module Responsibilities
- **config**: Loads and validates environment variables.
- **tally**: Handles HTTP requests to the local Tally ERP server.
- **parser**: Converts Tally XML responses into usable JSON objects.
- **database**: Manages the local SQLite database to store state.
- **hashing**: Computes hashes of records to detect modifications.
- **api**: Manages communication with the remote destination API.
- **sync**: Orchestrates the high-level sync workflow, tying other modules together.
- **scheduler**: Manages the periodic execution of the sync process.
- **logger**: Provides consistent logging across the application.
- **utils**: Contains shared helper functions.

## Sync Workflow
1. The `scheduler` triggers the `sync` module.
2. The `sync` module uses `tally` to request data.
3. The `tally` module returns XML data.
4. The `parser` converts the XML to JSON.
5. For each record, `hashing` computes a hash.
6. The `database` is queried to check if the hash has changed.
7. If changed or new, the `api` module pushes the data to the remote server.
8. Upon successful remote sync, the `database` is updated with the new hash.

## Data Flow
Tally ERP (XML) -> Agent (Parse -> Hash -> Diff -> JSON) -> Remote API (JSON)

## Configuration Strategy
Configuration is managed strictly via environment variables (`.env` file). The `config` module is responsible for loading these variables and making them accessible to the rest of the application.

## Design Principles
- Keep it simple (KISS)
- Modularity (separation of concerns)
- No unnecessary dependencies or frameworks
- Fail fast on configuration errors
- Idempotency in sync operations
