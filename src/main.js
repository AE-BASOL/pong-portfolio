import { createTypewriter } from './typewriter.js';

/**
 * Tunable configuration for performance and feel.
 */
const CONFIG = {
  DEBUG: false,
  constants: {
    BALL_SPEED: 5.9,
    BALL_SIZE: 9,
    BOX_LIVES: 3,
    PLAYER_LIVES: 3,
    PADDLE_WIDTH: 300,
    PADDLE_HEIGHT: 14,
    PADDLE_OFFSET: 92,
    PADDLE_SPEED: 18,
    PADDLE_MARGIN_RATIO: 0.05,
    FLOAT_AMPLITUDE: 22
  },
  urls: {
    About: 'https://example.com/about',
    Brain: 'https://example.com/brain',
    'Creative Portfolio': 'https://example.com/studio',
    Research: 'https://example.com/research',
    Work: 'https://example.com/work'
  },
  phrases: [
    'Designer. Developer. Dreamer.',
    'Guiding ideas through playful motion.',
    'Welcome to my interactive portfolio.'
  ]
};

const BUTTON_THEMES = {
  About: 'target-link--about',
  Brain: 'target-link--brain',
  'Creative Portfolio': 'target-link--creative',
  Research: 'target-link--research',
  Work: 'target-link--work'
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const navElement = document.getElementById('targets');
const playfieldElement = document.getElementById('playfield');
const boundaryElement = document.getElementById('play-boundary');
const livesIndicatorElement = document.getElementById('life-indicator');
const gameOverElement = document.getElementById('game-over');
const restartButton = document.getElementById('restart-button');

const typewriterElement = document.getElementById('typewriter');
createTypewriter(typewriterElement, CONFIG.phrases);

const {
  BALL_SPEED,
  BALL_SIZE,
  BOX_LIVES,
  PLAYER_LIVES,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_OFFSET,
  PADDLE_SPEED,
  PADDLE_MARGIN_RATIO,
  FLOAT_AMPLITUDE
} = CONFIG.constants;

const PLAYFIELD_RATIO = 2 / 3;
const MIN_PLAYFIELD_MARGIN = 24;
const PADDLE_PULSE_DURATION = 200;
const TARGET_SPEED = {
  x: { min: 26, max: 52 },
  y: { min: 18, max: 36 }
};
const TARGET_EDGE_BUFFER = 32;
const BOX_HIT_COOLDOWN = 160;
const BOX_ZONE_TOP_RATIO = 2 / 3;

const playfield = {
  left: 0,
  top: 0,
  width: canvas.width,
  height: canvas.height
};

let playfieldInitialized = false;

const paddle = {
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  x: canvas.width / 2 - PADDLE_WIDTH / 2,
  y: PADDLE_OFFSET,
  pulseTime: 0
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: BALL_SIZE,
  dx: 0,
  dy: 0,
  speed: BALL_SPEED,
  launched: false,
  pendingLaunchOffset: 0
};

let previousBallX = ball.x;
let previousBallY = ball.y;

const keyState = {
  left: false,
  right: false
};

const targetEntries = Object.entries(CONFIG.urls);
const boxes = targetEntries.map(([label, url]) => ({
  label,
  url,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  velocity: { x: 0, y: 0 },
  hitCooldown: 0,
  element: null,
  lives: BOX_LIVES,
  float: {
    amplitudeX: randomBetween(FLOAT_AMPLITUDE * 0.4, FLOAT_AMPLITUDE),
    amplitudeY:
      randomBetween(FLOAT_AMPLITUDE * 0.25, FLOAT_AMPLITUDE * 0.65) *
      (Math.random() > 0.5 ? 1 : -1),
    speedX: randomBetween(0.0007, 0.0014),
    speedY: randomBetween(0.0005, 0.0011),
    phaseX: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2
  },
  highlightTimeout: null,
  redirectTimeout: null,
  dodgeTimeout: null,
  dodging: false,
  livesElement: null
}));

const LIVES_MAX = PLAYER_LIVES;
let playerLives = PLAYER_LIVES;
let gameOver = false;

function buildTargetsNav() {
  navElement.innerHTML = '';

  targetEntries.forEach(([label, url], index) => {
    const link = document.createElement('a');
    const themeClass = BUTTON_THEMES[label];
    link.className = `target-link ${themeClass ?? ''}`.trim();
    link.href = url;
    const labelSpan = document.createElement('span');
    labelSpan.className = 'target-link__label';
    labelSpan.textContent = label;

    const livesContainer = document.createElement('span');
    livesContainer.className = 'target-link__lives';
    for (let i = 0; i < BOX_LIVES; i += 1) {
      const dot = document.createElement('span');
      dot.className = 'target-link__life';
      livesContainer.appendChild(dot);
    }

    link.append(labelSpan, livesContainer);
    link.addEventListener('click', (event) => {
      if (CONFIG.DEBUG) {
        event.preventDefault();
        console.log('Navigation suppressed (DEBUG):', label);
      }
    });
    navElement.appendChild(link);
    boxes[index].element = link;
    boxes[index].livesElement = livesContainer;
    link.style.setProperty('--base-x', '0px');
    link.style.setProperty('--base-y', '0px');
    link.style.setProperty('--float-x', '0px');
    link.style.setProperty('--float-y', '0px');
    link.style.setProperty('--dodge-x', '0px');
    link.style.setProperty('--dodge-y', '0px');
  });

  boxes.forEach((box) => resetBoxLives(box));
}

let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;

buildTargetsNav();
buildLivesIndicator();
resetPlayerLives();
updatePlayfieldDimensions();
parkBallBelowPaddle();
initializeBoxMotion();

function updateViewportMetrics() {
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;
}

function measureBoxes() {
  boxes.forEach((box) => {
    if (!box.element) return;
    const rect = box.element.getBoundingClientRect();
    box.width = rect.width;
    box.height = rect.height;
  });
}

function updatePlayfieldDimensions() {
  updateViewportMetrics();
  const safeViewportWidth = Math.max(1, viewportWidth);
  const safeViewportHeight = Math.max(1, viewportHeight);
  const maxWidth = Math.min(
    safeViewportWidth,
    Math.max(260, safeViewportWidth - MIN_PLAYFIELD_MARGIN * 2)
  );
  const maxHeight = Math.min(
    safeViewportHeight,
    Math.max(260, safeViewportHeight - MIN_PLAYFIELD_MARGIN * 2)
  );
  const targetWidth = Math.floor(safeViewportWidth * PLAYFIELD_RATIO);
  const targetHeight = Math.floor(safeViewportHeight * PLAYFIELD_RATIO);
  const minWidth = Math.min(PADDLE_WIDTH + TARGET_EDGE_BUFFER * 2, maxWidth);
  const minHeight = Math.min(PADDLE_OFFSET + paddle.height + TARGET_EDGE_BUFFER * 2, maxHeight);
  const width = clamp(targetWidth, minWidth, maxWidth);
  const height = clamp(targetHeight, minHeight, maxHeight);

  playfield.width = width;
  playfield.height = height;
  playfield.left = (safeViewportWidth - width) / 2;
  playfield.top = (safeViewportHeight - height) / 2;

  if (playfieldElement) {
    playfieldElement.style.width = `${width}px`;
    playfieldElement.style.height = `${height}px`;
    playfieldElement.style.left = `${playfield.left}px`;
    playfieldElement.style.top = `${playfield.top}px`;
  }

  if (navElement) {
    navElement.style.width = `${width}px`;
    navElement.style.height = `${height}px`;
  }

  if (boundaryElement) {
    boundaryElement.style.borderWidth = '2px';
  }

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  measureBoxes();

  const { minX, maxX } = getPaddleBounds();
  if (!playfieldInitialized || !Number.isFinite(paddle.x)) {
    paddle.x = (minX + maxX) / 2;
  } else {
    paddle.x = clamp(paddle.x, minX, maxX);
  }
  paddle.y = clamp(PADDLE_OFFSET, 0, Math.max(0, playfield.height - paddle.height));

  ball.x = clamp(ball.x, ball.radius, canvas.width - ball.radius);
  ball.y = clamp(ball.y, ball.radius, canvas.height - ball.radius);
  previousBallX = ball.x;
  previousBallY = ball.y;

  boxes.forEach((box) => {
    if (!box.element) return;
    const bounds = getBoxBounds(box);
    box.x = clamp(box.x, bounds.minX, bounds.maxX);
    box.y = clamp(box.y, bounds.minY, bounds.maxY);
    applyBoxPosition(box);
  });

  playfieldInitialized = true;
}

function applyBoxPosition(box) {
  if (!box.element) return;
  box.element.style.setProperty('--base-x', `${box.x.toFixed(2)}px`);
  box.element.style.setProperty('--base-y', `${box.y.toFixed(2)}px`);
}

function getBoxBounds(box) {
  const float = box.float ?? {};
  const width = box.width || box.element?.offsetWidth || 0;
  const height = box.height || box.element?.offsetHeight || 0;
  const marginX = TARGET_EDGE_BUFFER + Math.abs(float.amplitudeX ?? 0);
  const marginY = TARGET_EDGE_BUFFER + Math.abs(float.amplitudeY ?? 0);
  const minX = marginX;
  const zoneTop = playfield.height * BOX_ZONE_TOP_RATIO;
  const minY = Math.max(zoneTop + marginY, zoneTop);
  const maxX = Math.max(minX, playfield.width - width - marginX);
  const maxY = Math.max(minY, playfield.height - height - marginY);
  return { minX, maxX, minY, maxY };
}

function randomVelocity(range) {
  const magnitude = randomBetween(range.min, range.max);
  return (Math.random() > 0.5 ? 1 : -1) * magnitude;
}

function initializeBoxMotion() {
  requestAnimationFrame(() => {
    boxes.forEach((box) => {
      if (!box.element) return;
      const bounds = getBoxBounds(box);
      const hasHorizontalRange = bounds.maxX > bounds.minX;
      const hasVerticalRange = bounds.maxY > bounds.minY;
      box.x = hasHorizontalRange
        ? randomBetween(bounds.minX, bounds.maxX)
        : bounds.minX;
      box.y = hasVerticalRange
        ? randomBetween(bounds.minY, bounds.maxY)
        : bounds.minY;
      box.velocity.x = randomVelocity(TARGET_SPEED.x);
      box.velocity.y = randomVelocity(TARGET_SPEED.y);
      if (Math.abs(box.velocity.x) < 8) {
        box.velocity.x = box.velocity.x < 0 ? -18 : 18;
      }
      if (Math.abs(box.velocity.y) < 8) {
        box.velocity.y = box.velocity.y < 0 ? -14 : 14;
      }
      box.hitCooldown = 0;
      applyBoxPosition(box);
    });

  });
}

initializeBoxMotion();

let lastTime = 0;
let navAnimationTime = 0;
const debugState = {
  enabled: CONFIG.DEBUG,
  overlay: null,
  lastSample: 0,
  frames: 0
};

function ensureDebugOverlay() {
  if (!debugState.enabled || debugState.overlay) return;
  const overlay = document.createElement('div');
  overlay.className = 'debug-overlay';
  overlay.textContent = 'Debug enabled';
  document.body.appendChild(overlay);
  debugState.overlay = overlay;
  debugState.lastSample = performance.now();
  debugState.frames = 0;
}

function removeDebugOverlay() {
  if (!debugState.overlay) return;
  debugState.overlay.remove();
  debugState.overlay = null;
}

function setDebug(enabled) {
  debugState.enabled = enabled;
  if (enabled) {
    ensureDebugOverlay();
  } else {
    removeDebugOverlay();
  }
}

setDebug(debugState.enabled);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function rectanglesOverlap(a, b) {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  );
}

function createBoxRect(box) {
  const width = box.width || box.element?.offsetWidth || 0;
  const height = box.height || box.element?.offsetHeight || 0;
  return {
    left: box.x,
    top: box.y,
    right: box.x + width,
    bottom: box.y + height
  };
}

function getPaddleBounds() {
  const minX = canvas.width * PADDLE_MARGIN_RATIO;
  const maxX = canvas.width * (1 - PADDLE_MARGIN_RATIO) - paddle.width;
  return { minX, maxX };
}

function updateBoxLives(box) {
  if (!box.livesElement) return;
  const dots = box.livesElement.children;
  for (let i = 0; i < dots.length; i += 1) {
    const dot = dots[i];
    if (dot) {
      dot.classList.toggle('is-empty', i >= box.lives);
    }
  }
}

function resetBoxLives(box) {
  box.lives = BOX_LIVES;
  updateBoxLives(box);
}

function buildLivesIndicator() {
  if (!livesIndicatorElement) return;
  livesIndicatorElement.innerHTML = '';
  for (let i = 0; i < LIVES_MAX; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'life-dot';
    dot.setAttribute('aria-hidden', 'true');
    livesIndicatorElement.appendChild(dot);
  }
  updateLivesIndicator();
}

function updateLivesIndicator() {
  if (!livesIndicatorElement) return;
  const dots = livesIndicatorElement.querySelectorAll('.life-dot');
  dots.forEach((dot, index) => {
    dot.classList.toggle('is-empty', index >= playerLives);
  });
  livesIndicatorElement.setAttribute('data-count', `${playerLives}`);
  livesIndicatorElement.setAttribute('aria-label', `Lives remaining: ${playerLives}`);
}

function setGameOverState(active) {
  gameOver = active;
  if (gameOverElement) {
    gameOverElement.classList.toggle('is-visible', active);
  }
  if (active) {
    ball.launched = false;
    ball.dx = 0;
    ball.dy = 0;
  }
}

function resetPlayerLives() {
  playerLives = LIVES_MAX;
  updateLivesIndicator();
}

function loseLife() {
  if (gameOver) return;
  playerLives = Math.max(0, playerLives - 1);
  updateLivesIndicator();
  if (playerLives === 0) {
    setGameOverState(true);
  }
  parkBallBelowPaddle();
}

function restartGame() {
  setGameOverState(false);
  resetPlayerLives();
  boxes.forEach((box) => {
    resetBoxLives(box);
    box.hitCooldown = 0;
    box.dodging = false;
    if (box.highlightTimeout) {
      clearTimeout(box.highlightTimeout);
      box.highlightTimeout = null;
    }
    if (box.dodgeTimeout) {
      clearTimeout(box.dodgeTimeout);
      box.dodgeTimeout = null;
    }
    if (box.redirectTimeout) {
      clearTimeout(box.redirectTimeout);
      box.redirectTimeout = null;
    }
    if (box.element) {
      box.element.classList.remove('target-link--hit');
      box.element.classList.remove('target-link--dodge');
      box.element.classList.remove('target-link--depleted');
      box.element.style.setProperty('--dodge-x', '0px');
      box.element.style.setProperty('--dodge-y', '0px');
    }
  });
  initializeBoxMotion();
  parkBallBelowPaddle();
}

/**
 * Park the ball just below the paddle with a subtle horizontal offset.
 */
function parkBallBelowPaddle() {
  paddle.pulseTime = 0;
  const centerX = paddle.x + paddle.width / 2;
  ball.pendingLaunchOffset = randomBetween(-0.12, 0.12) * paddle.width;
  ball.x = clamp(
    centerX + ball.pendingLaunchOffset,
    ball.radius,
    canvas.width - ball.radius
  );
  ball.y = clamp(
    paddle.y + paddle.height + ball.radius + 6,
    ball.radius,
    canvas.height - ball.radius
  );
  ball.dx = 0;
  ball.dy = 0;
  ball.launched = false;
  previousBallX = ball.x;
  previousBallY = ball.y;
}

/**
 * Launch the ball downward with a slight horizontal variance.
 */
function launchBall() {
  if (gameOver || playerLives <= 0 || ball.launched) return;
  const centerX = paddle.x + paddle.width / 2;
  const offset = ball.pendingLaunchOffset || 0;
  ball.x = clamp(centerX + offset, ball.radius, canvas.width - ball.radius);
  ball.y = clamp(
    paddle.y + paddle.height + ball.radius + 6,
    ball.radius,
    canvas.height - ball.radius
  );
  let horizontal = randomBetween(-0.45, 0.45) * ball.speed;
  let vertical = Math.sqrt(Math.max(ball.speed * ball.speed - horizontal * horizontal, 0));
  const minVertical = ball.speed * 0.65;
  if (vertical < minVertical) {
    vertical = minVertical;
    const remaining = Math.sqrt(
      Math.max(ball.speed * ball.speed - vertical * vertical, 0)
    );
    const direction = Math.sign(horizontal || 1);
    horizontal = direction * remaining;
  }
  ball.dx = horizontal;
  ball.dy = Math.abs(vertical);
  ball.pendingLaunchOffset = 0;
  ball.launched = true;
  previousBallX = ball.x;
  previousBallY = ball.y;
}

function updatePaddleFromKeyboard() {
  if (!keyState.left && !keyState.right) return;
  if (keyState.left) {
    paddle.x -= PADDLE_SPEED;
  }
  if (keyState.right) {
    paddle.x += PADDLE_SPEED;
  }
  const { minX, maxX } = getPaddleBounds();
  paddle.x = clamp(paddle.x, minX, maxX);
}

function drawRoundedRectPath(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawPaddle() {
  const radius = 12;
  const x = paddle.x;
  const y = paddle.y;
  const { width, height } = paddle;
  const pulseFactor = clamp(paddle.pulseTime / PADDLE_PULSE_DURATION, 0, 1);

  ctx.save();
  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = '#f8fafc';
  ctx.shadowColor = 'rgba(248, 250, 252, 0.35)';
  ctx.shadowBlur = 4;
  ctx.fill();

  if (pulseFactor > 0) {
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, `rgba(56, 189, 248, ${0.15 + 0.45 * pulseFactor})`);
    gradient.addColorStop(1, `rgba(129, 140, 248, ${0.15 + 0.45 * pulseFactor})`);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.6 * pulseFactor;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(94, 234, 212, ${0.4 * pulseFactor})`;
    ctx.shadowColor = `rgba(56, 189, 248, ${0.4 * pulseFactor})`;
    ctx.shadowBlur = 16 * pulseFactor;
    ctx.stroke();
  }

  ctx.restore();
}

function drawBall() {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = '#f8fafc';
  ctx.shadowBlur = 6;
  ctx.shadowColor = 'rgba(248, 250, 252, 0.35)';
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function updateBoxMotion(dt) {
  if (gameOver) return;
  const delta = dt || 16.67;
  const seconds = delta / 1000;
  boxes.forEach((box) => {
    if (!box.element) return;
    box.hitCooldown = Math.max(0, box.hitCooldown - delta);
    box.x += box.velocity.x * seconds;
    box.y += box.velocity.y * seconds;

    const width = box.width || box.element.offsetWidth;
    const height = box.height || box.element.offsetHeight;
    box.width = width;
    box.height = height;

    const bounds = getBoxBounds(box);

    if (bounds.maxX <= bounds.minX) {
      box.x = bounds.minX;
      box.velocity.x = 0;
    } else if (box.x <= bounds.minX) {
      box.x = bounds.minX;
      box.velocity.x = Math.abs(box.velocity.x || randomVelocity(TARGET_SPEED.x));
    } else if (box.x >= bounds.maxX) {
      box.x = bounds.maxX;
      box.velocity.x = -Math.abs(box.velocity.x || randomVelocity(TARGET_SPEED.x));
    }

    if (bounds.maxY <= bounds.minY) {
      box.y = bounds.minY;
      box.velocity.y = 0;
    } else if (box.y <= bounds.minY) {
      box.y = bounds.minY;
      box.velocity.y = Math.abs(box.velocity.y || randomVelocity(TARGET_SPEED.y));
    } else if (box.y >= bounds.maxY) {
      box.y = bounds.maxY;
      box.velocity.y = -Math.abs(box.velocity.y || randomVelocity(TARGET_SPEED.y));
    }

    applyBoxPosition(box);
  });
}

/**
 * Allow navigation boxes to bump into one another with simple elastic swaps.
 */
function resolveBoxCollisions() {
  for (let i = 0; i < boxes.length; i += 1) {
    const boxA = boxes[i];
    if (!boxA.element) continue;
    const rectA = createBoxRect(boxA);
    for (let j = i + 1; j < boxes.length; j += 1) {
      const boxB = boxes[j];
      if (!boxB.element) continue;
      const rectB = createBoxRect(boxB);
      if (!rectanglesOverlap(rectA, rectB)) continue;

      const overlapX = Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left);
      const overlapY = Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top);
      if (overlapX <= 0 || overlapY <= 0) continue;

      if (overlapX < overlapY) {
        const direction = rectA.left < rectB.left ? -1 : 1;
        const shift = (overlapX / 2) * direction;
        boxA.x += shift;
        boxB.x -= shift;
        const temp = boxA.velocity.x;
        boxA.velocity.x = boxB.velocity.x;
        boxB.velocity.x = temp;
      } else {
        const direction = rectA.top < rectB.top ? -1 : 1;
        const shift = (overlapY / 2) * direction;
        boxA.y += shift;
        boxB.y -= shift;
        const temp = boxA.velocity.y;
        boxA.velocity.y = boxB.velocity.y;
        boxB.velocity.y = temp;
      }

      const boundsA = getBoxBounds(boxA);
      const boundsB = getBoxBounds(boxB);
      boxA.x = clamp(boxA.x, boundsA.minX, boundsA.maxX);
      boxA.y = clamp(boxA.y, boundsA.minY, boundsA.maxY);
      boxB.x = clamp(boxB.x, boundsB.minX, boundsB.maxX);
      boxB.y = clamp(boxB.y, boundsB.minY, boundsB.maxY);

      applyBoxPosition(boxA);
      applyBoxPosition(boxB);

      rectA.left = boxA.x;
      rectA.top = boxA.y;
      rectA.right = boxA.x + (boxA.width || boxA.element.offsetWidth || 0);
      rectA.bottom = boxA.y + (boxA.height || boxA.element.offsetHeight || 0);
      rectB.left = boxB.x;
      rectB.top = boxB.y;
      rectB.right = boxB.x + (boxB.width || boxB.element.offsetWidth || 0);
      rectB.bottom = boxB.y + (boxB.height || boxB.element.offsetHeight || 0);

      rectA.left = boxA.x;
      rectA.top = boxA.y;
      rectA.right = boxA.x + (boxA.width || boxA.element.offsetWidth || 0);
      rectA.bottom = boxA.y + (boxA.height || boxA.element.offsetHeight || 0);
      rectB.left = boxB.x;
      rectB.top = boxB.y;
      rectB.right = boxB.x + (boxB.width || boxB.element.offsetWidth || 0);
      rectB.bottom = boxB.y + (boxB.height || boxB.element.offsetHeight || 0);
    }
  }
}

function animateTargets(dt) {
  if (gameOver) return;
  navAnimationTime += dt;
  boxes.forEach((box) => {
    if (!box.element) return;
    const { float } = box;
    const offsetX = Math.sin(float.phaseX + navAnimationTime * float.speedX) * float.amplitudeX;
    const offsetY = Math.cos(float.phaseY + navAnimationTime * float.speedY) * float.amplitudeY;
    box.element.style.setProperty('--float-x', `${offsetX.toFixed(2)}px`);
    box.element.style.setProperty('--float-y', `${offsetY.toFixed(2)}px`);
  });
}

function triggerTargetHit(box) {
  if (!box.element) return false;
  box.element.classList.add('target-link--hit');
  if (box.highlightTimeout) {
    clearTimeout(box.highlightTimeout);
  }
  box.highlightTimeout = setTimeout(() => {
    if (box.element) {
      box.element.classList.remove('target-link--hit');
    }
    box.highlightTimeout = null;
  }, 260);

  if (box.lives > 0) {
    box.lives -= 1;
    updateBoxLives(box);
  }

  const depleted = box.lives === 0;
  if (depleted) {
    triggerTargetRedirect(box);
  }

  return depleted;
}

function triggerTargetRedirect(box) {
  if (!box.element) return;
  box.element.classList.add('target-link--depleted');
  if (box.redirectTimeout) {
    clearTimeout(box.redirectTimeout);
  }
  box.redirectTimeout = setTimeout(() => {
    if (CONFIG.DEBUG) {
      console.log('Redirect suppressed (DEBUG):', box.url);
      resetBoxLives(box);
      if (box.element) {
        box.element.classList.remove('target-link--depleted');
      }
      parkBallBelowPaddle();
    } else {
      window.location.href = box.url;
      resetBoxLives(box);
    }
    box.redirectTimeout = null;
  }, 320);
}

function triggerTargetDodge(box) {
  if (!box.element || box.dodging) return;
  box.dodging = true;
  const offsetX = (Math.random() > 0.5 ? 1 : -1) * randomBetween(4, 9);
  const offsetY = randomBetween(-3, 3);
  box.element.classList.add('target-link--dodge');
  box.element.style.setProperty('--dodge-x', `${offsetX.toFixed(2)}px`);
  box.element.style.setProperty('--dodge-y', `${offsetY.toFixed(2)}px`);
  if (box.dodgeTimeout) {
    clearTimeout(box.dodgeTimeout);
  }
  box.dodgeTimeout = setTimeout(() => {
    if (box.element) {
      box.element.classList.remove('target-link--dodge');
      box.element.style.setProperty('--dodge-x', '0px');
      box.element.style.setProperty('--dodge-y', '0px');
    }
    box.dodging = false;
    box.dodgeTimeout = null;
  }, 280);
}

function maybeDodgeTargets(metrics) {
  const { ballScreenX, ballScreenY } = metrics;
  boxes.forEach((box) => {
    if (!box.element || box.dodging) return;
    const rect = box.element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = ballScreenX - centerX;
    const dy = ballScreenY - centerY;
    const distanceSq = dx * dx + dy * dy;
    const threshold = 160 * 160;
    if (distanceSq < threshold && Math.random() < 0.02) {
      triggerTargetDodge(box);
    }
  });
}

function handlePaddleCollision() {
  const left = paddle.x;
  const right = paddle.x + paddle.width;
  const top = paddle.y;
  const bottom = paddle.y + paddle.height;

  const overlapsX = ball.x + ball.radius > left && ball.x - ball.radius < right;
  const overlapsY = ball.y + ball.radius > top && ball.y - ball.radius < bottom;

  if (!overlapsX || !overlapsY) {
    return;
  }

  const prevOverlapsX =
    previousBallX + ball.radius > left && previousBallX - ball.radius < right;
  const prevOverlapsY =
    previousBallY + ball.radius > top && previousBallY - ball.radius < bottom;

  let hitSide;

  if (!prevOverlapsY && prevOverlapsX) {
    hitSide = previousBallY < top ? 'top' : 'bottom';
  } else if (!prevOverlapsX && prevOverlapsY) {
    hitSide = previousBallX < left ? 'left' : 'right';
  } else if (!prevOverlapsX && !prevOverlapsY) {
    const distances = [
      { side: 'left', value: Math.abs(previousBallX + ball.radius - left) },
      { side: 'right', value: Math.abs(right - (previousBallX - ball.radius)) },
      { side: 'top', value: Math.abs(previousBallY + ball.radius - top) },
      { side: 'bottom', value: Math.abs(bottom - (previousBallY - ball.radius)) }
    ];
    distances.sort((a, b) => a.value - b.value);
    hitSide = distances[0].side;
  } else {
    hitSide =
      Math.abs(ball.dy) >= Math.abs(ball.dx)
        ? previousBallY < top
          ? 'top'
          : 'bottom'
        : previousBallX < left
        ? 'left'
        : 'right';
  }

  const speed = Math.hypot(ball.dx, ball.dy) || ball.speed;

  if (hitSide === 'left' || hitSide === 'right') {
    const magnitude = Math.max(Math.abs(ball.dx), speed * 0.65);
    if (hitSide === 'left') {
      ball.x = left - ball.radius - 1;
      ball.dx = -Math.abs(magnitude);
    } else {
      ball.x = right + ball.radius + 1;
      ball.dx = Math.abs(magnitude);
    }
  } else {
    const centerX = paddle.x + paddle.width / 2;
    const relativeIntersect = ball.x - centerX;
    const normalized = clamp(relativeIntersect / (paddle.width / 2 || 1), -1, 1);
    const bounceAngle = normalized * (Math.PI / 3);
    ball.dx = speed * Math.sin(bounceAngle);
    if (hitSide === 'top') {
      ball.y = top - ball.radius - 1;
      ball.dy = -Math.abs(speed * Math.cos(bounceAngle));
    } else {
      ball.y = bottom + ball.radius + 1;
      ball.dy = Math.abs(speed * Math.cos(bounceAngle));
    }
  }

  paddle.pulseTime = PADDLE_PULSE_DURATION;
}

function handleWallCollisions() {
  if (ball.x + ball.radius >= canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.dx *= -1;
  }
  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.dx *= -1;
  }
  if (ball.y - ball.radius <= 0) {
    loseLife();
    return;
  }
  if (ball.y + ball.radius >= canvas.height) {
    ball.y = canvas.height - ball.radius;
    ball.dy = -Math.abs(ball.dy || ball.speed);
  }
}

function getCanvasMetrics() {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 ? rect.width / canvas.width : 1;
  const scaleY = rect.height > 0 ? rect.height / canvas.height : 1;
  return {
    rect,
    scaleX,
    scaleY,
    invScaleX: scaleX !== 0 ? 1 / scaleX : 1,
    invScaleY: scaleY !== 0 ? 1 / scaleY : 1,
    ballScreenX: rect.left + ball.x * scaleX,
    ballScreenY: rect.top + ball.y * scaleY,
    ballScreenRadiusX: ball.radius * scaleX,
    ballScreenRadiusY: ball.radius * scaleY
  };
}

function handleTargetCollisions(metrics) {
  const { rect: canvasRect, invScaleX, invScaleY } = metrics;
  if (!canvasRect || !Number.isFinite(invScaleX) || !Number.isFinite(invScaleY)) {
    return;
  }

  boxes.forEach((box) => {
    if (!box.element || box.hitCooldown > 0) return;
    const boxRect = box.element.getBoundingClientRect();
    if (!boxRect.width || !boxRect.height) return;

    const left = (boxRect.left - canvasRect.left) * invScaleX;
    const right = (boxRect.right - canvasRect.left) * invScaleX;
    const top = (boxRect.top - canvasRect.top) * invScaleY;
    const bottom = (boxRect.bottom - canvasRect.top) * invScaleY;

    const overlapsX = ball.x + ball.radius > left && ball.x - ball.radius < right;
    const overlapsY = ball.y + ball.radius > top && ball.y - ball.radius < bottom;
    if (!overlapsX || !overlapsY) {
      return;
    }

    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const halfWidth = Math.max(1, (right - left) / 2);
    const halfHeight = Math.max(1, (bottom - top) / 2);
    const normalizedX = (ball.x - centerX) / halfWidth;
    const normalizedY = (ball.y - centerY) / halfHeight;

    if (Math.abs(normalizedX) > Math.abs(normalizedY)) {
      if (normalizedX > 0) {
        ball.x = right + ball.radius;
        ball.dx = Math.abs(ball.dx || ball.speed);
      } else {
        ball.x = left - ball.radius;
        ball.dx = -Math.abs(ball.dx || ball.speed);
      }
    } else {
      if (normalizedY > 0) {
        ball.y = bottom + ball.radius;
        ball.dy = Math.abs(ball.dy || ball.speed);
      } else {
        ball.y = top - ball.radius;
        ball.dy = -Math.abs(ball.dy || ball.speed);
      }
    }

    const depleted = triggerTargetHit(box);
    box.hitCooldown = BOX_HIT_COOLDOWN;

    const impactScale = 0.32;
    const bounceKick = normalizedY * impactScale;
    if (normalizedX > 0) {
      box.velocity.x = Math.abs(box.velocity.x || randomVelocity(TARGET_SPEED.x));
    } else if (normalizedX < 0) {
      box.velocity.x = -Math.abs(box.velocity.x || randomVelocity(TARGET_SPEED.x));
    }
    box.velocity.y += bounceKick * TARGET_SPEED.y.max;
    const maxHorizontal = TARGET_SPEED.x.max * 1.25;
    const maxVertical = TARGET_SPEED.y.max * 1.25;
    box.velocity.x = clamp(box.velocity.x, -maxHorizontal, maxHorizontal);
    box.velocity.y = clamp(box.velocity.y, -maxVertical, maxVertical);

    if (!depleted) {
      const speed = Math.hypot(ball.dx, ball.dy) || ball.speed;
      if (Math.abs(speed - ball.speed) > 0.01) {
        const adjust = ball.speed / speed;
        ball.dx *= adjust;
        ball.dy *= adjust;
      }
    }
  });
}

function update(dt) {
  updatePaddleFromKeyboard();
  if (paddle.pulseTime > 0) {
    paddle.pulseTime = Math.max(0, paddle.pulseTime - (dt || 16.67));
  }

  if (gameOver) {
    previousBallX = ball.x;
    previousBallY = ball.y;
    return;
  }

  const delta = dt || 16.67;
  const scale = delta / 16.67;
  if (!ball.launched) {
    const centerX = paddle.x + paddle.width / 2;
    const offset = ball.pendingLaunchOffset || 0;
    ball.x = clamp(centerX + offset, ball.radius, canvas.width - ball.radius);
    ball.y = clamp(
      paddle.y + paddle.height + ball.radius + 6,
      ball.radius,
      canvas.height - ball.radius
    );
    previousBallX = ball.x;
    previousBallY = ball.y;
    return;
  }

  previousBallX = ball.x;
  previousBallY = ball.y;
  ball.x += ball.dx * scale;
  ball.y += ball.dy * scale;

  handleWallCollisions();
  if (!ball.launched) {
    previousBallX = ball.x;
    previousBallY = ball.y;
    return;
  }
  handlePaddleCollision();
  const metrics = getCanvasMetrics();
  maybeDodgeTargets(metrics);
  handleTargetCollisions(metrics);

  ball.x = clamp(ball.x, ball.radius, canvas.width - ball.radius);
  ball.y = clamp(ball.y, ball.radius, canvas.height - ball.radius);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPaddle();
  drawBall();
}

function loop(timestamp = 0) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;
  updateBoxMotion(dt || 16.67);
  resolveBoxCollisions();
  animateTargets(dt || 16.67);
  update(dt);
  render();

  if (debugState.enabled) {
    ensureDebugOverlay();
    debugState.frames += 1;
    const elapsed = timestamp - debugState.lastSample;
    if (elapsed >= 250) {
      const fps = (debugState.frames * 1000) / (elapsed || 1);
      const speed = Math.hypot(ball.dx, ball.dy);
      if (debugState.overlay) {
        const ballX = ball.x.toFixed(0);
        const ballY = ball.y.toFixed(0);
        debugState.overlay.textContent = `FPS: ${fps.toFixed(1)} | Ball: ${ballX}×${ballY} | Speed: ${speed.toFixed(2)}`;
      }
      debugState.frames = 0;
      debugState.lastSample = timestamp;
    }
  }

  requestAnimationFrame(loop);
}

loop();

window.addEventListener('keydown', (event) => {
  if (event.code === 'ArrowLeft') {
    keyState.left = true;
  } else if (event.code === 'ArrowRight') {
    keyState.right = true;
  } else if (event.code === 'Enter') {
    launchBall();
  } else if (event.code === 'KeyF') {
    setDebug(!debugState.enabled);
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowLeft') {
    keyState.left = false;
  } else if (event.code === 'ArrowRight') {
    keyState.right = false;
  }
});

function updatePaddleFromPointer(clientX) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  const relative = (clientX - rect.left) / rect.width;
  const x = relative * canvas.width - paddle.width / 2;
  const { minX, maxX } = getPaddleBounds();
  paddle.x = clamp(x, minX, maxX);
}

canvas.addEventListener('mousemove', (event) => {
  updatePaddleFromPointer(event.clientX);
});

canvas.addEventListener('touchmove', (event) => {
  if (event.touches.length === 0) return;
  updatePaddleFromPointer(event.touches[0].clientX);
  event.preventDefault();
});

if (restartButton) {
  restartButton.addEventListener('click', () => {
    restartGame();
  });
}

function handleResize() {
  updatePlayfieldDimensions();
  if (!ball.launched) {
    parkBallBelowPaddle();
  }
}

window.addEventListener('resize', handleResize);

window.__PONG_DEBUG__ = {
  set: setDebug,
  state: debugState
};
