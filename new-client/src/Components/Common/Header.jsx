// import React from "react";
// import { FaBars } from "react-icons/fa";
import UserProfile from "./UserProfile";

const Header = () => {
  return (
    <header className=" text-white p-4 flex justify-between items-center sticky top-0 z-50">
      {/* <button
        onClick={toggleSidebar}
        className="text-white focus:outline-none p-2"
      >
        {collapsed ? (
          <FaBars className="text-2xl" />
        ) : (
          //TODO use proper icon
          <FaBars className="text-2xl" />
        )}
      </button> */}
      <h1 className="text-xl font-bold"></h1>
      <UserProfile />
    </header>
  );
};

export default Header;
