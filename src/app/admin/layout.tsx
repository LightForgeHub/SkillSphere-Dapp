import { ReactNode } from "react";

export const metadata = {
  title: "Admin Panel | SkillSphere",
  description: "Administration and dispute resolution dashboard",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
