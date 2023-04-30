const header = document.querySelector('#header');

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

function update_range_value(target){
    if(target.value === '-1') {
        document.querySelector('label[for="crf"] span').textContent = 'use bitrate';
    } else {
        document.querySelector('label[for="crf"] span').textContent = target.value;
    }
}
const {versions} = window;
function openDirectory(){
    // window.electron.openDialog('showOpenDialog', {properties:['openFile','openDirectory']}).then(result => console.log(result));
    document.querySelector('input[name="output_path"]')
        .value = `This app is using 
        Chrome (v${versions.chrome()}), 
        Node.js (v${versions.node()}), 
        and Electron (v${versions.electron()})`;
}