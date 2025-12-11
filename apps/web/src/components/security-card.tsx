"use client";
import { useState } from "react";
import { ChangePasswordModal } from "./change-password-modal";

export default function SecurityCard() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  return (
    <>
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

        <div className="bg-white dark:bg-dark-primary dark:border-gray-800 border p-6 border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex flex-col gap-5 sm:flex-row justify-between sm:items-center">
            <h3 className="text-lg font-semibold dark:text-white/90 text-gray-800">
              Change your Password
            </h3>
            <div>
              <button
                type="button"
                onClick={() => setChangePasswordModalOpen(true)}
                className="inline-flex items-center dark:hover:bg-white/5 dark:hover:text-white/90 transition dark:bg-dark-primary dark:text-gray-400 px-4 py-3 gap-2 dark:border-gray-800 border border-gray-200 shadow-theme-xs text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  role="img"
                  aria-label="Edit icon"
                >
                  <title>Edit icon</title>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.0909 2.78198C14.2122 1.9033 12.7876 1.9033 11.9089 2.78198L4.57499 10.1159C4.26658 10.4243 4.05446 10.8157 3.96443 11.2425L3.31206 14.3351C3.25973 14.5832 3.33629 14.8409 3.51558 15.0202C3.69487 15.1995 3.95262 15.2761 4.20071 15.2237L7.2933 14.5714C7.72007 14.4813 8.11147 14.2692 8.41988 13.9608L15.7538 6.62687C16.6325 5.74819 16.6325 4.32357 15.7538 3.44489L15.0909 2.78198ZM12.9696 3.84264C13.2625 3.54975 13.7373 3.54975 14.0302 3.84264L14.6932 4.50555C14.986 4.79845 14.986 5.27332 14.6932 5.56621L14.0437 6.21565L12.3201 4.49208L12.9696 3.84264ZM11.2595 5.55274L5.63565 11.1766C5.53285 11.2794 5.46214 11.4098 5.43213 11.5521L5.01733 13.5185L6.9837 13.1037C7.12595 13.0737 7.25642 13.0029 7.35922 12.9001L12.9831 7.27631L11.2595 5.55274Z"
                    fill="currentColor"
                  />
                </svg>
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </>
  );
}
