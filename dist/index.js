const header = document.querySelector('#header');
const container_optgroups = document.querySelectorAll('select[id="format"] optgroup');
const select_container = document.querySelector('select[id="format"]');
document.querySelector('#crf').addEventListener('input',(e) => {
    update_range_value(e.target);
})
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

function setOutputDirectory(){
    window.electron.openDialog('showOpenDialog', {properties:['openDirectory']})
        .then(result => document.querySelector('input[name="output_path"]').value = result.filePaths[0]);
}

/*executeFfmpeg({operation:'getMetadata', inputFile:'E:/Tuaca Documents/Filenori/netfile/encoding/output_vp9.webm'});
async function executeFfmpeg(args){
    try{
        const result = await window.electron.invoke('execute-ffmpeg', args);
        console.log('FFmpeg operation successful : ', result);
    } catch (error) {
        console.error('FFmpeg operation failed : ', error);
    }
}*/
