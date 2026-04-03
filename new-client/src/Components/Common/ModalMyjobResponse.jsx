import React from 'react'
import { AiOutlineClose } from 'react-icons/ai'

export const ModalMyjobResponse = ({ data, closeHandleResponseModal, saveResponse, }) => {
    return (
        <div className={`modal ${saveResponse ? "block" : "hidden"}`}>
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white p-6 rounded-lg w-1/2 relative h-[90vh] overflow-y-scroll">
                    <main className="h-[100vh]">
                        <button className="absolute top-3 right-3" onClick={closeHandleResponseModal}>
                            <AiOutlineClose size={24} />
                        </button>
                        <h2 className="text-xl font-bold mb-4">Review & Save Your Filter</h2>
                    </main>
                </div>
            </div>
        </div>
    )
}
