# Shadow

A free shadow puzzle for young kids that works offline. A little ninja wants to sneak past a sleeping samurai and out through the gate of a little town, but it may only walk in the shadows. Tap a side of the town to move the sun there, always round clockwise: every pagoda, bamboo clump and cherry tree casts a shadow away from it, as long as the thing is tall. In towns with stone lanterns the moon is at the bottom: then it is night, dark everywhere but round the lanterns, which light up. The samurai looks from every side the sun goes by on the way, not only where it stops. The pagodas and bamboo are in the way, so the ninja has to find a way round them, through the shadows, moving the sun as it goes.

Made for ages 5 and up. There is no timer and no way to lose: nothing moves until you tap, and when the ninja steps into the light, the samurai only wakes for a moment and the ninja runs back to the start, under a little shelter where it is always shady, to try again.

## Demo

Check out the live demo at: https://mardesnic.github.io/des-shadow/

On your phone, open it and choose **Add to Home Screen** (Safari) or **Install app** (Chrome). It then opens like an app and works offline.

## Features

- The sun on three sides and the moon on the fourth, with shadows by day and lanterns at night
- Levels in two worlds, the pagodas by day and the night, each opening when the one before is solved
- Tap where the ninja should go and it finds its own way through the shadow
- Every level is checked by a solver, so every level can be solved
- A count of puzzles solved
- Picks up where you left off after a reload
- Keeps the screen on while you play
- In English and Croatian, following the phone's language unless you pick one
- Light and dark mode
- No ads, accounts or tracking

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # game and translation tests
npm run build      # production build in dist/
```

`npm run deploy` builds the app and publishes it to GitHub Pages.
