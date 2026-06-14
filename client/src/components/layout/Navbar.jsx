// src/components/Navbar.jsx

import {
  Search,
  Bell,
  MessageSquare,
  ShoppingCart,
  ChevronDown,
  Menu,
  Bot,
} from "lucide-react";

export default function Navbar({ onMenuClick, onChatClick }) {
  return (
    <header className="w-full bg-white border-b border-gray-200">
      {/* MOBILE NAVBAR */}
      <div className="flex items-center justify-between px-4 h-14 md:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 text-gray-700"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center">
            <span className="text-white text-lg font-bold">+</span>
          </div>

          <div className="leading-4">
            <p className="text-[11px] font-semibold text-gray-700">
              Globalis tajlot.
            </p>
            <p className="text-base font-bold text-gray-900">100X.</p>
          </div>
        </div>

        <div className="relative cursor-pointer">
          <Bell size={20} className="text-gray-700" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </div>

        <button
          type="button"
          onClick={onChatClick}
          className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-xs font-semibold text-green-700"
          aria-label="Open Chat with AI"
        >
          <Bot size={14} />
          Chat with AI
        </button>
      </div>

      {/* DESKTOP NAVBAR */}
      <div className="hidden md:flex h-[72px] px-8 items-center justify-between">
        {/* SEARCH BAR */}
        <div className="relative w-[380px]">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search doctors, medicines, products..."
            className="w-full bg-gray-100 rounded-full py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-green-400 transition"
          />
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onChatClick}
            className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 transition"
          >
            <Bot size={16} />
            Chat with AI
          </button>

          {/* NOTIFICATION */}
          <div className="relative cursor-pointer">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </div>

          {/* MESSAGE */}
          <div className="cursor-pointer">
            <MessageSquare size={20} className="text-gray-600" />
          </div>

          {/* CART */}
          <div className="relative cursor-pointer">
            <ShoppingCart size={20} className="text-gray-600" />
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center">
              3
            </span>
          </div>

          {/* USER PROFILE */}
          <div className="flex items-center gap-3 cursor-pointer">
            <img
              src="https://i.pravatar.cc/40"
              alt="user"
              className="w-10 h-10 rounded-full object-cover"
            />

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">
                Hello, User!
              </span>

              <ChevronDown size={16} className="text-gray-500" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}