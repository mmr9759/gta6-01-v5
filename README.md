# VELMARA: Streets of Gold (v5)

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/mmr9759/gta6-01-v5/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/mmr9759/gta6-01-v5/reward.svg)](https://make.fun/bounty/gta6-01)

Entry for the make.fun bounty [gta6-01 — Make GTA 6](https://make.fun/bounty/gta6-01):
a 2D top-down open-world crime game that runs offline in a desktop browser
from static files, no network needed.

Riko Vale came back to Velmara for one last job. The city had other plans.

## The game

- **A whole city**: 3600×2600 of sun-soaked streets across seven districts —
  Marina Bay, Downtown, The Hills, Old Town, Midtown, Harbor Docks and
  South Beach — with traffic, pedestrians, parks, palms and a beach.
- **10 story missions**: from a first taxi fare to the crown of Velmara —
  car theft, timed package runs, police escapes, street races, a night
  shift and a gold-truck heist, with dialogue from Dario, Mara and Lena.
- **8 cars to steal**: sedan, taxi, coupe, pickup, van, sports car, muscle
  car and the Gold Hauler — each with its own speed and handling.
- **Wanted 0–5 stars**: patrol cruisers chase you, roadblocks appear at
  3 stars, a helicopter circles with a spotlight at 4. Lose them and the
  heat cools; get caught on foot and you are BUSTED.
- **Side life**: taxi fares (double pay at night), 24 hidden gold coins,
  street races, and Kilo Garage upgrades — armor, turbo and nitro.
- **Day and night**: the clock changes the city — lit windows, headlights,
  thinner crowds after dark, and night fares that pay double.
- **Sound, synthesized live**: an adaptive bassline that gets tenser when
  the police are on you, engine hum, sirens and effects — no audio files.
- **Save**: progress autosaves to localStorage; continue from the menu.

## Controls

| Key | Action |
| --- | ------ |
| WASD / arrows | Walk and drive |
| E | Enter / steal a car, pick up a fare, open a garage or shop |
| F | Punch |
| Mouse click | Shoot (costs ammo) |
| SHIFT | Nitro boost (once installed) |
| M | Mission list |
| P / ESC | Pause, close menus |

## Play it

Serve `game/` with any static file server and open `index.html`, for
example:

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in desktop Chrome.

## Files

- `game/index.html` — the page; `game/src/` — the game's own source,
  one file per system (`config`, `world`, `police`, `missions`,
  `render`, `audio`, `shots`, `main`).
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json`.
- `screenshots/` — four real renders of the game running in a browser.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Why v5

The v4 entry reached 98.23% — just 0.64 points under the top-100 cutoff.
v5 pushes further: ten missions instead of five, eight cars instead of
six, roadblocks and a helicopter for the police, a night economy for
taxi fares, garage upgrades, a day/night cycle that changes play, and
a denser, more readable city.

## License

MIT. See [LICENSE](LICENSE).
