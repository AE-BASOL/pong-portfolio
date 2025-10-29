# Pong Portfolio

A playful "game-as-navigation" landing page that mixes a Pong-like paddle interaction, collision-triggered navigation, and a looping typewriter headline.

## What's new in this iteration

- Removed the max-width shell so the layout now breathes edge-to-edge, keeping the fixed header hovering freely above a brighter white page with a slow ambient gradient animation.
- Wrapped the canvas and paddle in a softer glow, refined the liquid-glass styling, and added generous spacing plus subtle hover glints to the navigation buttons (now drifting independently and occasionally "dodging" the ball).
- Tuned gameplay with a faster initial launch speed, randomized floaty nav boxes that flash before redirecting, and retained the inverted playfield with the paddle shielding the canvas top.

## 1) Stack summary

| Tool | Purpose | Version |
| --- | --- | --- |
| [Vite](https://vitejs.dev/) | Dev server & bundler | 5.2.0 |
| Vanilla HTML/CSS/JS | UI & game logic | ECMAScript modules |
| [Prettier](https://prettier.io/) | Formatting | 3.2.5 |

## 2) Prerequisites (Windows 11)

1. Install Node.js LTS from https://nodejs.org/en/download (choose the Windows Installer).
2. Install Git for Windows from https://git-scm.com/download/win.
3. Optional: install Prettier globally (`npm install --global prettier`) if you want editor CLI formatting.

## 3) Setup

```bash
git clone https://github.com/your-user/pong-portfolio.git
cd pong-portfolio
npm install
```

## 4) Run in WebStorm (Windows 11)

1. Open **WebStorm** → **File → Open…** and select the `pong-portfolio` folder.
2. Configure the Node interpreter: **File → Settings → Languages & Frameworks → Node.js** and point it to the Node.js LTS installation.
3. To run scripts, use the **npm** tool window (View → Tool Windows → npm) or the integrated **Terminal**.
4. Start the development server with `npm run dev`. WebStorm will open a browser preview; otherwise, copy the URL (default http://localhost:5173) into your browser.
5. Prefer a static preview instead? Right-click `index.html` → **Open in Browser** or enable WebStorm's Live Edit feature.
6. To debug, create a JavaScript Debug configuration (**Run → Edit Configurations → + → JavaScript Debug**) targeting the dev server URL, enable "Break on exceptions," and start debugging. View console logs in the browser DevTools console (F12) or via WebStorm's Debug Console.

## 5) Local testing checklist

- Press **Enter**: the ball launches upward from a random upper-field start with a slight random left/right motion, then rebounds off the top paddle.
- Move the paddle with the mouse and the **ArrowLeft/ArrowRight** keys; it stays anchored near the top edge while the ball dives toward the bottom targets.
- Confirm the bottom navigation shows **Creative Portfolio** alongside the other sections and that redirects fire when the ball lands in each range.
- Let the ball exit the bottom edge—if it crosses within a target's column, the button pulses briefly and then `window.location` changes to the configured URL.
- Confirm the header's typewriter animation loops through all phrases above the canvas without clipping.
- Toggle debug mode by editing `CONFIG.DEBUG` in `src/main.js`:
  - `true`: logs collisions, keeps the ball in-bounds, and suppresses redirects (including clicks on the target nav).
  - `false`: normal navigation behavior.

## 6) Build and production preview

```bash
npm run build
npm run preview
```

- The production build outputs to the `dist/` folder.
- `npm run preview` serves the build locally (default http://localhost:4173).

## 7) Deploy options

### GitHub Pages

1. Commit and push the repository to GitHub.
2. In the repository settings → **Pages**, choose the `gh-pages` branch or `main` + `/dist` (after using a Pages workflow) as the source.
3. Optionally add a custom domain and enable "Enforce HTTPS".
4. Automate deployment by running `npm run build`, committing the `dist/` output to the `gh-pages` branch, and pushing, or configure a GitHub Actions workflow for Vite.

### Static hosting alternative

Any static host (Netlify, Vercel, Render Static, Cloudflare Pages) can deploy the generated `dist/` folder. Build command: `npm run build`. Publish directory: `dist/`.

## 8) Config reference

- **Typewriter phrases**: edit `CONFIG.phrases` in `src/main.js` (updates both the header copy and the animation cycle).
- **Navigation labels & URLs**: edit `CONFIG.urls` in `src/main.js`. The nav bar and collision lanes read from the same entries (including **Creative Portfolio**).
- **Canvas tuning**: adjust `CONFIG.canvas` values for paddle size/offset, speeds, and ball radius/background color.

## 9) Known limitations and TODO

- Add sound effects and bounce feedback.
- Track scoring / combo mechanics.
- Improve mobile touch controls and accessibility cues.
- Pause / resume toggle and multiple lives.

## License

This project is released under the [MIT License](./LICENSE).
