# Tally Sync Agent

## Project Overview
The Tally Sync Agent is a standalone application that synchronizes data between Tally ERP and a remote API.

## Purpose
Its purpose is to extract data from Tally, parse the XML, track changes using hashing and a local database, and sync the updates to an external system, all on a scheduled basis.

## Folder Structure
- `src/`: Source code
  - `config/`: Configuration handling
  - `tally/`: Tally communication and XML requests
  - `parser/`: XML parsing and conversion
  - `database/`: Local storage for sync state tracking
  - `hashing/`: Data hashing for change detection
  - `api/`: Remote API communication
  - `sync/`: Core synchronization workflow logic
  - `scheduler/`: Task scheduling
  - `logger/`: Application logging
  - `utils/`: Helper functions
- `docs/`: Documentation
- `tests/`: Automated tests
- `logs/`: Log files
- `data/`: Local database storage

## Quick Start
1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your values
4. Start the application: `npm start`

## Installation
For detailed installation instructions, dependencies, and environment setup, please refer to the deployment guide below.

## Deployment
For production deployment instructions on Windows environments (including Task Scheduler setup, environment configuration, and logging), please see the full [Deployment Guide](file:///Users/saidushyant/code/Sync%20agent/docs/deployment-guide.md).

## Planned Project Phases
- Phase 0: Project foundation and architecture (Current)
- Phase 1: Core sync workflow and scheduling
- Phase 2: Tally integration and XML parsing
- Phase 3: Database, hashing, and state management
- Phase 4: API integration
- Phase 5: Logging, error handling, and testing
