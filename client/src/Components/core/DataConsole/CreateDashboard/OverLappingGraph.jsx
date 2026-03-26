import React from 'react';

const OverlappingCirclesGraph = () => {
    return (
        <div className="flex justify-center items-center h-auto">
            <svg
                width="300"
                height="300"
                viewBox="0 0 400 400"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle
                    cx="150"
                    cy="200"
                    r="100"
                    fill="rgba(0, 255, 150, 0.6)"
                />
                <circle
                    cx="250"
                    cy="200"
                    r="100"
                    fill="rgba(0, 150, 255, 0.6)"
                />
                <circle
                    cx="200"
                    cy="120"
                    r="100"
                    fill="rgba(255, 150, 200, 0.6)"
                />
            </svg>
        </div>
    );
};

export default OverlappingCirclesGraph;
