import { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-sql";
import "prismjs/themes/prism.css";

const TextEditor = ({ setPostScript, postScript }) => {
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState([]);
  const [isValidFormat, setIsValidFormat] = useState(true);

  // SQL Keywords for validation
  const SQL_KEYWORDS = [
    "SELECT",
    "FROM",
    "WHERE",
    "INSERT",
    "UPDATE",
    "DELETE",
    "CREATE",
    "DROP",
    "ALTER",
    "TABLE",
    "INDEX",
    "VIEW",
    "GRANT",
    "REVOKE",
    "COMMIT",
    "ROLLBACK",
    "JOIN",
    "INNER",
    "LEFT",
    "RIGHT",
    "FULL",
    "OUTER",
    "ON",
    "GROUP",
    "ORDER",
    "BY",
    "HAVING",
    "DISTINCT",
    "COUNT",
    "SUM",
    "AVG",
    "MIN",
    "MAX",
    "AS",
    "AND",
    "OR",
    "NOT",
    "IN",
    "EXISTS",
    "BETWEEN",
    "LIKE",
    "IS",
    "NULL",
  ];

  useEffect(() => {
    if (postScript) setCode(postScript);
  }, [postScript]);

  // Function to remove comments from SQL code
  const removeComments = (sqlCode) => {
    let result = sqlCode;

    // Remove single-line comments starting with --
    result = result.replace(/--.*$/gm, "");

    // Remove single-line comments starting with //
    result = result.replace(/\/\/.*$/gm, "");

    // Remove multi-line comments /* */
    result = result.replace(/\/\*[\s\S]*?\*\//g, "");

    return result;
  };

  // Function to check if quotes are within comments
  const isWithinComment = (code, position) => {
    const beforePosition = code.substring(0, position);

    // Check for single-line comments (-- or //)
    const lines = beforePosition.split("\n");
    const currentLine = lines[lines.length - 1];

    const dashCommentIndex = currentLine.indexOf("--");
    const slashCommentIndex = currentLine.indexOf("//");

    if (
      dashCommentIndex !== -1 &&
      position >= beforePosition.lastIndexOf("\n") + dashCommentIndex + 1
    ) {
      return true;
    }

    if (
      slashCommentIndex !== -1 &&
      position >= beforePosition.lastIndexOf("\n") + slashCommentIndex + 1
    ) {
      return true;
    }

    // Check for multi-line comments
    const multiLineCommentRegex = /\/\*[\s\S]*?\*\//g;
    let match;
    while ((match = multiLineCommentRegex.exec(code)) !== null) {
      if (
        position >= match.index &&
        position <= match.index + match[0].length
      ) {
        return true;
      }
    }

    return false;
  };

  // Enhanced quote counting that ignores quotes within comments
  const countQuotesIgnoringComments = (code, quoteType) => {
    let count = 0;
    const quote = quoteType === "single" ? "'" : '"';

    for (let i = 0; i < code.length; i++) {
      if (code[i] === quote && !isWithinComment(code, i)) {
        count++;
      }
    }

    return count;
  };

  const validateSQL = (sqlCode) => {
    const newErrors = [];

    if (!sqlCode.trim()) {
      setErrors([]);
      setIsValidFormat(true);
      return;
    }

    // Remove comments for validation
    const codeWithoutComments = removeComments(sqlCode);
    const trimmedCode = codeWithoutComments.trim().toUpperCase();

    // Skip validation if only comments
    if (!trimmedCode) {
      setErrors([]);
      setIsValidFormat(true);
      return;
    }

    // Check if SQL starts with valid keyword
    const startsWithKeyword = SQL_KEYWORDS.some((keyword) =>
      trimmedCode.startsWith(keyword)
    );

    if (!startsWithKeyword) {
      newErrors.push(
        "SQL must start with a valid keyword (SELECT, INSERT, UPDATE, DELETE, etc.)"
      );
    }

    // Check for unmatched single quotes (ignoring those in comments)
    const singleQuotes = countQuotesIgnoringComments(sqlCode, "single");
    if (singleQuotes % 2 !== 0) {
      newErrors.push("Unmatched single quotes detected");
    }

    // Check for unmatched double quotes (ignoring those in comments)
    const doubleQuotes = countQuotesIgnoringComments(sqlCode, "double");
    if (doubleQuotes % 2 !== 0) {
      newErrors.push("Unmatched double quotes detected");
    }

    // Check for unmatched parentheses (ignoring those in comments)
    const openParens = (codeWithoutComments.match(/\(/g) || []).length;
    const closeParens = (codeWithoutComments.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      newErrors.push("Unmatched parentheses detected");
    }

    // Check for unmatched square brackets (ignoring those in comments)
    const openBrackets = (codeWithoutComments.match(/\[/g) || []).length;
    const closeBrackets = (codeWithoutComments.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      newErrors.push("Unmatched square brackets detected");
    }

    // Check for basic SQL structure patterns
    if (trimmedCode.startsWith("SELECT") && !trimmedCode.includes("FROM")) {
      newErrors.push("SELECT statement should include FROM clause");
    }

    // Check for proper SQL statement ending (ignoring comments)
    if (
      codeWithoutComments.trim().length > 10 &&
      !codeWithoutComments.trim().endsWith(";")
    ) {
      newErrors.push("SQL statement should end with semicolon (;)");
    }

    // Check for invalid characters that might indicate formatting issues
    // Updated regex to allow comment characters
    const invalidChars = codeWithoutComments.match(
      /[^\w\s\(\)\[\].,;'"=<>!@#$%^&*+\-\/\\|`~:?]/g
    );
    if (invalidChars && invalidChars.length > 0) {
      newErrors.push("Invalid characters detected in SQL");
    }

    setErrors(newErrors);
    setIsValidFormat(newErrors.length === 0);
  };

  const handleCodeChange = (newCode) => {
    if (setPostScript) setPostScript(newCode);
    setCode(newCode);
    validateSQL(newCode);
  };

  const getErrorSeverity = (error) => {
    // Determine if error is critical or just a warning
    const warnings = ["SQL statement should end with semicolon"];

    return warnings.some((warning) => error.includes(warning))
      ? "warning"
      : "error";
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Status indicator */}
      {code.trim() && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "15px",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(255, 255, 255, 0.9)",
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isValidFormat ? "#28a745" : "#dc3545",
            }}
          ></div>
          <span style={{ color: isValidFormat ? "#28a745" : "#dc3545" }}>
            {isValidFormat ? "Valid" : "Invalid"}
          </span>
        </div>
      )}

      <Editor
        value={code}
        onValueChange={handleCodeChange}
        highlight={(code) => highlight(code, languages.sql)}
        padding={15}
        style={{
          minHeight: "300px",
          border:
            !isValidFormat && code.trim()
              ? "2px solid #dc3545"
              : "1px solid #ccc",
          borderRadius: "5px",
          fontFamily: "monospace",
          backgroundColor:
            !isValidFormat && code.trim() ? "#fff5f5" : "#ffffff",
        }}
        placeholder="Enter SQL query..."
      />

      {/* Error display */}
      {errors.length > 0 && (
        <div
          style={{
            marginTop: "8px",
            padding: "10px",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeaa7",
            borderRadius: "5px",
            maxHeight: "120px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              color: "#856404",
              marginBottom: "5px",
            }}
          >
            ⚠️ SQL Format Issues:
          </div>
          {errors.map((error, index) => (
            <div
              key={index}
              style={{
                fontSize: "13px",
                color:
                  getErrorSeverity(error) === "error" ? "#dc3545" : "#ffc107",
                marginBottom: "3px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>{getErrorSeverity(error) === "error" ? "❌" : "⚠️"}</span>
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer info */}
      {code.trim() && (
        <div
          style={{
            marginTop: "5px",
            fontSize: "11px",
            color: "#6c757d",
            display: "flex",
            justifyContent: "space-between",
            paddingTop: "5px",
            borderTop: "1px solid #eee",
          }}
        >
          <span>
            Characters: {code.length} | Lines: {code.split("\n").length}
          </span>
          <span>
            Status:{" "}
            {isValidFormat ? "✅ Well-formatted" : "❌ Format issues detected"}
          </span>
        </div>
      )}
    </div>
  );
};

export default TextEditor;
