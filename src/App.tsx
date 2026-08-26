import { Routes, Route, Navigate } from "react-router";
import Users from "@/pages/Users";
import Profile from "@/pages/Profile";
import Help from "@/pages/Help";
import MyGroups from "@/pages/MyGroups";
import MailingLists from "@/pages/MailingLists";
import MailingListMembers from "@/pages/MailingListMembers";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";

export default function App() {
  return (
    <Routes>
      {/* Everything is gated. ProtectedRoute renders the login dialog in place
          of the routed page, so a signed-out visitor to any URL stays there
          rather than being redirected. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* No landing page of its own: the default view is the caller's
              own mailing lists. */}
          <Route path="/" element={<Navigate to="/my-groups" replace />} />
          <Route path="/health" element={<div>Health Check</div>} />
          <Route path="/users" element={<Users />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-groups" element={<MyGroups />} />
          <Route path="/help" element={<Help />} />
          <Route path="/mailing-lists" element={<MailingLists />} />
          <Route
            path="/mailing-lists/:groupKey"
            element={<MailingListMembers />}
          />
        </Route>
      </Route>
    </Routes>
  );
}
