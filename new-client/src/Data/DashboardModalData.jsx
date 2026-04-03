import { Pie } from "react-chartjs-2"

export const FormFolder = [
    { title: "Create Folder", path: "/data-console/dashboard/new-create" },
    {
        id: "1",
        isFolder: true,
        name: "Root Folder",    
        Links: [
            { isFolder: false, name: "File1.txt" },
            { isFolder: false, name: "File2.txt" },
            {
                id: "1.1",
                isFolder: true,
                name: "Sub Folder 1",
                Links: [
                    { isFolder: false, name: "File3.txt" },
                    {
                        id: "1.1.1",
                        isFolder: true,
                        name: "Nested Folder 1",
                        Links: [
                            { isFolder: false, name: "File4.txt" },
                            { isFolder: false, name: "File5.txt" },
                        ],
                    },
                    {
                        id: "1.1.2",
                        isFolder: true,
                        name: "Nested Folder 2",
                        Links: [
                            { isFolder: false, name: "File6.txt" },
                            {
                                id: "1.1.2.1",
                                isFolder: true,
                                name: "Deeply Nested Folder",
                                Links: [
                                    { isFolder: false, name: "File7.txt" },
                                    { isFolder: false, name: "File8.txt" },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: "1.2",
                isFolder: true,
                name: "Sub Folder 2",
                Links: [
                    { isFolder: false, name: "File9.txt" },
                    { isFolder: false, name: "File10.txt" },
                ],
            },
        ],
    },
]


