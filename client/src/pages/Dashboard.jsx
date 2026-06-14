import React, { useState } from "react";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import HeroSection from "../components/dashboard/HeroSection";

const Dashboard = ({ onNavigateChat }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openSidebar = () => setIsSidebarOpen(true);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex relative">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="flex-1">
        <Navbar onMenuClick={openSidebar} onChatClick={onNavigateChat} />

        {/* PAGE CONTENT */}
        <div className="p-6 md:p-10">
          <HeroSection />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;