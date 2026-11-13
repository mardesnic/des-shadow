# Shadow

A free shadow puzzle for young kids that works offline. A little ninja wants to get to the scroll at the end of the street, but it may only walk in the shadows. Tap a spot in the sky to move the sun: in the morning the shadows of the trees and towers fall one way, in the evening the other, and at noon they hide right under. Move the sun so the shadows join up, and walk the ninja through them.

Made for ages 5 and up. There is no timer and no way to lose: nothing moves until you tap, and when the sun is in the way, the ninja only screws its eyes shut.

## Demo

Check out the live demo at: https://mardesnic.github.io/des-shadow/

On your phone, open it and choose **Add to Home Screen** (Safari) or **Install app** (Chrome). It then opens like an app and works offline.

## Features

- Shadows as long as the thing that casts them, falling away from the sun
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
