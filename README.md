# Operation: Bring Them Home

An original browser action game by Old Skool Games and Software. Concept by David Cole.

## First playable: Rescue

Cover twelve escaping prisoners with a defensive gun. Bring at least eight to the truck before the two-minute extraction window closes. Orange uniforms are friendly; red helmets are hostile. Raiders target prisoners and sappers assault the gun. Difficulty changes enemy speed, deployment frequency, and aim. Friendly fire is enabled.

- Mouse: aim, hold left click to fire.
- Keyboard: A/D or Left/Right to aim, Space to fire, R to reload, P/Escape to pause.
- Touch: drag on the field to aim, hold FIRE below the field, tap RELOAD.
- Twenty-four rounds per clip; reload takes 1.65 seconds. Empty clips reload when you try firing.
- SOUND and VOICE toggles persist locally. Voices are temporary browser speech, not final recordings.
- Losing browser focus pauses the mission. Resume explicitly to continue.

## Development

Node 22.18+ or 24 recommended. Run `npm ci`, `npm run dev`, `npm test`, and `npm run build`.

Phaser 3.90.0 supplies rendering and pointer input. TypeScript contains the mission simulation and AI. Vite compiles the application. `src/model.ts` is independent of Phaser; future human Player 2 controls can replace AI decisions without replacing the renderer.

The build script copies the compiled site to root `index.html` and `assets/`. Commit those files alongside the source. GitHub Pages can serve **main / (root)** directly. Phaser is loaded from a version-pinned jsDelivr CDN; Google Fonts is optional and has local font fallbacks. A failed engine load displays a useful message. No server or paid AI service is required.

## Roadmap

1. Playtest Rescue: balance, clarity, keyboard and touch handling.
2. Replace temporary speech with original recorded, processed voice clips; add music.
3. Assault, helicopter Escape, and final Showdown.
4. Optional human opponent and controller support.

This is a new game inspired by classic home-computer action adventures. It contains no original Beach Head code, graphics, music, or voice recordings.
