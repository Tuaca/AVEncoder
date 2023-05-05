const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

async function createWindow() {
    console.log('Creating main windows...');
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
    console.log('Loading HTML file...');
    await mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    mainWindow.once('ready-to-show',()=>{
        mainWindow.show();
    });
    console.log('Window created and HTML file loaded');
}

app.whenReady().then(() => {
    createWindow();

    const appDataPath = getAppDataPath();
    const presetsFolderPath = path.join(appDataPath, 'presets');
    // Create the directory if it doesn't exist
    if (!fs.existsSync(appDataPath)) {fs.mkdirSync(appDataPath, { recursive: true });}
    if (!fs.existsSync(presetsFolderPath)) {fs.mkdirSync(presetsFolderPath, { recursive: true });}

    ipcMain.on('get_presets_list', (event) => {
        event.sender.send('presets_list', getPresetsList(presetsFolderPath));
    });

    ipcMain.on('export_preset', (event, args)=>{
        const presetText = `exports.load = function(ffmpeg){ ffmpeg.format('${args.container}').outputOptions(${JSON.stringify(args.outputOptions)}) }`;
        const presetExportPath = path.join(presetsFolderPath,`${args.presetName}.js`);
        fs.writeFile(presetExportPath, presetText, (err) => {
            if (err) throw err;
            alert('preset export complete.\nplease restart the app.');
        });
    });

    ipcMain.handle('dialog',(event,method,params) => {
        return dialog[method](params);
    });

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

                const encodingPromise = new Promise((resolve, reject) => {
                    const startEncoding = (containerFormat) => {
                        proc = ffmpeg(encodingOptions.inputFile, { presets: presetsFolderPath });
                        if (encodingOptions.presets) {
                            proc = proc.preset(encodingOptions.presets);
                        }
                        proc = proc.outputOptions(encodingOptions.outputOptions)
                            .on('progress', (progress) => {
                                const currentTime = new Date();
                                const elapsedTimeInSeconds =
                                    (currentTime - encodingStartTime) / 1000;
                                progress['speed'] = (
                                    timemarkToSeconds(progress.timemark) / elapsedTimeInSeconds
                                ).toFixed(1);
                                progress['currentVideo'] = filenameWithoutExtension;
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
                            .save(path.join(outputPath, `${filenameWithoutExtension}_encoding.${containerFormat}`));

                        // Handle pause, resume, and stop messages from renderer process
                        ipcMain.on('stop', stopEncoding);
                    };

                    if (encodingOptions.presets) {
                        const presetPath = path.join(presetsFolderPath, `${encodingOptions.presets}.js`);
                        getFormatFromPreset(presetPath).then((presetFormat) => {
                            const containerFormat = presetFormat || container;
                            startEncoding(containerFormat);
                        }).catch((err) => {
                            console.error('Error getting format from preset:', err);
                            reject(err);
                        });
                    } else {
                        startEncoding(container);
                    }
                });
                try {await encodingPromise;}
                catch (err) {cleanupListeners();throw err;}
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


// 시스템 폴더 경로를 찾습니다.
function getAppDataPath() {
    const platform = os.platform();
    const homeDir = os.homedir();

    switch (platform) {
        case 'win32': // Windows
            return path.join(homeDir, 'Documents', 'AVEncoder');
        case 'darwin': // macOS
            return path.join(homeDir, 'Documents', 'AVEncoder');
        default: // Linux and other platforms
            return path.join(homeDir, '.AVEncoder');
    }
}
// 프리셋 폴더에서 프리셋 목록을 불러옵니다.
function getPresetsList(presetsFolderPath) {
    let presetsList = [];
    try {
        const files = fs.readdirSync(presetsFolderPath);
        presetsList = files.map(file => {
            const parsedPath = path.parse(file);
            return parsedPath.name;
        });
    } catch (err) {
        console.error('Error reading presets folder:', err);
    }
    return presetsList;
}

// 프리셋 내에 format 지정이 되어있는지 확인합니다.
function getFormatFromPreset(presetPath) {
    return new Promise((resolve, reject) => {
        try {
            const presetContent = fs.readFileSync(presetPath, 'utf8');
            const regex = /\.format\(['"](.+?)['"]\)/;

            const match = presetContent.match(regex);
            if (match && match[1]) {
                resolve(match[1]);
            } else {
                resolve(null);
            }
        } catch (error) {
            console.error('Error reading preset file:', error);
            reject(error);
        }
    });
}

// 타임마크를 초로 변환합니다.
function timemarkToSeconds(timemark) {
    let parts = timemark.split(':');
    let hours = parseFloat(parts[0]);
    let minutes = parseFloat(parts[1]);
    let seconds = parseFloat(parts[2]);
    return (hours * 3600) + (minutes * 60) + seconds;
}