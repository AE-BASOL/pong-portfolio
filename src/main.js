import { createTypewriter } from './typewriter.js';

/**
 * Global configuration for the landing experience.
 */
const CONFIG = {
  DEBUG: false,
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
  ],
  canvas: {
    background: '#0b1729',
    paddleWidth: 140,
    paddleHeight: 16,
    paddleOffset: 70,
    paddleSpeed: 8,
    ballRadius: 11,
    ballSpeed: 5.6
  }
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const navElement = document.getElementById('targets');

const typewriterElement = document.getElementById('typewriter');
createTypewriter(typewriterElement, CONFIG.phrases);

const { paddleWidth, paddleHeight, paddleOffset, paddleSpeed, ballRadius, ballSpeed } =
  CONFIG.canvas;

const paddle = {
  width: paddleWidth,
  height: paddleHeight,
  x: canvas.width / 2 - paddleWidth / 2,
  y: paddleOffset,
  targetX: null
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: ballRadius,
  dx: 0,
  dy: 0,
  speed: ballSpeed,
  launched: false
};

const keyState = {
  left: false,
  right: false
};

const targetEntries = Object.entries(CONFIG.urls);
const boxes = targetEntries.map(([label, url], index, arr) => ({
  label,
  url,
  x: 0,
  width: canvas.width / arr.length,
  element: null,
  float: {
    amplitudeX: randomBetween(4, 9),
    amplitudeY: randomBetween(2, 6) * (Math.random() > 0.5 ? 1 : -1),
    speedX: randomBetween(0.0008, 0.0016),
    speedY: randomBetween(0.0006, 0.0013),
    phaseX: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2
  },
  highlightTimeout: null,
  redirectTimeout: null,
  dodgeTimeout: null,
  dodging: false
}));

function buildTargetsNav() {
  navElement.innerHTML = '';

  targetEntries.forEach(([label, url], index) => {
    const link = document.createElement('a');
    link.className = 'target-link';
    link.href = url;
    link.textContent = label;
    link.addEventListener('click', (event) => {
      if (CONFIG.DEBUG) {
        event.preventDefault();
        console.log('Navigation suppressed (DEBUG):', label);
      }
    });
    navElement.appendChild(link);
    boxes[index].element = link;
    link.style.setProperty('--float-x', '0px');
    link.style.setProperty('--float-y', '0px');
    link.style.setProperty('--dodge-x', '0px');
    link.style.setProperty('--dodge-y', '0px');
  });
}

buildTargetsNav();

resetBall();

const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
gradient.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
gradient.addColorStop(1, 'rgba(14, 116, 144, 0.18)');

let lastTime = 0;
let navAnimationTime = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function resetBall() {
  ball.launched = false;
  ball.dx = 0;
  ball.dy = 0;

  const horizontalPadding = 24;
  const minX = ball.radius + horizontalPadding;
  const maxX = canvas.width - ball.radius - horizontalPadding;
  ball.x = randomBetween(minX, maxX);

  const minY = paddle.y + paddle.height + ball.radius + 32;
  const maxY = canvas.height * 0.55;
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
  if (keyState.left) {
    paddle.x -= paddleSpeed;
  }
  if (keyState.right) {
    paddle.x += paddleSpeed;
  }
  paddle.x = clamp(paddle.x, 0, canvas.width - paddle.width);
}

function updatePaddleFromMouse() {
  if (paddle.targetX == null) return;
  const diff = paddle.targetX - (paddle.x + paddle.width / 2);
  paddle.x = clamp(paddle.x + diff * 0.18, 0, canvas.width - paddle.width);
}

function drawBackground() {
  ctx.fillStyle = CONFIG.canvas.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBaselineGuides() {
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 1);
  ctx.lineTo(canvas.width, canvas.height - 1);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
  ctx.lineWidth = 1.5;
  boxes.forEach((box) => {
    ctx.beginPath();
    ctx.moveTo(box.x, canvas.height - 18);
    ctx.lineTo(box.x, canvas.height - 2);
    ctx.stroke();
  });
  ctx.restore();
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
  const radius = 18;
  const x = paddle.x;
  const y = paddle.y;
  const { width, height } = paddle;

  ctx.save();
  drawRoundedRectPath(ctx, x, y, width, height, radius);

  const gradientFill = ctx.createLinearGradient(x, y, x, y + height);
  gradientFill.addColorStop(0, 'rgba(248, 250, 252, 0.45)');
  gradientFill.addColorStop(1, 'rgba(15, 23, 42, 0.7)');

  ctx.fillStyle = gradientFill;
  ctx.globalAlpha = 0.92;
  ctx.fill();

  const outline = ctx.createLinearGradient(x, y, x, y + height);
  outline.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  outline.addColorStop(1, 'rgba(59, 130, 246, 0.35)');

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = outline;
  ctx.globalAlpha = 1;
  ctx.stroke();

  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.shadowColor = 'rgba(59, 130, 246, 0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.globalCompositeOperation = 'lighter';
  ctx.fill();

  ctx.restore();
}

function drawBall() {
  ctx.beginPath();
  ctx.fillStyle = '#f1f5f9';
  ctx.shadowColor = 'rgba(241, 245, 249, 0.45)';
  ctx.shadowBlur = 8;
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
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
  if (!box.element) return;
  box.element.classList.add('target-link--hit');
  if (box.highlightTimeout) {
    clearTimeout(box.highlightTimeout);
  }
  box.highlightTimeout = setTimeout(() => {
    if (box.element) {
      box.element.classList.remove('target-link--hit');
    }
    box.highlightTimeout = null;
  }, 460);
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
    triggerTargetHit(target);
    if (CONFIG.DEBUG) {
      console.log('Target collision:', target.label);
      ball.dy = -Math.abs(ball.dy || ball.speed);
      ball.y = canvas.height - ball.radius - 2;
    } else {
      ball.launched = false;
      ball.dx = 0;
      ball.dy = 0;
      if (target.redirectTimeout) {
        clearTimeout(target.redirectTimeout);
      }
      target.redirectTimeout = setTimeout(() => {
        window.location.href = target.url;
      }, 240);
    }
  } else {
    resetBall();
  }
}

function update(dt) {
  updatePaddleFromKeyboard();
  updatePaddleFromMouse();

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
  drawBackground();
  drawBaselineGuides();
  drawPaddle();
  drawBall();
}

function loop(timestamp = 0) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;
  animateTargets(dt || 16.67);
  update(dt);
  render();
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
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowLeft') {
    keyState.left = false;
  } else if (event.code === 'ArrowRight') {
    keyState.right = false;
  }
});

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const relative = (event.clientX - rect.left) / rect.width;
  const x = relative * canvas.width;
  paddle.targetX = clamp(x, 0, canvas.width);
});

canvas.addEventListener('mouseleave', () => {
  paddle.targetX = null;
});

function updateBoxLayout() {
  boxes.forEach((box, index) => {
    const width = canvas.width / boxes.length;
    box.x = index * width;
    box.width = width;
  });
}

updateBoxLayout();

window.addEventListener('resize', updateBoxLayout);
