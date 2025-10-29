# Pong Portfolio

A playful "game-as-navigation" landing page that mixes a Pong-like paddle interaction, collision-triggered navigation, and a looping typewriter headline.

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
5. To debug, create a JavaScript Debug configuration (**Run → Edit Configurations → + → JavaScript Debug**) targeting the dev server URL, enable "Break on exceptions," and start debugging.
6. View console logs in the browser DevTools console (F12) or via WebStorm's Debug Console.

_If you prefer vanilla hosting without the dev server, right-click `index.html` → **Open in Browser** or enable WebStorm's Live Edit._

## 5) Local testing checklist

- Press **Enter** to launch the ball from the paddle.
- Move the paddle with the mouse and the **ArrowLeft/ArrowRight** keys.
- Let the ball hit a bottom navigation box to trigger `window.location` with the configured URL.
- Confirm the header's typewriter animation loops through all phrases.
- Toggle the debug mode by editing `CONFIG.DEBUG` in `src/main.js`:
  - `true`: logs collision events and **disables redirects**.
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

- **Typewriter phrases**: edit `CONFIG.phrases` in `src/main.js`.
- **Navigation labels & URLs**: edit `CONFIG.urls` in `src/main.js`.
- **Canvas & speed tuning**: update `CONFIG.canvas` values (size constants, speeds, offsets).

## 9) Known limitations and TODO

- Add sound effects and bounce feedback.
- Track scoring / combo mechanics.
- Improve mobile touch controls and accessibility cues.
- Pause / resume toggle and multiple lives.

## License

This project is released under the [MIT License](./LICENSE).
