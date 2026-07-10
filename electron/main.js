const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const netModule = require('net');

// ─── MUST be called before app is ready ────────────────────────────────────
// Register 'app://' as a privileged scheme so it behaves like https://
// This gives us proper CORS, secure context, and worker support.
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: {
    secure: true,
    standard: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
  }
}]);

let mainWindow;
let javaProcess;

const BACKEND_PORT = 8080;

/**
 * Checks if a port is occupied and kills the process holding it (Windows).
 */
function freePort(port) {
  return new Promise((resolve) => {
    const tester = netModule.createServer();

    tester.once('error', () => {
      console.log(`[Main]: Port ${port} already in use. Freeing it...`);
      try {
        const output = execSync(
          `netstat -ano | findstr LISTENING | findstr :${port}`,
          { encoding: 'utf8', shell: 'cmd.exe' }
        );
        const lines = output.trim().split(/\r?\n/);
        const pids = new Set();
        lines.forEach((line) => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
        });
        pids.forEach((pid) => {
          try {
            execSync(`taskkill /F /PID ${pid}`, { shell: 'cmd.exe' });
            console.log(`[Main]: Killed stale PID ${pid} on port ${port}`);
          } catch (_) { /* already dead */ }
        });
      } catch (_) { /* netstat found nothing */ }
      setTimeout(resolve, 600);
    });

    tester.once('listening', () => {
      tester.close(resolve); // Port is already free
    });

    tester.listen(port, '127.0.0.1');
  });
}

function startJavaBackend() {
  return new Promise((resolve) => {
    console.log('Starting Java Spring Boot backend...');

    const jarPath = path.join(__dirname, '../backend/target/codesmart-backend-1.0.0.jar');
    let resolved = false;

    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    javaProcess = spawn('java', ['-jar', jarPath], { windowsHide: true });

    javaProcess.stdout.on('data', (data) => {
      const text = data.toString();
      console.log(`[Backend]: ${text}`);
      if (text.includes('Started') && text.includes('Application')) {
        safeResolve();
      }
    });

    javaProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error]: ${data}`);
    });

    javaProcess.on('error', (err) => {
      console.error(`[Backend Launch Error]: ${err.message}`);
      safeResolve();
    });

    javaProcess.on('close', (code) => {
      console.log(`Java backend exited with code ${code}`);
      safeResolve();
    });

    setTimeout(safeResolve, 30000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'CodeSmart — Visual Java IDE',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Required for Electron desktop apps loading local files:
      // Allows Workers, ES modules, and Monaco to load from app:// protocol
      webSecurity: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.openDevTools();

  // Load via our custom app:// protocol instead of file://
  // This gives proper HTTP semantics without CORS/security restrictions
  mainWindow.loadURL('app://dist/');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // ─── Register app:// protocol handler ──────────────────────────────────
  // Routes app://dist/path → frontend/dist/path
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Strip the leading /dist from the path
    if (pathname.startsWith('/dist')) {
      pathname = pathname.slice(5); // remove '/dist'
    }

    // Default to index.html for root
    if (!pathname || pathname === '/') {
      pathname = '/index.html';
    }

    const distRoot = path.join(__dirname, '../frontend/dist');
    const filePath = path.join(distRoot, pathname);

    // Security: ensure the resolved path stays inside dist/
    if (!filePath.startsWith(distRoot)) {
      return new Response('Forbidden', { status: 403 });
    }

    return net.fetch('file:///' + filePath.replace(/\\/g, '/'));
  });

  try {
    await freePort(BACKEND_PORT);
    await startJavaBackend();
  } catch (e) {
    console.error('Backend startup error:', e);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (javaProcess) {
    console.log('[Main]: Killing Java backend process...');
    javaProcess.kill('SIGTERM');
  }
});
