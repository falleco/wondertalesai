"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function WelcomeBanner() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="mb-8 bg-primary rounded-2xl relative overflow-hidden dashboard-gradient">
      <div className="px-6 py-8 md:px-10 md:py-10 md:max-w-3xl relative z-10">
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome to AiStarterKit
        </h2>

        <p className="text-white/80 text-sm mb-6">
          Create Content Smarter, Faster, and Effortlessly with AiStarterKit.
        </p>

        <Link
          href={"#"}
          className="text-white hover:bg-white hover:text-primary-500 transition border border-white/50 py-3 px-5 shadow-theme-xs text-sm font-medium rounded-full"
        >
          Learn more
        </Link>
      </div>

      <Image
        src="/images/dashboard/Saly.png"
        alt="AI Agent illustration"
        className="absolute right-5 top-0 h-full object-contain hidden md:block"
        width={230}
        height={230}
      />

      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="rounded-full p-2 bg-white/30 hover:bg-white/70 hover:text-gray-800 transition text-gray-500 absolute right-3 top-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          role="img"
          aria-label="Close banner"
        >
          <title>Close banner</title>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.96967 5.03099C3.67678 4.73809 3.67678 4.26322 3.96967 3.97033C4.26256 3.67743 4.73744 3.67743 5.03033 3.97033L7.99935 6.93934L10.9683 3.97041C11.2612 3.67752 11.736 3.67752 12.0289 3.97041C12.3218 4.26331 12.3218 4.73818 12.0289 5.03107L9.06001 8L12.0289 10.9689C12.3218 11.2618 12.3218 11.7367 12.0289 12.0296C11.736 12.3225 11.2612 12.3225 10.9683 12.0296L7.99935 9.06066L5.03033 12.0297C4.73744 12.3226 4.26256 12.3226 3.96967 12.0297C3.67678 11.7368 3.67678 11.2619 3.96967 10.969L6.93869 8.00001L3.96967 5.03099Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}
