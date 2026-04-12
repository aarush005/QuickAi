import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { Menu, X } from "lucide-react";
import { SignIn, useUser } from "@clerk/clerk-react";
import Sidebar from "../components/Sidebar";

const Layout = () => {
  const navigate = useNavigate();
  const [sidebar, setSidebar] = useState(false);
  const { user } = useUser();

  return user ? (
    <div className="flex flex-col h-screen">
      {/* NAVBAR */}
      <nav className="w-full px-4 sm:px-8 min-h-14 flex items-center justify-between border-b border-gray-200 bg-white">
        <img
          className="cursor-pointer h-6"
          src={assets.logo}
          alt="logo"
          onClick={() => navigate("/")}
        />

        {/* TOGGLE BUTTON */}
        {sidebar ? (
          <X
            onClick={() => setSidebar(false)}
            className="w-6 h-6 text-gray-600 sm:hidden cursor-pointer"
          />
        ) : (
          <Menu
            onClick={() => setSidebar(true)}
            className="w-6 h-6 text-gray-600 sm:hidden cursor-pointer"
          />
        )}
      </nav>

      {/* BACKDROP (MOBILE ONLY) */}
      {sidebar && (
        <div
          onClick={() => setSidebar(false)}
          className="fixed inset-0 bg-black/30 z-40 sm:hidden"
        />
      )}

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar sidebar={sidebar} setSidebar={setSidebar} />

        {/* CONTENT */}
        <div className="flex-1 bg-[#F4F7FB] overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-screen">
      <SignIn />
    </div>
  );
};

export default Layout;