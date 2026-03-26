import React, { useState } from "react";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { motion } from "framer-motion";
import { useTheme } from "../../ThemeContext";
import {
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
} from "@mui/material";
import { postDataRequest } from "../../Service/Console.service";
import toast from "react-hot-toast";

export const ScheduleJobModal = ({ isOpen, onClose, handleScheduleJob }) => {
  const [scheduleData, setScheduleData] = useState({
    scheduleType: "one-time",
    date: "",
    time: "",
    repeatDays: 1,
    weekdays: [],
    monthlyOption: "",
    monthDate: "",
    OnMonth: "",
    jobName: isOpen,
  });

  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedWeekDays, setSelectedWeekDays] = useState([]);
  const [selectedOption, setSelectedOption] = useState("months");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const { colorPalette, selectedColor } = useTheme();
  const withoutHoverBackground = colorPalette[selectedColor]["500"];
  const hoverBackground = colorPalette[selectedColor]["400"];

  const months = [
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
  ];

  const days = [...Array(31)].map((_, i) => (i + 1).toString());

  const weekOptions = [1, 2, 3, 4, "Last"];
  const weekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

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
  // {
  // "hour":"06",
  // "minutes":"15",
  // "day":"",
  // "daysOfMonth":[],
  // "month":[],
  // "weekDay":[],
  // "weeks":[],
  // "numOfWeek":-1,  // if schedule one-time
  // "startOn":"2024-12-26T03:40:00",
  // "jobName":"jobServiceNowBasic"
  // }

  const saveScheduleJob = async () => {
    console.log("data", scheduleData, isOpen);

    try {
      if (!scheduleData.time || !scheduleData.date) {
        toast.error("Please provide both time and date for scheduling.");
        return;
      }

      const [hours, minutes] = scheduleData.time.split(":");
      const date = new Date(scheduleData.date);

      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      date.setSeconds(0);
      date.setMilliseconds(0);

      const startOn = date.toISOString().slice(0, 19); // Format to "YYYY-MM-DDTHH:MM:SS"

      const payload = {
        hour: hours || "00",
        minutes: minutes || "00",
        day: 0,
        daysOfMonth: [],
        month: [],
        weekDay: [],
        weeks: [],
        numOfWeek: -1,
        startOn: startOn,
        jobName: isOpen,
        trigger: "", // Initialize trigger here
      };

      let trigger = ""; // Variable to store trigger description

      switch (scheduleData.scheduleType) {
        case "daily":
          payload.day = scheduleData.repeatDays
            ? Number(scheduleData.repeatDays)
            : 0;
          trigger = `Each ${scheduleData.repeatDays} day(s), starting ${scheduleData.date}`;
          break;

        case "weekly":
          payload.weekDay = scheduleData.weekdays || [];
          payload.day = 0; // REMOVE setting repeatDays here
          trigger = `Each ${scheduleData.repeatDays} week(s), on ${scheduleData.weekdays.join(", ")}, starting ${scheduleData.date}`;
          break;

        case "monthly":
          payload.month = (selectedMonths || []).map(String);

          if (selectedOption === "days") {
            payload.daysOfMonth = (selectedDays || []).map(Number);
            payload.weekDay = []; // Ensure weekDay is empty
            payload.weeks = []; // Ensure weeks are empty
            trigger = `On the ${selectedDays.join(", ")} day(s) of ${selectedMonths.join(", ")}, starting ${scheduleData.date}`;
          } else if (selectedOption === "on") {
            payload.weeks = selectedWeeks.length ? [selectedWeeks[0]] : []; // ✅ Only take the first value
            payload.weekDay = selectedWeekDays || [];
            payload.daysOfMonth = []; // Ensure daysOfMonth is empty
            trigger = `On the ${payload.weeks[0]} ${selectedWeekDays.join(", ")}, of ${selectedMonths.join(", ")}, starting ${scheduleData.date}`;
          }
          break;

        case "one-time":
          payload.numOfWeek = -1;
          trigger = `One time, on ${scheduleData.date} at ${scheduleData.time}`;
          break;

        default:
          break;
      }

      payload.trigger = trigger; // Assign trigger to payload after switch statement
      payload.scheduleType = "job";

      console.log("Final payload:", payload);

      try {
        const response = await postDataRequest("/schedule/newTask", payload);

        if (response?.status === 201) {
          toast.success("Task scheduled successfully!");
          handleScheduleJob(payload.trigger); // Pass trigger description
          setScheduleData({
            scheduleType: "one-time",
            date: "",
            time: "",
            repeatDays: 1,
            weekdays: [],
            monthlyOption: "",
            monthDate: "",
            OnMonth: "",
          });
          onClose();
        } else {
          //   toast.error(`Failed to schedule task. Status: ${response.status}`);
          console.error("Schedule task failed:", response);
        }
      } catch (error) {
        toast.error("An error occurred while scheduling the task.");
        console.error("Error scheduling task:", error);
      }
    } catch (error) {
      toast.error("An error occurred while preparing data.");
      console.error("Data preparation error:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-lg shadow-lg w-[60vw] h-[60vh] p-4 relative"
      >
        {/* Close Button */}
        <AiOutlineCloseCircle
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 cursor-pointer text-2xl"
          onClick={onClose}
        />

        {/* Modal Title */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          New Trigger
        </h2>
        {/* Schedule Type Selection */}
        <div className="flex space-x-4 item-start ">
          <div className="w-[25%] ">
            {["one-time", "daily", "weekly", "monthly"].map((type) => (
              <label
                key={type}
                className="flex items-center space-x-2  cursor-pointer"
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

          {/* Date & Time Fields */}
          <div className="w-full ">
            <main className="flex  items-center  gap-x-4 justify-start border-b-[2px] border-b pb-2 w-full">
              <div>
                <label
                  htmlFor="date"
                  className="text-sm font-medium text-gray-700 flex items-center"
                >
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
                <label
                  htmlFor="time"
                  className="text-sm font-medium text-gray-700 flex items-center"
                >
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
            </main>

            <section className="h-[33vh] py-4">
              {/* Daily Schedule - Repeat Interval */}
              {["daily", "weekly"].includes(scheduleData.scheduleType) && (
                <label className="text-sm font-medium text-gray-700 flex items-center ">
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
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Select Days:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Sunday",
                      "Monday",
                      "Tueday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ].map((day, index) => (
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

              {/* Monthly Schedule - Options */}
              {scheduleData.scheduleType === "monthly" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {" "}
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
                          <Checkbox checked={selectedMonths.includes(month)} />
                          <ListItemText primary={month} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Days Selection */}
                  <label className="flex items-center space-x-2">
                    <input
                      className="h-[2rem]"
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
                            <Checkbox checked={selectedDays.includes(day)} />
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
                            <Checkbox checked={selectedWeeks.includes(week)} />
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
                        onChange={(e) => setSelectedWeekDays(e.target.value)}
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
            </section>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={saveScheduleJob}
            className="text-white px-4 py-2 rounded-md cursor-pointer transition"
            style={{ backgroundColor: withoutHoverBackground }}
            onMouseEnter={(e) =>
              (e.target.style.backgroundColor = withoutHoverBackground)
            }
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = hoverBackground)
            }
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
};
