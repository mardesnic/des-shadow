# Shadow

A free shadow puzzle for young kids that works offline. A little ninja wants to get to the golden cell under a treasure chest at the edge of a little town, but it may only walk in the shadows. Tap the button with the sun and the moon on it to move the sun on to the next side of the town, always round clockwise: every pagoda and bamboo clump casts a shadow away from it, as long as the thing is tall: one cell for bamboo, two or three for a pagoda, one for each floor. In towns with stone lanterns the moon is at the bottom: then it is night, dark everywhere but round the lanterns, which light up. The pagodas and bamboo are in the way, so the ninja has to find a way round them, through the shadows, moving the sun as it goes.

Made for ages 5 and up. There is no timer and no way to lose: nothing moves until you tap, the ninja won't walk out into the sun, and if the sun moves onto it, it only ducks and runs back to the start, under a little shelter where it is always shady, to try again.

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
