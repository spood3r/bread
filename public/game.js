const TARGET = 'bread';

// socket.io real-time updates
const socket = io();
socket.on('leaderboard', (rows) => renderLeaderboard(rows || []));
socket.on('beaten', (data) => {
  try {
    const t = document.getElementById('toast');
    if (!t) return;
    const by = data.by || 'someone';
    const ms = data.time_ms || 0;
    t.textContent = `${by} beat your time with ${formatMs(ms)}s`;
    t.style.display = '';
    t.classList.add('show');
    setTimeout(() => {
      t.classList.remove('show');
      t.style.display = 'none';
    }, 4000);
  } catch (e) { console.error(e); }
});

const setupContainer = document.getElementById('setupContainer');
const gameContainer = document.getElementById('gameContainer');
const leaderboardTbody = document.querySelector('#leaderboard tbody');

const usernameEl = document.getElementById('username');
const startBtn = document.getElementById('startBtn');
const typingInput = document.getElementById('typingInput');
const timerEl = document.getElementById('timer');
const submitBtn = document.getElementById('submitBtn');
const targetWordEl = document.getElementById('targetWord');

let startAt = null;
let elapsedMs = null;
let running = false;

function formatMs(ms) {
  return (ms / 1000).toFixed(3);
}

function resetToSetup() {
  setupContainer.style.display = '';
  gameContainer.style.display = 'none';
  typingInput.value = '';
  timerEl.textContent = 'Time: 0.000s';
  startAt = null;
  elapsedMs = null;
  running = false;
}

function startGame() {
  const name = (usernameEl.value || '').trim();
  if (!name) {
    alert('Please enter your name first.');
    usernameEl.focus();
    return;
  }
  setupContainer.style.display = 'none';
  gameContainer.style.display = '';
  typingInput.value = '';
  typingInput.focus();
  startAt = performance.now();
  running = true;
  elapsedMs = null;
  timerEl.textContent = 'Time: 0.000s';
  // register username for personal notifications
  const n = (usernameEl.value || '').trim();
  if (n) socket.emit('register', n);
  // disable start to avoid multiple starts
  startBtn.disabled = true;
}

async function submitScore() {
  if (elapsedMs == null) {
    alert('You need to finish typing the word first.');
    return;
  }
  const name = (usernameEl.value || 'anonymous').trim().slice(0, 48) || 'anonymous';
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, time_ms: Math.round(elapsedMs) })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'submit failed');
      return;
    }
    await fetchLeaderboard();
    alert(`Score submitted! Your rank: ${data.rank}`);
    // after submit, unregister and reset UI
    const n = (usernameEl.value || '').trim();
    if (n) socket.emit('unregister', n);
    startBtn.disabled = false;
    resetToSetup();
  } catch (err) {
    console.error(err);
    alert('Network error');
  }
}

// live timing + enable submit when finished
typingInput.addEventListener('input', () => {
  if (!running || startAt == null) return;
  const v = typingInput.value;
  const now = performance.now();
  const ms = now - startAt;
  timerEl.textContent = `Time: ${formatMs(ms)}s`;
  if (v === TARGET) {
    running = false;
    elapsedMs = ms;
    timerEl.textContent = `Finished: ${formatMs(elapsedMs)}s`;
    typingInput.blur();
    submitBtn.disabled = false;
  }
});

startBtn.addEventListener('click', startGame);
submitBtn.addEventListener('click', submitScore);

// UI polish: disable submit until finished
submitBtn.disabled = true;

async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) return;
    const rows = await res.json();
    renderLeaderboard(rows);
  } catch (err) {
    console.error('fetch leaderboard failed', err);
  }
}

function renderLeaderboard(list) {
  leaderboardTbody.innerHTML = '';
  list.forEach((r, i) => {
    const tr = document.createElement('tr');
    const rankTd = document.createElement('td');
    const nameTd = document.createElement('td');
    const timeTd = document.createElement('td');
    rankTd.textContent = i + 1;
    nameTd.textContent = r.name;
    timeTd.textContent = formatMs(r.time_ms);
    tr.appendChild(rankTd);
    tr.appendChild(nameTd);
    tr.appendChild(timeTd);
    leaderboardTbody.appendChild(tr);
  });
}

// initial
fetchLeaderboard();
setInterval(fetchLeaderboard, 1500);
resetToSetup();

// expose for inline onclick compatibility (if any)
window.startGame = startGame;
window.submitScore = submitScore;
