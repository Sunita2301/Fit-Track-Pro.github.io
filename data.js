window.fittrackData = {
  wellness: {
    steps: { current: 8740, goal: 10000 },
    calories: { current: 560, goal: 750 },
    water: { current: 2.6, goal: 3.0 },
  },
  activities: [
    { id: 'act-1', name: 'Sunrise Run', duration: 42, calories: 360, session: 'morning', weekday: 1 },
    { id: 'act-2', name: 'Midday Cycling', duration: 35, calories: 310, session: 'afternoon', weekday: 2 },
    { id: 'act-3', name: 'Power Yoga', duration: 30, calories: 220, session: 'evening', weekday: 3 },
    { id: 'act-4', name: 'Strength Circuit', duration: 28, calories: 260, session: 'evening', weekday: 4 },
  ],
  meals: {
    breakfast: [
      { id: 'meal-b1', item: 'Greek Yogurt Parfait', calories: 240 },
      { id: 'meal-b2', item: 'Almond Butter Toast', calories: 190 },
    ],
    lunch: [
      { id: 'meal-l1', item: 'Quinoa Power Bowl', calories: 420 },
      { id: 'meal-l2', item: 'Citrus Greens Salad', calories: 250 },
    ],
    dinner: [
      { id: 'meal-d1', item: 'Grilled Salmon', calories: 360 },
      { id: 'meal-d2', item: 'Roasted Veggies', calories: 180 },
    ],
    snacks: [
      { id: 'meal-s1', item: 'Protein Bites', calories: 150 },
      { id: 'meal-s2', item: 'Berry Mix', calories: 110 },
    ],
  },
  insights: {
    weeklyCalories: [480, 520, 610, 570, 640, 710, 530],
    weeklyActivity: [35, 42, 55, 48, 62, 70, 40],
    highlights: [
      'Hydration on point — water intake streak at 5 days.',
      'Consistency boost: 4 strength-focused workouts logged.',
      'Calorie burn now 12% above last week’s average.',
    ],
  },
};
