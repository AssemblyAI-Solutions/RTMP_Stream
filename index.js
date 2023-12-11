const ASSEMBLYAI_API_KEY = ""
const RTMP_URL = "rtmp://your.rtmp.server/live/stream";


const WebSocket = require('ws');
const spawn = require('child_process').spawn;

const ws = new WebSocket('wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000', {
    headers: {
        Authorization: ASSEMBLYAI_API_KEY,
    }
});

ws.on('open', function open() {
    const ffmpeg = spawn('ffmpeg', ['-i', RTMP_URL, '-vn', '-f', 's16le', '-ac', '1', '-ar', '16000', '-']);

    let buffer = Buffer.alloc(0);

    ffmpeg.stdout.on('data', (data) => {
        buffer = Buffer.concat([buffer, data]);
        const buffer_size = 4096;
        while (buffer.length >= buffer_size) {
            const chunk = buffer.slice(0, buffer_size);
            buffer = buffer.slice(buffer_size);

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    audio_data: chunk.toString('base64')
                }), (error) => {
                    if (error) console.error(error);
                });
            }
        }
    });

    ffmpeg.stderr.on('data', (data) => {
        // console.error(`stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });

    ws.on('close', () => {
        ffmpeg.kill();
    });
});

ws.on('message', function incoming(message) {
    const data = JSON.parse(message);
    if (data.message_type === 'PartialTranscript'){
        console.log(data.text);
    }
});
