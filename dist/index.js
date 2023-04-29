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
