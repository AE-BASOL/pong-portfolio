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
    background: '#04152c',
    paddleWidth: 140,
    paddleHeight: 16,
    paddleOffset: 90,
    paddleSpeed: 8,
    ballRadius: 11,
    ballSpeed: 4.6,
    boxHeight: 64
  }
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const typewriterElement = document.getElementById('typewriter');
createTypewriter(typewriterElement, CONFIG.phrases);

const { paddleWidth, paddleHeight, paddleOffset, paddleSpeed, ballRadius, ballSpeed, boxHeight } =
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
  y: paddle.y - ballRadius,
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

const boxes = Object.entries(CONFIG.urls).map(([label, url], index, arr) => {
  const width = canvas.width / arr.length;
  return {
    label,
    url,
    x: index * width,
    y: canvas.height - boxHeight,
    width,
    height: boxHeight
  };
});

const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
gradient.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
gradient.addColorStop(1, 'rgba(244, 114, 182, 0.08)');

let lastTime = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetBall() {
  ball.launched = false;
  ball.x = paddle.x + paddle.width / 2;
  ball.y = paddle.y - ball.radius;
  ball.dx = 0;
  ball.dy = 0;
}

function launchBall() {
  if (ball.launched) return;
  ball.launched = true;
  const direction = Math.random() > 0.5 ? 1 : -1;
  ball.dx = ball.speed * 0.8 * direction;
  ball.dy = -ball.speed;
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

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
}

function drawPaddle() {
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = 'rgba(56, 189, 248, 0.45)';
  ctx.shadowBlur = 18;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.shadowBlur = 0;
}

function drawBall() {
  ctx.beginPath();
  ctx.fillStyle = '#f1f5f9';
  ctx.shadowColor = 'rgba(241, 245, 249, 0.6)';
  ctx.shadowBlur = 12;
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawBoxes() {
  ctx.font = '16px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  boxes.forEach((box) => {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const radius = 12;
    roundedRect(ctx, box.x + 12, box.y + 10, box.width - 24, box.height - 20, radius);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(box.label, box.x + box.width / 2, box.y + box.height / 2);
  });
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function handleCollisions() {
  // Side walls
  if (ball.x + ball.radius >= canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.dx *= -1;
  }
  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.dx *= -1;
  }

  // Ceiling
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.dy *= -1;
  }

  // Paddle
  if (
    ball.y + ball.radius >= paddle.y &&
    ball.y + ball.radius <= paddle.y + paddle.height + Math.abs(ball.dy) &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width &&
    ball.dy > 0
  ) {
    const relativeIntersect = ball.x - (paddle.x + paddle.width / 2);
    const normalized = relativeIntersect / (paddle.width / 2);
    const bounceAngle = normalized * (Math.PI / 3);
    ball.dx = ball.speed * Math.sin(bounceAngle);
    ball.dy = -Math.abs(ball.speed * Math.cos(bounceAngle));
  }

  // Boxes
  boxes.forEach((box) => {
    if (intersectsCircleRect(ball, box)) {
      if (CONFIG.DEBUG) {
        console.log('Box collision:', box.label);
      }
      ball.dy = -Math.abs(ball.dy || ball.speed);
      ball.y = box.y - ball.radius - 2;
      if (!CONFIG.DEBUG) {
        window.location.href = box.url;
      }
    }
  });

  // Floor fail-safe
  if (ball.y - ball.radius > canvas.height + 30) {
    resetBall();
  }
}

function intersectsCircleRect(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function update(dt) {
  updatePaddleFromKeyboard();
  updatePaddleFromMouse();

  if (!ball.launched) {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius;
  } else {
    const delta = dt || 16.67;
    const scale = delta / 16.67;
    ball.x += ball.dx * scale;
    ball.y += ball.dy * scale;
    handleCollisions();
  }
}

function render() {
  drawBackground();
  drawBoxes();
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
    // developer shortcut to reset the ball
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

window.addEventListener('resize', () => {
  // Keep the canvas responsive by scaling via CSS. The drawing dimensions stay fixed.
  // We still update the bounding boxes for pointer hit testing.
  boxes.forEach((box, index, arr) => {
    const width = canvas.width / arr.length;
    box.x = index * width;
    box.y = canvas.height - boxHeight;
    box.width = width;
    box.height = boxHeight;
  });
});
