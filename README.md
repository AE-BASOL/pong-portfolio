# Pong Portfolio — Dark Mode Edition

A playful Pong-inspired navigation surface that now lives inside a moody, animated nightscape. The paddled ball still drives navigation, but every section button embraces its own visual identity while the header stays perfectly composed across screen sizes.

## Design & animation layers

- **Dark abstract environment**: layered gradient backdrops (`.ambient::before`, `.ambient::after` in `src/style.css`) drift slowly via CSS keyframes to create a low-contrast nebula behind the action.
- **Themed navigation targets**: each anchor gets a dedicated class in `src/main.js` and bespoke styling in `src/style.css`:
  - `target-link--about` → frosted liquid glass with blur and soft interior sheen.
  - `target-link--brain` → pastel lo-fi gradient with a repeating texture overlay.
  - `target-link--creative` → radiant orb with pulsing glow animations (`@keyframes orb-pulse` / `orb-ambient`).
  - `target-link--research` → brushed-metal gradient and crisp highlights.
  - `target-link--work` → terminal-inspired slab with monospaced copy and a blinking cursor on hover.
- **Responsive typewriter headline**: `src/typewriter.js` measures the longest phrase, locks the header width, and scales the font size (never wraps) while `#typewriter::after` keeps the blinking caret alive.
- **Glowing gameplay elements**: the paddle uses a time-based rainbow gradient with collision-triggered glow boosts, and the ball renders with a persistent halo (`drawPaddle` / `drawBall` in `src/main.js`).

## Run locally on Windows 11 with WebStorm

1. **Install prerequisites**
   - [Node.js LTS](https://nodejs.org/en/download) (Windows Installer).
   - [Git for Windows](https://git-scm.com/download/win).
2. **Clone & install**
   ```bash
   git clone https://github.com/your-user/pong-portfolio.git
   cd pong-portfolio
   npm install
   ```
3. **Open in WebStorm**
   - Launch WebStorm → **File → Open…** and select the project folder.
   - Ensure WebStorm uses your Node LTS interpreter (**File → Settings → Languages & Frameworks → Node.js**).
4. **Start the dev server**
   - In the **npm** tool window or the integrated terminal, run `npm run dev`.
   - WebStorm’s preview or your browser should open `http://localhost:5173` automatically; otherwise, copy the URL manually.
5. **Debug / iterate**
   - Use WebStorm’s JavaScript Debug configuration pointing to the dev URL for breakpoints.
   - Inspect console output in DevTools (F12) or WebStorm’s Debug Console.

## Disable the ambient background animation

For performance testing, pause the moving gradients by editing `src/style.css`:

```css
.ambient::before,
.ambient::after {
  /* comment out or remove the animation line */
  animation: none;
}
```

Alternatively, set `animation: none !important;` via DevTools if you only need a temporary toggle.

## Customize colors, gradients, and phrases

- **Section button aesthetics**: update the theme rules in `src/style.css` under the `target-link--*` selectors. The animated orb uses the `@keyframes orb-pulse` and `orb-ambient` definitions in the same file.
- **Background hues**: adjust the root color tokens (`--bg-base`, `--bg-alt`, `--accent`) or the gradient stops inside the `.ambient` selectors in `src/style.css`.
- **Paddle / ball glow**: tweak the hue speed or glow intensity in `drawPaddle` and `drawBall` within `src/main.js`.
- **Header phrases**: edit `CONFIG.phrases` in `src/main.js`. The typewriter layout automatically resizes to fit the new longest phrase.
- **Navigation URLs & labels**: modify `CONFIG.urls` and the matching theme map in `src/main.js`.

## Build scripts

```bash
npm run dev     # start Vite locally
npm run build   # production build (outputs to dist/)
npm run preview # preview the build locally
```

## License

Released under the [MIT License](./LICENSE).
