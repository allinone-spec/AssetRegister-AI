import React, { useEffect } from 'react'
import PageLayout from '../../../Common/PageLayout'
import { useDispatch } from 'react-redux'
import { setHeadingTitle } from '../../../../redux/Slices/HeadingTitle'
import { useTheme } from '../../../../ThemeContext'
import CreateFolder from './CreateFolder'
import { useNavigate } from 'react-router-dom'
const CreateNEwFolder = () => {
    const navigate = useNavigate();
    const { colorPalette, selectedColor, textBlackColor, textWhiteColor } = useTheme();
    const handleNavigate = () => {
        navigate("/dashboard/All-folders-list")
    }

    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setHeadingTitle('Create Folder'));
      }, [])
    const backgroundColor = colorPalette[selectedColor]["100"];
    const textColor = colorPalette[selectedColor]["900"];
    const actionColor = colorPalette[selectedColor]["400"];
    const borderColor = colorPalette[selectedColor]["500"];
    const lightbackground = colorPalette[selectedColor]["200"]

    return (
        <PageLayout>
            <main
                className="max-w-[650px] min-h-[60%] py-5 px-5 rounded-lg sm:mx-auto mx-3 my-5"
                style={{ backgroundColor, textColor, actionColor }}
            >
                <CreateFolder
                    textBlackColor={textBlackColor}
                    textWhiteColor={textWhiteColor}
                    borderColor={borderColor}
                    textColor={textColor}
                    lightbackground={lightbackground}
                    handleSave={handleNavigate}
                />
            </main>

        </PageLayout>
    )
}

export default CreateNEwFolder
