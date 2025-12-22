"use client";

import { trpc } from "@web/trpc/react";
import type { User } from "better-auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EditProfileModal } from "./edit-profile-modal";
import { authClient } from "@web/auth/client";

type PropsType = {
  user?: User | null;
};

export default function ProfileCard({ user }: PropsType) {
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const updateProfile = trpc.auth.updateProfile.useMutation();
  const router = useRouter();

  const userProfile = {
    fullName: user?.name || "User",
    email: user?.email || "",
    image: user?.image || null,
  };
  const profileFormData = {
    fullName: userProfile.fullName,
    image: userProfile.image,
  };
  const initials = userProfile.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <div className="mb-8 p-6 rounded-2xl border bg-white border-[#F2F4F7] dark:border-gray-800 dark:bg-dark-primary">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-6">
          My Profile
        </h2>
        <div className="bg-white border dark:bg-dark-primary dark:border-gray-800 border-gray-200 rounded-xl overflow-hidden">
          <div className="p-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Personal Information
            </h3>
            <button
              type="button"
              onClick={() => setEditProfileModalOpen(true)}
              className="inline-flex items-center shadow-theme-xs dark:hover:bg-white/5 dark:hover:text-white/90 transition dark:bg-dark-primary dark:text-gray-400 px-4 py-3 gap-2 dark:border-gray-800 border border-gray-200 text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50"
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
              Edit
            </button>
          </div>

          <div className="flex items-center gap-4 px-6 pb-6 pt-0">
            {userProfile.image ? (
              <Image
                src={userProfile.image}
                alt={userProfile.fullName}
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="h-14 w-14 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                {initials || "U"}
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Full name
              </p>
              <p className="font-semibold mt-1 text-gray-800 dark:text-white/90">
                {userProfile.fullName}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-7 max-w-lg p-6 pt-0 border-gray-200 dark:border-gray-800">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                Email address
              </dt>

              <dd className="font-semibold mt-2 text-gray-800 dark:text-white/90">
                {userProfile.email}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <EditProfileModal
        key={userProfile.email}
        isOpen={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        data={profileFormData}
        email={userProfile.email}
        onSave={async (_data) => {
          await authClient.updateUser({
            name: _data.fullName,
            image: _data.image ?? null,
          });

          router.refresh();
        }}
      />
    </>
  );
}
