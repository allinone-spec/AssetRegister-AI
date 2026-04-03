import { IoArrowBack } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const BackButton = ({ handleHideForm }) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (handleHideForm) handleHideForm();
    else navigate(-1);
  };

  return (
    <button
      onClick={handleGoBack}
      style={{
        display: "flex",
        alignItems: "center",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: "16px",
        color: "blue",
      }}
    >
      <IoArrowBack style={{ marginRight: "8px" }} />
      Back
    </button>
  );
};

export default BackButton;
