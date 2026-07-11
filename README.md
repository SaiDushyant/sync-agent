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

## Installation
1. Clone the repository
2. Run `npm install`

## Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in the required values in `.env`

## Running
- To run normally: `npm start`
- To run in development mode (with auto-restart): `npm run dev`

## Planned Project Phases
- Phase 0: Project foundation and architecture (Current)
- Phase 1: Core sync workflow and scheduling
- Phase 2: Tally integration and XML parsing
- Phase 3: Database, hashing, and state management
- Phase 4: API integration
- Phase 5: Logging, error handling, and testing
