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

## Visual direction

The first pixel-art pass uses an original generated terrain layer (`src/art/battlefield-terrain.webp`) inspired by the approved concept sheet, with code-drawn scenery and animated pixel sprites in `src/art/render.ts`. The route, collision walls, hit targets and game rules retain their existing coordinates. Orange escapees, red enemy accents, distinct dogs, two-person gun crews, recessed sandbag shelters and an open extraction van keep the action readable. The second crew member is decorative; the squad remains one target. A terrain loading failure falls back to a plain field with the same scenery and sprites.

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
3. Chapter 03: Breakout — defend the moving escape convoy.
4. Chapter 04: The Confrontation — a knife-throwing showdown.
5. Chapter 05: Extraction — escape aboard an attack helicopter.
6. Optional human opponent and controller support.

This is a new game inspired by classic home-computer action adventures. Code, graphics, and music are original. The casualty scream is the user-supplied `retroScream.mp3`, identified by the contributor as a sound effect from Beach Head II / Impossible Mission. Its inclusion does not establish redistribution rights. The source preserves the supplied MP3 bytes in `src/audio/retro-scream.ts`.

## Chapter 02: Hold the Line

Choose Hold the Line above the game, or open `?chapter=defense`. Defend an outpost until the convoy arrives at 150 seconds, then hold through twelve seconds of boarding. Lose if the gun position reaches zero health or three friendly stretcher teams die. Warnings precede rotating left, center and right attacks; sappers breach the gate and machine-gun crews telegraph a burst before reloading. COVER makes medics duck and cross at 35% speed, shielding them from enemy bullets but never friendly fire. GO restores full speed. Desktop and touch controls, shared ammunition, audio toggles and bundled radio recordings carry over from Rescue. Chapters have separate encounter rules and scenery; Rescue remains the default.

Defense tests cover wave warnings and sectors, friendly-fire attribution, ducking/GO, gate breaches, gun-crew interruption, convoy boarding, failure priority, aid-station arrival and a deterministic careful-player completion at all three difficulties.

### Armored reinforcements

Hold the Line now has occasional armored transports: a three-second warning, eight-hit armor, three infantry unloaded one at a time, and a machine gun that locks onto an exposed stretcher team or the gun position before its burst. COVER protects medics as usual. Shooting the vehicle before unloading cancels remaining reinforcements; already deployed soldiers remain. The transport withdraws after 26 seconds on station, and another cannot approach until a 42-second gap after it leaves or is destroyed. No new transports start in the last fifteen seconds before convoy arrival. Transport infantry share the eight-hostile limit.

## Campaign order

1. The Rescue — playable prisoner crossings.
2. Hold the Line — playable outpost defense.
3. Breakout — playable convoy escape.
4. The Confrontation — planned knife-throwing duel.
5. Extraction — planned attack-helicopter escape.

The opening assault is no longer a separate planned chapter. These labels establish the sequence; the final two chapters are not implemented yet.

## Chapter 03: Breakout

Open `?chapter=breakout` or choose the third chapter above the game. Man the rear gun of a rescue truck on a scrolling road. Survive 150 seconds and destroy the final armored pursuer, which joins at 120 seconds. Losing all truck health, three friendly trucks, or reaching the bridge with the final pursuer alive ends the mission. Motorcycles arrive in staggered packs of two or three, weave, and take one hit each. Jeeps take three hits; armored pursuers take eighteen. Packs wait until the five-vehicle pursuit cap has room for the entire group. Enemy shots have visible aiming tells followed by bursts and green reload bars. Friendly vehicles use blue-and-cream bodies with orange roof panels and flags, leave through roadside exits, and can be hit by either side. Enemy spawns are bounded; one armored pursuer and one friendly truck at a time. Desktop aim/fire/reload/pause and mobile slider/FIRE/RELOAD carry over. Cover orders do not apply to the moving convoy. Pause freezes road motion along with the simulation. Bundled synthesized radio dialogue announces traffic, pursuit and the bridge.


## Chapter 04 — The Confrontation
Open `?chapter=confrontation` for the fortress knife duel. Both fighters have five health points per round; win two out of three rounds, with a two-minute limit per round. W/S or Up/Down changes between three levels, Space throws, and holding C ducks. A/D is an alternate height control. The same position slider and independent THROW/DUCK buttons work on touchscreen and desktop. Duck stamina lasts 1.1 seconds and recovers on release. Knives can be thrown while moving between levels and launch from the fighter’s current height; movement continues during wind-up. AI tracks heights, telegraphs throws, recovers between attacks, and sometimes ducks incoming knives while recovering. Rookie, Regular and Veteran adjust wind-up, knife speed and evasion. Chapter 05 — Extraction is playable.

Duel refinement: fighters render at 54% size (another 25% reduction) with matching collision bounds. Holding Space plus up/down tilts a knife twelve degrees during wind-up; holding touch THROW while moving the slider gives the same angle control. Release THROW to change platforms. AI sometimes attacks from a neighboring level, aims toward your current height within the same twelve-degree limit, and locks its aim at the start of wind-up. Its red warning line shows that angle, giving you time to dodge.

Duel pacing: player movement is 220 px/s; AI movement is 190 px/s (220 on Veteran). Player knives travel at 800 px/s; AI knives at 620 / 720 / 800 px/s on Rookie / Regular / Veteran. Wind-up warnings and locked aim still give a deliberate dodge window.

Knife reserves: both fighters start with three knives, spent only when a throw launches. One knife recharges every 2.5 seconds, up to three; recharge freezes with the mission and never banks while full. Short recovery allows bursts, but an empty reserve blocks new throws. Both reserves are visible in the HUD.

Match format: best two out of three rounds. Five hits win a round; a two-minute timeout awards it to the AI. Three-second intermissions freeze combat, then reset health, knife reserves, stamina, positions and the timer. The HUD shows round score; the chapter ends only when either side wins twice.

Defeated duelists tumble into the fortress pit with the bundled retro scream on every knockout. Final results wait for the fall to finish; timeouts do not trigger a death animation. The Commandant alternates original fortress dialogue with “You can’t hurt meeee!” on surviving player hits.

## Chapter 05 — Extraction

Open `?chapter=extraction` for a top-down helicopter shooter. Fly down the river for 100 seconds and destroy the command gunship. WASD/arrows fly in four directions, Space fires unlimited twin cannons, and R/X launches a rocket. Hold mouse click to steer and fire, or use the touch flight pad with independent FIRE and ROCKET buttons. The helicopter has 100% armor. Enemy fire deals 8% damage (gunship 10%); brief hit protection prevents overlapping bullets draining the whole health bar.

Field Test 24: fighter groups grow from two to three after 12 seconds, arrive deeper into the field and fire as they pass the helicopter. Fighters and the gunship lead movement by 75 pixels, then lock their aim during a visible warning. Aircraft need four hits, jeeps four, boats nine, tanks twelve and the command gunship sixty-four. Waves arrive every 1.9 seconds, dropping to 1.5 after 25 seconds, adjusted by difficulty; regular bullets travel at 360 px/s. The gunship reloads in .95 seconds and broadens its salvos below half health. Missed gunship clearance still loses at 130 seconds.

Three rockets deal six splash damage and recharge one every eight seconds. Repair crates restore 12% armor; rocket crates replenish two rockets, with supplies every 25 seconds. Ground installations arrive at five seconds and then every eight seconds until the finale. AA and radar have fourteen and ten hit points; supported batteries predict movement and fire faster, wider salvos. Destroying radar weakens its battery. Ground sites move with terrain at 155 px/s, and helicopters can fly over them.

The river, trees, buildings and bridges share continuous world coordinates. The helipad ending has been removed: after clearing the gunship and completing the route, combat ends and the helicopter flies upward off screen before the victory report. Holding fire while stationary loses during the opening; an automated pilot anticipating shots can complete every difficulty without altering health or enemies. All five chapters are playable independently.
