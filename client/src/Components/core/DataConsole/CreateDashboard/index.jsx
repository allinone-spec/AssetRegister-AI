import { useEffect, useState } from "react";
import PageLayout from "../../../Common/PageLayout";
import AddFolder from "./AddFolder";
import { useTheme } from "../../../../ThemeContext";
import SelectChart from "./SelectChart";
import Propertysection from "./Propertysection";
import { useDispatch } from "react-redux";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { setDashboardData } from "../../../../redux/Slices/DashboardSlice";

const NewDashboard = ({ routeName }) => {
  const {
    colorPalette,
    selectedColor,
    textBlackColor,
    bgColor,
    textWhiteColor,
    isCustom,
  } = useTheme();
  const { textColor } = bgColor;
  const [step, setStep] = useState(0);
  const dispatch = useDispatch();
  const [objectId, setObjectId] = useState(null);
  const [objectValue, setObjectValue] = useState(null);

  //const dashboardData = useSelector((state) => state.dashboard.dashboardData);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    dispatch(setDashboardData({ field: name, value }));
  };

  const [isPreview, setIsPreview] = useState(false);

  const [title, setTitle] = useState("");
  const handleNext = (number) => {
    setStep(number);
    number == 4 && setTitle("Pie Chart");
  };

  /* const handleHeadingtitle = (name) => {
    setTitle(name)
  }*/
  useEffect(() => {
    let newTitle = step < 4 ? "Create New Dashboard" : title;
    dispatch(setHeadingTitle(newTitle));
  }, [title, step]);

  const backgroundColor = isCustom || colorPalette[selectedColor]["100"];
  const actionColor = isCustom || colorPalette[selectedColor]["400"];
  const borderColor = isCustom || colorPalette[selectedColor]["500"];
  const lightbackground = isCustom || colorPalette[selectedColor]["200"];

  return (
    <PageLayout>
      {step < 4 && (
        <main
          className={` ${
            !isPreview ? "max-w-[650px] sm:mx-auto mx-3" : "mx-auto"
          } h-[90%] py-5 px-5 rounded-lg my-5`}
          style={{
            backgroundColor: !isPreview && backgroundColor,
            textColor,
            actionColor,
          }}
        >
          {
            {
              0: (
                <AddFolder
                  gotoNext={handleNext}
                  onChange={handleInputChange}
                  textColor={textColor}
                  setObjectId={setObjectId}
                  setObjectValue={setObjectValue}
                />
              ),
              // 1: (
              //   <SelectChart
              //     textBlackColor={textBlackColor}
              //     textWhiteColor={textWhiteColor}
              //     borderColor={borderColor}
              //     lightbackground={lightbackground}
              //     gotoNext={handleNext}
              //   />
              // ),
              1: (
                <Propertysection
                  // textBlackColor={textBlackColor}
                  // textWhiteColor={textWhiteColor}
                  // borderColor={borderColor}
                  textColor={textColor}
                  lightbackground={lightbackground}
                  gotoNext={handleNext}
                  setIsPreview={setIsPreview}
                  isPreview={isPreview}
                  objectId={objectId}
                  objectValue={objectValue}
                  routeName={routeName}
                />
              ),
            }[step]
          }
        </main>
      )}
    </PageLayout>
  );
};

export default NewDashboard;
