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
        } catch (err) {throw err;}

        const encodeVideo = (encodingOptions) => {
            let outputPath = path.dirname(encodingOptions.inputFile);
            let filename = path.basename(encodingOptions.inputFile);
            let container = filename.slice(filename.lastIndexOf('.') + 1);
            let filename_without_extension = filename.slice(0, filename.lastIndexOf('.'));

            let encodingStartTime = new Date();

            if(encodingOptions.hasOwnProperty('outputPath')) outputPath = encodingOptions.outputPath;
            if(encodingOptions.hasOwnProperty('container')) container = encodingOptions.container;

            return new Promise((resolve, reject) => {
                let ffmpegCommand = ffmpeg(encodingOptions.inputFile)
                    .outputOptions(encodingOptions.outputOptions)
                    .on('progress', (progress)=>{
                        let currentTime = new Date();
                        let elapsedTimeInSeconds = (currentTime - encodingStartTime) / 1000;
                        progress['speed'] = (timemarkToSeconds(progress.timemark) / elapsedTimeInSeconds).toFixed(1);
                        event.sender.send('progress-update', progress);
                    })
                    .on('end', ()=>{
                        resolve();
                    })
                    .on('error', (err) => {
                        reject(err);
                    })
                    .save(path.join(outputPath, `${filename_without_extension}_encoding.${container}`));
            });
        }
        try{
            if(args.operation === 'encode') {
                return await encodeVideo(args.options);
            }
        } catch (err) {throw err;}
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