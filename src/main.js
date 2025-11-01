import { createTypewriter } from './typewriter.js';

/**
 * Tunable configuration for performance and feel.
 */
const CONFIG = {
  DEBUG: false,
  constants: {
    BALL_SPEED: 8.4,
    BALL_SIZE: 6,
    BOX_LIVES: 3,
    PADDLE_WIDTH: 150,
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

const typewriterElement = document.getElementById('typewriter');
createTypewriter(typewriterElement, CONFIG.phrases);

const {
  BALL_SPEED,
  BALL_SIZE,
  BOX_LIVES,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_OFFSET,
  PADDLE_SPEED,
  PADDLE_MARGIN_RATIO,
  FLOAT_AMPLITUDE
} = CONFIG.constants;

const PADDLE_PULSE_DURATION = 200;
const TARGET_SPEED = {
  x: { min: 26, max: 52 },
  y: { min: 18, max: 36 }
};
const TARGET_EDGE_BUFFER = 48;
const BOX_HIT_COOLDOWN = 160;

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
  speed: BALL_SPEED
};

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

buildTargetsNav();

resetBall();

let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;

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

function applyBoxPosition(box) {
  if (!box.element) return;
  box.element.style.setProperty('--base-x', `${box.x.toFixed(2)}px`);
  box.element.style.setProperty('--base-y', `${box.y.toFixed(2)}px`);
}

function randomVelocity(range) {
  const magnitude = randomBetween(range.min, range.max);
  return (Math.random() > 0.5 ? 1 : -1) * magnitude;
}

function initializeBoxMotion() {
  requestAnimationFrame(() => {
    updateViewportMetrics();
    measureBoxes();
    boxes.forEach((box) => {
      if (!box.element) return;
      const horizontalMax = Math.max(viewportWidth - box.width, TARGET_EDGE_BUFFER);
      const verticalMax = Math.max(viewportHeight - box.height, TARGET_EDGE_BUFFER);
      box.x = randomBetween(-TARGET_EDGE_BUFFER, horizontalMax);
      box.y = randomBetween(-TARGET_EDGE_BUFFER, verticalMax);
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

function resetBall() {
  paddle.pulseTime = 0;
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  const angle = randomBetween(0.22, 0.78) * Math.PI;
  const directionX = Math.random() > 0.5 ? 1 : -1;
  const directionY = Math.random() > 0.5 ? 1 : -1;
  const vx = Math.cos(angle) * ball.speed * directionX;
  const vy = Math.sin(angle) * ball.speed * directionY;
  ball.dx = vx;
  ball.dy = vy;
  if (Math.abs(ball.dy) < ball.speed * 0.35) {
    ball.dy = Math.sign(ball.dy || 1) * ball.speed * 0.45;
  }
}

function launchBall() {
  resetBall();
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
    const horizontalLimit = viewportWidth + TARGET_EDGE_BUFFER;
    const verticalLimit = viewportHeight + TARGET_EDGE_BUFFER;

    if (box.x > horizontalLimit) {
      box.x = -width - TARGET_EDGE_BUFFER;
    } else if (box.x < -width - TARGET_EDGE_BUFFER) {
      box.x = horizontalLimit;
    }

    if (box.y > verticalLimit) {
      box.y = -height - TARGET_EDGE_BUFFER;
    } else if (box.y < -height - TARGET_EDGE_BUFFER) {
      box.y = verticalLimit;
    }

    applyBoxPosition(box);
  });
}

function animateTargets(dt) {
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
  box.element.classList.add('target-link--shake');
  if (box.highlightTimeout) {
    clearTimeout(box.highlightTimeout);
  }
  box.highlightTimeout = setTimeout(() => {
    if (box.element) {
      box.element.classList.remove('target-link--hit');
      box.element.classList.remove('target-link--shake');
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
      resetBall();
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
  if (
    ball.y - ball.radius <= paddle.y + paddle.height &&
    ball.y + ball.radius >= paddle.y &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width &&
    ball.dy < 0
  ) {
    const relativeIntersect = ball.x - (paddle.x + paddle.width / 2);
    const normalized = clamp(relativeIntersect / (paddle.width / 2), -1, 1);
    const bounceAngle = normalized * (Math.PI / 3);
    const speed = Math.hypot(ball.dx, ball.dy) || ball.speed;
    ball.dx = speed * Math.sin(bounceAngle);
    ball.dy = Math.abs(speed * Math.cos(bounceAngle));
    ball.y = paddle.y + paddle.height + ball.radius + 1;
    paddle.pulseTime = PADDLE_PULSE_DURATION;
  }
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
    ball.y = ball.radius;
    ball.dy = Math.abs(ball.dy || ball.speed);
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

  const delta = dt || 16.67;
  const scale = delta / 16.67;
  ball.x += ball.dx * scale;
  ball.y += ball.dy * scale;

  handleWallCollisions();
  handlePaddleCollision();
  const metrics = getCanvasMetrics();
  maybeDodgeTargets(metrics);
  handleTargetCollisions(metrics);

  if (
    ball.x < -ball.radius ||
    ball.x > canvas.width + ball.radius ||
    ball.y < -ball.radius ||
    ball.y > canvas.height + ball.radius
  ) {
    resetBall();
  }
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
  } else if (event.code === 'Space') {
    resetBall();
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

function handleResize() {
  updateViewportMetrics();
  measureBoxes();
  boxes.forEach((box) => {
    if (!box.element) return;
    const maxX = viewportWidth + TARGET_EDGE_BUFFER;
    const maxY = viewportHeight + TARGET_EDGE_BUFFER;
    box.x = clamp(box.x, -box.width - TARGET_EDGE_BUFFER, maxX);
    box.y = clamp(box.y, -box.height - TARGET_EDGE_BUFFER, maxY);
    applyBoxPosition(box);
  });
}

window.addEventListener('resize', handleResize);

window.__PONG_DEBUG__ = {
  set: setDebug,
  state: debugState
};
