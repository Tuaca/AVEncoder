const header = document.querySelector('#header');
const container_optgroups = document.querySelectorAll('select[id="format"] optgroup');
const select_container = document.querySelector('select[id="format"]');
const table_list = document.querySelector('.table_rows');
const list_template = document.querySelector('body > div > .table_row');
let input_videos = [];

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
        this.resolution = this.width + ' x ' + this.height;
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

// 퀄리티 레인지 바에 이벤트리스너를 추가합니다.
document.querySelector('#crf').addEventListener('input',(e) => {
    update_range_value(e.target);
});

// 상단 탭을 누르면 해당 윈도우로 스위치한다.
function switch_window(target) {
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

// 비디오 코덱을 설정하면 해당 코덱에서 사용할 수 있는 컨테이너를 표시합니다.
document.querySelector('select[id="v_codec"]').addEventListener('change', (e) => {
    const target_optgroup = document.querySelector(`optgroup[label="${e.target.value}"]`);
    container_optgroups.forEach(optgroup => {optgroup.style.display = 'none';});
    target_optgroup.style.display = 'block';
    if(!Array.from(target_optgroup.querySelectorAll('option'))
        .map(option => option.value).includes(select_container.value)){
        select_container.style.backgroundColor = 'crimson';
    } else select_container.style.backgroundColor = '#181818';
});
select_container.addEventListener('change',(e)=>{
    e.target.style.backgroundColor = '#181818';
})


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

// crf 값을 실시간으로 반영합니다. -1 : 비트레이트 설정/ 0 ~ 63
function update_range_value(target){
    if(target.value === '-1') {
        document.querySelector('label[for="crf"] span').textContent = 'use bitrate';
        document.querySelector('input[name="bitrate"]').disabled = false;
    } else {
        document.querySelector('label[for="crf"] span').textContent = target.value;
        if(document.querySelector('input[name="bitrate"]').disabled === false)
            document.querySelector('input[name="bitrate"]').disabled = true;
    }
}

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