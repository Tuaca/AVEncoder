/*
const ffmpeg = require('fluent-ffmpeg');

function encodeVideo(inputFile, outputFile, codec, progressCallback) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFile)
            .output(outputFile)
            .videoCodec(codec)
            .on('progress', progress => progressCallback(progress.percent))
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
}

const inputFile = document.getElementById('inputFile');
const outputFile = document.getElementById('outputFile');
const codec = document.getElementById('codec');
const encodeForm = document.getElementById('encodeForm');
const progressBar = document.getElementById('progressBar');

encodeForm.addEventListener('submit', async event => {
    event.preventDefault();

    const inputFilePath = inputFile.files[0].path;
    const outputFilePath = outputFile.value;
    const selectedCodec = codec.value;

    progressBar.value = 0;

    try {
        await encodeVideo(inputFilePath, outputFilePath, selectedCodec, progress => {
            progressBar.value = progress;
        });
        alert('Encoding completed successfully!');
    } catch (error) {
        alert(`An error occurred during encoding: ${error.message}`);
    }
});
*/
