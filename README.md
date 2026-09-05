# Aero / Lite

A lightweight Three.js flight trainer built around private-pilot fundamentals. Fly a Skyhawk-style high-wing trainer through a guided traffic pattern, then receive a scored landing debrief.

## Training lesson

- Normal takeoff, rotation, and climb
- Upwind, crosswind, downwind, base, and final pattern legs
- Flap and airspeed guidance
- PAPI glidepath lights and stabilized-approach feedback
- Flare, touchdown, braking, and directional control
- Go-around practice
- Landing score for centerline, touchdown zone, descent rate, and alignment

## Run locally

```bash
npm install
npm run dev
```

## Controls

- `W` / `S` — pitch up / down
- `A` / `D` — roll left / right
- `Q` / `E` — rudder / ground steering
- `↑` / `↓` — smoothly increase / decrease throttle (`Shift` / `Control` also work)
- `F` — cycle flaps up, 10°, 20°, and 30°
- `Space` — brake during rollout
- `G` — go around during approach
- `C` — toggle external and internal pilot views
- Click and drag — look around in either view; release to hold the view angle
- `Volume Up` / `Volume Down` (or `+` / `-`) — adjust game audio
- `Tab` — toggle the in-flight controls reference
- `P` or `Escape` — pause

The simplified power model is calibrated around the current Skyhawk envelope: a 180 hp engine, 124 KTAS maximum cruise speed, and 48 KCAS stall speed. Full-power takeoff acceleration is tuned toward the published 960 ft standard-condition ground roll.
