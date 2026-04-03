import { useState, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  Checkbox,
  FormControl,
  ListItemText,
  MenuItem,
  Select,
} from "@mui/material";
import toast from "react-hot-toast";
import { postDataRequest } from "../../Service/admin.save";
import { useSelector } from "react-redux";
import { ScheduleManagement } from "./ScheduleManagement";
import {
  scheduleConstants,
  buildSchedulePayload,
  validateScheduleData,
} from "../../Utils/scheduleUtils";

export const EmailModal = ({
  isEmailModalOpen,
  CloseEmailModal,
  routeName,
  jobName,
  tableName,
  viewId,
  isJob = true,
  scheduleType,
  showScheduleManagement = false,
  editData = null,
  onUpdate = null,
  isDrawer,
}) => {
  const [scheduleData, setScheduleData] = useState({
    scheduleType: "one-time",
    date: "",
    time: "",
    repeatDays: 1,
    weekdays: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedWeekDays, setSelectedWeekDays] = useState([]);
  const [selectedOption, setSelectedOption] = useState("months");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const { permissionDetails, permissionList } = useSelector(
    (state) => state.permission,
  );
  const [emailValidation, setEmailValidation] = useState({
    isValid: true,
    invalidEmails: [],
  });

  // const { bgColor } = useTheme();
  const selectedObject = useSelector((state) => state.selectedObject.value);
  // const { backgroundColor } = bgColor;

  // Use constants from utility file
  const { months, days, weekOptions, weekDays } = scheduleConstants;

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

  // Email validation function
  const validateEmails = (emailString) => {
    if (!emailString.trim()) {
      return { isValid: true, invalidEmails: [] };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = emailString
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    const invalidEmails = emails.filter((email) => !emailRegex.test(email));

    return {
      isValid: invalidEmails.length === 0,
      invalidEmails: invalidEmails,
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Validate emails if the field is 'to'
    if (name === "to") {
      const validation = validateEmails(value);
      setEmailValidation(validation);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setScheduleData({
      scheduleType: "one-time",
      date: "",
      time: "",
      repeatDays: 1,
      weekdays: [],
    });
    setFormData({
      to: "",
      subject: "",
      body: "",
    });
    setEmailValidation({
      isValid: true,
      invalidEmails: [],
    });
    setSelectedDays([]);
    setSelectedWeeks([]);
    setSelectedWeekDays([]);
    setSelectedOption("months");
    setSelectedMonths([]);
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isEmailModalOpen) {
      resetForm();
    }
  }, [isEmailModalOpen]);

  // Pre-fill form when editData is provided (edit mode)
  useEffect(() => {
    if (isEmailModalOpen && editData) {
      try {
        // Parse email details from emailDetails
        let emailDetails = {};
        if (editData.emailDetails) {
          emailDetails =
            typeof editData.emailDetails === "string"
              ? JSON.parse(editData.emailDetails)
              : editData.emailDetails;
        }

        // Set email form data
        setFormData({
          to: Array.isArray(emailDetails.to)
            ? emailDetails.to.join(", ")
            : emailDetails.to || "",
          subject: emailDetails.subject || "",
          body: emailDetails.message || "",
        });

        // Parse schedule time (e.g., "One time, on 2025-11-25 at 07:19")
        if (editData.scheduleTime) {
          const scheduleTimeStr = editData.scheduleTime;
          let parsedType = "one-time";
          let repeatDays = 1;
          let weekdays = [];
          let months = [];
          let days = [];
          let weeks = [];
          let weekDaysArr = [];
          let monthlyOption = "months";
          let extractedDate = "";
          let extractedTime = "";

          // Extract date (format: YYYY-MM-DD)
          const dateMatch = scheduleTimeStr.match(/(\d{4}-\d{2}-\d{2})/);
          extractedDate = dateMatch ? dateMatch[1] : "";

          // Extract time (format: HH:MM)
          const timeMatch = scheduleTimeStr.match(/(\d{1,2}):(\d{2})/);
          extractedTime = timeMatch
            ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`
            : "";

          // Parse schedule type and details
          if (scheduleTimeStr.includes("One time")) {
            parsedType = "one-time";
            const dateTimeMatch = scheduleTimeStr.match(
              /on (\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2})/,
            );
            if (dateTimeMatch) {
              extractedDate = dateTimeMatch[1];
              extractedTime = dateTimeMatch[2];
            }
          } else if (
            scheduleTimeStr.includes("Each") &&
            scheduleTimeStr.includes("day(s)")
          ) {
            parsedType = "daily";
            const dayMatch = scheduleTimeStr.match(/Each (\d+) day\(s\)/);
            if (dayMatch) {
              repeatDays = parseInt(dayMatch[1]);
            }
          } else if (
            scheduleTimeStr.includes("Each") &&
            scheduleTimeStr.includes("week(s)")
          ) {
            parsedType = "weekly";
            const weekMatch = scheduleTimeStr.match(/Each (\d+) week\(s\)/);
            if (weekMatch) {
              repeatDays = parseInt(weekMatch[1]);
            }
            const weekdayMatch = scheduleTimeStr.match(/on ([^,]+), starting/);
            if (weekdayMatch) {
              const weekdayStr = weekdayMatch[1];
              const extractedWeekdays = weekdayStr
                .split(/,|\sand\s/)
                .map((day) => day.trim());
              weekdays = extractedWeekdays;
            }
          } else if (
            scheduleTimeStr.includes("On the") &&
            scheduleTimeStr.includes("of")
          ) {
            parsedType = "monthly";
            monthlyOption = "on";

            // Extract week number
            const weekMatch = scheduleTimeStr.match(/On the (\d+|Last)/);
            if (weekMatch) {
              weeks = [
                weekMatch[1] === "Last" ? "Last" : weekMatch[1].toString(),
              ];
            }

            // Extract weekday
            const weekdayMatch = scheduleTimeStr.match(
              /On the (?:\d+|Last) (\w+),/,
            );
            if (weekdayMatch) {
              weekDaysArr = [weekdayMatch[1]];
            }

            // Extract months - improved regex
            const monthMatch = scheduleTimeStr.match(/of\s+(.+?),\s+starting/);
            if (monthMatch) {
              const monthStr = monthMatch[1].trim();
              const extractedMonths = monthStr
                .split(/,\s*|\s+and\s+/)
                .map((month) => month.trim());
              months = extractedMonths;
            }
          } else if (scheduleTimeStr.includes("day(s) of")) {
            parsedType = "monthly";
            monthlyOption = "days";

            // Extract days
            const dayMatch = scheduleTimeStr.match(/On the ([^)]+) day\(s\)/);
            if (dayMatch) {
              const dayStr = dayMatch[1];
              days = dayStr.split(/,|\sand\s/).map((day) => day.trim());
            }

            // Extract months
            const monthMatch = scheduleTimeStr.match(/of\s+(.+?),\s+starting/);
            if (monthMatch) {
              const monthStr = monthMatch[1].trim();
              months = monthStr
                .split(/,\s*|\s+and\s+/)
                .map((month) => month.trim());
            }
          }

          setScheduleData({
            scheduleType: parsedType,
            date: extractedDate,
            time: extractedTime,
            repeatDays: repeatDays,
            weekdays: weekdays,
          });

          // Set monthly options
          setSelectedMonths(months);
          setSelectedDays(days);
          setSelectedWeeks(weeks);
          setSelectedWeekDays(weekDaysArr);
          setSelectedOption(monthlyOption);
        }
      } catch (error) {
        console.error("Error parsing editData:", error);
      }
    }
  }, [isEmailModalOpen, editData]);

  const saveScheduleEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const isEditMode = editData && onUpdate;

    try {
      // Validate emails before submission
      if (isJob && !emailValidation.isValid) {
        toast.error(
          `Invalid email addresses: ${emailValidation.invalidEmails.join(", ")}`,
        );
        return;
      }

      // Validate schedule data
      const validation = validateScheduleData(scheduleData);
      if (!validation.isValid) {
        toast.error(validation.errors[0]);
        return;
      }

      // Build payload using utility function
      const payload = buildSchedulePayload(scheduleData, null, {
        selectedDays,
        selectedWeeks,
        selectedWeekDays,
        selectedOption,
        selectedMonths,
        selectedObject,
        jobName,
        viewId,
        tableName,
        scheduleType,
      });

      // Add email-specific data if this is a job
      if (isJob) {
        payload.emailJson = {
          provider: "mail",
          to: formData.to
            .split(",")
            .map((email) => email.trim())
            .filter((email) => email.length > 0),
          subject: formData.subject,
          message: formData.body,
          emailType: viewId
            ? "view"
            : tableName === "Register"
              ? "AssetRegister"
              : "table",
        };
      }

      console.log("Final payload:", payload);

      // Handle edit mode
      if (isEditMode) {
        await onUpdate(payload);
        resetForm();
        return;
      }

      // Handle create mode
      const response = await postDataRequest("/schedule/newTask", payload);

      if (response?.status === 201 || response?.status === 200) {
        if (!showScheduleManagement) {
          CloseEmailModal();
        }
        toast.success("Task scheduled successfully!");
        resetForm();
      } else {
        // toast.error(`Failed to schedule task. Status: ${response?.status}`);
        console.error("Schedule task failed:", response);
      }
    } catch (error) {
      toast.error(
        error.message || "An error occurred while scheduling the task.",
      );
      console.error("Error scheduling task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isEmailModalOpen && (
        // <motion.div
        //   initial={{ opacity: 0, scale: 0.95, y: -10 }}
        //   animate={{ opacity: 1, scale: 1, y: 0 }}
        //   exit={{ opacity: 0, scale: 0.95, y: -10 }}
        //   transition={{ duration: 0.3, ease: "easeInOut" }}
        //   className={`${isDrawer ? "" : "fixed inset-0"} bg-opacity-50 z-50`}
        // >
        <div
          className={`${isDrawer ? "" : "border shadow-lg p-5"} relative bg-surface rounded xl:max-w-[50vw] max-w-[80vw] mx-auto mt-11 max-h-[90vh] overflow-y-auto`}
        >
          {/* Close Button */}
          {!isDrawer && (
            <button
              onClick={CloseEmailModal}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 z-10"
            >
              <AiOutlineClose size={20} />
            </button>
          )}
          {/* Modal Title */}
          {!isDrawer && (
            <h2 className="text-lg font-semibold mb-4">
              {showScheduleManagement
                ? `Merge Schedule Management`
                : editData
                  ? "Edit Scheduled Email"
                  : isJob
                    ? "Send Email"
                    : "Send Merge"}
            </h2>
          )}

          {/* Schedule Creation Form */}
          <form onSubmit={saveScheduleEmail}>
            <div className="flex space-x-4 item-start">
              {/* Schedule Type Selection */}
              <div className="w-[25%]">
                {["one-time", "daily", "weekly", "monthly"].map((type) => (
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
                    <label className="text-sm font-medium text-text-primary flex items-center">
                      Start Date:
                      <input
                        type="date"
                        name="date"
                        value={scheduleData.date}
                        onChange={handleChange}
                        className="ml-2 px-3 py-1 border text-text-sub rounded-md focus:ring-2 focus:ring-blue-500 bg-input-bg "
                        required
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-primary flex items-center">
                      Time:
                      <input
                        type="time"
                        name="time"
                        value={scheduleData.time}
                        onChange={handleChange}
                        className="ml-2 px-3 py-1 border text-text-sub  rounded-md focus:ring-2 focus:ring-blue-500 bg-input-bg"
                        required
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-4">
                  {/* Daily/Weekly Repeat Interval */}
                  {["daily", "weekly"].includes(scheduleData.scheduleType) && (
                    <label className="text-sm font-medium text-text-primary flex items-center mb-4">
                      Repeat every
                      <input
                        type="number"
                        name="repeatDays"
                        value={scheduleData.repeatDays}
                        min="1"
                        onChange={handleChange}
                        className="ml-2 px-3 py-1 w-16 border rounded-md focus:ring-2 focus:ring-blue-500 bg-input-bg"
                      />
                      days
                    </label>
                  )}

                  {/* Weekly Schedule - Select Weekdays */}
                  {scheduleData.scheduleType === "weekly" && (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium text-text-primary">
                        Select Days:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Sunday",
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                        ].map((day, index) => (
                          <label
                            key={index}
                            className={`px-2 py-1 border rounded-md cursor-pointer ${
                              scheduleData.weekdays.includes(day)
                                ? "bg-blue-500 text-text-primary"
                                : "text-text-primary"
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
                      <p className="text-sm font-medium text-text-primary">
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
                          className="bg-input-bg border border-gray-300 rounded"
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
                          className="bg-input-bg border border-gray-300 rounded"
                          checked={selectedOption === "days"}
                          onChange={() => setSelectedOption("days")}
                        />
                        <span>Days:</span>
                        <FormControl fullWidth>
                          <Select
                            sx={{ height: "2rem" }}
                            multiple
                            className="bg-input-bg border border-gray-300 rounded"
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
                          className="bg-input-bg border border-gray-300 rounded"
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
                            className="bg-input-bg border border-gray-300 rounded"
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
                            className="bg-input-bg border border-gray-300 rounded"
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
            {/* Email Fields (only for job emails) */}
            {isJob && (
              <>
                <div className="my-4">
                  <label className="block text-sm font-medium text-text-primary">
                    To:
                  </label>
                  <input
                    type="text"
                    name="to"
                    value={formData.to}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 bg-input-bg ${
                      !emailValidation.isValid
                        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="recipient@example.com, another@example.com"
                    required
                  />
                  {!emailValidation.isValid && (
                    <p className="text-xs text-red-500 mt-1">
                      Invalid email addresses:{" "}
                      {emailValidation.invalidEmails.join(", ")}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-primary">
                    Subject:
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 bg-input-bg"
                    placeholder="Subject of the email"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-primary">
                    Body:
                  </label>
                  <textarea
                    name="body"
                    value={formData.body}
                    onChange={handleInputChange}
                    rows="4"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 bg-input-bg"
                    placeholder="Write your email here..."
                    required
                  />
                </div>
              </>
            )}
            {/* Action Button */}
            {permissionList?.includes(routeName) &&
              permissionDetails[routeName]?.hasWriteOnly && (
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    // style={{
                    //   background: isLoading ? "lightgrey" : backgroundColor,
                    // }}
                    className="font-semibold py-2 px-4 rounded text-white bg-accent"
                  >
                    {editData
                      ? isLoading
                        ? "Updating..."
                        : "Update"
                      : showScheduleManagement
                        ? isLoading
                          ? "Creating..."
                          : "Create Schedule"
                        : isJob
                          ? isLoading
                            ? "Sending..."
                            : "Send"
                          : isLoading
                            ? "Merging..."
                            : "Merge"}
                  </button>
                </div>
              )}
          </form>

          {/* Schedule Management Section */}
          <ScheduleManagement
            routeName={routeName}
            isVisible={showScheduleManagement}
          />
        </div>
        // </motion.div>
      )}
    </AnimatePresence>
  );
};
