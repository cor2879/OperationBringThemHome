"""Render original radio dialogue with FFmpeg's bundled Flite synthesizer."""
import base64
import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
LINES = {
    'Anti-aircraft site! Take out the radar!': 'rms',
    'Everyone is aboard. Get us out of here!': 'rms',
    'Enemy gunship! Use the rockets!': 'rms',
    'Landing zone is clear. Bring them home!': 'rms',
    'Everyone is home. Mission accomplished!': 'rms',

    'The convoy is clear. Finish this and get to the helicopter!': 'rms',
    'You will never leave this fortress!': 'awb',
    'You can’t hurt meeee!': 'awb',
    'Stay sharp. Watch his throwing arm.': 'rms',
    'The route is clear. Get to the helicopter!': 'rms',
    'Convoy moving! Keep them off our tail!': 'rms',
    "Motorcycles! They're gaining on us!": 'kal',
    'Armed jeep closing in!': 'rms',
    'Friendly truck! Watch your fire!': 'kal',
    'Armored pursuit! Take it out!': 'rms',
    'Bridge ahead! Almost home!': 'kal',
    'One last armored pursuer! Clear it before the bridge!': 'rms',
    'Pursuit cleared! Head for the checkpoint!': 'kal',
    'Friendly truck hit! Protect the convoy!': 'rms',
    'Checkpoint reached. The convoy is safe.': 'rms',
    'Armored transport inbound! Stop the reinforcements!': 'rms',
    'Transport destroyed!': 'rms',
    'Hold the outpost. The convoy is on its way.': 'rms',
    'Hostiles approaching from the left!': 'rms',
    'Hostiles approaching from the center!': 'rms',
    'Hostiles approaching from the right!': 'rms',
    'Wounded coming through! Watch your fire!': 'kal',
    'Convoy arriving! Cover the boarding!': 'rms',
    'Enemy gun reloading. Clear the position.': 'rms',
    'Medics, heads down!': 'rms',
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
