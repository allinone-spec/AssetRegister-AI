import React, { useState, useEffect } from 'react';
import PageLayout from '../../Common/PageLayout';
import { useDispatch } from 'react-redux';
import { setHeadingTitle } from '../../../redux/Slices/HeadingTitle';
import { useTheme } from '../../../ThemeContext';
import { useNavigate, useParams } from 'react-router-dom';
import { getRequest, postDataRequest } from '../../../Service/api.service';
import toast from 'react-hot-toast';

const CreateNewFile = () => {
    const { folderId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        fileName: '',
        fileType: '',
        filePath: '',
        folderId: '',
    });
    const [myFolders, setMyFolders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const { colorPalette, selectedColor } = useTheme();
    const backgroundColor = colorPalette[selectedColor]["100"];
    const textColor = colorPalette[selectedColor]["900"];
    const actionColor = colorPalette[selectedColor]["400"];
    useEffect(() => {
        dispatch(setHeadingTitle('Create File'));
        fetchFolders();
    }, [dispatch]);

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            folderId: folderId
        }));
    }, [folderId]);


    const fetchFolders = async () => {
        try {
            const user= localStorage.getItem("user-id")
            const sourceType="Dashboard"
            const response = await getRequest(`/folder/${user}/user/${sourceType}`);
            setMyFolders(response?.data || []);
        } catch (err) {
            setError("Error fetching folders");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.fileName || !formData.fileType || !formData.folderId) {
            toast.success("Please fill in all required fields.");
            return;
        }

        try {
            setIsLoading(true);
            await postDataRequest('/files/upload', formData);
            toast.success("File uploaded successfully!");
            setFormData({
                fileName: '',
                fileType: '',
                filePath: '',
                folderId: '',
            })
            // navigate("/dashboard/All-folders-list");
        } catch (error) {
            console.error("Error uploading file:", error);
            toast.error("Failed to upload file. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageLayout>
            <main
                className="w-[40%] h-[90%] py-5 px-5 rounded-lg mx-auto my-5"
                style={{ backgroundColor, textColor, actionColor }}
            >
                <div className="h-full max-w-full py-2 mx-auto flex flex-col justify-between">
                    <form onSubmit={handleSubmit} className="flex h-full flex-col justify-between">
                        {/* Folder Selection */}
                        <select
                            id="folder"
                            name="folderId"
                            className="w-full p-3 border rounded-md shadow-sm mb-4"
                            value={formData.folderId}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                        >
                            <option value="">Select Folder</option>
                            {isLoading ? (
                                <option>Loading folders...</option>
                            ) : error ? (
                                <option>Error loading folders</option>
                            ) : (
                                myFolders.map(({ id, folderName }) => (
                                    <option key={id} value={id}>{folderName}</option>
                                ))
                            )}
                        </select>

                        {/* File Name */}
                        <input
                            type="text"
                            name="fileName"
                            placeholder="File Name"
                            className="w-full p-3 border rounded-md shadow-sm mb-4"
                            value={formData.fileName}
                            onChange={handleChange}
                            required
                        />

                        {/* File Type */}
                        <input
                            type="text"
                            name="fileType"
                            placeholder="File Type (e.g., html, css, js)"
                            className="w-full p-3 border rounded-md shadow-sm mb-4"
                            value={formData.fileType}
                            onChange={handleChange}
                            required
                        />

                        {/* File Path */}
                        <input
                            type="text"
                            name="filePath"
                            placeholder="File Path (e.g., /src)"
                            className="w-full p-3 border rounded-md shadow-sm mb-4"
                            value={formData.filePath}
                            onChange={handleChange}
                        />

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="bg-blue-500 text-white p-3 rounded-md shadow-md hover:bg-blue-600 disabled:bg-gray-400"
                            disabled={isLoading}
                        >
                            {isLoading ? "Uploading..." : "Upload File"}
                        </button>
                    </form>
                </div>
            </main>
        </PageLayout>
    );
};

export default CreateNewFile;
