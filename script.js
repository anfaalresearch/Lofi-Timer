const KEY = 'focusV5';

const $ = (id) =>
  document.getElementById(id);


const defaults = {
  work: 25,
  break: 5,

  mode: 'focus',

  seconds: 25 * 60,
  total: 25 * 60,

  running: false,
  timerEndAt: null,

  session: 1,

  goal: 120,
  weekGoal: 600,

  task: '',

  subjects: [],
  selectedSubjectId: null,

  tasks: [],

  history: [],

  daily: {},

  trendRange: 'week'
};


let state = loadState();

let timerInterval = null;
let timerEndAt =
  Number(state.timerEndAt) ||
  null;


/* =========================
   STORAGE
========================= */

function loadState() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          KEY
        ) || 'null'
      );


    const result = {
      ...defaults,
      ...(saved || {})
    };


    result.subjects =
      Array.isArray(
        result.subjects
      )
        ? result.subjects
        : [];


    result.tasks =
      Array.isArray(
        result.tasks
      )
        ? result.tasks
        : [];


    result.history =
      Array.isArray(
        result.history
      )
        ? result.history
        : [];


    result.daily =
      result.daily &&
      typeof result.daily === 'object' &&
      !Array.isArray(result.daily)
        ? result.daily
        : {};


    return result;

  } catch {

    localStorage.removeItem(
      KEY
    );

    return {
      ...defaults,
      subjects: [],
      tasks: [],
      history: []
    };
  }
}


function save() {

  localStorage.setItem(
    KEY,
    JSON.stringify(state)
  );
}


function makeId() {

  return (
    Date.now() +
    '-' +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}


/* =========================
   DATES
========================= */

function dayKey(
  date = new Date()
) {

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, '0'),
    String(
      date.getDate()
    ).padStart(2, '0')
  ].join('-');
}


function weekKeys() {

  const start =
    new Date();

  const day =
    start.getDay() || 7;

  start.setDate(
    start.getDate() -
    day +
    1
  );


  return Array.from(
    { length: 7 },
    (_, index) => {

      const date =
        new Date(start);

      date.setDate(
        start.getDate() +
        index
      );

      return dayKey(
        date
      );
    }
  );
}


function monthKeys() {

  const now =
    new Date();

  const days =
    new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();


  return Array.from(
    { length: days },
    (_, index) =>
      dayKey(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          index + 1
        )
      )
  );
}


/* =========================
   DATA
========================= */

function getSubject(
  id =
    state.selectedSubjectId
) {

  return (
    state.subjects.find(
      (item) =>
        item.id === id
    ) || null
  );
}


function rebuildData() {

  const daily = {};


  state.subjects.forEach(
    (subject) => {

      subject.daily = {};
      subject.totalMinutes = 0;
    }
  );


  state.history.forEach(
    (item) => {

      const minutes =
        Number(
          item.minutes || 0
        );


      const key =
        dayKey(
          new Date(
            item.completedAt
          )
        );


      daily[key] =
        Number(
          daily[key] || 0
        ) +
        minutes;


      const subject =
        getSubject(
          item.subjectId
        );


      if (subject) {

        subject.daily[key] =
          Number(
            subject.daily[key] || 0
          ) +
          minutes;


        subject.totalMinutes +=
          minutes;
      }
    }
  );


  state.daily =
    daily;
}


/* =========================
   TIMER DATA
========================= */

function formatTime(
  seconds
) {

  const safe =
    Math.max(
      0,
      Math.floor(
        seconds
      )
    );


  return (
    `${String(
      Math.floor(
        safe / 60
      )
    ).padStart(2, '0')}:` +
    `${String(
      safe % 60
    ).padStart(2, '0')}`
  );
}


function elapsedMinutes() {

  if (
    state.mode !== 'focus'
  ) {
    return 0;
  }


  return Math.floor(
    (
      state.total -
      state.seconds
    ) / 60
  );
}


function todayMinutes() {

  return (
    Number(
      state.daily?.[
        dayKey()
      ] || 0
    ) +
    elapsedMinutes()
  );
}


function subjectToday(
  subject
) {

  if (!subject) {
    return 0;
  }


  return (
    Number(
      subject.daily?.[
        dayKey()
      ] || 0
    ) +
    (
      subject.id ===
      state.selectedSubjectId
        ? elapsedMinutes()
        : 0
    )
  );
}


function completedMinutes() {

  return state.history.reduce(
    (
      total,
      item
    ) =>
      total +
      Number(
        item.minutes || 0
      ),

    0
  );
}


/* =========================
   STREAK
========================= */

function getStreak() {

  const dates =
    Object.keys(
      state.daily || {}
    )
      .filter(
        (key) =>
          Number(
            state.daily[key]
          ) > 0
      )
      .sort()
      .reverse();


  if (!dates.length) {
    return 0;
  }


  const today =
    dayKey();


  const yesterdayDate =
    new Date();

  yesterdayDate.setDate(
    yesterdayDate.getDate() -
    1
  );


  const yesterday =
    dayKey(
      yesterdayDate
    );


  if (
    dates[0] !== today &&
    dates[0] !== yesterday
  ) {
    return 0;
  }


  let streak = 1;


  for (
    let i = 0;
    i <
      dates.length - 1;
    i++
  ) {

    const a =
      new Date(
        dates[i] + 'T00:00:00'
      );

    const b =
      new Date(
        dates[i + 1] + 'T00:00:00'
      );


    const difference =
      Math.round(
        (a - b) /
        86400000
      );


    if (
      difference !== 1
    ) {
      break;
    }


    streak++;
  }


  return streak;
}


/* =========================
   RANGE TOTAL
========================= */

function rangeTotal(
  keys
) {

  const saved =
    keys.reduce(
      (
        total,
        key
      ) =>
        total +
        Number(
          state.daily?.[key] ||
          0
        ),

      0
    );


  const live =
    keys.includes(
      dayKey()
    )
      ? elapsedMinutes()
      : 0;


  return (
    saved +
    live
  );
}


/* =========================
   TIMER RING
========================= */

function updateRing() {

  const progress =
    state.total > 0
      ? (
          1 -
          state.seconds /
          state.total
        )
      : 0;


  const degrees =
    Math.max(
      0,
      Math.min(
        360,
        progress * 360
      )
    );


  $('timerRing').style.background =
    `conic-gradient(
      var(--accent)
      ${degrees}deg,
      rgba(255,255,255,.07)
      ${degrees}deg
      360deg
    )`;


  $('timerRing')
    .classList
    .toggle(
      'is-running',
      state.running
    );
}


/* =========================
   FULL RENDER
========================= */

function renderAll() {

  const selected =
    getSubject();


  const today =
    todayMinutes();


  const total =
    completedMinutes() +
    elapsedMinutes();


  const best =
    Math.max(
      0,
      ...Object.values(
        state.daily || {}
      ).map(Number),
      today
    );


  const streak =
    getStreak();


  const week =
    rangeTotal(
      weekKeys()
    );


  const month =
    rangeTotal(
      monthKeys()
    );


  /* TIMER */

  $('subjectTitle')
    .textContent =
    selected?.name ||
    'Choose a subject';


  $('taskTitle')
    .textContent =
    state.task ||
    'Add a task, then start when you are ready.';


  $('sessionCount')
    .textContent =
    `Session ${
      String(
        state.session
      ).padStart(2, '0')
    }`;


  $('timerDisplay')
    .textContent =
    formatTime(
      state.seconds
    );


  $('modeBtn')
    .textContent =
    state.mode.toUpperCase();


  $('startBtn')
    .disabled =
    state.running ||
    !selected;


  $('pauseBtn')
    .disabled =
    !state.running;


  if (!selected) {

    $('timerLabel')
      .textContent =
      'SELECT A SUBJECT';

  } else if (
    state.running
  ) {

    $('timerLabel')
      .textContent =
      state.mode ===
      'focus'
        ? 'FOCUSING'
        : 'BREAK TIME';

  } else if (
    state.seconds ===
    state.total
  ) {

    $('timerLabel')
      .textContent =
      'READY TO FOCUS';

  } else {

    $('timerLabel')
      .textContent =
      'PAUSED';
  }


  $('currentSessionElapsed')
    .textContent =
    `${elapsedMinutes()}m this session`;


  $('currentSessionSaved')
    .textContent =
    state.running
      ? 'Not saved until complete'
      : state.seconds === state.total
        ? ''
        : 'Paused — not saved';


  /* TODAY */

  $('todayMinutes')
    .textContent =
    `${today}m`;


  $('goalProgress')
    .textContent =
    `${today} / ${
      state.goal
    } min`;


  $('goalFill')
    .style.width =
    `${Math.min(
      100,
      today /
      Math.max(
        1,
        state.goal
      ) *
      100
    )}%`;


  /* STATS */

  $('streakValue')
    .textContent =
    `${streak} day${
      streak === 1
        ? ''
        : 's'
    } streak`;


  $('streakStat')
    .textContent =
    streak;


  $('sessionsStat')
    .textContent =
    state.history.length;


  $('minutesStat')
    .textContent =
    `${total}m`;


  $('bestDayStat')
    .textContent =
    `${best}m`;


  $('weekTotal')
    .textContent =
    `${week}m`;


  $('monthTotal')
    .textContent =
    `${month}m`;


  $('weekGoalText')
    .textContent =
    `${week} / ${
      state.weekGoal
    }m`;


  const weekPct =
    Math.round(
      Math.min(
        100,
        week /
        Math.max(
          1,
          state.weekGoal
        ) *
        100
      )
    );


  $('weekGoalPercent')
    .textContent =
    `${weekPct}%`;


  $('weekGoalFill')
    .style.width =
    `${weekPct}%`;


  $('taskInput')
    .value =
    state.task;


  $('workInput')
    .value =
    state.work;


  $('breakInput')
    .value =
    state.break;


  const light =
    localStorage.getItem(
      'focusTheme'
    ) === 'light';


  document.body
    .classList
    .toggle(
      'light',
      light
    );


  $('themeBtn')
    .textContent =
    light
      ? '☀'
      : '☾';


  renderSubjects();
  renderRanking();
  renderTasks();
  renderHistory();
  renderTrend();
  updateFocusOverlay();
  updateRing();
}


/* =========================
   LIVE TIMER UPDATE
========================= */

function updateLive() {

  const today =
    todayMinutes();


  const total =
    completedMinutes() +
    elapsedMinutes();


  $('timerDisplay')
    .textContent =
    formatTime(
      state.seconds
    );


  $('currentSessionElapsed')
    .textContent =
    `${elapsedMinutes()}m this session`;


  $('todayMinutes')
    .textContent =
    `${today}m`;


  $('goalProgress')
    .textContent =
    `${today} / ${
      state.goal
    } min`;


  $('goalFill')
    .style.width =
    `${Math.min(
      100,
      today /
      Math.max(
        1,
        state.goal
      ) *
      100
    )}%`;


  $('minutesStat')
    .textContent =
    `${total}m`;


  const weekLive =
    rangeTotal(
      weekKeys()
    );


  $('weekTotal')
    .textContent =
    `${weekLive}m`;


  $('monthTotal')
    .textContent =
    `${rangeTotal(
      monthKeys()
    )}m`;


  $('weekGoalText')
    .textContent =
    `${weekLive} / ${
      state.weekGoal
    }m`;


  const weekLivePct =
    Math.round(
      Math.min(
        100,
        weekLive /
        Math.max(
          1,
          state.weekGoal
        ) *
        100
      )
    );


  $('weekGoalPercent')
    .textContent =
    `${weekLivePct}%`;


  $('weekGoalFill')
    .style.width =
    `${weekLivePct}%`;


  document
    .querySelectorAll(
      '.subject-item'
    )
    .forEach(
      (row) => {

        const s =
          getSubject(
            row.dataset.subjectId
          );


        if (!s) {
          return;
        }


        row.querySelector(
          '.subject-minutes'
        ).textContent =
        `${subjectToday(s)}m`;
      }
    );


  renderRankingLive();

  updateTrendLive();

  updateFocusOverlay();

  updateRing();
}


/* =========================
   SUBJECTS
========================= */

function renderSubjects() {

  const list =
    $('subjectList');


  list.innerHTML =
    '';


  $('subjectCount')
    .textContent =
    state.subjects.length;


  $('subjectEmpty')
    .hidden =
    state.subjects.length >
    0;


  state.subjects.forEach(
    (s) => {

      const row =
        document.createElement(
          'div'
        );


      row.className =
        `subject-item${
          s.id ===
          state.selectedSubjectId
            ? ' active'
            : ''
        }`;


      row.dataset.subjectId =
        s.id;


      row.innerHTML = `
        <span class="subject-dot"></span>

        <span class="subject-name"></span>

        <span class="subject-minutes"></span>

        <button
          class="subject-remove"
          type="button"
        >
          ×
        </button>
      `;


      row.querySelector(
        '.subject-name'
      ).textContent =
      s.name;


      row.querySelector(
        '.subject-minutes'
      ).textContent =
      `${subjectToday(s)}m`;


      row.onclick =
        (event) => {

          if (
            event.target.closest(
              '.subject-remove'
            )
          ) {
            return;
          }


          selectSubject(
            s.id
          );
        };


      row.querySelector(
        '.subject-remove'
      ).onclick =
        (event) => {

          event.stopPropagation();

          removeSubject(
            s.id
          );
        };


      list.appendChild(
        row
      );
    }
  );
}


/* =========================
   RANKING
========================= */

function rankedSubjects() {

  return state.subjects
    .map(
      (s) => ({
        subject: s,
        minutes:
          subjectToday(s)
      })
    )
    .filter(
      (item) =>
        item.minutes > 0
    )
    .sort(
      (a, b) =>
        b.minutes -
        a.minutes ||
        a.subject.name
          .localeCompare(
            b.subject.name
          )
    );
}


function renderRanking() {

  const box =
    $('rankingBars');


  box.innerHTML =
    '';


  const ranked =
    rankedSubjects();


  if (
    ranked.length ===
    0
  ) {

    $('topSubjectName')
      .textContent =
      'No focus yet';


    $('topSubjectTime')
      .textContent =
      '';


    box.innerHTML = `
      <div class="ranking-empty">

        <div class="ranking-empty-icon">
          —
        </div>

        <strong>
          No focus yet
        </strong>

        <span>
          Complete some focus time and
          your subjects will appear here.
        </span>

      </div>
    `;

    return;
  }


  const max =
    Math.max(
      1,
      ...ranked.map(
        (item) =>
          item.minutes
      )
    );


  $('topSubjectName')
    .textContent =
    ranked[0]
      .subject
      .name;


  $('topSubjectTime')
    .textContent =
    `${ranked[0].minutes}m`;


  ranked
    .slice(0, 6)
    .forEach(
      (item, index) => {

        const row =
          document.createElement(
            'div'
          );


        row.className =
          'ranking-row';


        const percent =
          Math.round(
            item.minutes /
            max *
            100
          );


        row.innerHTML = `
          <span class="rank-no">
            ${index + 1}
          </span>

          <div class="rank-bar-wrap">

            <div class="rank-name">

              <span
                class="ranking-subject-name"
              ></span>

              <span
                class="ranking-minutes"
              >
                ${item.minutes}m
              </span>

            </div>

            <div class="rank-track">

              <div class="rank-fill"></div>

            </div>

          </div>

          <span
            class="ranking-value"
          >
            ${percent}%
          </span>
        `;


        row.querySelector(
          '.ranking-subject-name'
        ).textContent =
        item.subject.name;


        box.appendChild(
          row
        );


        requestAnimationFrame(
          () => {

            row.querySelector(
              '.rank-fill'
            ).style.width =
            `${Math.max(
              3,
              percent
            )}%`;
          }
        );
      }
    );
}


function renderRankingLive() {

  const ranked =
    rankedSubjects();


  const box =
    $('rankingBars');


  if (
    ranked.length ===
    0
  ) {

    if (
      !box.querySelector(
        '.ranking-empty'
      )
    ) {
      renderRanking();
    }

    return;
  }


  const count =
    Math.min(
      ranked.length,
      6
    );


  if (
    box.children.length !==
    count
  ) {

    renderRanking();

    return;
  }


  const max =
    Math.max(
      1,
      ...ranked.map(
        (item) =>
          item.minutes
      )
    );


  $('topSubjectName')
    .textContent =
    ranked[0]
      .subject
      .name;


  $('topSubjectTime')
    .textContent =
    `${ranked[0].minutes}m`;


  ranked
    .slice(0, 6)
    .forEach(
      (item, index) => {

        const row =
          box.children[
            index
          ];


        if (!row) {
          return;
        }


        const percent =
          Math.round(
            item.minutes /
            max *
            100
          );


        row.querySelector(
          '.ranking-subject-name'
        ).textContent =
        item.subject.name;


        row.querySelector(
          '.ranking-minutes'
        ).textContent =
        `${item.minutes}m`;


        row.querySelector(
          '.ranking-value'
        ).textContent =
        `${percent}%`;


        row.querySelector(
          '.rank-fill'
        ).style.width =
        `${Math.max(
          3,
          percent
        )}%`;
      }
    );
}


/* =========================
   TASKS
========================= */

function renderTasks() {

  const list =
    $('taskList');


  list.innerHTML =
    '';


  $('taskCount')
    .textContent =
    state.tasks.length;


  state.tasks.forEach(
    (task, index) => {

      const row =
        document.createElement(
          'div'
        );


      row.className =
        `task-item${
          task.done
            ? ' done'
            : ''
        }`;


      row.innerHTML = `
        <input
          class="task-check"
          type="checkbox"
          ${
            task.done
              ? 'checked'
              : ''
          }
        >

        <span
          class="task-text"
        ></span>

        <button
          class="task-delete"
          type="button"
        >
          ×
        </button>
      `;


      row.querySelector(
        '.task-text'
      ).textContent =
      task.text;


      row.querySelector(
        '.task-check'
      ).onchange =
        () => {

          task.done =
            !task.done;

          save();

          renderAll();
        };


      row.querySelector(
        '.task-delete'
      ).onclick =
        () => {

          state.tasks.splice(
            index,
            1
          );

          save();

          renderAll();
        };


      list.appendChild(
        row
      );
    }
  );
}


/* =========================
   HISTORY
========================= */

function renderHistory() {

  const list =
    $('historyList');


  list.innerHTML =
    '';


  const recent =
    [...state.history]
      .sort(
        (a, b) =>
          new Date(
            b.completedAt
          ) -
          new Date(
            a.completedAt
          )
      )
      .slice(
        0,
        10
      );


  if (
    recent.length ===
    0
  ) {

    list.innerHTML = `
      <div class="history-empty">
        No completed sessions yet.
        Finish a focus session and it will appear here.
      </div>
    `;

    return;
  }


  recent.forEach(
    (item) => {

      const s =
        getSubject(
          item.subjectId
        );


      const row =
        document.createElement(
          'div'
        );


      row.className =
        'history-item';


      row.innerHTML = `
        <div>

          <div class="history-main"></div>

          <div class="history-sub"></div>

        </div>

        <div class="history-right">

          <strong class="history-duration">
            ${item.minutes}m
          </strong>

          <span class="history-time"></span>

          <button
            class="history-delete"
            type="button"
          >
            ×
          </button>

        </div>
      `;


      row.querySelector(
        '.history-main'
      ).textContent =
      s?.name ||
      item.subjectName ||
      'Removed subject';


      row.querySelector(
        '.history-sub'
      ).textContent =
      item.task ||
      'Focus session';


      row.querySelector(
        '.history-time'
      ).textContent =
      new Date(
        item.completedAt
      ).toLocaleString(
        [],
        {
          dateStyle:
            'short',

          timeStyle:
            'short'
        }
      );


      row.querySelector(
        '.history-delete'
      ).onclick =
        () =>
          deleteHistory(
            item.id
          );


      list.appendChild(
        row
      );
    }
  );
}


/* =========================
   TREND
========================= */

/* Build the chart data array (shared by render + patch) */

function buildTrendData() {

  const isMonth =
    state.trendRange === 'month';

  if (isMonth) {

    const keys = monthKeys();
    const data = [];

    for (let i = 0; i < keys.length; i += 7) {

      const chunk = keys.slice(i, i + 7);

      data.push({
        label: `W${data.length + 1}`,
        minutes: rangeTotal(chunk)
      });
    }

    return data;
  }

  return weekKeys().map((key) => ({
    label: new Date(key + 'T00:00:00').toLocaleDateString([], { weekday: 'short' }),
    minutes:
      Number(state.daily?.[key] || 0) +
      (key === dayKey() ? elapsedMinutes() : 0)
  }));
}


/*
 * Full rebuild — only call when structure changes
 * (range switch, initial render, session complete).
 * Triggers the grow animation on bars.
 */

function renderTrend() {

  const chart = $('trendChart');
  const isMonth = state.trendRange === 'month';

  $('trendEyebrow').textContent = isMonth ? 'THIS MONTH' : 'THIS WEEK';
  $('trendTitle').textContent = isMonth ? 'Monthly focus trend' : 'Weekly focus trend';

  const data = buildTrendData();
  const max = Math.max(1, ...data.map((item) => item.minutes));

  chart.innerHTML = '';

  data.forEach((item, index) => {

    const column = document.createElement('div');
    column.className = 'chart-day';
    column.dataset.col = index;

    const height = item.minutes > 0 ? Math.max(3, item.minutes / max * 100) : 2;

    column.innerHTML = `
      <div class="chart-value">${item.minutes}m</div>
      <div class="chart-bar-wrap">
        <div class="chart-bar" style="height:${height}%"></div>
      </div>
      <div class="chart-label">${item.label}</div>
    `;

    chart.appendChild(column);
  });

  document.querySelectorAll('.range-btn').forEach((button) => {
    button.classList.toggle(
      'active',
      button.dataset.range === state.trendRange
    );
  });
}


/*
 * Lightweight live patch — called every tick.
 * Only updates text and bar heights in-place.
 * Never rewrites innerHTML → no flicker, no animation restart.
 */

function updateTrendLive() {

  const chart = $('trendChart');
  const columns = chart.querySelectorAll('.chart-day');
  const data = buildTrendData();

  /* Structure mismatch means a range switch happened — full rebuild */
  if (columns.length !== data.length) {
    renderTrend();
    return;
  }

  const max = Math.max(1, ...data.map((item) => item.minutes));

  data.forEach((item, index) => {

    const col = columns[index];
    if (!col) return;

    const height = item.minutes > 0 ? Math.max(3, item.minutes / max * 100) : 2;

    /* Only write if the value actually changed */
    const valueEl = col.querySelector('.chart-value');
    const newText = `${item.minutes}m`;
    if (valueEl.textContent.trim() !== newText) {
      valueEl.textContent = newText;
    }

    const bar = col.querySelector('.chart-bar');
    const newHeight = `${height}%`;
    if (bar.style.height !== newHeight) {
      bar.style.height = newHeight;
    }
  });
}

/* =========================
   ACTIONS
========================= */

function addSubject(
  name
) {

  const clean =
    name.trim();


  if (!clean) {
    return;
  }


  const duplicate =
    state.subjects.some(
      (s) =>
        s.name.toLowerCase() ===
        clean.toLowerCase()
    );


  if (
    duplicate
  ) {

    alert(
      'That subject already exists.'
    );

    return;
  }


  const newSubject = {

    id:
      makeId(),

    name:
      clean,

    daily:
      {},

    totalMinutes:
      0
  };


  state.subjects.push(
    newSubject
  );


  state.selectedSubjectId =
    newSubject.id;


  state.mode =
    'focus';


  state.total =
    state.work * 60;


  state.seconds =
    state.total;


  save();

  renderAll();
}


function selectSubject(
  id
) {

  if (
    state.running
  ) {

    alert(
      'Pause the current session before switching subjects.'
    );

    return;
  }


  if (
    state.selectedSubjectId ===
    id
  ) {
    return;
  }


  const current =
    getSubject();

  const elapsed =
    elapsedMinutes();


  if (
    current &&
    state.mode === 'focus' &&
    elapsed >= 1
  ) {

    const shouldSave =
      confirm(
        `You have ${elapsed} minute${
          elapsed === 1 ? '' : 's'
        } of focus time in progress.\n\n` +
        'Save this partial session before switching subjects?\n\n' +
        'OK → Save and switch\n' +
        'Cancel → Discard and switch'
      );


    if (shouldSave) {
      savePartialFocusSession(
        current
      );
    }
  }


  state.selectedSubjectId =
    id;


  state.mode =
    'focus';


  state.total =
    state.work * 60;


  state.seconds =
    state.total;


  save();

  renderAll();
}


function removeSubject(
  id
) {

  const s =
    getSubject(id);


  if (!s) {
    return;
  }


  if (
    !confirm(
      `Remove "${s.name}"? Old history will stay.`
    )
  ) {
    return;
  }


  if (
    state.selectedSubjectId ===
    id
  ) {

    /* Save any in-progress focus time
       before removing the active subject */

    savePartialFocusSession(
      s
    );


    stopTimer();


    state.selectedSubjectId =
      null;


    state.mode =
      'focus';


    state.total =
      state.work * 60;


    state.seconds =
      state.total;
  }


  state.subjects =
    state.subjects.filter(
      (item) =>
        item.id !== id
    );


  save();

  renderAll();
}


function addTask() {

  const value =
    $('newTaskInput')
      .value
      .trim();


  if (!value) {
    return;
  }


  state.tasks.push({

    id:
      makeId(),

    text:
      value,

    done:
      false

  });


  $('newTaskInput')
    .value =
    '';


  save();

  renderAll();
}


function savePartialFocusSession(
  subject = getSubject()
) {

  const elapsed =
    elapsedMinutes();


  if (
    !subject ||
    state.mode !== 'focus' ||
    elapsed < 1
  ) {
    return false;
  }


  state.history.unshift({

    id:
      makeId(),

    completedAt:
      new Date()
        .toISOString(),

    minutes:
      elapsed,

    subjectId:
      subject.id,

    subjectName:
      subject.name,

    task:
      state.task ||
      'Partial session'
  });


  state.session +=
    1;


  rebuildData();

  return true;
}


function clearTasks() {

  if (
    !state.tasks.length
  ) {
    return;
  }


  if (
    !confirm(
      'Clear all tasks?'
    )
  ) {
    return;
  }


  state.tasks =
    [];


  save();

  renderAll();
}


/* =========================
   TIMER
========================= */

function startTimer() {

  if (
    state.running ||
    !getSubject()
  ) {
    return;
  }


  state.running =
    true;


  timerEndAt =
    Date.now() +
    state.seconds *
    1000;


  state.timerEndAt =
    timerEndAt;


  clearInterval(
    timerInterval
  );


  timerInterval =
    setInterval(
      tick,
      250
    );


  save();

  renderAll();
}


function stopTimer() {

  state.running =
    false;

  timerEndAt =
    null;


  state.timerEndAt =
    null;


  clearInterval(
    timerInterval
  );


  timerInterval =
    null;
}


function pauseTimer() {

  if (
    !state.running
  ) {
    return;
  }


  const remaining =
    timerEndAt
      ? Math.max(
          0,
          timerEndAt -
          Date.now()
        )

      : state.seconds *
        1000;


  stopTimer();


  state.seconds =
    Math.ceil(
      remaining /
      1000
    );


  save();

  renderAll();
}


/*
 * Resets ONLY the current countdown.
 *
 * If the user has accumulated focus minutes
 * in this session, we ask whether to save
 * them first — so no data is ever silently lost.
 *
 * It does NOT touch:
 * - History  (unless the user chooses to save)
 * - Today
 * - Subjects
 * - Streak
 * - Stats
 * - Tasks
 */

function resetTimer() {

  const elapsed =
    elapsedMinutes();


  /* Only warn when there is meaningful
     progress to lose (>= 1 full minute
     elapsed in a focus session). */

  if (
    elapsed >= 1 &&
    state.mode === 'focus'
  ) {

    const choice =
      confirm(
        `You have ${elapsed} minute${
          elapsed === 1 ? '' : 's'
        } of focus time in progress.\n\n` +
        `Save this partial session before resetting?\n\n` +
        `OK → Save and reset\n` +
        `Cancel → Discard and reset`
      );


    if (choice) {

      /* Save partial session to history */

      const s = getSubject();


      if (s) {

        savePartialFocusSession(
          s
        );
      }
    }
  }


  stopTimer();


  state.mode =
    'focus';


  state.total =
    state.work * 60;


  state.seconds =
    state.total;


  save();

  renderAll();
}


function tick() {

  if (
    !state.running ||
    !timerEndAt
  ) {
    return;
  }


  const remaining =
    Math.ceil(
      Math.max(
        0,
        timerEndAt -
        Date.now()
      ) /
      1000
    );


  if (
    remaining <=
    0
  ) {

    state.seconds =
      0;


    stopTimer();


    if (
      state.mode ===
      'focus'
    ) {

      completeFocus();

    } else {

      completeBreak();
    }


    return;
  }


  if (
    remaining !==
    state.seconds
  ) {

    state.seconds =
      remaining;


    updateLive();
  }
}


function completeFocus() {

  const s =
    getSubject();


  if (!s) {

    resetTimer();

    return;
  }


  const minutes =
    Math.round(
      state.total / 60
    );


  const record = {

    id:
      makeId(),

    completedAt:
      new Date()
        .toISOString(),

    minutes:
      minutes,

    subjectId:
      s.id,

    subjectName:
      s.name,

    task:
      state.task ||
      'Focus session'
  };


  state.history.unshift(
    record
  );


  state.mode =
    'break';


  state.total =
    state.break * 60;


  state.seconds =
    state.total;


  state.session +=
    1;


  rebuildData();

  save();

  playBeep();

  notify(
    'Focus session complete',
    'Time for a break.'
  );

  renderAll();
}


function completeBreak() {

  state.mode =
    'focus';


  state.total =
    state.work * 60;


  state.seconds =
    state.total;


  save();

  playBeep();

  notify(
    'Break complete',
    'Ready for another focus session.'
  );

  renderAll();
}


/* =========================
   HISTORY
========================= */

function deleteHistory(
  id
) {

  if (
    !confirm(
      'Remove this session from history and stats?'
    )
  ) {
    return;
  }


  state.history =
    state.history.filter(
      (item) =>
        item.id !== id
    );


  rebuildData();

  save();

  renderAll();
}


function clearHistory() {

  if (
    !state.history.length
  ) {
    return;
  }


  if (
    !confirm(
      'Clear all completed session history?'
    )
  ) {
    return;
  }


  state.history =
    [];


  rebuildData();

  save();

  renderAll();
}


/*
 * Only removes completed sessions
 * from today.
 *
 * It does NOT touch the active timer.
 */

function resetToday() {

  const today =
    dayKey();


  const exists =
    state.history.some(
      (item) =>
        dayKey(
          new Date(
            item.completedAt
          )
        ) === today
    );


  if (!exists) {
    return;
  }


  if (
    !confirm(
      "Reset today's completed focus time?"
    )
  ) {
    return;
  }


  state.history =
    state.history.filter(
      (item) =>
        dayKey(
          new Date(
            item.completedAt
          )
        ) !== today
    );


  rebuildData();

  save();

  renderAll();
}


/* =========================
   GOALS
========================= */

function saveGoal(
  event
) {

  if (
    event.submitter?.value ===
    'cancel'
  ) {

    event.preventDefault();

    $('goalDialog')
      .close();

    return;
  }


  event.preventDefault();


  state.goal =
    Math.max(
      15,
      Math.min(
        720,
        Number(
          $('goalInput')
            .value
        ) || 120
      )
    );


  save();


  $('goalDialog')
    .close();


  renderAll();
}


function saveWeekGoal(
  event
) {

  if (
    event.submitter?.value ===
    'cancel'
  ) {

    event.preventDefault();

    $('weekGoalDialog')
      .close();

    return;
  }


  event.preventDefault();


  state.weekGoal =
    Math.max(
      30,
      Math.min(
        5000,
        Number(
          $('weekGoalInput')
            .value
        ) || 600
      )
    );


  save();


  $('weekGoalDialog')
    .close();


  renderAll();
}


/* =========================
   TIMER SETTINGS
========================= */

function saveTimerSettings(
  event
) {

  if (
    event.submitter?.value ===
    'cancel'
  ) {

    event.preventDefault();

    $('timerDialog')
      .close();

    return;
  }


  event.preventDefault();


  const hasPausedFocus =
    !state.running &&
    state.mode === 'focus' &&
    state.seconds < state.total &&
    elapsedMinutes() >= 1;


  if (hasPausedFocus) {

    const shouldSave =
      confirm(
        'Save the paused focus time before applying new timer settings?\n\n' +
        'OK → Save and apply\n' +
        'Cancel → Discard and apply'
      );


    if (shouldSave) {
      savePartialFocusSession();
    }
  }


  state.work =
    Math.max(
      1,
      Math.min(
        180,
        Number(
          $('workInput')
            .value
        ) || 25
      )
    );


  state.break =
    Math.max(
      1,
      Math.min(
        60,
        Number(
          $('breakInput')
            .value
        ) || 5
      )
    );


  if (
    !state.running
  ) {

    state.mode =
      'focus';

    state.total =
      state.work * 60;

    state.seconds =
      state.total;
  }


  save();


  $('timerDialog')
    .close();


  renderAll();
}


/* =========================
   SOUND
========================= */

function playBeep() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;


    if (!AudioContext) {
      return;
    }


    const context =
      new AudioContext();


    const oscillator =
      context.createOscillator();


    const gain =
      context.createGain();


    oscillator.connect(
      gain
    );

    gain.connect(
      context.destination
    );


    oscillator.frequency.value =
      740;


    oscillator.type =
      'sine';


    gain.gain.setValueAtTime(
      .16,
      context.currentTime
    );


    gain.gain.exponentialRampToValueAtTime(
      .01,
      context.currentTime +
      .55
    );


    oscillator.start();


    oscillator.stop(
      context.currentTime +
      .55
    );

  } catch {
    // Sound is optional.
  }
}


/* =========================
   NOTIFICATIONS
========================= */

async function enableNotifications() {

  if (
    !(
      'Notification' in
      window
    )
  ) {

    alert(
      'Notifications are not supported in this browser.'
    );

    return;
  }


  const permission =
    await Notification.requestPermission();


  if (
    permission ===
    'granted'
  ) {

    $('notificationDialog')
      .close();
  }
}


function notify(
  title,
  body
) {

  if (
    'Notification' in
    window &&
    Notification.permission ===
    'granted'
  ) {

    try {

      new Notification(
        title,
        {
          body
        }
      );

    } catch {
      // Optional.
    }
  }
}


/* =========================
   CSV EXPORT
========================= */

function exportCsv() {

  const rows = [
    [
      'Date',
      'Time',
      'Subject',
      'Task',
      'Minutes'
    ]
  ];


  [...state.history]
    .reverse()
    .forEach(
      (item) => {

        const d =
          new Date(
            item.completedAt
          );


        rows.push([
          d.toLocaleDateString(),
          d.toLocaleTimeString(
            [],
            {
              hour:
                '2-digit',

              minute:
                '2-digit'
            }
          ),
          item.subjectName ||
            'Removed subject',
          item.task || '',
          item.minutes
        ]);
      }
    );


  const csv =
    rows
      .map(
        (row) =>
          row
            .map(
              (value) =>
                `"${String(
                  value
                ).replaceAll(
                  '"',
                  '""'
                )}"`
            )
            .join(',')
      )
      .join('\n');


  const blob =
    new Blob(
      [csv],
      {
        type:
          'text/csv;charset=utf-8'
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      'a'
    );


  link.href =
    url;

  link.download =
    `focus-${dayKey()}.csv`;


  document.body.appendChild(
    link
  );

  link.click();

  link.remove();


  URL.revokeObjectURL(
    url
  );
}


/* =========================
   FOCUS MODE
========================= */

function openFocusMode() {

  if (
    !getSubject()
  ) {

    alert(
      'Choose a subject first.'
    );

    return;
  }


  $('focusModeOverlay')
    .hidden =
    false;


  updateFocusOverlay();


  document.documentElement
    .requestFullscreen
    ?.()
    .catch(
      () => {}
    );
}


function closeFocusMode() {

  $('focusModeOverlay')
    .hidden =
    true;


  if (
    document.fullscreenElement
  ) {

    document.exitFullscreen
      ?.()
      .catch(
        () => {}
      );
  }
}


function updateFocusOverlay() {

  if (
    $('focusModeOverlay')
      .hidden
  ) {
    return;
  }


  const s =
    getSubject();


  $('focusOverlaySubject')
    .textContent =
    s?.name ||
    'Focus';


  $('focusOverlayTask')
    .textContent =
    state.task ||
    'Deep work';


  $('focusOverlayTime')
    .textContent =
    formatTime(
      state.seconds
    );


  $('focusOverlayLabel')
    .textContent =
    !s
      ? 'SELECT A SUBJECT'
      : state.running
        ? state.mode === 'focus'
          ? 'FOCUSING'
          : 'BREAK TIME'
        : state.seconds ===
          state.total
          ? 'READY TO FOCUS'
          : 'PAUSED';


  const progress =
    state.total > 0
      ? (
          1 -
          state.seconds /
          state.total
        ) * 100
      : 0;


  $('focusOverlayProgress')
    .style.width =
    `${Math.max(
      0,
      Math.min(
        100,
        progress
      )
    )}%`;
}


/* =========================
   NAVIGATION
========================= */

function setupNavigation() {

  const links =
    [
      ...document.querySelectorAll(
        '.nav-link'
      )
    ];


  links.forEach(
    (link) => {

      link.onclick =
        () => {

          document
            .getElementById(
              link.dataset.target
            )
            ?.scrollIntoView({
              behavior:
                'smooth'
            });
        };
    }
  );


  const sections =
    links
      .map(
        (link) =>
          document.getElementById(
            link.dataset.target
          )
      )
      .filter(Boolean);


  const observer =
    new IntersectionObserver(
      (entries) => {

        const visible =
          entries
            .filter(
              (entry) =>
                entry.isIntersecting
            )
            .sort(
              (a, b) =>
                b.intersectionRatio -
                a.intersectionRatio
            )[0];


        if (!visible) {
          return;
        }


        links.forEach(
          (link) => {

            link.classList.toggle(
              'active',

              link.dataset.target ===
              visible.target.id
            );
          }
        );
      },
      {
        rootMargin:
          '-25% 0px -55% 0px',

        threshold:
          [.05,.2,.5]
      }
    );


  sections.forEach(
    (section) =>
      observer.observe(
        section
      )
  );
}


function restoreRunningTimer() {

  if (!state.running) {
    return;
  }


  const savedEndAt =
    Number(
      state.timerEndAt
    );


  if (
    !Number.isFinite(
      savedEndAt
    ) ||
    savedEndAt <= 0
  ) {

    /* States saved by older versions did not
       include an end timestamp. Treat them as
       paused instead of leaving the UI locked. */

    state.running =
      false;

    state.timerEndAt =
      null;

    timerEndAt =
      null;

    return;
  }


  timerEndAt =
    savedEndAt;


  const remaining =
    Math.ceil(
      Math.max(
        0,
        timerEndAt -
        Date.now()
      ) / 1000
    );


  if (remaining <= 0) {

    state.seconds =
      0;

    stopTimer();


    if (
      state.mode === 'focus'
    ) {
      completeFocus();
    } else {
      completeBreak();
    }

    return;
  }


  state.seconds =
    remaining;


  timerInterval =
    setInterval(
      tick,
      250
    );
}


/* =========================
   EVENTS
========================= */

$('themeBtn').onclick =
  () => {

    localStorage.setItem(
      'focusTheme',

      localStorage.getItem(
        'focusTheme'
      ) === 'light'
        ? 'dark'
        : 'light'
    );


    renderAll();
  };


$('focusModeBtn').onclick =
  openFocusMode;


$('exitFocusModeBtn').onclick =
  closeFocusMode;


$('timerSettingsBtn').onclick =
  () => {

    $('workInput').value =
      state.work;

    $('breakInput').value =
      state.break;

    $('timerDialog')
      .showModal();
  };


$('timerForm').onsubmit =
  saveTimerSettings;


$('startBtn').onclick =
  startTimer;


$('pauseBtn').onclick =
  pauseTimer;


$('resetTimerBtn').onclick =
  resetTimer;


$('modeBtn').onclick =
  () => {

    if (
      state.running
    ) {
      return;
    }


    state.mode =
      state.mode === 'focus'
        ? 'break'
        : 'focus';


    state.total =
      (
        state.mode === 'focus'
          ? state.work
          : state.break
      ) * 60;


    state.seconds =
      state.total;


    save();

    renderAll();
  };


$('goalBtn').onclick =
  () => {

    $('goalInput').value =
      state.goal;

    $('goalDialog')
      .showModal();
  };


$('goalForm').onsubmit =
  saveGoal;


$('weekGoalBtn').onclick =
  () => {

    $('weekGoalInput').value =
      state.weekGoal;

    $('weekGoalDialog')
      .showModal();
  };


$('weekGoalForm').onsubmit =
  saveWeekGoal;


$('saveTaskBtn').onclick =
  () => {

    state.task =
      $('taskInput')
        .value
        .trim();

    save();

    renderAll();
  };


$('clearTaskBtn').onclick =
  () => {

    state.task =
      '';

    save();

    renderAll();
  };


$('addTaskBtn').onclick =
  addTask;


$('clearTasksBtn').onclick =
  clearTasks;


$('newTaskInput').onkeydown =
  (event) => {

    if (
      event.key ===
      'Enter'
    ) {

      event.preventDefault();

      addTask();
    }
  };


$('addSubjectBtn').onclick =
  () => {

    $('subjectNameInput')
      .value =
      '';

    $('subjectDialog')
      .showModal();


    setTimeout(
      () =>
        $('subjectNameInput')
          .focus(),

      20
    );
  };


$('subjectForm').onsubmit =
  (event) => {

    if (
      event.submitter?.value ===
      'cancel'
    ) {

      event.preventDefault();

      $('subjectDialog')
        .close();

      return;
    }


    event.preventDefault();


    const name =
      $('subjectNameInput')
        .value
        .trim();


    if (name) {
      addSubject(
        name
      );
    }


    $('subjectDialog')
      .close();
  };


$('subjectNameInput').onkeydown =
  (event) => {

    if (
      event.key ===
      'Enter'
    ) {

      event.preventDefault();

      $('saveSubjectBtn')
        .click();
    }
  };


$('resetTodayBtn').onclick =
  resetToday;


$('resetStatsBtn').onclick =
  clearHistory;


$('clearHistoryBtn').onclick =
  clearHistory;


$('exportCsvBtn').onclick =
  exportCsv;


$('enableNotificationsBtn').onclick =
  enableNotifications;


document
  .querySelectorAll(
    '.range-btn'
  )
  .forEach(
    (button) => {

      button.onclick =
        () => {

          document
            .querySelectorAll(
              '.range-btn'
            )
            .forEach(
              (item) =>
                item.classList.remove(
                  'active'
                )
            );


          button.classList.add(
            'active'
          );


          state.trendRange =
            button.dataset.range;


          save();

          renderTrend();
        };
    }
  );


document
  .querySelectorAll(
    '.preset-btn'
  )
  .forEach(
    (button) => {

      button.onclick =
        () => {

          $('workInput')
            .value =
            button.dataset.work;


          $('breakInput')
            .value =
            button.dataset.break;
        };
    }
  );


document.addEventListener(
  'keydown',
  (event) => {

    const tag =
      document.activeElement
        ?.tagName;


    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA'
    ) {
      return;
    }


    if (
      event.code ===
      'Space'
    ) {

      event.preventDefault();


      if (
        state.running
      ) {
        pauseTimer();
      } else if (
        getSubject()
      ) {
        startTimer();
      }
    }


    if (
      event.key.toLowerCase() ===
      'r'
    ) {

      resetTimer();
    }


    if (
      event.key ===
      'Escape'
    ) {

      if (
        !$('focusModeOverlay')
          .hidden
      ) {

        closeFocusMode();
      }
    }
  }
);


/* =========================
   START
========================= */

rebuildData();


restoreRunningTimer();


/* Prompt for notifications on first visit (only once) */
(function maybePromptNotifications() {
  if (
    'Notification' in window &&
    Notification.permission === 'default' &&
    !localStorage.getItem('focusNotifAsked')
  ) {
    localStorage.setItem('focusNotifAsked', '1');
    setTimeout(
      () => $('notificationDialog').showModal(),
      1200
    );
  }
}());

if (
  !getSubject() &&
  state.subjects.length
) {

  state.selectedSubjectId =
    state.subjects[0].id;
}

setupNavigation();

save();

renderAll();
