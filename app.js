// ===== AI QUIZ MASTER — THE ULTIMATE ARENA =====

(function () {
  'use strict';

  const state = {
    user: null,
    stats: JSON.parse(localStorage.getItem('aiHubStats')) || { quiz: 0, merge: 0, ttt: 0, chess: 0 },
    quizQuestions: [],
    quizIndex: 0,
    score: 0,
    chessBoard: [],
    chessSelected: null,
    chessTurn: 'W',
    mergeBoard: [],
    mergeScore: 0,
    mergeBest: parseInt(localStorage.getItem('mergeBest')) || 0,
  };

  const CATEGORIES = [
    { id: 'Science', name: 'Science', icon: '🔬', color: '#6366f1' },
    { id: 'Mathematics', name: 'Mathematics', icon: '📐', color: '#06b6d4' },
    { id: 'History', name: 'History', icon: '📜', color: '#f59e0b' },
    { id: 'Geography', name: 'Geography', icon: '🌍', color: '#10b981' },
    { id: 'Programming', name: 'Programming', icon: '💻', color: '#ec4899' },
    { id: 'GK', name: 'General Knowledge', icon: '🎓', color: '#8b5cf6' },
    { id: 'Sports', name: 'Sports', icon: '🏀', color: '#ef4444' }
  ];

  const $ = (id) => document.getElementById(id);

  function init() {
    setupAuth();
    setupNavigation();
    setupGameStarters();
    renderCategories();
    
    const saved = localStorage.getItem('aiHubUser');
    if (saved) {
      try {
        const userData = JSON.parse(saved);
        if (userData && userData.name) login(userData.name);
      } catch(e) { localStorage.removeItem('aiHubUser'); }
    }
  }

  function setupAuth() {
    const authForm = $('authForm');
    if (authForm) {
      authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('authUsername').value.trim() || 'Guest';
        login(name);
      });
    }
    if ($('guestBtn')) $('guestBtn').onclick = () => login('Guest');
    if ($('logoutBtn')) $('logoutBtn').onclick = () => { localStorage.removeItem('aiHubUser'); location.reload(); };
  }

  function login(name) {
    state.user = { name };
    localStorage.setItem('aiHubUser', JSON.stringify({ name }));
    if ($('userNameDisplay')) $('userNameDisplay').textContent = name;
    if ($('welcomeName')) $('welcomeName').textContent = name;
    if ($('authScreen')) $('authScreen').classList.remove('active');
    if ($('appContainer')) $('appContainer').classList.remove('hidden');
    showScreen('homeScreen');
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = $(id);
    if (target) target.classList.add('active');
    if (id === 'statsScreen') renderStats();
    window.scrollTo(0,0);
  }

  function setupNavigation() {
    if ($('navHome')) $('navHome').onclick = () => showScreen('homeScreen');
    if ($('navStats')) $('navStats').onclick = () => showScreen('statsScreen');
    if ($('navBtnLogin')) $('navBtnLogin').onclick = () => {
      // Clear user and show auth screen
      localStorage.removeItem('aiHubUser');
      location.reload();
    };
  }


  function renderCategories() {
    const grid = $('categoryGrid');
    if (!grid) return;
    grid.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'cat-card glass-card';
      card.innerHTML = `<div class="cat-icon" style="background:${cat.color}22">${cat.icon}</div><h4>${cat.name}</h4>`;
      card.onclick = () => startQuiz(cat.id);
      grid.appendChild(card);
    });
  }

  function renderStats() {
    const grid = $('statsGrid');
    if (!grid) return;
    grid.innerHTML = `
      <div class="stat-box"><h3>Quiz Score</h3><p>${state.stats.quiz}</p></div>
      <div class="stat-box"><h3>Merge Best</h3><p>${state.mergeBest}</p></div>
      <div class="stat-box"><h3>TTT Wins</h3><p>${state.stats.ttt}</p></div>
      <div class="stat-box"><h3>Chess Games</h3><p>${state.stats.chess}</p></div>
    `;
  }

  function saveStats() {
    localStorage.setItem('aiHubStats', JSON.stringify(state.stats));
  }

  function setupGameStarters() {
    if ($('startChess')) $('startChess').onclick = startChess;
    if ($('startMergeGame')) $('startMergeGame').onclick = startMerge;
    if ($('startImpossible')) $('startImpossible').onclick = () => startQuiz('Impossible');
    if ($('startFeud')) $('startFeud').onclick = () => startFeud();
    if ($('startTicTacToe')) $('startTicTacToe').onclick = () => startTtt();
    if ($('startMemory')) $('startMemory').onclick = () => startMemory();
    if ($('startWordScramble')) $('startWordScramble').onclick = () => startScramble();
  }

  const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? `http://${location.hostname}:3000`
    : '';


  // --- QUIZ (REAL API CALL) ---
  async function startQuiz(id) {
    showScreen('loadingScreen');
    try {
      const res = await fetch(`${API_BASE}/api/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: id, numQuestions: 20 })
      });
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        state.quizQuestions = data.questions;
        state.quizIndex = 0;
        state.score = 0;
        $('quizScore').textContent = '0';
        $('quizBadge').textContent = id + " Quiz";
        showScreen('quizScreen');
        loadQuizQuestion();
      } else {
        throw new Error("No questions found");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load quiz. Please check if server is running.");
      showScreen('homeScreen');
    }
  }

  function loadQuizQuestion() {
    const q = state.quizQuestions[state.quizIndex];
    if (!q) return;
    $('questionText').textContent = q.question;
    $('progressFill').style.width = `${((state.quizIndex + 1) / state.quizQuestions.length) * 100}%`;
    $('optionsContainer').innerHTML = '';
    
    // Options are usually A, B, C, D object
    const opts = q.options;
    ['A', 'B', 'C', 'D'].forEach(key => {
      if (opts[key]) {
        const b = document.createElement('button');
        b.className = 'opt-btn';
        b.innerHTML = `<span class="opt-key">${key}</span> ${opts[key]}`;
        b.onclick = () => handleAnswer(key, q.correct, q.explanation, b);
        $('optionsContainer').appendChild(b);
      }
    });
    
    $('explanationBox').classList.add('hidden');
    $('nextBtn').classList.add('hidden'); // Hide next until answered
  }

  function handleAnswer(selected, correct, explanation, btn) {
    const allBtns = document.querySelectorAll('.opt-btn');
    allBtns.forEach(b => b.style.pointerEvents = 'none');
    
    if (selected === correct) {
      state.score += 100;
      btn.classList.add('correct');
    } else {
      btn.classList.add('wrong');
      // Show correct one
      allBtns.forEach(b => {
        if (b.textContent.startsWith(correct)) b.classList.add('correct');
      });
    }
    
    $('quizScore').textContent = state.score;
    $('explanationBox').classList.remove('hidden');
    $('explanationText').textContent = explanation;
    $('nextBtn').classList.remove('hidden');
  }

  $('nextBtn').onclick = () => {
    state.quizIndex++;
    if (state.quizIndex >= state.quizQuestions.length) {
      state.stats.quiz += state.score;
      saveStats();
      showScreen('homeScreen');
      alert(`Quiz Complete! Score: ${state.score}`);
    } else {
      loadQuizQuestion();
    }
  };

  // --- CHESS ---
  const CHESS_PIECES = { 'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟', 'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔', 'p': '♙' };
  function startChess() {
    state.chessBoard = [['R','N','B','Q','K','B','N','R'],['P','P','P','P','P','P','P','P'],['','','','','','','',''],['','','','','','','',''],['','','','','','','',''],['','','','','','','',''],['p','p','p','p','p','p','p','p'],['r','n','b','q','k','b','n','r']];
    state.chessTurn = 'W'; state.chessSelected = null;
    showScreen('chessScreen'); renderChess();
    state.stats.chess++; saveStats();
  }
  function renderChess() {
    const board = $('chessBoard');
    if (!board) return;
    board.innerHTML = '';
    for(let r=0; r<8; r++) {
      for(let c=0; c<8; c++) {
        const sq = document.createElement('div'); sq.className = `chess-sq ${(r+c)%2===0 ? 'light' : 'dark'}`;
        if (state.chessSelected && state.chessSelected.r === r && state.chessSelected.c === c) sq.classList.add('selected');
        const p = state.chessBoard[r][c]; sq.textContent = CHESS_PIECES[p] || '';
        sq.onclick = () => {
          if (state.chessSelected) {
            if (state.chessSelected.r === r && state.chessSelected.c === c) state.chessSelected = null;
            else {
              state.chessBoard[r][c] = state.chessBoard[state.chessSelected.r][state.chessSelected.c];
              state.chessBoard[state.chessSelected.r][state.chessSelected.c] = '';
              state.chessSelected = null; state.chessTurn = state.chessTurn === 'W' ? 'B' : 'W';
              $('chessStatus').textContent = (state.chessTurn === 'W' ? "White" : "Black") + " to move";
            }
            renderChess();
          } else if (p) { state.chessSelected = { r, c }; renderChess(); }
        };
        board.appendChild(sq);
      }
    }
  }
  if ($('resetChess')) $('resetChess').onclick = startChess;

  // --- MERGE ---
  function startMerge() {
    state.mergeBoard = Array(64).fill(0); state.mergeScore = 0;
    $('mergeScore').textContent = '0'; $('mergeBest').textContent = state.mergeBest;
    for(let i=0; i<15; i++) addMergeTile();
    showScreen('mergeScreen'); renderMerge();
  }
  function addMergeTile() {
    const empty = state.mergeBoard.map((v, i) => v === 0 ? i : null).filter(v => v !== null);
    if (empty.length > 0) state.mergeBoard[empty[Math.floor(Math.random() * empty.length)]] = 2;
  }
  function renderMerge() {
    const grid = $('mergeGrid');
    if (!grid) return;
    grid.innerHTML = '';
    state.mergeBoard.forEach((val, i) => {
      const tile = document.createElement('div'); tile.className = `merge-tile ${val ? 'tile-' + val : ''}`;
      tile.textContent = val || '';
      tile.onclick = () => {
        if (!val) return;
        const connected = findConnected(i, val);
        if (connected.length > 1) {
          connected.forEach(idx => state.mergeBoard[idx] = 0);
          state.mergeBoard[i] = val * 2; state.mergeScore += val * connected.length;
          $('mergeScore').textContent = state.mergeScore;
          if (state.mergeScore > state.mergeBest) { state.mergeBest = state.mergeScore; localStorage.setItem('mergeBest', state.mergeBest); $('mergeBest').textContent = state.mergeBest; }
          addMergeTile(); addMergeTile(); renderMerge();
        }
      };
      grid.appendChild(tile);
    });
  }
  function findConnected(idx, val) {
    const connected = [], queue = [idx], visited = new Set([idx]);
    while(queue.length) {
      const curr = queue.shift(); connected.push(curr);
      const r = Math.floor(curr / 8), c = curr % 8;
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr,nc]) => {
        const ni = nr * 8 + nc;
        if (nr>=0 && nr<8 && nc>=0 && nc<8 && !visited.has(ni) && state.mergeBoard[ni] === val) { visited.add(ni); queue.push(ni); }
      });
    }
    return connected;
  }
  if ($('newMergeGame')) $('newMergeGame').onclick = startMerge;

  // --- OTHERS ---
  async function startScramble() {
    showScreen('loadingScreen');
    try {
      const res = await fetch(`${API_BASE}/api/generate-puzzle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Science', language: 'English' })
      });
      const data = await res.json();
      state.puzzleCurrentWord = data.word.toUpperCase();
      $('scrambledWord').textContent = state.puzzleCurrentWord.split('').sort(()=>Math.random()-0.5).join(' ');
      $('puzzleHint').textContent = "Hint: " + data.hint;
      $('puzzleInput').value = '';
      showScreen('puzzleScreen');
      $('puzzleInput').focus();
    } catch (err) {
      console.error(err);
      // Fallback
      state.puzzleCurrentWord = "CODING";
      $('scrambledWord').textContent = "O D I N C G";
      $('puzzleHint').textContent = "Hint: Programming";
      $('puzzleInput').value = '';
      showScreen('puzzleScreen');
    }
  }
  $('puzzleSubmitBtn').onclick = () => { if ($('puzzleInput').value.trim().toUpperCase() === state.puzzleCurrentWord) { alert("Correct!"); startScramble(); } };
  $('puzzleSkipBtn').onclick = startScramble;
  if ($('backToHomeFromPuzzle')) $('backToHomeFromPuzzle').onclick = () => showScreen('homeScreen');

  function startTtt() { 
    showScreen('tttScreen'); 
    state.tttBoard = Array(9).fill(null); 
    state.tttActive = true; 
    if ($('tttStatus')) $('tttStatus').textContent = "Your turn (X)";
    renderTtt(); 
  }
  function renderTtt() {
    const grid = $('tttGrid'); 
    if (!grid) return; 
    grid.innerHTML = '';
    state.tttBoard.forEach((v, i) => {
      const cell = document.createElement('div'); 
      cell.className = `ttt-cell ${v ? v.toLowerCase() : ''}`;
      cell.textContent = v || '';
      cell.onclick = () => {
        if (!state.tttActive || state.tttBoard[i]) return;
        state.tttBoard[i] = 'X'; 
        renderTtt();
        if (checkWin('X')) { 
          state.stats.ttt++; 
          saveStats(); 
          return endTtt("You Win!"); 
        }
        if (state.tttBoard.every(b => b)) return endTtt("Draw!");
        
        state.tttActive = false;
        if ($('tttStatus')) $('tttStatus').textContent = "AI is thinking...";
        
        setTimeout(() => {
          const empty = state.tttBoard.map((v, i) => v === null ? i : null).filter(v => v !== null);
          if (empty.length) {
            const move = empty[Math.floor(Math.random() * empty.length)];
            state.tttBoard[move] = 'O';
            renderTtt();
            if (checkWin('O')) return endTtt("AI Wins!");
            if (state.tttBoard.every(b => b)) return endTtt("Draw!");
          }
          state.tttActive = true;
          if ($('tttStatus')) $('tttStatus').textContent = "Your turn (X)";
        }, 600);
      };
      grid.appendChild(cell);
    });
  }
  function checkWin(p) { 
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; 
    return wins.some(l => l.every(i => state.tttBoard[i] === p)); 
  }
  function endTtt(m) { 
    state.tttActive = false; 
    if ($('tttStatus')) $('tttStatus').textContent = m; 
  }
  if ($('resetTtt')) $('resetTtt').onclick = startTtt;


  function startFeud() {
    showScreen('feudScreen');
    state.feudCurrent = { q: "AI will...", answers: ["KILL", "SAVE", "HELP"] };
    $('feudQuestion').textContent = `Finish: "${state.feudCurrent.q}"`;
    $('feudAnswers').innerHTML = state.feudCurrent.answers.map((a,i) => `<div class="feud-row">${i+1}. ? <span class="pts">${50-i*10}</span></div>`).join('');
  }

  function startMemory() {
    showScreen('memoryScreen');
    const e = ['🤖', '🧠', '🚀', '💻', '🎮', '⚡', '🌌', '🧬'];
    state.memoryCards = [...e, ...e].sort(() => Math.random() - 0.5);
    state.memoryFlipped = []; state.memoryLocked = false;
    const grid = $('memoryGrid'); if (!grid) return; grid.innerHTML = '';
    state.memoryCards.forEach((emoji, i) => {
      const card = document.createElement('div'); card.className = 'memory-card';
      card.onclick = () => {
        if (state.memoryLocked || state.memoryFlipped.includes(i) || card.classList.contains('revealed')) return;
        card.textContent = emoji; card.classList.add('flipped'); state.memoryFlipped.push(i);
        if (state.memoryFlipped.length === 2) {
          state.memoryLocked = true;
          const [a, b] = state.memoryFlipped;
          if (state.memoryCards[a] === state.memoryCards[b]) {
            document.querySelectorAll('.memory-card')[a].classList.add('revealed'); document.querySelectorAll('.memory-card')[b].classList.add('revealed');
            state.memoryFlipped = []; state.memoryLocked = false;
          } else { setTimeout(() => { document.querySelectorAll('.memory-card')[a].classList.remove('flipped'); document.querySelectorAll('.memory-card')[a].textContent = ''; document.querySelectorAll('.memory-card')[b].classList.remove('flipped'); document.querySelectorAll('.memory-card')[b].textContent = ''; state.memoryFlipped = []; state.memoryLocked = false; }, 800); }
        }
      };
      grid.appendChild(card);
    });
  }

  // --- CHATBOT LOGIC ---
  const chatInput = $('chatInput');
  const chatBody = $('chatBody');
  const chatWindow = $('chatWindow');

  if ($('openChat')) $('openChat').onclick = () => chatWindow.classList.toggle('active');
  if ($('closeChat')) $('closeChat').onclick = () => chatWindow.classList.remove('active');

  async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    chatInput.value = '';

    const loadingMsg = addMessage("Thinking...", 'bot');

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      loadingMsg.textContent = data.response || "I'm sorry, I couldn't understand that. Please try rephrasing.";
    } catch (err) {
      loadingMsg.textContent = "❌ Connection Error. Please refresh.";
    }
    chatBody.scrollTop = chatBody.scrollHeight;
  }


  function addMessage(text, side) {
    const div = document.createElement('div');
    div.className = `msg ${side}`;
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    return div;
  }

  if ($('sendChatBtn')) $('sendChatBtn').onclick = sendChatMessage;
  if (chatInput) {
    chatInput.onkeypress = (e) => { if (e.key === 'Enter') sendChatMessage(); };
  }

  init();
})();

