# Operation: Bring Them Home

An original browser action game by Old Skool Games and Software. Concept by David Cole.

## First playable: Rescue

Cover twelve escaping prisoners with a defensive gun. Bring at least eight to the truck before the two-minute extraction window closes. Orange uniforms are friendly; red helmets are hostile. Raiders target prisoners and sappers assault the gun. Difficulty changes enemy speed, deployment frequency, and aim. Friendly fire is enabled.

- Mouse: aim, hold left click to fire.
- Keyboard: A/D or Left/Right to aim, Space to fire, R to reload, P/Escape to pause.
- Touch: drag on the field to aim, hold FIRE below the field, tap RELOAD.
- Twenty-four rounds per clip; reload takes 1.65 seconds. Empty clips reload when you try firing.
- SOUND and VOICE toggles persist locally. Radio voices are temporary browser speech. Each enemy-caused prisoner casualty has a one-in-six chance of playing the supplied retro scream at reduced volume when SOUND is enabled; pause, restart, or SOUND OFF stops it.
- Player-caused prisoner deaths trigger “Hey! Don’t shoot me!” instead of the scream. Radio lines wait for the scream to finish. Turning VOICE ON plays a radio check. Speech is independent of the SOUND toggle; pause, restart, and VOICE OFF clear waiting dialogue.
- Losing browser focus pauses the mission. Resume explicitly to continue.

## Development
### Squad-command field test

Mobile: use the left-thumb aiming slider, hold FIRE with the right thumb, and tap TAKE COVER / GO! to toggle the order. Releasing FIRE does not release the cover order. RELOAD remains separate; firing an empty clip still starts a reload. Pause/restart clear touch inputs. Desktop mouse and keyboard controls are unchanged.

- Hold **C** or **HOLD: TAKE COVER** to stop escapees at the next shelter; release to send them onward.
- Commands have a short reaction delay. Shelters A and B each hold three people; overflow continues along the route.
- Sheltered escapees are protected from enemy fire, but player bullets remain dangerous. Raiders target exposed escapees or your gun.
- Raiders telegraph a locked aiming line before firing. The extraction clock continues while the squad is in cover.


Node 22.18+ or 24 recommended. Run `npm ci`, `npm run dev`, `npm test`, and `npm run build`.

Phaser 3.90.0 supplies rendering and pointer input. TypeScript contains the mission simulation and AI. Vite compiles the application. `src/model.ts` is independent of Phaser; future human Player 2 controls can replace AI decisions without replacing the renderer.

The build script copies the compiled site to root `index.html` and `assets/`. Commit those files alongside the source. GitHub Pages can serve **main / (root)** directly. Phaser is loaded from a version-pinned jsDelivr CDN; Google Fonts is optional and has local font fallbacks. A failed engine load displays a useful message. No server or paid AI service is required.

## Roadmap

1. Playtest Rescue: balance, clarity, keyboard and touch handling.
2. Replace temporary speech with original recorded, processed voice clips; add music.
3. Assault, helicopter Escape, and final Showdown.
4. Optional human opponent and controller support.

This is a new game inspired by classic home-computer action adventures. Code, graphics, and music are original. The casualty scream is the user-supplied `retroScream.mp3`, identified by the contributor as a sound effect from Beach Head II / Impossible Mission. Its inclusion does not establish redistribution rights. The source preserves the supplied MP3 bytes in `src/audio/retro-scream.ts`.
