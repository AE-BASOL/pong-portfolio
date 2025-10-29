import { createTypewriter } from './typewriter.js';

/**
 * Global configuration for the landing experience.
 */
const CONFIG = {
  DEBUG: false,
  urls: {
    About: 'https://example.com/about',
    Brain: 'https://example.com/brain',
    Studio: 'https://example.com/studio',
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
    ballSpeed: 4.6
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
  y: canvas.height - paddleOffset,
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
  width: canvas.width / arr.length
}));

function buildTargetsNav() {
  navElement.innerHTML = '';
  const openBracket = document.createElement('span');
  openBracket.className = 'targets-bracket';
  openBracket.textContent = '[';
  openBracket.setAttribute('aria-hidden', 'true');
  navElement.appendChild(openBracket);

  targetEntries.forEach(([label, url], index) => {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.className = 'targets-separator';
      separator.textContent = '|';
      separator.setAttribute('aria-hidden', 'true');
      navElement.appendChild(separator);
    }

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
  });

  const closeBracket = document.createElement('span');
  closeBracket.className = 'targets-bracket';
  closeBracket.textContent = ']';
  closeBracket.setAttribute('aria-hidden', 'true');
  navElement.appendChild(closeBracket);
}

buildTargetsNav();

const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
gradient.addColorStop(0, 'rgba(59, 130, 246, 0.22)');
gradient.addColorStop(1, 'rgba(14, 116, 144, 0.18)');

let lastTime = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetBall() {
  ball.launched = false;
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.dx = 0;
  ball.dy = 0;
}

function launchBall() {
  if (ball.launched) return;
  ball.launched = true;

  const maxHorizontal = ball.speed * 0.75;
  const minHorizontal = maxHorizontal * 0.2;
  let vx = (Math.random() * 2 - 1) * maxHorizontal;
  while (Math.abs(vx) < minHorizontal) {
    vx = (Math.random() * 2 - 1) * maxHorizontal;
  }

  ball.dx = vx;
  ball.dy = Math.abs(ball.speed);
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

function drawPaddle() {
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = 'rgba(56, 189, 248, 0.35)';
  ctx.shadowBlur = 10;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.shadowBlur = 0;
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

function handlePaddleCollision() {
  if (
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width &&
    ball.dy > 0
  ) {
    const relativeIntersect = ball.x - (paddle.x + paddle.width / 2);
    const normalized = clamp(relativeIntersect / (paddle.width / 2), -1, 1);
    const bounceAngle = normalized * (Math.PI / 3);
    const speed = Math.hypot(ball.dx, ball.dy) || ball.speed;
    ball.dx = speed * Math.sin(bounceAngle);
    ball.dy = -Math.abs(speed * Math.cos(bounceAngle));
    ball.y = paddle.y - ball.radius - 1;
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
    ball.dy *= -1;
  }
}

function handleTargetCollision() {
  if (ball.y - ball.radius < canvas.height) {
    return;
  }

  const target = boxes.find((box) => ball.x >= box.x && ball.x < box.x + box.width);
  if (target) {
    if (CONFIG.DEBUG) {
      console.log('Target collision:', target.label);
      ball.dy = -Math.abs(ball.dy || ball.speed);
      ball.y = canvas.height - ball.radius - 2;
    } else {
      window.location.href = target.url;
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
