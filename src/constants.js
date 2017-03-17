const WEEK_DAYS = {
  MO: 0,
  TU: 1,
  WE: 2,
  TH: 3,
  FR: 4,
  SA: 5,
  SU: 6,
};

const FREQUENCIES = {
  SECONDLY: 0,
  MINUTELY: 1,
  HOURLY: 2,
  DAILY: 3,
  WEEKLY: 4,
  MONTHLY: 5,
  YEARLY: 6,
};

const ADD_FREQUENCY = {
  0: 'addSecond',
  1: 'addMinute',
  2: 'addHour',
  3: 'addDay',
  4: 'addWeek',
  5: 'addMonth',
  6: 'addYear',
};

const LEGACY = {
  dayOfWeek: 'byDay',
  startdate: 'dtStart',
  byhour: 'byHour',
  byminute: 'byMinute',
  bysecond: 'bySecond',
};

module.exports = {
  FREQUENCIES,
  WEEK_DAYS,
  LEGACY,
  ADD_FREQUENCY,
};