import { Outlet } from "react-router-dom";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <main className="pl-64 min-h-screen">
        <DashboardTopBar />
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
