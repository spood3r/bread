const TARGET = 'bread';

const nameInput = document.getElementById('name');
const typeInput = document.getElementById('typeInput');
const timeEl = document.getElementById('time');
const boardEl = document.getElementById('board');
const resetBtn = document.getElementById('reset');

let startAt = null;
let running = false;

function formatMs(ms) {
  return (ms / 1000).toFixed(3);
}

function reset() {
  startAt = null;
  running = false;
  typeInput.value = '';
  timeEl.textContent = '0.000';
  typeInput.focus();
}

typeInput.addEventListener('keydown', (e) => {
  if (!running) {
    running = true;
    startAt = performance.now();
  }
  if (e.key === 'Enter') e.preventDefault();
});

typeInput.addEventListener('input', async () => {
  const v = typeInput.value;
  if (!running) return;
  const elapsed = performance.now() - startAt;
  timeEl.textContent = formatMs(elapsed);
  if (v === TARGET) {
    running = false;
    const ms = Math.round(elapsed);
    await submitScore(nameInput.value || 'anonymous', ms);
  }
});

resetBtn.addEventListener('click', reset);

async function submitScore(name, time_ms) {
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, time_ms })
    });
    const data = await res.json();
    if (res.ok) {
      await fetchLeaderboard();
      alert(`Submitted! Your rank: ${data.rank}`);
      reset();
    } else {
      alert(data.error || 'submit failed');
    }
  } catch (err) {
    alert('Network error');
    console.error(err);
  }
}

function renderLeaderboard(list) {
  boardEl.innerHTML = '';
  for (const row of list) {
    const li = document.createElement('li');
    li.textContent = `${row.name} — ${formatMs(row.time_ms)}s`;
    boardEl.appendChild(li);
  }
}

async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    renderLeaderboard(data);
  } catch (err) {
    console.error('fetch leaderboard failed', err);
  }
}

// initial
fetchLeaderboard();
setInterval(fetchLeaderboard, 1500);
reset();
