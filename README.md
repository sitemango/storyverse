# Fifteen Seconds

> **A city should not ask people to become faster. It should learn to become fairer.**

An original, browser-only interactive manga about Tara, her grandfather Dadu, and a pedestrian crossing that asks everyone to move at the same pace. The story begins with a timer and gradually turns the reader's attention toward access, shared space, and the everyday choices that shape a city.

This is a static website: no account, backend, analytics, build step, or third-party runtime library is required.

## Run locally

From the project directory, start any static web server. For example:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. Opening `index.html` directly may disable some browser features; use a local server instead.

## Deploy

### GitHub Pages

The project is already arranged for a root-level static deployment. Push the repository, then in **Settings → Pages** choose the deployment source for the repository and publish the root of the selected branch. No build command or output directory is needed.

### Vercel

Import the repository as a static site. Leave the framework preset empty, set no build command, and use `.` as the output directory.

All local assets use relative paths, so the project can also be hosted below a subpath.

## Story and interaction map

1. **The Crossing** — a real 15-second, visitor-started signal countdown. Visual pressure increases; the countdown continues if the reader scrolls away.
2. **Fifteen Seconds** — select five different walking paces against the same fixed timer.
3. **Look Again** — tap five evidence markers in an illustrated Indian neighborhood street.
4. **The Average Human** — break apart a control-room category and reveal the people it leaves out.
5. **The Mirror** — scroll to reveal the actions reflected beneath public complaints.
6. **The Numbers** — turn Tara's five-page notebook and review clearly labelled, non-statistical field observations.
7. **Give Them 15 Seconds** — drag or tap-to-place the campaign poster; wait for the first person to stop.
8. **The Second Person** — make three small civic choices. Wrong choices show consequences and allow a retry; there is no score.
9. **34 Seconds** — scroll or use the accessible range control to advance the calm return crossing and reveal its narration.
10. **The City** — choose a personal commitment, leave an anonymous handwritten note on this device, and reach the quiet closing page.

The five notebook bars are illustrative marks from Tara's one-morning field notes, **not citywide measurements**. The final note wall stores commitments only in the current browser's `localStorage`; notes are not sent to a server and are not shared across devices.

## Controls

- **Begin** enters the story; the opening can be skipped without completing the countdown.
- **Contents** opens the manga-style table of contents. Chapter links scroll to their panels.
- **Sound** turns on or off a quiet, synthesized city ambience and short signal/horn tones. Audio is off by default and starts only after an explicit click.
- **P** starts presentation mode at Chapter 01; press **P** again to leave it. Presentation mode hides the floating controls.
- **E** restarts the experience at the title sequence. Notes saved on the device remain available afterward.
- The Chapter 09 range slider provides a keyboard- and touch-accessible alternative to scroll scrubbing.
- Standard browser scrolling, keyboard focus, and touch input work throughout.

## Architecture

- `index.html` — semantic chapter structure, interaction controls, accessible labels, and the inline street illustration.
- `style.css` — the visual system, responsive manga panels, motion, reduced-motion overrides, and all breakpoints.
- `script.js` — small modular controllers for the intro, navigation, optional Web Audio soundscape, countdown, evidence pins, notebook, poster placement, civic-choice sequence, scroll-driven chapters, and local notes.
- `assets/crossing-opening.jpg` and `assets/crossing-return.jpg` — original, generated companion illustrations made for this story.
- `assets/icons/signal.svg` — the project favicon.

The implementation uses plain HTML, CSS, and vanilla JavaScript. It has no external fonts, libraries, network calls, or build-time dependencies. The return crossing is a scroll-revealed transition from the opening artwork to its calmer companion image.

## Accessibility and performance

- Semantic headings, landmarks, button labels, live status announcements, a skip link, visible keyboard focus, and a keyboard-operable contents panel.
- Reduced-motion preferences disable or shorten nonessential motion and make chapter copy visible without reveal animation.
- Sound is opt-in; the story does not depend on audio.
- Touch-sized evidence pins, a draggable **and** tap/keyboard poster-placement flow, and a range input for the scroll-controlled crossing.
- Images are compressed JPEGs; the return artwork is lazy-loaded. CSS and JavaScript are local and dependency-free.

## License

The source and project assets are released under the MIT License. See [`LICENSE`](LICENSE).
