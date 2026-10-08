"""Render original radio dialogue with FFmpeg's bundled Flite synthesizer."""
import base64
import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
LINES = {
    'Prisoners are moving. Cover the route.': 'rms',
    'We made it! Keep them coming!': 'kal',
    'One more heading home!': 'kal',
    'Thank you! Get the others!': 'kal',
    "Easy! We're on your side!": 'kal',
    "Hey! Don't shoot me!": 'kal',
    'We lost one. Watch the orange uniforms.': 'rms',
    'Sapper on the left. Protect your position.': 'rms',
    'Machine gun on the left. Get them to cover!': 'rms',
    'Machine gun reloading. Move them now!': 'rms',
    'Dog loose! Get to cover!': 'rms',
    'Take cover! Stop at the next shelter!': 'rms',
    'Moving! Cover us!': 'kal',
    'Extraction confirmed. You brought them home.': 'rms',
    'Pull back. The operation is over.': 'rms',
    'Radio check. Voice channel online.': 'rms',
}
clips = {}
with tempfile.TemporaryDirectory() as temporary:
    directory = pathlib.Path(temporary)
    for index, (line, voice) in enumerate(LINES.items()):
        text = directory / f'{index}.txt'
        output = directory / f'{index}.mp3'
        text.write_text(line)
        subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i',
                        f'flite=textfile={text}:voice={voice}', '-af',
                        'highpass=f=250,lowpass=f=3300,alimiter=limit=0.8',
                        '-ar', '22050', '-ac', '1', '-b:a', '48k', str(output)], check=True)
        clips[line] = base64.b64encode(output.read_bytes()).decode()
(ROOT / 'src/audio/radio-clips.ts').write_text(
    '// Original dialogue synthesized offline with Flite; no device speech service required.\n'
    'export default ' + json.dumps(clips, indent=2) + ' as Record<string,string>;\n')
