const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = path.join(__dirname, 'leaderboard.db');
const db = new sqlite3.Database(dbPath);

const http = require('http');
const server = http.createServer(app);
const { Server: IOServer } = require('socket.io');
const io = new IOServer(server);

// map username -> Set of socket ids
const userSockets = new Map();

function addSocketForUser(name, socketId) {
  if (!name) return;
  const set = userSockets.get(name) || new Set();
  set.add(socketId);
  userSockets.set(name, set);
}

function removeSocketForUser(name, socketId) {
  if (!name) return;
  const set = userSockets.get(name);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(name);
}

function emitToUser(name, event, payload) {
  const set = userSockets.get(name);
  if (!set) return;
  for (const sid of set) io.to(sid).emit(event, payload);
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    time_ms INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`);
});

app.get('/api/leaderboard', (req, res) => {
  db.all(
    'SELECT name, time_ms, created_at FROM entries ORDER BY time_ms ASC, created_at ASC LIMIT 50',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'db error' });
      res.json(rows);
    }
  );
});

app.post('/api/submit', (req, res) => {
  const name = (req.body.name || 'anonymous').toString().trim().slice(0, 48) || 'anonymous';
  const time_ms = parseInt(req.body.time_ms, 10);
  if (!Number.isFinite(time_ms) || time_ms <= 0) return res.status(400).json({ error: 'invalid time_ms' });

  const now = Date.now();
  db.run(
    'INSERT INTO entries (name, time_ms, created_at) VALUES (?, ?, ?)',
    [name, time_ms, now],
    function (err) {
      if (err) return res.status(500).json({ error: 'db insert error' });
      // compute rank (1-based). earlier created_at wins on tie
      db.get(
        'SELECT COUNT(*) AS cnt FROM entries WHERE time_ms < ? OR (time_ms = ? AND created_at <= ?)',
        [time_ms, time_ms, now],
        (err2, row) => {
          if (err2) return res.status(500).json({ error: 'db rank error' });
          const rank = (row && row.cnt) ? row.cnt : 0;
          // return top 10 leaderboard plus the rank of this submission
          db.all(
            'SELECT name, time_ms, created_at FROM entries ORDER BY time_ms ASC, created_at ASC LIMIT 10',
            [],
            (err3, rows) => {
              if (err3) return res.status(500).json({ error: 'db fetch error' });
              // emit updated leaderboard to all connected clients
              try { io.emit('leaderboard', rows); } catch (e) {}

              // notify users whose personal best was beaten by this new submission
              // get best times per user
              db.all('SELECT name, MIN(time_ms) AS best FROM entries GROUP BY name', [], (err4, bestRows) => {
                if (!err4 && Array.isArray(bestRows)) {
                  for (const br of bestRows) {
                    const uname = br.name;
                    const best = br.best;
                    // if the new submission time is strictly less than that user's best
                    // and it's not the submitter themselves, notify them
                    if (uname !== name && Number.isFinite(best) && time_ms < best) {
                      emitToUser(uname, 'beaten', { by: name, time_ms: time_ms });
                    }
                  }
                }
              });

              res.json({ rank: rank, leaderboard: rows });
            }
          );
        }
      );
    }
  );
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  // send initial leaderboard on connect
  db.all('SELECT name, time_ms, created_at FROM entries ORDER BY time_ms ASC, created_at ASC LIMIT 10', [], (err, rows) => {
    if (!err) socket.emit('leaderboard', rows || []);
  });
  // handle client registering a username for personal notifications
  socket.on('register', (name) => {
    try {
      const n = (name || '').toString().trim().slice(0, 48);
      if (n) addSocketForUser(n, socket.id);
    } catch (e) {}
  });

  socket.on('unregister', (name) => {
    try {
      const n = (name || '').toString().trim().slice(0, 48);
      if (n) removeSocketForUser(n, socket.id);
    } catch (e) {}
  });

  socket.on('disconnect', () => {
    // remove socket id from all users it's registered to
    for (const [name, set] of userSockets.entries()) {
      if (set.has(socket.id)) {
        removeSocketForUser(name, socket.id);
      }
    }
  });
});

// bind to 0.0.0.0 so container/platform routing can reach the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
