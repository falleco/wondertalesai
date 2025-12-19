"use client";
import { useState } from "react";

export default function SecurityCard() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  return (
    <div className="p-6 rounded-2xl border bg-white border-[#F2F4F7] dark:border-gray-800 dark:bg-dark-primary">
      <h2 className="text-lg font-bold text-gray-800 mb-6 dark:text-white/90">
        Security
      </h2>
      {twoFactorEnabled ? (
        <div className="bg-white border dark:bg-dark-primary dark:border-gray-800 border-gray-200 rounded-2xl overflow-hidden mb-6 p-6">
          <div className="flex gap-5 flex-col md:flex-row justify-between md:items-center">
            <div className="flex-1">
              <h3 className="text-lg flex items-center gap-2.5 font-semibold text-gray-800 dark:text-white/90">
                Two factor authentication
                <span className="inline-flex dark:bg-success-600/15 dark:text-success-600 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Enabled
                </span>
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Two-factor authentication adds an additional layer of security
                to your account by requiring more than just a password to log
                in.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setTwoFactorEnabled(false)}
                className="inline-flex items-center shadow-theme-xs dark:hover:bg-white/5 dark:hover:text-white/90 transition dark:bg-dark-primary dark:text-gray-400 px-4 py-3 gap-2 dark:border-gray-800 border border-gray-200 text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50"
              >
                Disable Two-factor authentication
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border dark:bg-dark-primary dark:border-gray-800 border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex gap-5 flex-col md:flex-row justify-between md:items-center">
            <div className="flex-1">
              <h3 className="text-lg flex items-center gap-2.5 dark:text-white/90 font-semibold text-gray-800">
                Two factor authentication
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium dark:text-white/80 dark:bg-white/[0.05] bg-gray-100 text-gray-800">
                  Disabled
                </span>
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Two-factor authentication adds an additional layer of security
                to your account by requiring more than just a password to log
                in.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setTwoFactorEnabled(true)}
                className="inline-flex items-center shadow-theme-xs dark:hover:bg-white/5 dark:hover:text-white/90 transition dark:bg-dark-primary dark:text-gray-400 px-4 py-3 gap-2 dark:border-gray-800 border border-gray-200 text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50"
              >
                Enable Two-factor authentication
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
