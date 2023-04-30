const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const path = require('path');

async function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModules: false,
            sandbox: true,
            preload: path.join(__dirname,'preload.js')
        }
    });
    await mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(() => {
    createWindow();
    ipcMain.handle('dialog',(event,method,params) => {
        return dialog[method](params);
    });
    ipcMain.handle('execute-ffmpeg', async (event, args) => {
        const ffmpeg = require('fluent-ffmpeg');
        const ffmpegPath = require('ffmpeg-static');

        ffmpeg.setFfmpegPath(ffmpegPath);

        // Implement your ffmpeg functions here, using args as needed
        // e.g., convert video, extract frames, etc.
        const getMetadata = (inputFile) => {
            return new Promise((resolve, reject) => {
                ffmpeg(inputFile).ffprobe((err,metadata) => {
                    if(err) {
                        reject(err);
                    } else {
                        resolve(metadata);
                    }
                });
            });
        };
        try{
            if(args.operation === 'getMetadata') {
                return await getMetadata(args.inputFile);
            }
        } catch (err) {
            throw err;
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});