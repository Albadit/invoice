import { SidebarLayout } from "@/components/layout";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout>
      {children}
    </SidebarLayout>
  );
}
