export const navItems = [
  {
    type: "link",
    href: "/",
    label: "Home",
  },
  {
    type: "dropdown",
    label: "Products",
    items: [
      {
        href: "/text-generator",
        label: "Text Generator",
        icon: "/images/logo/generators/text.svg",
      },
      {
        href: "/image-generator",
        label: "Image Generator",
        icon: "/images/logo/generators/image.svg",
      },
      {
        href: "/code-generator",
        label: "Code Generator",
        icon: "/images/logo/generators/code.svg",
      },
      {
        href: "/video-generator",
        label: "Video Generator",
        icon: "/images/logo/generators/video.svg",
      },
      {
        href: "/email-generator",
        label: "Email Generator",
        icon: "/images/logo/generators/email.svg",
      },
    ],
  },
  {
    type: "dropdown",
    label: "Pages",
    items: [
      { href: "/profile", label: "Dashboard" },
      { href: "/pricing", label: "Pricing" },
      { href: "/blog", label: "Blog Grid" },
      { href: "/blog-details", label: "Blog Details" },
      { href: "/signin", label: "Sign In" },
      { href: "/signup", label: "Sign Up" },
      { href: "/reset-password", label: "Reset Password" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/not-found", label: "404 Error" },
    ],
  },
  {
    type: "link",
    href: "/contact",
    label: "Contact",
  },
] satisfies NavItem[];

type NavItem = Record<string, string | unknown> &
  (
    | {
        type: "link";
        href: string;
      }
    | {
        type: "dropdown";
      }
  );
