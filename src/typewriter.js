const DEFAULT_SPEED = 80;
const DELETE_SPEED = 45;
const PAUSE_BETWEEN = 1400;
const MIN_SCALE = 0.72;

function setupLayout(element, phrases) {
  if (!phrases.length) return () => {};
  const longest = phrases.reduce((acc, phrase) => (phrase.length > acc.length ? phrase : acc), '');

  const previous = element.textContent;
  element.textContent = longest;

  const computed = getComputedStyle(element);
  const baseFontSize = parseFloat(computed.fontSize);
  const width = Math.ceil(element.scrollWidth);

  element.dataset.baseFontSize = baseFontSize.toString();
  element.dataset.baseWidth = width.toString();
  element.style.width = `${width}px`;

  element.textContent = previous;

  function updateScale() {
    const baseWidth = Number(element.dataset.baseWidth);
    const baseSize = Number(element.dataset.baseFontSize);
    if (!baseWidth || !baseSize) return;

    const margin = 40;
    const available = Math.max(180, window.innerWidth - margin * 2);
    const scale = Math.min(1, available / baseWidth);
    const clampedScale = Math.max(MIN_SCALE, scale);
    element.style.fontSize = `${(baseSize * clampedScale).toFixed(2)}px`;
    element.style.width = `${baseWidth * clampedScale}px`;
  }

  updateScale();
  window.addEventListener('resize', updateScale);

  return () => window.removeEventListener('resize', updateScale);
}

/**
 * Creates a looping typewriter effect on the provided element.
 * @param {HTMLElement} el
 * @param {string[]} phrases
 */
export function createTypewriter(el, phrases) {
  const teardownLayout = setupLayout(el, phrases);
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

  return () => {
    clearTimeout(frameRequest);
    teardownLayout();
  };
}
