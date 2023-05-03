const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const path = require('path');
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

async function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 814,
        height: 657,
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
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegPath = require('ffmpeg-static');

    ffmpeg.setFfmpegPath(ffmpegPath);

    ipcMain.handle('execute-ffmpeg', async (event, args) => {
        let proc; // ffmpeg process

        // Function to stop encoding
        const stopEncoding = () => {
            if (proc) {
                console.log('Encoding stopped by user');
                proc.kill();
            }
        };

        // Remove event listeners when no longer needed
        const cleanupListeners = () => {
            ipcMain.removeListener('stop', stopEncoding);
        };

        try {
            const { operation, inputFile, options } = args;

            if (operation === 'getMetadata') {
                const metadata = await new Promise((resolve, reject) => {
                    ffmpeg(inputFile).ffprobe((err, metadata) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(metadata);
                        }
                    });
                });
                return metadata;
            } else if (operation === 'encode') {
                // Set encoding options
                const encodingOptions = options;
                const outputPath = encodingOptions.outputPath || path.dirname(encodingOptions.inputFile);
                const filename = path.basename(encodingOptions.inputFile);
                const container = encodingOptions.container || filename.slice(filename.lastIndexOf('.') + 1);
                const filenameWithoutExtension = filename.slice(0, filename.lastIndexOf('.'));

                const encodingStartTime = new Date();

                // Start encoding
                await new Promise((resolve, reject) => {
                    proc = ffmpeg(encodingOptions.inputFile)
                        .outputOptions(encodingOptions.outputOptions)
                        .on('progress', (progress) => {
                            const currentTime = new Date();
                            const elapsedTimeInSeconds =
                                (currentTime - encodingStartTime) / 1000;
                            progress['speed'] = (
                                timemarkToSeconds(progress.timemark) / elapsedTimeInSeconds
                            ).toFixed(1);
                            event.sender.send('progress-update', progress);
                        })
                        .on('end', () => {
                            cleanupListeners();
                            resolve();
                        })
                        .on('error', (err) => {
                            cleanupListeners();
                            reject(err);
                        })
                        .save(path.join(outputPath, `${filenameWithoutExtension}_encoding.${container}`));
                    // Handle pause, resume, and stop messages from renderer process
                    ipcMain.on('stop', stopEncoding);
                });
            }
        } catch (err) {
            cleanupListeners();
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

// 타임마크를 초로 변환합니다.
function timemarkToSeconds(timemark) {
    let parts = timemark.split(':');
    let hours = parseFloat(parts[0]);
    let minutes = parseFloat(parts[1]);
    let seconds = parseFloat(parts[2]);
    return (hours * 3600) + (minutes * 60) + seconds;
}