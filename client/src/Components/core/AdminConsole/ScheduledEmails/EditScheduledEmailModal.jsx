import { useState, useEffect } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { motion, AnimatePresence } from "framer-motion";
import { Button, TextField, CircularProgress } from "@mui/material";
import { useForm } from "react-hook-form";
import { useTheme } from "../../../../ThemeContext";

const EditScheduledEmailModal = ({ isOpen, onClose, onSubmit, emailData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { bgColor } = useTheme();
  const { backgroundColor } = bgColor;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm();

  useEffect(() => {
    if (emailData && isOpen) {
      try {
        // Parse emailDetails JSON string
        let emailDetails = {};
        if (emailData.emailDetails) {
          emailDetails =
            typeof emailData.emailDetails === "string"
              ? JSON.parse(emailData.emailDetails)
              : emailData.emailDetails;
        }

        // Extract values from emailDetails object
        const emailTo = Array.isArray(emailDetails.to)
          ? emailDetails.to.join(", ")
          : emailDetails.to || "";
        const subject = emailDetails.subject || "";
        const message = emailDetails.message || "";

        // Handle schedule time conversion for datetime-local input
        let scheduleDateTime = "";
        if (emailData.scheduleTime) {
          // Try to extract date and time from existing format
          const dateMatch = emailData.scheduleTime.match(/\d{4}-\d{2}-\d{2}/);
          const timeMatch = emailData.scheduleTime.match(/(\d{1,2}):(\d{2})/);

          if (dateMatch) {
            let timeString = "09:00"; // Default time

            if (timeMatch) {
              // Use existing time from schedule
              timeString = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
            } else {
              // If no time found, use current time
              const now = new Date();
              timeString = `${now.getHours().toString().padStart(2, "0")}:${now
                .getMinutes()
                .toString()
                .padStart(2, "0")}`;
            }

            scheduleDateTime = `${dateMatch[0]}T${timeString}`;
          } else {
            // Default to tomorrow at current time if no date found
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            scheduleDateTime = tomorrow.toISOString().slice(0, 16);
          }
        } else {
          // Default to tomorrow at current time
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          scheduleDateTime = tomorrow.toISOString().slice(0, 16);
        }

        setValue("emailTo", emailTo);
        setValue("subject", subject);
        setValue("message", message);
        setValue("scheduleTime", scheduleDateTime);
      } catch (error) {
        console.error("Error parsing emailDetails:", error);
        // Fallback to empty values if parsing fails
        setValue("emailTo", "");
        setValue("subject", "");
        setValue("message", "");
      }
    }
  }, [emailData, isOpen, setValue]);

  const handleFormSubmit = async (formData) => {
    setIsLoading(true);
    try {
      // Parse existing emailDetails to preserve other properties
      let existingEmailDetails = {};
      if (emailData.emailDetails) {
        try {
          existingEmailDetails =
            typeof emailData.emailDetails === "string"
              ? JSON.parse(emailData.emailDetails)
              : emailData.emailDetails;
        } catch (error) {
          console.error("Error parsing existing emailDetails:", error);
        }
      }

      // Convert comma-separated email string to array
      const emailToArray = formData.emailTo
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      // Format schedule time for API
      const scheduleDate = new Date(formData.scheduleTime);
      const formattedScheduleTime = `One-time, on ${scheduleDate.toLocaleDateString(
        "en-CA"
      )} at ${scheduleDate.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      })}`;

      const payload = {
        emailJson: {
          ...existingEmailDetails,
          to: emailToArray,
          subject: formData.subject,
          message: formData.message,
        },
        scheduleTime: formattedScheduleTime,
      };

      await onSubmit(payload);
      reset();
      onClose();
    } catch (error) {
      console.error("Error updating scheduled email:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Scheduled Email
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <AiOutlineClose size={24} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="p-6 space-y-6"
          >
            {/* Schedule Info (Read-only) */}
            {emailData?.scheduleTime && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">
                  Schedule Information
                </h3>
                <p className="text-gray-600 text-sm">
                  {emailData.scheduleTime}
                </p>
                {emailData?.nextExecutionDate && (
                  <p className="text-gray-600 text-sm mt-1">
                    Next execution:{" "}
                    {new Date(emailData.nextExecutionDate).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Schedule Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Date & Time <span className="text-red-500">*</span>
              </label>
              <TextField
                type="datetime-local"
                {...register("scheduleTime", {
                  required: "Schedule date and time is required",
                  validate: (value) => {
                    const selectedDate = new Date(value);
                    const now = new Date();
                    if (selectedDate <= now) {
                      return "Please select a future date and time";
                    }
                    return true;
                  },
                })}
                fullWidth
                variant="outlined"
                error={!!errors.scheduleTime}
                helperText={
                  errors.scheduleTime?.message ||
                  "Select the date and time when the email should be sent"
                }
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />
            </div>

            {/* Email To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Recipients <span className="text-red-500">*</span>
              </label>
              <TextField
                {...register("emailTo", {
                  // required: "Email recipients are required",
                  // validate: (value) => {
                  //   const emails = value
                  //     .split(",")
                  //     .map((email) => email.trim());
                  //   const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  //   const invalidEmails = emails.filter(
                  //     (email) => email && !emailPattern.test(email)
                  //   );
                  //   if (invalidEmails.length > 0) {
                  //     return `Invalid email format: ${invalidEmails.join(
                  //       ", "
                  //     )}`;
                  //   }
                  //   return true;
                  // },
                })}
                type="email"
                fullWidth
                // multiline
                // rows={3}
                variant="outlined"
                placeholder="Enter email addresses separated by commas (e.g., user1@example.com, user2@example.com)"
                error={!!errors.emailTo}
                helperText={errors.emailTo?.message}
                className="w-full"
                required
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <TextField
                {...register("subject", {
                  // required: "Subject is required",
                  // minLength: {
                  //   value: 3,
                  //   message: "Subject must be at least 3 characters",
                  // },
                })}
                fullWidth
                variant="outlined"
                placeholder="Enter email subject"
                error={!!errors.subject}
                helperText={errors.subject?.message}
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <TextField
                {...register("message", {
                  // required: "Message is required",
                  // minLength: {
                  //   value: 10,
                  //   message: "Message must be at least 10 characters",
                  // },
                })}
                fullWidth
                multiline
                rows={6}
                variant="outlined"
                placeholder="Enter email message content"
                error={!!errors.message}
                helperText={errors.message?.message}
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outlined"
                onClick={handleClose}
                disabled={isLoading}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                className="px-6"
                style={{
                  backgroundColor: backgroundColor,
                }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <CircularProgress size={16} color="inherit" />
                    Updating...
                  </div>
                ) : (
                  "Update"
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditScheduledEmailModal;
