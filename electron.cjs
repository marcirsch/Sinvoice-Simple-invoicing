const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');

const isDev = process.env.NODE_ENV !== 'production';
const userDataPath = app.getPath('userData');
const dataDirPath = path.join(userDataPath, 'data');

// --- Path Management & State ---
if (!fs.existsSync(dataDirPath)) {
    fs.mkdirSync(dataDirPath, { recursive: true });
}
const appStatePath = path.join(userDataPath, 'app_state.json');
let settingsFilePath = path.join(dataDirPath, 'settings.json'); // Default path
const customersFilePath = path.join(dataDirPath, 'customers.csv');

function loadAppState() {
    try {
        if (fs.existsSync(appStatePath)) {
            const state = JSON.parse(fs.readFileSync(appStatePath, 'utf-8'));
            if (state.customSettingsPath && fs.existsSync(state.customSettingsPath)) {
                settingsFilePath = state.customSettingsPath;
            }
        }
    } catch (e) {
        console.error("Failed to load app state:", e);
    }
}

function saveAppState() {
    try {
        const state = { customSettingsPath: settingsFilePath };
        fs.writeFileSync(appStatePath, JSON.stringify(state, null, 2));
    } catch (e) {
        console.error("Failed to save app state:", e);
    }
}

function registerIpcHandlers() {
    function loadAndSendData(win) {
        const data = {};
        try {
            if (fs.existsSync(settingsFilePath)) {
                data.settings = fs.readFileSync(settingsFilePath, 'utf-8');
            }
            if (fs.existsSync(customersFilePath)) {
                data.customers = fs.readFileSync(customersFilePath, 'utf-8');
            }
            win.webContents.send('data-loaded', data);
        } catch (e) {
            console.error("Failed to load data:", e);
        }
    }

    ipcMain.on('load-data', (event) => {
        loadAndSendData(BrowserWindow.fromWebContents(event.sender));
    });

    ipcMain.on('save-settings', (event, settings) => {
        try {
            fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
        } catch (e) {
            console.error("Failed to save settings:", e);
        }
    });

    ipcMain.on('save-customers', (event, customers) => {
        try {
            const csv = Papa.unparse(customers);
            fs.writeFileSync(customersFilePath, csv);
        } catch (e) {
            console.error("Failed to save customers:", e);
        }
    });

    ipcMain.handle('show-open-dialog', async () => {
        const { filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        return filePaths[0];
    });

    ipcMain.on('set-settings-path-and-reload', (event, filePath) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (filePath && fs.existsSync(filePath)) {
            settingsFilePath = filePath;
            saveAppState();
            loadAndSendData(win);
        }
    });
}

function createWindow() {
  loadAppState();

  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
  });

  win.loadURL(
    isDev
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, 'dist/index.html')}`
  );

  if (isDev) {
    win.webContents.openDevTools();
  }
}

// --- App Lifecycle ---
app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
