"use client";

import { MoreVerticalIcon } from "@web/components/icons";
import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  align?: "left" | "right";
  buttonClassName?: string;
  menuClassName?: string;
  itemClassName?: string;
  buttonIcon?: React.ReactNode;
}

export function DropdownMenu({
  items,
  align = "right",
  buttonClassName = "",
  menuClassName = "",
  itemClassName = "",
  buttonIcon = <MoreVerticalIcon />,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Detect if there's enough space to open downward
  useLayoutEffect(() => {
    if (!isOpen || !dropdownRef.current || !menuRef.current) return;

    const buttonRect = dropdownRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    setOpenUp(spaceBelow < menuHeight && spaceAbove > menuHeight);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={`w-8 h-8 bg-white hover:text-gray-800 dark:hover:text-white/90 rounded-full flex items-center justify-center border dark:bg-white/3 dark:border-white/5 border-gray-100 ${buttonClassName}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {buttonIcon}
      </button>

      <div
        ref={menuRef}
        className={`absolute  z-50 mt-1 w-32 p-2 origin-top-right rounded-lg shadow-theme-xs dark:bg-dark-primary dark:border-gray-800 border border-gray-100 bg-white focus:outline-none transition-all duration-100 ease-in-out
        ${
          isOpen
            ? "transform opacity-100 scale-100"
            : "transform opacity-0 scale-95 pointer-events-none"
        }
        ${align === "right" ? "right-0" : "left-0"}
        ${openUp ? "bottom-full mb-1" : "top-full mt-1"}
        ${menuClassName}`}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              item.onClick();
              setIsOpen(false);
            }}
            className={`w-full text-left rounded-md flex items-center px-4 py-1.5 text-sm dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white/90 text-gray-700 hover:bg-gray-100 ${itemClassName}`}
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
