import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setHeadingTitle } from '../../../../redux/Slices/HeadingTitle';
const ReportFolder = () => {
    const dispatch = useDispatch();
    dispatch(setHeadingTitle('Report Folder'))
    return (
        <div>
            <p>Report Folder</p>

        </div>
    )
}

export default ReportFolder
