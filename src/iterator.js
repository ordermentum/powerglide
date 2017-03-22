const moment = require('moment-timezone');

const constants = require('./constants');
const TimezoneDate = require('./timezone_date');

class Iterator {
  constructor(rule = {}, start, count = null) {
    this.rule = rule;
    if (!this.rule || !this.rule.frequency) {
      throw new Error('Invalid rule, no frequency property on rule.');
    }

    this.rule.interval = this.rule.interval ? this.rule.interval : 1;

    if (count) {
      this.count = count;
    } else if (this.rule.count) {
      this.count = this.rule.count;
    } else {
      this.count = 52;
    }

    const timezone = this.rule.tzId || 'UTC';
    this.start = new TimezoneDate(start || new Date(), timezone);
  }

  * [Symbol.iterator]() {
    let limit = this.count;
    while (limit > 0) {
      const value = this.getNext(this.start || new Date());
      yield value;
      this.start = value;
      limit -= 1;
    }
  }

  setLowerIntervals(intervalTime, intervals) {
    if (this.rule.frequency > 0) {
      const seconds = this.rule.bySecond ? this.rule.bySecond[0] : intervals.getSeconds();
      intervalTime.setSeconds(seconds);
    }
    if (this.rule.frequency > 1) {
      const minutes = this.rule.byMinute ? this.rule.byMinute[0] : intervals.getMinutes();
      intervalTime.setMinutes(minutes);
    }
    if (this.rule.frequency > 2) {
      const hours = this.rule.byHour ? this.rule.byHour[0] : intervals.getHours();
      intervalTime.setHours(hours);
    }

    return intervalTime;
  }

  getLowerIntervals(fromDate) {
    const timezone = this.rule.tzId || 'UTC';
    const intervalTime = new TimezoneDate(fromDate || new Date(), timezone);
    return this.setLowerIntervals(intervalTime, intervalTime);
  }

  calculateFortnight(intervalTime) {
    // calculate the difference in weeks between the dtStart
    // and the current date.
    const weekDiff = moment(this.rule.dtStart.date).diff(intervalTime.date.toISOString(), 'week');
    // ensures that it only gets the even week amount to advance the time.
    const evenWeeks = weekDiff - (weekDiff % 2);
    // Adds the even weeks to the dtStart which gives the last run time before
    // the current date.
    const startingPoint = moment(this.rule.dtStart.date).add(Math.abs(evenWeeks), 'weeks');
    const timezone = this.rule.tzId || 'UTC';
    return new TimezoneDate(startingPoint, timezone);
  }

  handleFortnight(intervalTime, fromDate) {
    let lastRun = fromDate;
    // if the start date is before the from Date advance the fromDate
    // until it's within 2 weeks of the current date.
    const pastDtStart = moment(this.rule.dtStart.date).isBefore(fromDate);
    if (pastDtStart) {
      lastRun = this.calculateFortnight(intervalTime);
    }

    lastRun.addFortnight();
    return this.setLowerIntervals(lastRun, intervalTime);
  }

  handleLastMonthDay(tzFromDate, intervalTime) {
    const timezone = this.rule.tzId || 'UTC';
    // Gets the last day of the current month
    if (tzFromDate.getDate() === tzFromDate.date.daysInMonth() &&
      tzFromDate.date.isBefore(intervalTime)) {
        // It's the last day of the month and just need to
        // advance the times to the rules or last run intervals.
      return intervalTime;
    }

    // Advance the fromDate to the last day of the month.
    let lastMonthDay = new TimezoneDate(
      tzFromDate.date.add(1, 'months').date(0), timezone);

    // If it's equal to or after the run time and we are
    // on the actual day, add a month.
    if (tzFromDate.date.isSameOrAfter(intervalTime.date.add(1, 'months').date(0))) {
      lastMonthDay = new TimezoneDate(
        tzFromDate.date.add(2, 'months').date(0), timezone);
    }

    // Set the HH/MM/SS intervals on the correct day.
    return this.setLowerIntervals(lastMonthDay, intervalTime);
  }

  handleMonthly(intervalTime, fromDate) {
    const timezone = this.rule.tzId || 'UTC';
    const tzFromDate = new TimezoneDate(fromDate, timezone);

    // Is it earlier in the month than the byMonthDay rule?
    // Need to process last day of the month...
    if (this.rule.byMonthDay[0] === -1) {
      return this.handleLastMonthDay(tzFromDate, intervalTime);
    }

    const intervals = new TimezoneDate(intervalTime, timezone);

    if (tzFromDate.getDate() < this.rule.byMonthDay[0]) {
      // If the from day of the month is before the specified date.
      return intervalTime.setDate(this.rule.byMonthDay[0]);
    } else if (tzFromDate.getDate() > this.rule.byMonthDay[0]) {
      // If the from date is after the specified date.
      intervalTime.addMonth();
      intervalTime.setDate(this.rule.byMonthDay[0]);
    } else if (tzFromDate.getDate() === this.rule.byMonthDay[0]) {
      // If the from date is the same day as the byMonthDay.
      if (tzFromDate.date.isSameOrAfter(intervalTime.date)) {
        // And the time is after the intervals run time
        // then we need to skip ahead to the day next month.
        intervalTime.addMonth();
        intervalTime.setDate(this.rule.byMonthDay[0]);
      }
    }

    return this.setLowerIntervals(intervalTime, intervals);
  }

  getNext(fromDate) {
    const intervalTime = this.getLowerIntervals(fromDate);

    if (fromDate.toISOString) fromDate = fromDate.toISOString(); // eslint-disable-line

    // If this rule is monthly
    if (this.rule.frequency === 5) {
      return this.handleMonthly(intervalTime, fromDate);
    }

    // If this rule is fortnightly
    if (this.rule.frequency === 4 && this.rule.interval === 2) {
      return this.handleFortnight(intervalTime, fromDate);
    }

    // If this rule is weekly
    if (this.rule.frequency === 4 && this.rule.interval === 1) {
      const day = this.rule.byDay[0];
      intervalTime.setDay(day);
    }

    // Weekly/Daily/Hourly/Minutely/Secondly can all advance in a similar
    // predictable fashion and don't need to be handled separately.
    if (moment(fromDate).isBefore(intervalTime.date.toISOString())) {
      return intervalTime;
    }

    const intervals = this.getLowerIntervals(intervalTime);
    for (let i = 0; i < this.rule.interval; i++) {
      intervalTime[constants.ADD_FREQUENCY[this.rule.frequency]]();
    }

    return this.setLowerIntervals(intervalTime, intervals);
  }
}

module.exports = Iterator;
