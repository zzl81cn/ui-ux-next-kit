import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ConsoleLayout } from "./layouts/ConsoleLayout";
import { RequireSession } from "./layouts/RequireSession";
import { AccountSettingsPage } from "./pages/AccountSettingsPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { JobsPage } from "./pages/JobsPage";
import { LoginPage } from "./pages/LoginPage";
import { MenusPage } from "./pages/MenusPage";
import { MissingPage } from "./pages/MissingPage";
import { PermissionsPage } from "./pages/PermissionsPage";
import { RolesPage } from "./pages/RolesPage";
import { StatsPage } from "./pages/StatsPage";
import { SystemLogsPage } from "./pages/SystemLogsPage";
import { SystemSettingsPage } from "./pages/SystemSettingsPage";
import { UsersPage } from "./pages/UsersPage";
import { WorkersPage } from "./pages/WorkersPage";
import { ThemeRoot } from "./theme/ThemeRoot";

export function App() {
  return (
    <ThemeRoot>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireSession />}>
            <Route element={<ConsoleLayout />}>
              <Route path="/" element={<Navigate to="/stats" replace />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/workers" element={<WorkersPage />} />
              <Route path="/system" element={<Navigate to="/system/settings" replace />} />
              <Route path="/system/settings" element={<SystemSettingsPage />} />
              <Route path="/system/menus" element={<MenusPage />} />
              <Route path="/settings" element={<Navigate to="/settings/users" replace />} />
              <Route path="/settings/users" element={<UsersPage />} />
              <Route path="/settings/roles" element={<RolesPage />} />
              <Route path="/settings/permissions" element={<PermissionsPage />} />
              <Route path="/settings/departments" element={<DepartmentsPage />} />
              <Route path="/logs" element={<Navigate to="/logs/system" replace />} />
              <Route path="/logs/system" element={<SystemLogsPage />} />
              <Route path="/account/settings" element={<AccountSettingsPage />} />
              <Route path="*" element={<MissingPage />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </ThemeRoot>
  );
}
