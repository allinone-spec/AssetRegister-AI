import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setHeadingTitle } from '../../../../redux/Slices/HeadingTitle'

const MyGraph = () => {
    const dispatch = useDispatch();
    dispatch(setHeadingTitle('My Graph'))

    return (
        <div>
            <p>My All Graph</p>

        </div>
    )
}

export default MyGraph
