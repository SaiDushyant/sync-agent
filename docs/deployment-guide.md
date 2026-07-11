# Deployment Guide

This guide provides instructions for deploying the Tally Sync Agent in a production Windows environment.

## System Requirements
- **Operating System:** Windows Server 2016 / 2019 / 2022 or Windows 10 / 11
- **Node.js:** v18.x or later
- **TallyPrime:** Installed and running, with the target company open
- **Network:** Outbound internet access to the Backend API (port 443)
- **Permissions:** Administrator access for Task Scheduler configuration

## Installation
1. Extract the deployment package or clone the repository to your target deployment directory (e.g., `C:\SyncAgent`).
2. Open a Command Prompt or PowerShell window as Administrator.
3. Navigate to the directory:
   ```cmd
   cd C:\SyncAgent
   ```

## npm install
Install production dependencies to prepare the application:
```cmd
npm install --production
```

## .env configuration
1. Copy the `.env.example` file and rename it to `.env` in the root directory.
2. Edit `.env` with a text editor and fill in your production values:
   - `TALLY_HOST` and `TALLY_PORT`: Point to your Tally instance.
   - `API_URL` and `API_KEY`: Credentials for the remote backend.
   - `DATABASE_PATH`: Keep default (`./data/sync.db`) or specify an absolute path.
   - `SYNC_INTERVAL`: Configure sync frequency in seconds.

## TallyPrime HTTP setup
1. Open TallyPrime.
2. Go to **F12: Configure** > **Advanced Configuration**.
3. Ensure that **Enable ODBC/HTTP access** is set to **Yes**.
4. Verify the configured port matches `TALLY_PORT` in your `.env`.

## Backend API setup
Ensure the API endpoint specified in `API_URL` is live and reachable from the deployment server. Whitelist the server's IP address on the API side if IP restrictions are in place.

## Running the application
To start the application manually in the foreground:
```cmd
npm start
```
You should see initialization logs indicating the scheduler has started.

## Stopping the application
To stop the foreground process gracefully, press `Ctrl+C` in the terminal. The agent will finish any active syncs and safely close the database connection.

## Windows Task Scheduler configuration
To ensure the Sync Agent runs continuously as a background service:
1. Open **Task Scheduler**.
2. Click **Create Task** (not Basic Task) in the right pane.
3. **General Tab:**
   - Name: `Tally Sync Agent`
   - Select **Run whether user is logged on or not**.
   - Check **Run with highest privileges**.
4. **Triggers Tab:**
   - New... > Begin the task: **At startup**.
5. **Actions Tab:**
   - New... > Action: **Start a program**.
   - Program/script: Enter the path to your Node.js executable (e.g., `C:\Program Files\nodejs\node.exe`).
   - Add arguments: `src/index.js`
   - Start in: Enter the application directory (e.g., `C:\SyncAgent`).
6. **Settings Tab:**
   - Uncheck "Stop the task if it runs longer than...".
7. Save the task and enter your Windows credentials.

## Log file location
All application logs are appended to a rolling log file located at:
`C:\SyncAgent\logs\sync-agent.log`

## Database location
The SQLite tracking database is located at the path defined in your `.env`. By default, this is:
`C:\SyncAgent\data\sync.db`

## Updating the application
1. Stop the application via Task Scheduler (Right-click > End) or `Ctrl+C` if running manually.
2. Backup the `data/` directory and `.env` file.
3. Replace the existing source code with the updated version.
4. Run `npm install --production`.
5. Restart the task in Task Scheduler.

## Troubleshooting
- **Cannot connect to Tally:** Check if TallyPrime is running, the company is loaded, and the HTTP port is open. Ensure Windows Firewall is not blocking the port.
- **API Authentication Failures:** Verify the `API_KEY` in the `.env` file.
- **Database Locks (`SQLITE_BUSY`):** Ensure multiple instances of the Sync Agent are not running simultaneously.

## Backup recommendations
- Set up a daily backup of the `data/sync.db` file to prevent full sync repetitions in case of data loss.
- Always keep a secure backup of the `.env` file containing API keys.
