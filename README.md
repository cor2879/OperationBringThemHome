# Operation: Bring Them Home

An original browser action game by Old Skool Games and Software. Concept by David Cole.

## First playable: Rescue

Cover twelve escaping prisoners with a defensive gun. Bring at least eight to the truck before the six-minute extraction window closes. Only one escapee is active at a time; after rescue or loss, the next leaves following a 1.8-second deployment gap. Orange uniforms are friendly; red helmets are hostile. Raiders focus on the exposed escapee and sappers assault the gun. Difficulty changes enemy speed, deployment frequency, and aim. Friendly fire is enabled.

- Mouse: aim, hold left click to fire.
- Keyboard: A/D or Left/Right to aim, Space to fire, R to reload, P/Escape to pause.
- Touch: use the aiming slider below the field, hold FIRE, tap TAKE COVER / GO!, and tap RELOAD.
- Twenty-four rounds per clip; reload takes 1.65 seconds. Empty clips reload when you try firing.
- SOUND and VOICE toggles persist locally. Radio voices are bundled synthetic recordings, played through the unlocked game audio context without a browser speech service. Each enemy-caused prisoner casualty has a one-in-six chance of playing the supplied retro scream at reduced volume when SOUND is enabled; pause, restart, or SOUND OFF stops it.
- Player-caused prisoner deaths trigger “Hey! Don’t shoot me!” instead of the scream. Radio lines wait for the scream to finish. Turning VOICE ON plays a radio check. Voices are independent of the SOUND toggle; pause, restart, and VOICE OFF clear waiting dialogue. Original dialogue clips are generated offline with FFmpeg/Flite using `python scripts/generate-radio-voices.py`.
- Losing browser focus pauses the mission. Resume explicitly to continue.

## Development
### Squad-command field test

Mobile: use the left-thumb aiming slider, hold FIRE with the right thumb, and tap TAKE COVER / GO! to toggle the order. Releasing FIRE does not release the cover order. RELOAD remains separate; firing an empty clip still starts a reload. Pause/restart clear touch inputs. Desktop mouse and keyboard controls are unchanged.

- Hold **C** or **HOLD: TAKE COVER** to stop escapees at the next shelter; release to send them onward.
- Commands have a short reaction delay. Shelters A and B each hold the active escapee. Keeping someone in cover does not deploy the next prisoner; release GO to continue their crossing.
- Sheltered escapees are protected from enemy fire, but player bullets remain dangerous. Raiders target exposed escapees or your gun.
- Raiders telegraph a locked aiming line before firing. The extraction clock continues while the squad is in cover.
- One machine-gun squad at a time approaches from the upper left, deploys at the left flank, and sweeps the exposed crossing between shelters. Its amber setup lasts 1.5 seconds, red burst lasts 2.4 seconds, and green reload lasts 9.5 / 8.5 / 7.5 seconds on Rookie / Regular / Veteran. Use COVER before the burst and GO during reload. Burst range is limited to the crossing so trailing shots do not follow escapees past the second shelter. It takes three hits to destroy the squad and interrupt its cycle. Persistent status, aiming lines, phase bars, and bundled radio calls announce the threat.
- Destroying a machine-gun squad starts a 12 / 10 / 8-second reinforcement gap on Rookie / Regular / Veteran, before its replacement approaches. Raider/sapper deployments gradually accelerate with prisoner crossings, with at most 4 / 5 / 6 active at once. The bottom-right status tracks the current escapee and their shelter.
- After the first two crossings, occasional dogs pursue the active escapee along the route. A synthesized bark and bundled radio call give two seconds of warning. New warnings stop on the final leg from Shelter B to the van; previously issued warnings still complete. Dogs run at 64 / 72 / 80 pixels per second on Rookie / Regular / Veteran (escapees run at 43), take one hit, and wait outside shelters. Clear the dog before GO. Contact kills an exposed escapee; pursuit ends when its own escapee is rescued or lost. Only one dog can be active, with at least 35 seconds between warnings.


Node 22.18+ or 24 recommended. Run `npm ci`, `npm run dev`, `npm test`, and `npm run build`.

Phaser 3.90.0 supplies rendering and pointer input. TypeScript contains the mission simulation and AI. Vite compiles the application. `src/model.ts` is independent of Phaser; future human Player 2 controls can replace AI decisions without replacing the renderer.

The build script copies the compiled site to root `index.html` and `assets/`. Commit those files alongside the source. GitHub Pages can serve **main / (root)** directly. Phaser is loaded from a version-pinned jsDelivr CDN; Google Fonts is optional and has local font fallbacks. A failed engine load displays a useful message. No server or paid AI service is required.

## Roadmap

1. Playtest Rescue: balance, clarity, keyboard and touch handling.
2. Replace temporary speech with original recorded, processed voice clips; add music.
3. Assault, helicopter Escape, and final Showdown.
4. Optional human opponent and controller support.

This is a new game inspired by classic home-computer action adventures. Code, graphics, and music are original. The casualty scream is the user-supplied `retroScream.mp3`, identified by the contributor as a sound effect from Beach Head II / Impossible Mission. Its inclusion does not establish redistribution rights. The source preserves the supplied MP3 bytes in `src/audio/retro-scream.ts`.
