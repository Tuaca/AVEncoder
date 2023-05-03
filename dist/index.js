const header = document.querySelector('#header');
const container_optgroups = document.querySelectorAll('select[id="format"] optgroup');
const select_container = document.querySelector('select[id="format"]');
const table_list = document.querySelector('.table_rows');
const list_template = document.querySelector('body > div > .table_row');
const total_progress = document.querySelector('#total_progress');
const current_progress = document.querySelector('#current_progress');
const progress_toString = document.querySelector('#progress_toString');
let input_videos = [];
let completedVideos = 0;
let isEncoding = false;

class Video {
    constructor(video) {
        this.fileName = video.format.filename.match(/\\([^\\]+)$/)[1];
        this.filePath = video.format.filename;
        this.bitrate = video.format.bit_rate;
        this.duration = formatDuration(video.format.duration);
        this.size = formatBytes(video.format.size);
        video.streams.forEach(stream => {
            if(stream.codec_type === 'video'){
                this.framerate = (stream.nb_frames / video.format.duration).toFixed(2);
                this.v_bitrate = stream.bit_rate;
                this.v_codec = stream.codec_name;
                this.width = stream.width;
                this.height = stream.height;
                this.aspect_ratio = stream.sample_aspect_ratio;
            } else if(stream.codec_type === 'audio'){
                this.a_bitrate = stream.bit_rate;
                this.a_codec = stream.codec_name;
                this.sample_rate = stream.sample_rate;
            }
        });
        this.resolution = this.width + 'x' + this.height;
    }
    toObject() {
        return {
            fileName:this.fileName,
            filePath:this.filePath,
            bitrate:this.bitrate,
            duration:this.duration,
            size:this.size,
            framerate:this.framerate,
            v_bitrate:this.v_bitrate,
            v_codec:this.v_codec,
            width:this.width,
            height:this.height,
            resolution:this.resolution,
            aspect_ratio:this.aspect_ratio,
            a_bitrate:this.a_bitrate,
            a_codec:this.a_codec,
            sample_rate:this.sample_rate
        }
    }
}

// duration 을 초 단위로 입력받아 00:00:00 형태의 타임스탬프로 변환하는 함수
function formatDuration(duration) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration - (hours * 3600)) / 60);
    const seconds = Math.floor(duration % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Byte 값을 단위변환하는 함수
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    while (bytes >= 1024 && unitIndex < units.length - 1) {
        bytes /= 1024;
        unitIndex++;
    }
    const size = unitIndex === 0 ? bytes : bytes.toFixed(2);
    const unit = units[unitIndex];
    return `${size} ${unit}`;
}

// 상단 탭을 누르면 해당 윈도우로 스위치한다.
function switch_window(target) {
    if(!isEncoding){
        if(!target.classList.contains('on')){
            header.querySelector('.on').classList.remove('on');
            target.classList.add('on');
            if(target.textContent === 'Encoder'){
                document.querySelector('#encoder').classList.remove('hidden');
                document.querySelector('#editor').classList.add('hidden');
            } else {
                document.querySelector('#encoder').classList.add('hidden');
                document.querySelector('#editor').classList.remove('hidden');
            }
        }
    } else {
        alert('You can\'t switch tabs while video is encoding');
    }
}
document.querySelector('#encoder_tab').addEventListener('click', (e)=>{switch_window(e.currentTarget);});
document.querySelector('#editor_tab').addEventListener('click', (e)=>{switch_window(e.currentTarget);});


// 대기열을 초기화 후 업데이트합니다.
function updateList(){
    table_list.innerHTML = '';
    input_videos.forEach(function (video, index){
        const new_list = list_template.cloneNode(true);
        const split_location = video.fileName.lastIndexOf('.');
        new_list.children[0].textContent = index + 1;
        new_list.children[1].textContent = video.fileName.substring(0, split_location);
        new_list.children[2].textContent = video.fileName.substring(split_location + 1);
        new_list.children[3].textContent = video.v_codec;
        new_list.children[4].textContent = video.width + ' x ' + video.height;
        new_list.children[5].textContent = video.duration;
        new_list.children[6].textContent = video.size;
        new_list.addEventListener('click',(e)=>{focusItem(e.currentTarget);});
        table_list.append(new_list);
    });
}

// + 버튼을 클릭하면 파일 탐색기 브라우저를 띄우고 작업대기열을 갱신합니다.
document.querySelector('#add').addEventListener('click', ()=>{
    if(input_videos.length === 9) {
        alert('대기열이 꽉 찼습니다!');
        return;
    }
    window.electron.openDialog('showOpenDialog',{
        filters:[{name:'video', extensions:['mp4','avi','mov','mkv','webm','wmv','ogg']}],
        properties:['openFile']
    }).then(result => result.filePaths.forEach(filePath => {
        executeFfmpeg({operation:'getMetadata', inputFile:`${filePath}`}).then(data => {
            input_videos.push(new Video(data));
            updateList();
            focusItem(table_list.lastChild);
        })
    })).catch(err => console.log(err));
});
// - 버튼을 누르면 선택된 비디오가 작업대기열에서 제거됩니다.
document.querySelector('#remove').addEventListener('click', () => {
    input_videos = input_videos.filter(video => video.filePath !== document.querySelector('td[meta="filePath"]').textContent);
    Array.from(document.querySelectorAll('td[meta]')).forEach(td => {
        td.textContent = '';
    });
    updateList();
});

// 불러온 동영상을 클릭하면 하이라이트를 주고 메타데이터를 표시합니다.
function focusItem(item){
    let index = 0;
    const meta_td = Array.from(document.querySelectorAll('td[meta]'));
    Array.prototype.forEach.call(table_list.children, function(child, i){
        if(child === item) index = i;
        child.style.background = 'none';
    });
    item.style.background = '#666';
    meta_td.forEach(td => {
        td.textContent = input_videos[index][td.getAttribute('meta')];
    });
}

// 비디오 코덱을 설정하면 해당 코덱에서 사용할 수 있는 옵션과 컨테이너를 표시합니다.
document.querySelector('select[id="v_codec"]').addEventListener('change', (e) => {
    const target_optgroup = document.querySelector(`optgroup[label="${e.target.value}"]`);
    document.querySelectorAll('.dropdown_options').forEach(dropdown_option => {dropdown_option.classList.add('hidden')});
    document.querySelector(`.dropdown_options[codec="${e.target.value}"]`).classList.remove('hidden');
    container_optgroups.forEach(optgroup => {optgroup.style.display = 'none';});
    target_optgroup.style.display = 'block';
    if(!Array.from(target_optgroup.querySelectorAll('option'))
        .map(option => option.value).includes(select_container.value)){
        select_container.style.backgroundColor = 'crimson';
    } else select_container.style.backgroundColor = '#181818';
});
select_container.addEventListener('change',(e)=>{
    e.target.style.backgroundColor = '#181818';
});

// 비디오 코덱과 관련된 상세설정에 관한 드롭다운 메뉴 기능
document.querySelector('#options_by_v_codec > span').addEventListener('click',(e) => {
    if(e.currentTarget.parentNode.style.height === '100%') {
        e.currentTarget.parentNode.style.height = '20px'
        e.currentTarget.textContent = 'details ▼'
    } else {
        e.currentTarget.parentNode.style.height = '100%'
        e.currentTarget.textContent = 'details ▲'
    };
});

// crf 레인지의 값을 모니터링합니다. 0 ~ 63
document.querySelector('#crf').addEventListener('input',(e) => {
    if(e.target.value === '-1') {
        document.querySelector('label[for="crf"] span').textContent = 'inactive';
    } else {
        document.querySelector('label[for="crf"] span').textContent = e.target.value;
    }
});

// 아웃풋 경로를 설정합니다.
function setOutputDirectory() {
    window.electron.openDialog('showOpenDialog', { properties: ['openDirectory'] })
        .then(result => {
            if (result.canceled) { // 사용자가 취소 버튼을 눌렀을 때
                return;
            }
            document.querySelector('input[name="output_path"]').value = result.filePaths[0];
        })
        .catch(err => {
            console.error(err);
        });
}
document.querySelector('#output_btn').addEventListener('click',()=>{setOutputDirectory();});

// ffmpeg 기능을 사용합니다.
async function executeFfmpeg(args){
    try{
        return await window.electron.invoke('execute-ffmpeg', args);
    } catch (error) {
        console.error('ffmpeg operation failed : ', error);
        return null;
    }
}

// 옵션정보를 요약합니다.
function getSummaryText(options) {
    let summaryText = 'Encoding options summary:\n\n';

    if (options.hasOwnProperty('outputPath')) {
        summaryText += `Output Path: ${options.outputPath}\n`;
    }

    if (options.hasOwnProperty('container')) {
        summaryText += `Container: ${options.container}\n`;
    }

    summaryText += 'Output Options:\n';

    options.outputOptions.forEach(option => {
        summaryText += `${option}\n`;
    });

    return summaryText;
}

// 인코딩 옵션을 최종확인합니다..
document.querySelector('#start').addEventListener('click', (e) => {
    const obj = {};
    const options = {};
    let outputOptions = [];

    document.querySelectorAll('.options').forEach((element) => {
        if (element.value !== '' && element.value !== null) {
            obj[element.id] = element.value;
        }
    });

    if (obj.hasOwnProperty('output_path')) {
        options['outputPath'] = obj.output_path;
    }
    if (obj.hasOwnProperty('ss')) {
        outputOptions.push('-ss ' + obj.ss);
    }
    if (obj.hasOwnProperty('to')) {
        outputOptions.push('-to ' + obj.to);
    }

    if (obj.presets === 'custom') {
        const videoCodecOptions = getVideoCodecOptions(obj);
        outputOptions.push(...videoCodecOptions);

        if (obj.hasOwnProperty('format')) {
            options['container'] = obj.format;
        }

        if (obj.crf !== '-1') {
            outputOptions.push('-crf ' + obj.crf);
        }

        addBitrateOptions(obj, outputOptions);
        addVideoOptions(obj, outputOptions);
        addAudioOptions(obj, outputOptions);
    } else {
        alert('현제 프리셋 기능을 지원하지 않습니다.');
        return;
    }

    options['outputOptions'] = outputOptions;

    if (confirm(getSummaryText(options))) {
        encodeVideos(input_videos, options);
    }
});
function getVideoCodecOptions(obj) {
    const videoCodecOptions = [];

    switch (obj.v_codec) {
        case 'copy':
            videoCodecOptions.push('-c:v copy');
            break;
        case 'libx264': // h.264 코덱
            if (obj.h264_nvenc === 'on') {
                videoCodecOptions.push('-c:v h264_nvenc');
            } else {
                videoCodecOptions.push('-c:v libx264');
            }
            if (obj.hasOwnProperty('preset')) {
                videoCodecOptions.push('-preset:v ' + obj.preset);
            }
            if (obj.hasOwnProperty('profile')) {
                videoCodecOptions.push('-profile:v ' + obj.profile);
            }
            if (obj.hasOwnProperty('level')) {
                videoCodecOptions.push('-level ' + obj.level);
            }
            break;
        case 'libvpx-vp9': // vp9 코덱
            videoCodecOptions.push('-c:v libvpx-vp9');
            if (obj.speed !== '0') {
                videoCodecOptions.push('-speed ' + obj.speed);
            }
            if (obj.tile_columns !== '0') {
                videoCodecOptions.push('-tile-columns ' + obj.tile_columns);
            }
            if (obj.lag_in_frames !== '0') {
                videoCodecOptions.push('-lag-in-frames ' + obj.lag_in_frames);
            }
            if (obj.frame_parallel === 'on') {
                videoCodecOptions.push('-frame-parallel 1');
            }
            if (obj.auto_alt_ref === 'on') {
                videoCodecOptions.push('-auto-alt-ref 1');
            }
            break;
        default:
            videoCodecOptions.push('-c:v ' + obj.v_codec);
    }
    return videoCodecOptions;
}
function addBitrateOptions(obj, outputOptions) {
    if (obj.hasOwnProperty('bitrate')) {
        outputOptions.push('-b:v ' + obj.bitrate + 'k');
    }
    if (obj.hasOwnProperty('maxrate')) {
        outputOptions.push('-maxrate ' + obj.maxrate + 'k');
    }
    if (obj.hasOwnProperty('bufsize')) {
        outputOptions.push('-bufsize ' + obj.bufsize + 'k');
    }
}
function addVideoOptions(obj, outputOptions) {
    if (obj.hasOwnProperty('framerate')) {
        outputOptions.push('-r ' + obj.framerate);
    }
    if (obj.hasOwnProperty('resolution')) {
        outputOptions.push('-s ' + obj.resolution);
    }
}
function addAudioOptions(obj, outputOptions) {
    outputOptions.push('-c:a ' + obj.a_codec);
    if (obj.hasOwnProperty('a_bitrate')) {
        outputOptions.push('-b:a ' + obj.a_bitrate + 'k');
    }
    if (obj.hasOwnProperty('sample_rate')) {
        outputOptions.push('-ar ' + obj.sample_rate);
    }
}


// 인코딩을 중지합니다.
document.querySelector('#stop').addEventListener('click',()=>{
    if(isEncoding) {
        if(confirm('Would you really stop the current encoding?')) {
            window.electron.send('stop');
        }
    }
});

// 진행상황을 표시합니다.
window.electron.on('progress-update', (progress) => {
    updateProgressBar(progress.percent);
    progress_toString.textContent = `frame=${progress.frames} fps=${progress.currentFps} size=${progress.targetSize} time=${progress.timemark} bitrate=${progress.currentKbps}kbps speed=${progress.speed}x`;
});
function updateProgressBar(percent){
    const t_pro = ((completedVideos / input_videos.length) * 100) + (percent / input_videos.length)
    current_progress.value = percent;
    current_progress.nextSibling.textContent = ` ${completedVideos + 1} of ${input_videos.length} : ${Math.floor(percent)}%`
    total_progress.value = t_pro;
    total_progress.nextSibling.textContent = ` total : ${Math.floor(t_pro)}%`
}

// 인코딩 중 사용자 인터페이스 작동을 중지합니다.
function toggleInterface(){
    const options = document.querySelectorAll('.options');
    const btns = document.querySelectorAll('.btn');
    if(isEncoding === true) {
        options.forEach(option => {option.disabled = true;});
        btns.forEach(button => {button.disabled = true});
    } else {
        options.forEach(option => {option.disabled = false;});
        btns.forEach(button => {button.disabled = false});
    }
}

// 인코딩을 시작합니다.
async function encodeVideos(videos, options){
    current_progress.value = 0;
    total_progress.value = 0;
    completedVideos = 0;
    isEncoding = true;
    toggleInterface();
    for(const video of videos) {
        const encodingOptions = {
            inputFile : video.filePath,
            inputOptions : options.inputOptions,
            outputOptions : options.outputOptions,
        };
        if(options.hasOwnProperty('outputPath')) encodingOptions['outputPath'] = options.outputPath;
        if(options.hasOwnProperty('container')) encodingOptions['container'] = options.container;
        let isCorrupted = false;
        await executeFfmpeg({operation:'encode', options: encodingOptions}).then(result => {
            if(result === null) isCorrupted = true;
        });
        if(isCorrupted) {
            alert('The process has stopped');
            break;
        }
        updateProgressBar(100);
        completedVideos++;
    }
    isEncoding = false;
    toggleInterface();
    alert('encoding complete!');
}
