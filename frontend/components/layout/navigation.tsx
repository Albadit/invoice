'use client';

import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Settings } from "lucide-react";

export function Navigation() {
  const router = useRouter();

  return (
    <div className="fixed top-4 right-4 z-50">
      <Button
        variant="solid"
        onClick={() => router.push('/settings')}
        startContent={<Settings className="h-4 w-4" />}
      >
      </Button>
    </div>
  );
}
