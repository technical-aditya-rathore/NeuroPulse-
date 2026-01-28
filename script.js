const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
let audioCtx, analyser, source, animationId, dataArray, streamDestination;
let mediaRecorder, recordedChunks = [];

// Handle Dynamic Scaling
function resize() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// Core Audio Setup (Fixed for Voice + Recording)
function initEngine(audioSource) {
    if (audioCtx) audioCtx.close();
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    
    // Merger for Recording
    streamDestination = audioCtx.createMediaStreamDestination();

    if (audioSource instanceof MediaStream) {
        source = audioCtx.createMediaStreamSource(audioSource);
    } else {
        source = audioCtx.createMediaElementSource(audioSource);
        source.connect(audioCtx.destination);
    }
    
    source.connect(analyser);
    source.connect(streamDestination);

    document.getElementById('sys-status').innerText = "SYSTEM: ACTIVE";
    document.getElementById('sys-status').style.color = "#00f3ff";
    renderFrame();
}

// Logic: Inputs
document.getElementById('micBtn').onclick = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(initEngine)
        .catch(e => alert("Please allow microphone access."));
};

document.getElementById('audioFile').onchange = function() {
    const audio = new Audio(URL.createObjectURL(this.files[0]));
    audio.crossOrigin = "anonymous";
    audio.play();
    initEngine(audio);
};

// Logic: Final Recording Fix (Combined Audio + Video)
const recordBtn = document.getElementById('recordBtn');
recordBtn.onclick = () => {
    if (recordBtn.innerText === "REC START") {
        if (!streamDestination) return alert("Initialize audio first!");
        
        recordedChunks = [];
        const videoStream = canvas.captureStream(60);
        const audioStream = streamDestination.stream;
        
        const combined = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks()
        ]);

        mediaRecorder = new MediaRecorder(combined, { mimeType: 'video/webm;codecs=vp9,opus' });
        mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'NEUROPULSE_OS_ADI_MASTAN.webm';
            a.click();
        };

        mediaRecorder.start();
        recordBtn.innerText = "REC STOP";
        recordBtn.style.color = "red";
    } else {
        mediaRecorder.stop();
        recordBtn.innerText = "REC START";
        recordBtn.style.color = "";
    }
};

document.getElementById('killBtn').onclick = () => location.reload();

// Main Render Loop
function renderFrame() {
    animationId = requestAnimationFrame(renderFrame);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = 'rgba(3, 3, 5, 0.2)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const sens = document.getElementById('sens').value;
    const mode = document.getElementById('visualMode').value;

    if (mode === 'radial') {
        const baseRadius = Math.min(canvas.width, canvas.height) * 0.25;
        for (let i = 0; i < dataArray.length; i++) {
            const angle = i * ((Math.PI * 2) / dataArray.length);
            const len = baseRadius + (dataArray[i] * (sens / 4));
            
            ctx.strokeStyle = `hsla(${180 + dataArray[i]}, 100%, 50%, 0.8)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * baseRadius, cy + Math.sin(angle) * baseRadius);
            ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            ctx.stroke();
        }
    } else {
        const barWidth = (canvas.width / dataArray.length) * 2;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const h = dataArray[i] * (sens / 2.5);
            ctx.fillStyle = `hsla(${180 + dataArray[i]}, 100%, 50%, 0.8)`;
            ctx.fillRect(x, cy - h/2, barWidth - 1, h);
            x += barWidth;
        }
    }
}