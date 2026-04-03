import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import AddFolder from "./AddFolder";
import Propertysection from "./Propertysection";
import PageLayout from "../../../Common/PageLayout";
import { setHeadingTitle } from "../../../../redux/Slices/HeadingTitle";
import { setDashboardData } from "../../../../redux/Slices/DashboardSlice";

const NewDashboard = ({
  routeName,
  selectedFolder,
  folderData,
  onSave,
  sourceType,
}) => {
  const [step, setStep] = useState(0);
  const dispatch = useDispatch();
  const [objectId, setObjectId] = useState(folderData?.objectId || null);
  const [objectValue, setObjectValue] = useState(null);

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

  useEffect(() => {
    let newTitle = step < 4 ? "Create New Dashboard" : title;
    dispatch(setHeadingTitle(newTitle));
  }, [title, step]);

  return (
    <PageLayout>
      {step < 4 && (
        <main
          className={` ${
            !isPreview ? "max-w-[650px] sm:mx-auto mx-3" : "mx-auto"
          } h-[90%] py-5 px-5 rounded-lg my-5`}
        >
          {
            {
              0: (
                <AddFolder
                  gotoNext={handleNext}
                  onChange={handleInputChange}
                  // textColor={textColor}
                  setObjectId={setObjectId}
                  setObjectValue={setObjectValue}
                  selectedFolder={selectedFolder}
                  folderData={folderData}
                  sourceType={sourceType}
                />
              ),
              1: (
                <Propertysection
                  gotoNext={handleNext}
                  setIsPreview={setIsPreview}
                  isPreview={isPreview}
                  objectId={objectId || folderData?.objectId}
                  objectValue={objectValue}
                  routeName={routeName}
                  onSave={onSave}
                  folderData={folderData}
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
