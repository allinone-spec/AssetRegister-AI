import { useState, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  Checkbox,
  FormControl,
  ListItemText,
  MenuItem,
  Select,
  Button,
} from "@mui/material";
import toast from "react-hot-toast";
import { patchRequest } from "../../Service/admin.save";
import { useTheme } from "../../ThemeContext";
import { useSelector } from "react-redux";
import { scheduleConstants } from "../../Utils/scheduleUtils";

export const EditScheduleModal = ({
  isOpen,
  onClose,
  schedule,
  onScheduleUpdated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    scheduleType: "one-time",
    date: "",
    time: "",
    repeatDays: 1,
    weekdays: [],
  });

  // Monthly schedule states
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedWeekDays, setSelectedWeekDays] = useState([]);
  const [selectedOption, setSelectedOption] = useState("months");
  const [selectedMonths, setSelectedMonths] = useState([]);

  const { bgColor } = useTheme();
  const selectedObject = useSelector((state) => state.selectedObject.value);
  const { backgroundColor } = bgColor;

  const { months, days, weekOptions, weekDays, scheduleTypes } =
    scheduleConstants;

  // Initialize form data when schedule prop changes
  useEffect(() => {
    if (schedule && isOpen) {
      populateFormData(schedule);
    }
  }, [schedule, isOpen]);

  const populateFormData = (schedule) => {
    // Extract date and time from nextExecutionDate or use current date
    let scheduleDate, scheduleTime;

    if (schedule.nextExecutionDate) {
      const execDate = new Date(schedule.nextExecutionDate);
      scheduleDate = execDate.toISOString().split("T")[0];
      scheduleTime = `${String(execDate.getHours()).padStart(2, "0")}:${String(
        execDate.getMinutes(),
      ).padStart(2, "0")}`;
    } else {
      scheduleDate = new Date().toISOString().split("T")[0];
      scheduleTime = "12:00";
    }

    // Parse scheduleTime string to extract detailed information
    const scheduleTimeStr = schedule.scheduleTime || "";
    let scheduleType = "one-time";
    let repeatDays = 1;
    let weekdays = [];
    let months = [];
    let days = [];
    let weeks = [];
    let weekDays = [];
    let monthlyOption = "months";

    if (scheduleTimeStr.includes("One time")) {
      // One time, on 2025-11-16 at 09:55
      scheduleType = "one-time";

      // Extract date and time from the scheduleTime string
      const dateTimeMatch = scheduleTimeStr.match(
        /on (\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2})/,
      );
      if (dateTimeMatch) {
        scheduleDate = dateTimeMatch[1];
        scheduleTime = dateTimeMatch[2];
      }
    } else if (
      scheduleTimeStr.includes("Each") &&
      scheduleTimeStr.includes("day(s)")
    ) {
      // Each 2 day(s), starting 2025-11-05
      scheduleType = "daily";

      const dayMatch = scheduleTimeStr.match(/Each (\d+) day\(s\)/);
      if (dayMatch) {
        repeatDays = parseInt(dayMatch[1]);
      }

      // Extract starting date
      const startDateMatch = scheduleTimeStr.match(
        /starting (\d{4}-\d{2}-\d{2})/,
      );
      if (startDateMatch) {
        scheduleDate = startDateMatch[1];
      }
    } else if (
      scheduleTimeStr.includes("Each") &&
      scheduleTimeStr.includes("week(s)")
    ) {
      // Each 2 week(s), on Monday, starting 2025-11-09
      scheduleType = "weekly";

      const weekMatch = scheduleTimeStr.match(/Each (\d+) week\(s\)/);
      if (weekMatch) {
        repeatDays = parseInt(weekMatch[1]);
      }

      // Extract weekdays
      const weekdayMatch = scheduleTimeStr.match(/on ([^,]+), starting/);
      if (weekdayMatch) {
        const weekdayStr = weekdayMatch[1];
        // Handle multiple weekdays separated by commas or "and"
        const extractedWeekdays = weekdayStr
          .split(/,|\sand\s/)
          .map((day) => day.trim());
        weekdays = extractedWeekdays;
      }

      // Extract starting date
      const startDateMatch = scheduleTimeStr.match(
        /starting (\d{4}-\d{2}-\d{2})/,
      );
      if (startDateMatch) {
        scheduleDate = startDateMatch[1];
      }
    } else if (
      scheduleTimeStr.includes("On the") &&
      scheduleTimeStr.includes("of")
    ) {
      // On the 2 Tuesday, of February, starting 2025-11-05
      scheduleType = "monthly";
      monthlyOption = "on";

      // Extract week number
      const weekMatch = scheduleTimeStr.match(/On the (\d+|Last)/);
      if (weekMatch) {
        weeks = [weekMatch[1] === "Last" ? "Last" : parseInt(weekMatch[1])];
      }

      // Extract weekday
      const weekdayMatch = scheduleTimeStr.match(/On the (?:\d+|Last) (\w+),/);
      if (weekdayMatch) {
        weekDays = [weekdayMatch[1]];
      }

      // Extract months
      const monthMatch = scheduleTimeStr.match(/of ([^,]+), starting/);
      if (monthMatch) {
        const monthStr = monthMatch[1];
        // Handle multiple months separated by commas or "and"
        const extractedMonths = monthStr
          .split(/,|\sand\s/)
          .map((month) => month.trim());
        months = extractedMonths;
      }

      // Extract starting date
      const startDateMatch = scheduleTimeStr.match(
        /starting (\d{4}-\d{2}-\d{2})/,
      );
      if (startDateMatch) {
        scheduleDate = startDateMatch[1];
      }
    } else if (scheduleTimeStr.includes("day(s) of")) {
      // On the 1, 15 day(s) of January, March, starting 2025-11-05
      scheduleType = "monthly";
      monthlyOption = "days";

      // Extract days
      const dayMatch = scheduleTimeStr.match(/On the ([^)]+) day\(s\)/);
      if (dayMatch) {
        const dayStr = dayMatch[1];
        days = dayStr.split(/,|\sand\s/).map((day) => day.trim());
      }

      // Extract months
      const monthMatch = scheduleTimeStr.match(/of ([^,]+), starting/);
      if (monthMatch) {
        const monthStr = monthMatch[1];
        months = monthStr.split(/,|\sand\s/).map((month) => month.trim());
      }

      // Extract starting date
      const startDateMatch = scheduleTimeStr.match(
        /starting (\d{4}-\d{2}-\d{2})/,
      );
      if (startDateMatch) {
        scheduleDate = startDateMatch[1];
      }
    }

    setScheduleData({
      scheduleType,
      date: scheduleDate,
      time: scheduleTime,
      repeatDays,
      weekdays,
    });

    // Set monthly options
    setSelectedMonths(months);
    setSelectedDays(days);
    setSelectedWeeks(weeks);
    setSelectedWeekDays(weekDays);
    setSelectedOption(monthlyOption);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setScheduleData((prev) => ({ ...prev, [name]: value }));
  };

  const handleWeekdayChange = (day) => {
    setScheduleData((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter((d) => d !== day)
        : [...prev.weekdays, day],
    }));
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setScheduleData({
      scheduleType: "one-time",
      date: "",
      time: "",
      repeatDays: 1,
      weekdays: [],
    });
    setSelectedDays([]);
    setSelectedWeeks([]);
    setSelectedWeekDays([]);
    setSelectedOption("months");
    setSelectedMonths([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!scheduleData.time || !scheduleData.date) {
        toast.error("Please provide both time and date for scheduling.");
        return;
      }

      // Validate weekly schedule
      if (
        scheduleData.scheduleType === "weekly" &&
        scheduleData.weekdays.length === 0
      ) {
        toast.error("Please select at least one weekday for weekly schedule.");
        return;
      }

      // Validate monthly schedule
      if (scheduleData.scheduleType === "monthly") {
        if (selectedMonths.length === 0) {
          toast.error("Please select at least one month for monthly schedule.");
          return;
        }
        if (selectedOption === "days" && selectedDays.length === 0) {
          toast.error("Please select at least one day for monthly schedule.");
          return;
        }
        if (
          selectedOption === "on" &&
          (selectedWeeks.length === 0 || selectedWeekDays.length === 0)
        ) {
          toast.error("Please select week and weekday for monthly schedule.");
          return;
        }
      }

      const [hours, minutes] = scheduleData.time.split(":");
      const date = new Date(scheduleData.date);
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      date.setSeconds(0);
      date.setMilliseconds(0);

      const startOn = date.toISOString().slice(0, 19);

      // Parse email details if it's a JSON string
      let emailJson = null;
      if (schedule.emailDetails) {
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
        jobName: schedule.jobName || "",
        trigger: "",
        objectId: +selectedObject,
        viewId: schedule.viewId || null,
        tableName: schedule.tableName,
        scheduleType: schedule.schedulerType || "email",
        emailJson: emailJson,
        disable: schedule.disabled === "yes" ? "yes" : "no",
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
              ", ",
            )} day(s) of ${selectedMonths.join(", ")}, starting ${
              scheduleData.date
            }`;
          } else if (selectedOption === "on") {
            payload.weeks = selectedWeeks.length ? [selectedWeeks[0]] : [];
            payload.weekDay = selectedWeekDays || [];
            payload.daysOfMonth = [];
            trigger = `On the ${payload.weeks[0]} ${selectedWeekDays.join(
              ", ",
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

      const response = await patchRequest(
        `/schedule/${schedule.id}/update`,
        payload,
      );

      if (response?.status === 201 || response?.status === 200) {
        toast.success("Schedule updated successfully!");
        handleClose();
        if (onScheduleUpdated) {
          onScheduleUpdated();
        }
      }
    } catch (error) {
      toast.error("An error occurred while updating the schedule.");
      console.error("Error updating schedule:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !schedule) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed inset-0 bg-gray-500 bg-opacity-50 z-[60]"
      >
        <div className="relative bg-white shadow-lg p-6 border rounded xl:max-w-[50vw] max-w-[80vw] mx-auto mt-20 max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 z-10"
          >
            <AiOutlineClose size={20} />
          </button>

          {/* Modal Title */}
          <h2 className="text-lg font-semibold mb-4">Edit Schedule</h2>

          {/* Current Schedule Info */}
          <div className="mb-4 p-3 bg-gray-50 border rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Current Schedule:
            </h4>
            <p className="text-sm text-gray-600">{schedule.scheduleTime}</p>
            <p className="text-xs text-gray-500 mt-1">
              Next execution:{" "}
              {schedule.nextExecutionDate
                ? new Date(schedule.nextExecutionDate).toLocaleString()
                : "N/A"}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex space-x-4 item-start">
              {/* Schedule Type Selection */}
              <div className="w-[25%]">
                {scheduleTypes.map((type) => (
                  <label
                    key={type}
                    className="flex items-center space-x-2 cursor-pointer mb-2"
                  >
                    <input
                      type="radio"
                      name="scheduleType"
                      value={type}
                      checked={scheduleData.scheduleType === type}
                      onChange={handleChange}
                      className="form-radio text-blue-600 focus:ring focus:ring-blue-300"
                    />
                    <span className="capitalize text-sm">
                      {type.replace("-", " ")}
                    </span>
                  </label>
                ))}
              </div>

              {/* Schedule Configuration */}
              <div className="w-full">
                {/* Date & Time Fields */}
                <div className="flex items-center gap-x-4 justify-start border-b-2 pb-2 w-full">
                  <div>
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      Start Date:
                      <input
                        type="date"
                        name="date"
                        value={scheduleData.date}
                        onChange={handleChange}
                        className="ml-2 px-3 py-1 border rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      Time:
                      <input
                        type="time"
                        name="time"
                        value={scheduleData.time}
                        onChange={handleChange}
                        className="ml-2 px-3 py-1 border rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-4">
                  {/* Daily/Weekly Repeat Interval */}
                  {["daily", "weekly"].includes(scheduleData.scheduleType) && (
                    <label className="text-sm font-medium text-gray-700 flex items-center mb-4">
                      Repeat every
                      <input
                        type="number"
                        name="repeatDays"
                        value={scheduleData.repeatDays}
                        min="1"
                        onChange={handleChange}
                        className="ml-2 px-3 py-1 w-16 border rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                      days
                    </label>
                  )}

                  {/* Weekly Schedule - Select Weekdays */}
                  {scheduleData.scheduleType === "weekly" && (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium text-gray-700">
                        Select Days:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {weekDays.map((day, index) => (
                          <label
                            key={index}
                            className={`px-2 py-1 border rounded-md cursor-pointer ${
                              scheduleData.weekdays.includes(day)
                                ? "bg-blue-500 text-white"
                                : "bg-gray-100"
                            }`}
                            onClick={() => handleWeekdayChange(day)}
                          >
                            {day}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Monthly Schedule Options */}
                  {scheduleData.scheduleType === "monthly" && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Monthly Option:
                      </p>

                      {/* Months Multi-Select */}
                      <FormControl fullWidth>
                        <label>Months</label>
                        <Select
                          sx={{ height: "2rem" }}
                          multiple
                          value={selectedMonths}
                          onChange={(e) => setSelectedMonths(e.target.value)}
                          renderValue={(selected) => selected.join(", ")}
                        >
                          {months.map((month) => (
                            <MenuItem key={month} value={month}>
                              <Checkbox
                                checked={selectedMonths.includes(month)}
                              />
                              <ListItemText primary={month} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Days Selection */}
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="scheduleOption"
                          value="days"
                          checked={selectedOption === "days"}
                          onChange={() => setSelectedOption("days")}
                        />
                        <span>Days:</span>
                        <FormControl fullWidth>
                          <Select
                            sx={{ height: "2rem" }}
                            multiple
                            value={selectedDays}
                            onChange={(e) => setSelectedDays(e.target.value)}
                            renderValue={(selected) => selected.join(", ")}
                            disabled={selectedOption !== "days"}
                          >
                            {days.map((day) => (
                              <MenuItem key={day} value={day}>
                                <Checkbox
                                  checked={selectedDays.includes(day)}
                                />
                                <ListItemText primary={day} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </label>

                      {/* On Selection */}
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="scheduleOption"
                          value="on"
                          checked={selectedOption === "on"}
                          onChange={() => setSelectedOption("on")}
                        />
                        <span>On:</span>

                        {/* Week Selection */}
                        <FormControl fullWidth>
                          <Select
                            sx={{ height: "2rem" }}
                            multiple
                            value={selectedWeeks}
                            onChange={(e) => setSelectedWeeks(e.target.value)}
                            renderValue={(selected) => selected.join(", ")}
                            disabled={selectedOption !== "on"}
                          >
                            {weekOptions.map((week) => (
                              <MenuItem key={week} value={week}>
                                <Checkbox
                                  checked={selectedWeeks.includes(week)}
                                />
                                <ListItemText primary={week} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Weekday Selection */}
                        <FormControl fullWidth>
                          <Select
                            sx={{ height: "2rem" }}
                            multiple
                            value={selectedWeekDays}
                            onChange={(e) =>
                              setSelectedWeekDays(e.target.value)
                            }
                            renderValue={(selected) => selected.join(", ")}
                            disabled={selectedOption !== "on"}
                          >
                            {weekDays.map((day) => (
                              <MenuItem key={day} value={day}>
                                <Checkbox
                                  checked={selectedWeekDays.includes(day)}
                                />
                                <ListItemText primary={day} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={handleClose}
                variant="outlined"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  background: isLoading ? "lightgrey" : backgroundColor,
                }}
                className="font-semibold py-2 px-4 rounded text-white"
              >
                {isLoading ? "Updating..." : "Update Schedule"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
