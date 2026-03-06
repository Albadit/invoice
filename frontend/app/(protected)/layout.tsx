import { SidebarLayout } from "@/components/layout";
import { PermissionsProvider } from "@/features/auth/components";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionsProvider>
      <SidebarLayout>
        {children}
      </SidebarLayout>
    </PermissionsProvider>
  );
}
