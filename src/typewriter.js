const DEFAULT_SPEED = 80;
const DELETE_SPEED = 45;
const PAUSE_BETWEEN = 1400;

/**
 * Creates a looping typewriter effect on the provided element.
 * @param {HTMLElement} el
 * @param {string[]} phrases
 */
export function createTypewriter(el, phrases) {
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let frameRequest;

  function type() {
    const current = phrases[phraseIndex];
    const displayed = current.slice(0, charIndex);
    el.textContent = displayed;

    if (!isDeleting && charIndex === current.length) {
      isDeleting = true;
      frameRequest = setTimeout(type, PAUSE_BETWEEN);
      return;
    }

    if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
    }

    charIndex += isDeleting ? -1 : 1;

    const speed = isDeleting ? DELETE_SPEED : DEFAULT_SPEED;
    frameRequest = setTimeout(type, speed);
  }

  type();

  return () => clearTimeout(frameRequest);
}
