# Shadow

A free shadow puzzle for young kids that works offline. A little ninja wants to sneak past a sleeping samurai and out through the gate at the end of the street, but it may only walk in the shadows. Tap a spot in the sky to move the sun: in the morning the shadows of the trees and towers fall one way, in the evening the other, at noon they hide right under, and when the sun is low they are twice as long. Move the sun so the shadows join up, and walk the ninja through them.

Each world brings something new: bamboo that grows every time the sun moves, a hay cart the ninja can push, a cloud that drifts a little with every move, and the night, when only stone lanterns give light and the ninja blows them out.

Made for ages 5 and up. There is no timer and no way to lose: nothing moves until you tap, and when the ninja steps into the light, the samurai only wakes for a moment and the ninja runs back into the shadow.

## Demo

Check out the live demo at: https://mardesnic.github.io/des-shadow/

On your phone, open it and choose **Add to Home Screen** (Safari) or **Install app** (Chrome). It then opens like an app and works offline.

## Features

- Shadows as long as the thing that casts them, or twice as long when the sun is low
- Five worlds: the town, growing bamboo, a cart to push, a drifting cloud, and the night
- Every level is checked by a solver: it can be solved, and you can never get stuck
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
