# CodeSmart: testing, desktop runs, and Windows executable

## One-command desktop run

From the repository root, run:

```powershell
./scripts/run-desktop.ps1
```

The command runs backend tests, frontend tests, rebuilds the Spring Boot JAR and React bundle, then opens Electron. Use `./scripts/run-desktop.ps1 -SkipTests` for a quicker local restart after a small UI change.

Close a currently open CodeSmart window before running the command so the new desktop process is the only active window.

## Test layers

- **Frontend unit and component tests:** `cd frontend; npm test`
- **Backend unit and Spring integration tests:** `cd backend; mvn test`
- **Production frontend build:** `cd frontend; npm run build`
- **Full desktop smoke run:** `./scripts/run-desktop.ps1`

The frontend suite includes execution-engine tests for loops, recursion, DP tables, and coin-change updates. The backend integration test calls `POST /api/analyze` through Spring MVC and verifies parsing plus AST output.

## Build a Windows executable

First install Electron packaging support:

```powershell
cd electron
npm install
cd ..
./scripts/run-desktop.ps1 -SkipTests
cd electron
npm run package:win
```

The installer is written to `electron/dist/`. Install it and launch **CodeSmart** from the Start menu or its desktop shortcut.

## Important notes

- The Electron launcher starts `backend/target/codesmart-backend-1.0.0.jar`, so rebuild the backend before opening Electron.
- Electron loads `frontend/dist`, so rebuild the frontend before opening Electron.
- The provided launcher performs both rebuilds automatically.
