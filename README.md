# Pong Portfolio — Performance Pass

This branch keeps the Pong navigation concept but focuses on smoother motion, lighter rendering, and tighter responsiveness. The background is still dark and atmospheric, yet it now idles well under the 10 % CPU guideline while the gameplay elements respond instantly.

## What changed

- **Lean ambient backdrop** – the `.ambient` gradients in `src/style.css` were simplified (fewer layers, lighter blur) and move with long, low-amplitude keyframes so the GPU handles the work without busy scripts.
- **Responsive paddle pulse** – the paddle in `drawPaddle` stays matte white and only emits a short, 200 ms glow when collisions occur; mouse and keyboard controls now span ~90 % of the canvas width with no easing delay.
- **Smaller, faster ball** – `CONFIG.constants.BALL_SIZE` and `BALL_SPEED` shrink and accelerate the ball (~60 % of the previous size, ~1.5× speed) while retaining the original bounce math.
- **Navigation lives system** – every button in `buildTargetsNav` receives three life dots, floats independently, and counts down hits. When a counter reaches zero, `triggerTargetRedirect` plays a depletion animation before navigating.
- **Debug overlay** – press **F** or call `window.__PONG_DEBUG__.set(true)` to view a live FPS/physics readout without touching the main game loop.

## Gameplay tuning constants

The top of `src/main.js` exposes a `CONFIG.constants` object so you can rebalance feel without hunting through the loop:

| Constant | Purpose |
| --- | --- |
| `BALL_SPEED` | Launch and travel speed of the ball. |
| `BALL_SIZE` | Radius of the ball in canvas pixels. |
| `BOX_LIVES` | Number of hits a navigation box can take before redirecting. |
| `PADDLE_WIDTH` / `PADDLE_HEIGHT` | Paddle dimensions in pixels. |
| `PADDLE_SPEED` | Keyboard movement speed per frame. |
| `PADDLE_MARGIN_RATIO` | Percentage of canvas width reserved as lateral padding for the paddle. |
| `FLOAT_AMPLITUDE` | Base amplitude for the autonomous floating motion applied to nav buttons. |

Change the values and refresh; the layout and collision logic read from this object during setup.

## Disable background motion

To freeze the ambient animation for profiling, comment out the `animation` declarations on `.ambient::before` and `.ambient::after` inside `src/style.css`, or temporarily override them in DevTools with `animation: none !important;`.

## Customize the look & copy

- **Section themes** – edit the `target-link--*` rules in `src/style.css` to adjust gradients, textures, or hover states for each navigation button.
- **Floating behavior** – tune the random float ranges in `boxes` inside `src/main.js` if you want calmer or wilder movement.
- **Header phrases** – update `CONFIG.phrases` in `src/main.js`; the typewriter layout (`src/typewriter.js`) automatically resizes to keep a single-line headline.
- **Destination URLs** – replace the placeholders in `CONFIG.urls` with your real portfolio links.

## Debugging tips

- Press **Enter** to launch the ball, **Space** to reset, and **F** to toggle the FPS/physics overlay.
- From the console you can invoke `window.__PONG_DEBUG__.set(true)` (or `false`) to control the overlay programmatically. The overlay itself lives in `src/style.css` under the `.debug-overlay` selector.

## Run locally on Windows 11 with WebStorm

1. **Install prerequisites**
   - [Node.js LTS](https://nodejs.org/en/download) (Windows Installer)
   - [Git for Windows](https://git-scm.com/download/win)
2. **Clone & install**
   ```bash
   git clone https://github.com/your-user/pong-portfolio.git
   cd pong-portfolio
   npm install
   ```
3. **Open in WebStorm**
   - Start WebStorm → **File → Open…** → choose the project folder.
   - Verify WebStorm uses your Node LTS interpreter (**File → Settings → Languages & Frameworks → Node.js**).
4. **Run the dev server**
   - From the WebStorm npm tool window or terminal, run `npm run dev`.
   - Open `http://localhost:5173` in your browser (WebStorm usually auto-opens it).
5. **Iterate**
   - Use WebStorm’s JavaScript debug configuration for breakpoints.
   - Inspect logs in DevTools or the IDE console while the debug overlay shows frame pacing.

## Scripts

```bash
npm run dev     # start Vite locally
npm run build   # production build (outputs to dist/)
npm run preview # preview the production build
```

## License

Released under the [MIT License](./LICENSE).
