import StorybookExperience from "@web/components/storybook/storybook-experience";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function StorybookPage() {
  return (
    <div className={fredoka.className}>
      <StorybookExperience />
    </div>
  );
}
