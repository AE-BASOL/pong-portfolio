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
  launched: false
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
  width: 0,
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
    link.style.setProperty('--float-x', '0px');
    link.style.setProperty('--float-y', '0px');
    link.style.setProperty('--dodge-x', '0px');
    link.style.setProperty('--dodge-y', '0px');
  });

  boxes.forEach((box) => resetBoxLives(box));
}

buildTargetsNav();

resetBall();

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
  ball.launched = false;
  ball.dx = 0;
  ball.dy = 0;
  paddle.pulseTime = 0;
  const { minX, maxX } = getPaddleBounds();
  const horizontalPadding = 20;
  const minBallX = Math.max(ball.radius + horizontalPadding, minX);
  const maxBallX = Math.min(canvas.width - ball.radius - horizontalPadding, maxX + paddle.width);
  ball.x = randomBetween(minBallX, maxBallX);

  const minY = paddle.y + paddle.height + ball.radius + 24;
  const maxY = canvas.height * 0.48;
  ball.y = randomBetween(minY, maxY);
}

function launchBall() {
  if (ball.launched) return;
  ball.launched = true;

  const maxHorizontal = ball.speed * 0.95;
  const minHorizontal = maxHorizontal * 0.25;
  let vx = (Math.random() * 2 - 1) * maxHorizontal;
  while (Math.abs(vx) < minHorizontal) {
    vx = (Math.random() * 2 - 1) * maxHorizontal;
  }

  ball.dx = vx;
  ball.dy = -Math.abs(ball.speed * 1.08);
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

function maybeDodgeTargets() {
  if (!ball.launched || ball.dy <= 0 || ball.y < canvas.height - 140) {
    return;
  }

  const approaching = boxes.find(
    (box) => ball.x >= box.x - 20 && ball.x <= box.x + box.width + 20
  );

  if (approaching && Math.random() < 0.04) {
    triggerTargetDodge(approaching);
  }
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
}

function handleTargetCollision() {
  if (ball.y - ball.radius < canvas.height) {
    return;
  }

  const target = boxes.find((box) => ball.x >= box.x && ball.x < box.x + box.width);
  if (target) {
    const depleted = triggerTargetHit(target);
    if (depleted) {
      ball.launched = false;
      ball.dx = 0;
      ball.dy = 0;
    } else {
      ball.dy = -Math.abs(ball.dy || ball.speed);
      ball.y = canvas.height - ball.radius - 4;
    }
  } else {
    resetBall();
  }
}

function update(dt) {
  updatePaddleFromKeyboard();
  if (paddle.pulseTime > 0) {
    paddle.pulseTime = Math.max(0, paddle.pulseTime - (dt || 16.67));
  }

  if (!ball.launched) {
    return;
  }

  const delta = dt || 16.67;
  const scale = delta / 16.67;
  ball.x += ball.dx * scale;
  ball.y += ball.dy * scale;

  handleWallCollisions();
  handlePaddleCollision();
  maybeDodgeTargets();
  handleTargetCollision();

  if (ball.y - ball.radius > canvas.height + 30) {
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

function updateBoxLayout() {
  const margin = canvas.width * PADDLE_MARGIN_RATIO;
  const usableWidth = canvas.width - margin * 2;
  const segment = usableWidth / boxes.length;
  const boxWidth = segment * 0.68;
  boxes.forEach((box, index) => {
    box.width = boxWidth;
    box.x = margin + index * segment + (segment - boxWidth) / 2;
  });
}

updateBoxLayout();

window.addEventListener('resize', updateBoxLayout);

window.__PONG_DEBUG__ = {
  set: setDebug,
  state: debugState
};
