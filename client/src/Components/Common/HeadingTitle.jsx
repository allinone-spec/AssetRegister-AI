import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const HeadingTitle = () => {
  const headingTitle = useSelector((state) => state.title.headingTitle);

  // update the browser tab title whenever the heading changes
  useEffect(() => {
    if (headingTitle && headingTitle.length) {
      document.title = `ITAMExperts - ${headingTitle}`;
    } else {
      document.title = "ITAMExperts"; // fallback default
    }
  }, [headingTitle]);

  return (
    <div>
      <h1
        className="text-left sm:text-2xl text-sm py-4 font-semibold sm:leading-[2.36rem] decoration-skip-ink sm:w-auto w-[160px] truncate"
        title={headingTitle}
      >
        {headingTitle}
      </h1>
    </div>
  );
};

export default HeadingTitle;
