const STORAGE_KEYS = {
  activities: 'fittrackActivities',
  meals: 'fittrackMeals',
  wellness: 'fittrackWellness',
};

const SESSION_KEY = 'fittrackSessionMeta';
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const baseData = window.fittrackData;
const FALLBACK_WEEKLY_CALORIES = [2200, 1800, 2000, 2500, 1900, 2400, 2100];
const FALLBACK_MEAL_SPLIT = [500, 700, 800, 300];
const FALLBACK_MEAL_LABELS = ['B', 'L', 'D', 'S'];
const DEFAULT_WEEKLY_CALORIES =
  Array.isArray(baseData.insights?.weeklyCalories) && baseData.insights.weeklyCalories.length >= 7
    ? baseData.insights.weeklyCalories.slice(0, 7)
    : FALLBACK_WEEKLY_CALORIES;
const chartInstances = {
  weekly: null,
  meals: null,
};

const normalizeActivities = (activities) =>
  activities.map((activity, index) => ({
    ...activity,
    weekday:
      typeof activity.weekday === 'number' && activity.weekday >= 0 && activity.weekday <= 6
        ? activity.weekday
        : index % 7,
  }));

const mealBuckets = ['breakfast', 'lunch', 'dinner', 'snacks'];

const computeMealTotals = (sourceMeals = {}) =>
  mealBuckets.map((mealKey) =>
    (sourceMeals[mealKey] || []).reduce((sum, item) => sum + Number(item.calories || 0), 0)
  );

const DEFAULT_MEAL_SPLIT = computeMealTotals(baseData.meals);

const ensureMealBuckets = (meals) => {
  const normalized = {};
  mealBuckets.forEach((bucket) => {
    const source = Array.isArray(meals?.[bucket]) ? meals[bucket] : [];
    normalized[bucket] = source.map((item) => ({ ...item }));
  });
  return normalized;
};

const state = {
  activities: normalizeActivities(structuredClone(baseData.activities)),
  meals: ensureMealBuckets(baseData.meals),
  wellness: structuredClone(baseData.wellness),
  filter: 'all',
};

const selectors = {
  clock: document.getElementById('liveClock'),
  stepsValue: document.getElementById('stepsValue'),
  caloriesValue: document.getElementById('caloriesValue'),
  waterValue: document.getElementById('waterValue'),
  stepsGoal: document.getElementById('stepsGoal'),
  caloriesGoal: document.getElementById('caloriesGoal'),
  waterGoal: document.getElementById('waterGoal'),
  activityList: document.getElementById('activityList'),
  activityForm: document.getElementById('activityForm'),
  mealGrid: document.getElementById('mealGrid'),
  mealForm: document.getElementById('mealForm'),
  dailyCalories: document.getElementById('dailyCalories'),
  weeklyCaloriesChart: document.getElementById('weeklyCaloriesChart'),
  mealCaloriesChart: document.getElementById('mealCaloriesChart'),
  sessionChart: document.getElementById('sessionChart'),
  insightsList: document.getElementById('insightsList'),
  filterPills: document.querySelectorAll('.filter-pill'),
  navButtons: document.querySelectorAll('[data-scroll]'),
  downloadBtn: document.getElementById('downloadSummary'),
  resetBtn: document.getElementById('resetDashboard'),
  modal: document.getElementById('statusModal'),
  modalMessage: document.getElementById('modalMessage'),
  modalClose: document.getElementById('modalClose'),
  confirmModal: document.getElementById('confirmModal'),
  confirmMessage: document.getElementById('confirmMessage'),
  confirmCancel: document.getElementById('confirmCancel'),
  confirmAccept: document.getElementById('confirmAccept'),
};

let confirmResolver = null;

const loadFromStorage = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : structuredClone(fallback);
  } catch (err) {
    console.error('Failed to load storage', err);
    return structuredClone(fallback);
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save storage', err);
  }
};

const seedStorageDefaults = () => {
  try {
    if (!localStorage.getItem(STORAGE_KEYS.activities)) {
      saveToStorage(STORAGE_KEYS.activities, baseData.activities);
    }
    if (!localStorage.getItem(STORAGE_KEYS.meals)) {
      saveToStorage(STORAGE_KEYS.meals, baseData.meals);
    }
    if (!localStorage.getItem(STORAGE_KEYS.wellness)) {
      saveToStorage(STORAGE_KEYS.wellness, baseData.wellness);
    }
  } catch (err) {
    console.warn('Unable to seed default dashboard data', err);
  }
};

const formatNumber = (num) => new Intl.NumberFormat().format(num);

const clamp = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const destroyChart = (key) => {
  if (chartInstances[key]) {
    chartInstances[key].destroy();
    chartInstances[key] = null;
  }
};

const buildGradient = (ctx, colors) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height || 300);
  const stops = colors.length - 1;
  colors.forEach((color, index) => {
    gradient.addColorStop(index / stops, color);
  });
  return gradient;
};

const renderWeeklyChart = (values) => {
  if (!selectors.weeklyCaloriesChart || typeof window.Chart === 'undefined') return;
  const ctx = selectors.weeklyCaloriesChart.getContext('2d');
  destroyChart('weekly');
  const gradient = buildGradient(ctx, ['#55f7d5', '#7fb8ff', '#7964ff']);

  chartInstances.weekly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: DAY_LABELS,
      datasets: [
        {
          label: 'Calories',
          data: values,
          backgroundColor: gradient,
          borderRadius: 12,
          borderSkipped: false,
          hoverBackgroundColor: gradient,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
          },
          ticks: {
            color: 'rgba(248, 251, 255, 0.7)',
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.08)',
          },
          ticks: {
            color: 'rgba(248, 251, 255, 0.7)',
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(2, 7, 16, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          titleColor: '#fff',
          bodyColor: '#fff',
          displayColors: false,
        },
      },
    },
  });
};

const renderMealChart = (values) => {
  if (!selectors.mealCaloriesChart || typeof window.Chart === 'undefined') return;
  const ctx = selectors.mealCaloriesChart.getContext('2d');
  destroyChart('meals');

  chartInstances.meals = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
      datasets: [
        {
          data: values,
          backgroundColor: ['#55f7d5', '#ff9b6a', '#7fb8ff', '#ff8fd8'],
          borderColor: 'rgba(4, 10, 20, 0.9)',
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: 'rgba(248, 251, 255, 0.85)',
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(2, 7, 16, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          titleColor: '#fff',
          bodyColor: '#fff',
          displayColors: false,
        },
      },
    },
  });
};

const initClock = () => {
  if (!selectors.clock) return;
  const updateClock = () => {
    const now = new Date();
    selectors.clock.textContent = now.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  updateClock();
  setInterval(updateClock, 1000);
};

const initSmoothScroll = () => {
  selectors.navButtons.forEach((btn, index) => {
    if (index === 0) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.scroll);
      selectors.navButtons.forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
};

const renderWellness = () => {
  const { wellness } = state;
  selectors.stepsValue.textContent = formatNumber(wellness.steps.current);
  selectors.caloriesValue.textContent = formatNumber(wellness.calories.current);
  selectors.waterValue.textContent = wellness.water.current.toFixed(1);
  selectors.stepsGoal.textContent = `Goal: ${formatNumber(wellness.steps.goal)}`;
  selectors.caloriesGoal.textContent = `Goal: ${wellness.calories.goal} kcal`;
  selectors.waterGoal.textContent = `Goal: ${wellness.water.goal} L`;

  document.querySelectorAll('.progress-card').forEach((card) => {
    const type = card.dataset.type;
    const dataset = wellness[type];
    if (!dataset) return;
    const percent = clamp((dataset.current / dataset.goal) * 100);
    const ring = card.querySelector('.progress-ring');
    const ringColor = getComputedStyle(card).getPropertyValue('--ring-color').trim() || 'var(--accent)';
    ring.style.background = `conic-gradient(${ringColor} ${percent * 3.6}deg, rgba(255,255,255,0.08) 0deg)`;
    ring.dataset.progress = percent.toFixed(0);
  });
};

const wellnessLimits = {
  steps: { min: 0, max: 20000, precision: 0 },
  calories: { min: 0, max: 2000, precision: 0 },
  water: { min: 0, max: 5, precision: 1 },
};

const adjustWellness = (metric, delta) => {
  const config = wellnessLimits[metric];
  if (!config || !state.wellness[metric]) return;
  const current = state.wellness[metric].current;
  const updated = clamp(current + delta, config.min, config.max);
  state.wellness[metric].current = Number(updated.toFixed(config.precision));
  saveToStorage(STORAGE_KEYS.wellness, state.wellness);
  renderWellness();
  renderInsights();
};

const initWellnessSection = () => {
  state.wellness = loadFromStorage(STORAGE_KEYS.wellness, baseData.wellness);
  renderWellness();
  document.querySelectorAll('.control-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const metric = btn.dataset.metric;
      const step = Number(btn.dataset.step);
      if (Number.isNaN(step)) return;
      adjustWellness(metric, step);
    });
  });
};

const renderActivities = () => {
  const { activities, filter } = state;
  const container = selectors.activityList;
  container.innerHTML = '';

  const filtered = activities.filter((act) => filter === 'all' || act.session === filter);

  if (!filtered.length) {
    container.innerHTML = '<p class="placeholder">No activities logged for this filter yet.</p>';
  } else {
    filtered.forEach((activity) => {
      const item = document.createElement('article');
      item.className = 'activity-item';
      item.innerHTML = `
        <div>
          <p class="activity-item__session">${activity.session}</p>
          <h4>${activity.name}</h4>
          <p>${activity.duration} mins</p>
        </div>
        <div class="activity-item__meta">
          <strong>${activity.calories} kcal</strong>
        </div>
        <div class="activity-item__actions">
          <star-border class="icon-border" thickness="1" color="#ff5f6d" speed="3s">
            <button type="button" class="icon-btn" data-remove-activity="${activity.id}" aria-label="Remove ${activity.name}">🗑️</button>
          </star-border>
        </div>
      `;
      container.appendChild(item);
    });
  }

  renderInsights();
};

const handleActivitySubmit = (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const name = formData.get('name').trim();
  const duration = Number(formData.get('duration'));
  const calories = Number(formData.get('calories'));
  const session = formData.get('session');

  if (!name || duration <= 0 || calories <= 0 || !session) {
    return;
  }

  const newActivity = {
    id: crypto.randomUUID(),
    name,
    duration,
    calories,
    session,
    weekday: new Date().getDay(),
  };

  state.activities.unshift(newActivity);
  saveToStorage(STORAGE_KEYS.activities, state.activities);
  renderActivities();
  showStatusModal('Activity added successfully!');
  form.reset();
};

const initActivitySection = () => {
  state.activities = normalizeActivities(loadFromStorage(STORAGE_KEYS.activities, baseData.activities));
  renderActivities();
  selectors.activityForm.addEventListener('submit', handleActivitySubmit);

  selectors.filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      selectors.filterPills.forEach((el) => el.classList.remove('active'));
      pill.classList.add('active');
      state.filter = pill.dataset.filter;
      renderActivities();
    });
  });

  selectors.activityList.addEventListener('click', (event) => {
    const target = event.target.closest('[data-remove-activity]');
    if (!target) return;
    handleActivityRemove(target.dataset.removeActivity);
  });
};

const handleActivityRemove = (id) => {
  state.activities = state.activities.filter((activity) => activity.id !== id);
  saveToStorage(STORAGE_KEYS.activities, state.activities);
  renderActivities();
  showStatusModal('Activity removed.');
};

const calculateDailyCalories = () => {
  const meals = state.meals;
  return Object.values(meals)
    .flat()
    .reduce((sum, meal) => sum + Number(meal.calories || 0), 0);
};

const renderMeals = () => {
  const container = selectors.mealGrid;
  container.innerHTML = '';

  mealBuckets.forEach((key) => {
    const items = state.meals[key] || [];
    const card = document.createElement('article');
    card.className = 'card meal-card';
    const title = key.charAt(0).toUpperCase() + key.slice(1);

    const listItems = items
      .map(
        (meal) => `
        <li class="meal-item">
          <div>
            <p>${meal.item}</p>
            <small>${meal.calories} kcal</small>
          </div>
          <button type="button" data-meal="${key}" data-id="${meal.id}">Remove</button>
        </li>
      `
      )
      .join('');

    card.innerHTML = `
      <header>
        <h3>${title}</h3>
        <span class="chip">${items.length} items</span>
      </header>
      <ul class="meal-items">
        ${items.length ? listItems : '<li class="placeholder">No items yet.</li>'}
      </ul>
    `;

    card.addEventListener('click', (event) => {
      const target = event.target;
      if (target.matches('button[data-id]')) {
        const mealType = target.dataset.meal;
        const id = target.dataset.id;
        state.meals[mealType] = state.meals[mealType].filter((item) => item.id !== id);
        saveToStorage(STORAGE_KEYS.meals, state.meals);
        renderMeals();
      }
    });

    const border = document.createElement('star-border');
    border.setAttribute('thickness', '2');
    border.setAttribute('color', '#0ff');
    border.setAttribute('speed', '4s');
    border.appendChild(card);
    container.appendChild(border);
  });

  selectors.dailyCalories.textContent = calculateDailyCalories();
  renderInsights();
};

const handleMealSubmit = (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const meal = formData.get('meal');
  const item = formData.get('item').trim();
  const calories = Number(formData.get('calories'));
  if (!meal || !item || calories <= 0) return;

  if (!state.meals[meal]) {
    state.meals[meal] = [];
  }
  const newMeal = { id: crypto.randomUUID(), item, calories };
  state.meals[meal].push(newMeal);
  saveToStorage(STORAGE_KEYS.meals, state.meals);
  renderMeals();
  showStatusModal(`${item} added to ${meal}.`);
  form.reset();
};

const initMealSection = () => {
  state.meals = ensureMealBuckets(loadFromStorage(STORAGE_KEYS.meals, baseData.meals));
  renderMeals();
  selectors.mealForm.addEventListener('submit', handleMealSubmit);
};

const computeWeeklyCaloriesSeries = () => {
  const totals = Array(7).fill(0);
  state.activities.forEach((activity, index) => {
    const dayIndex =
      typeof activity.weekday === 'number' && activity.weekday >= 0 && activity.weekday <= 6
        ? activity.weekday
        : index % 7;
    totals[dayIndex] += Number(activity.calories) || 0;
  });

  if (totals.some((value) => value > 0)) {
    return DAY_ORDER.map((day) => totals[day] || 0);
  }

  return DEFAULT_WEEKLY_CALORIES;
};

const renderInsights = () => {
  const todaysActivityMinutes = state.activities.reduce((sum, act) => sum + Number(act.duration || 0), 0);
  const todaysCaloriesBurned = state.activities.reduce((sum, act) => sum + Number(act.calories || 0), 0);
  const todaysMealCalories = calculateDailyCalories();

  const weeklyCaloriesSeries = computeWeeklyCaloriesSeries();
  const mealTotalsRaw = computeMealTotals(state.meals);
  const mealTotals =
    mealTotalsRaw.some((value) => value > 0)
      ? mealTotalsRaw
      : DEFAULT_MEAL_SPLIT.some((value) => value > 0)
        ? DEFAULT_MEAL_SPLIT
        : FALLBACK_MEAL_SPLIT;

  renderWeeklyChart(weeklyCaloriesSeries);
  renderMealChart(mealTotals);

  if (selectors.sessionChart) {
    const sessionTotals = { morning: 0, afternoon: 0, evening: 0 };
    state.activities.forEach((act) => {
      const bucket = sessionTotals[act.session];
      if (bucket !== undefined) {
        sessionTotals[act.session] += Number(act.duration) || 0;
      }
    });

    const maxSessionValue = Math.max(...Object.values(sessionTotals), 1);
    const sessionLabels = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
    };

    selectors.sessionChart.innerHTML = '';

    const hasData = Object.values(sessionTotals).some((value) => value > 0);
    if (!hasData) {
      selectors.sessionChart.innerHTML = '<p class="placeholder">Add an activity to see the breakdown.</p>';
    } else {
      Object.entries(sessionTotals).forEach(([key, value]) => {
        const row = document.createElement('div');
        row.className = 'session-bar';
        const ratio = value / maxSessionValue;
        row.innerHTML = `
          <span class="session-bar__label">${sessionLabels[key]}</span>
          <span class="session-bar__track">
            <span class="session-bar__fill" style="transform: scaleX(${ratio});"></span>
          </span>
          <span class="session-bar__value">${value}m</span>
        `;
        selectors.sessionChart.appendChild(row);
      });
    }
  }

  const hydrationPct = Math.round((state.wellness.water.current / state.wellness.water.goal) * 100);
  const stepDiff = state.wellness.steps.current - state.wellness.steps.goal;
  const activityCount = state.activities.length;

  const highlightMessages = [
    `Hydration ${hydrationPct >= 100 ? 'on track' : 'at'} ${Math.min(hydrationPct, 160)}% of goal.`,
    stepDiff >= 0
      ? `Step goal exceeded by ${formatNumber(stepDiff)} steps today.`
      : `${formatNumber(Math.abs(stepDiff))} steps left to reach today's goal.`,
    activityCount
      ? `${activityCount} logged activities totaling ${todaysActivityMinutes} mins and ${todaysCaloriesBurned} kcal.`
      : 'No activities logged yet — add one to get moving.',
    `Planned meals sum to ${todaysMealCalories} kcal for the day.`,
  ];

  selectors.insightsList.innerHTML = highlightMessages.map((text) => `<li>${text}</li>`).join('');
};

const showStatusModal = (message) => {
  selectors.modalMessage.textContent = message;
  selectors.modal.classList.add('active');
};

const hideStatusModal = () => {
  selectors.modal.classList.remove('active');
};

selectors.modalClose.addEventListener('click', hideStatusModal);
selectors.modal.addEventListener('click', (event) => {
  if (event.target === selectors.modal) hideStatusModal();
});

const confirmAction = (message) => {
  selectors.confirmMessage.textContent = message;
  selectors.confirmModal.classList.add('active');
  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
};

const closeConfirm = () => {
  selectors.confirmModal.classList.remove('active');
  confirmResolver = null;
};

selectors.confirmCancel.addEventListener('click', () => {
  if (confirmResolver) confirmResolver(false);
  closeConfirm();
});

selectors.confirmAccept.addEventListener('click', () => {
  if (confirmResolver) confirmResolver(true);
  closeConfirm();
});

selectors.confirmModal.addEventListener('click', (event) => {
  if (event.target === selectors.confirmModal) {
    if (confirmResolver) confirmResolver(false);
    closeConfirm();
  }
});

const downloadSummary = () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    wellness: state.wellness,
    activities: state.activities,
    meals: state.meals,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'fittrack-summary.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showStatusModal('Summary ready! Check your downloads.');
};

const handleReset = async () => {
  const confirmed = await confirmAction('Reset dashboard data? This clears local & session storage.');
  if (!confirmed) return;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem(SESSION_KEY);
  state.activities = normalizeActivities(structuredClone(baseData.activities));
  state.meals = ensureMealBuckets(baseData.meals);
  state.wellness = structuredClone(baseData.wellness);
  state.filter = 'all';
  document.querySelector('[data-filter="all"]').classList.add('active');
  selectors.filterPills.forEach((pill) => {
    if (pill.dataset.filter !== 'all') pill.classList.remove('active');
  });
  renderActivities();
  renderMeals();
  renderWellness();
  renderInsights();
  showStatusModal('Dashboard reset successfully.');
};

const initRevealAnimations = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    },
    { threshold: 0.2 }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
};

const initSessionMeta = () => {
  if (!sessionStorage.getItem(SESSION_KEY)) {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ startedAt: new Date().toISOString() })
    );
  }
};

window.addEventListener('DOMContentLoaded', () => {
  seedStorageDefaults();
  initSmoothScroll();
  initClock();
  initSessionMeta();
  initWellnessSection();
  initActivitySection();
  initMealSection();
  renderInsights();
  initRevealAnimations();

  selectors.downloadBtn.addEventListener('click', downloadSummary);
  selectors.resetBtn.addEventListener('click', handleReset);
});
