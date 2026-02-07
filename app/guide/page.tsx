import type { Metadata } from "next";
import { GuidePage } from "@/components/guide-page";

export const metadata: Metadata = {
  title: "Guide | Task Planner",
  description: "How to use Task Breaker for daily planning, recurring templates, and end-of-day review.",
};

export default function GuideRoute() {
  return <GuidePage />;
}
