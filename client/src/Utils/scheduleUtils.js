/**
 * Utility functions for schedule management
 */

export const scheduleConstants = {
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],

  days: [...Array(31)].map((_, i) => (i + 1).toString()),

  weekOptions: [1, 2, 3, 4, "Last"],

  weekDays: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ],

  scheduleTypes: ["one-time", "daily", "weekly", "monthly"],
};

/**
 * Parse schedule data from API response
 * @param {Object} schedule - Schedule object from API
 * @returns {Object} Parsed schedule data for form
 */
export const parseScheduleData = (schedule) => {
  if (!schedule) return null;

  // Extract date and time from nextExecutionDate or use current date
  let scheduleDate, scheduleTime;

  if (schedule.nextExecutionDate) {
    const execDate = new Date(schedule.nextExecutionDate);
    scheduleDate = execDate.toISOString().split("T")[0];
    scheduleTime = `${String(execDate.getHours()).padStart(2, "0")}:${String(
      execDate.getMinutes()
    ).padStart(2, "0")}`;
  } else {
    scheduleDate = new Date().toISOString().split("T")[0];
    scheduleTime = "12:00";
  }

  // Determine schedule type from scheduleTime field
  let scheduleType = "one-time";
  if (schedule.scheduleTime) {
    if (
      schedule.scheduleTime.includes("Each") &&
      schedule.scheduleTime.includes("day")
    ) {
      scheduleType = "daily";
    } else if (
      schedule.scheduleTime.includes("Each") &&
      schedule.scheduleTime.includes("week")
    ) {
      scheduleType = "weekly";
    } else if (schedule.scheduleTime.includes("month")) {
      scheduleType = "monthly";
    }
  }

  return {
    scheduleType,
    date: scheduleDate,
    time: scheduleTime,
    repeatDays: 1,
    weekdays: [],
  };
};

/**
 * Build schedule payload for API request
 * @param {Object} scheduleData - Form schedule data
 * @param {Object} schedule - Original schedule object (for updates)
 * @param {Object} options - Additional options
 * @returns {Object} API payload
 */
export const buildSchedulePayload = (
  scheduleData,
  schedule = null,
  options = {}
) => {
  const {
    selectedDays = [],
    selectedWeeks = [],
    selectedWeekDays = [],
    selectedOption = "months",
    selectedMonths = [],
    selectedObject,
    jobName,
    viewId,
    tableName,
    scheduleType: defaultScheduleType,
  } = options;

  if (!scheduleData.time || !scheduleData.date) {
    throw new Error("Please provide both time and date for scheduling.");
  }

  const [hours, minutes] = scheduleData.time.split(":");
  const date = new Date(scheduleData.date);
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
  date.setSeconds(0);
  date.setMilliseconds(0);

  const startOn = date.toISOString().slice(0, 19);

  // Parse email details if it's a JSON string (for updates)
  let emailJson = null;
  if (schedule?.emailDetails) {
    try {
      emailJson =
        typeof schedule.emailDetails === "string"
          ? JSON.parse(schedule.emailDetails)
          : schedule.emailDetails;
    } catch (error) {
      console.error("Error parsing email details:", error);
    }
  }

  const payload = {
    hour: hours || "00",
    minutes: minutes || "00",
    day: 0,
    daysOfMonth: [],
    month: [],
    weekDay: [],
    weeks: [],
    numOfWeek: 0,
    startOn: startOn,
    jobName: schedule?.jobName || jobName || "",
    trigger: "",
    objectId: +selectedObject,
    viewId: schedule?.viewId || viewId || null,
    tableName: schedule?.tableName || tableName,
    scheduleType: schedule?.schedulerType || defaultScheduleType || "email",
    emailJson: emailJson,
    disable: schedule?.disabled === "yes" ? "yes" : "no",
  };

  let trigger = "";

  // Build payload based on schedule type
  switch (scheduleData.scheduleType) {
    case "daily":
      payload.day = scheduleData.repeatDays
        ? Number(scheduleData.repeatDays)
        : 0;
      trigger = `Each ${scheduleData.repeatDays} day(s), starting ${scheduleData.date}`;
      break;

    case "weekly":
      payload.weekDay = scheduleData.weekdays || [];
      payload.day = 0;
      trigger = `Each ${
        scheduleData.repeatDays
      } week(s), on ${scheduleData.weekdays.join(", ")}, starting ${
        scheduleData.date
      }`;
      break;

    case "monthly":
      payload.month = (selectedMonths || []).map(String);

      if (selectedOption === "days") {
        payload.daysOfMonth = (selectedDays || []).map(Number);
        payload.weekDay = [];
        payload.weeks = [];
        trigger = `On the ${selectedDays.join(
          ", "
        )} day(s) of ${selectedMonths.join(", ")}, starting ${
          scheduleData.date
        }`;
      } else if (selectedOption === "on") {
        payload.weeks = selectedWeeks.length ? [selectedWeeks[0]] : [];
        payload.weekDay = selectedWeekDays || [];
        payload.daysOfMonth = [];
        trigger = `On the ${payload.weeks[0]} ${selectedWeekDays.join(
          ", "
        )}, of ${selectedMonths.join(", ")}, starting ${scheduleData.date}`;
      }
      break;

    case "one-time":
      payload.numOfWeek = -1;
      trigger = `One time, on ${scheduleData.date} at ${scheduleData.time}`;
      break;

    default:
      break;
  }

  payload.trigger = trigger;
  return payload;
};

/**
 * Validate schedule data
 * @param {Object} scheduleData - Schedule data to validate
 * @returns {Object} Validation result { isValid, errors }
 */
export const validateScheduleData = (scheduleData) => {
  const errors = [];

  if (!scheduleData.date) {
    errors.push("Start date is required");
  }

  if (!scheduleData.time) {
    errors.push("Start time is required");
  }

  if (
    scheduleData.scheduleType === "weekly" &&
    scheduleData.weekdays.length === 0
  ) {
    errors.push("Please select at least one weekday for weekly schedule");
  }

  if (scheduleData.scheduleType === "daily" && scheduleData.repeatDays < 1) {
    errors.push("Repeat days must be at least 1 for daily schedule");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Format schedule for display
 * @param {Object} schedule - Schedule object
 * @returns {Object} Formatted schedule data
 */
export const formatScheduleForDisplay = (schedule) => {
  if (!schedule) return null;

  return {
    ...schedule,
    formattedNextExecution: schedule.nextExecutionDate
      ? new Date(schedule.nextExecutionDate).toLocaleString()
      : "N/A",
    formattedCreatedTime: schedule.createdTime
      ? new Date(schedule.createdTime).toLocaleString()
      : "N/A",
    statusLabel: schedule.disabled === "no" ? "Active" : "Disabled",
    jobNameDisplay: schedule.jobName || "N/A",
  };
};

/**
 * Parse enhanced schedule time string for editing
 * @param {string} scheduleTimeStr - Schedule time string from API
 * @returns {Object} Parsed schedule configuration
 */
export const parseEnhancedScheduleTime = (scheduleTimeStr) => {
  const result = {
    scheduleType: "one-time",
    repeatDays: 1,
    weekdays: [],
    months: [],
    days: [],
    weeks: [],
    weekDays: [],
    monthlyOption: "months",
    date: null,
    time: null,
  };

  if (!scheduleTimeStr) return result;

  console.log("Parsing enhanced scheduleTime:", scheduleTimeStr);

  if (scheduleTimeStr.includes("One time")) {
    // One time, on 2025-11-16 at 09:55
    result.scheduleType = "one-time";

    const dateTimeMatch = scheduleTimeStr.match(
      /on (\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2})/
    );
    if (dateTimeMatch) {
      result.date = dateTimeMatch[1];
      result.time = dateTimeMatch[2];
    }
  } else if (
    scheduleTimeStr.includes("Each") &&
    scheduleTimeStr.includes("day(s)")
  ) {
    // Each 2 day(s), starting 2025-11-05
    result.scheduleType = "daily";

    const dayMatch = scheduleTimeStr.match(/Each (\d+) day\(s\)/);
    if (dayMatch) {
      result.repeatDays = parseInt(dayMatch[1]);
    }
  } else if (
    scheduleTimeStr.includes("Each") &&
    scheduleTimeStr.includes("week(s)")
  ) {
    // Each 2 week(s), on Monday, starting 2025-11-09
    result.scheduleType = "weekly";

    const weekMatch = scheduleTimeStr.match(/Each (\d+) week\(s\)/);
    if (weekMatch) {
      result.repeatDays = parseInt(weekMatch[1]);
    }

    const weekdayMatch = scheduleTimeStr.match(/on ([^,]+), starting/);
    if (weekdayMatch) {
      const weekdayStr = weekdayMatch[1];
      result.weekdays = weekdayStr.split(/,|\sand\s/).map((day) => day.trim());
    }
  } else if (
    scheduleTimeStr.includes("On the") &&
    scheduleTimeStr.includes("of")
  ) {
    // On the 2 Tuesday, of February, starting 2025-11-05
    result.scheduleType = "monthly";
    result.monthlyOption = "on";

    const weekMatch = scheduleTimeStr.match(/On the (\d+|Last)/);
    if (weekMatch) {
      result.weeks = [
        weekMatch[1] === "Last" ? "Last" : parseInt(weekMatch[1]),
      ];
    }

    const weekdayMatch = scheduleTimeStr.match(/On the (?:\d+|Last) (\w+),/);
    if (weekdayMatch) {
      result.weekDays = [weekdayMatch[1]];
    }

    const monthMatch = scheduleTimeStr.match(/of ([^,]+), starting/);
    if (monthMatch) {
      const monthStr = monthMatch[1];
      result.months = monthStr.split(/,|\sand\s/).map((month) => month.trim());
    }
  } else if (scheduleTimeStr.includes("day(s) of")) {
    // On the 1, 15 day(s) of January, March, starting 2025-11-05
    result.scheduleType = "monthly";
    result.monthlyOption = "days";

    const dayMatch = scheduleTimeStr.match(/On the ([^)]+) day\(s\)/);
    if (dayMatch) {
      const dayStr = dayMatch[1];
      result.days = dayStr.split(/,|\sand\s/).map((day) => day.trim());
    }

    const monthMatch = scheduleTimeStr.match(/of ([^,]+), starting/);
    if (monthMatch) {
      const monthStr = monthMatch[1];
      result.months = monthStr.split(/,|\sand\s/).map((month) => month.trim());
    }
  }

  // Extract starting date for non-one-time schedules
  if (result.scheduleType !== "one-time") {
    const startDateMatch = scheduleTimeStr.match(
      /starting (\d{4}-\d{2}-\d{2})/
    );
    if (startDateMatch) {
      result.date = startDateMatch[1];
    }
  }

  return result;
};
