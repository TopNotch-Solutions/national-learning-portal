import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import { ManageAdminsPage, ManageTeachersPage } from './pages/admin/AdminPages';
import ManageExplorePage from './pages/admin/ManageExplorePage';
import TeacherLayout from './pages/teacher/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import AddContentPage from './pages/teacher/AddContentPage';
import AddQuizPage from './pages/teacher/AddQuizPage';
import ManageQuizzesPage from './pages/teacher/ManageQuizzesPage';
import ManageExamsPage from './pages/teacher/ManageExamsPage';
import AddPastPaperPage from './pages/teacher/AddPastPaperPage';
import AddMemoPage from './pages/teacher/AddMemoPage';
import { getStoredUser, homePathForRole } from './lib/api';
import './App.css';
function RootRedirect() {
  const user = getStoredUser();
  const token = localStorage.getItem('edu_token');

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={homePathForRole(user.role)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/" element={<RootRedirect />} />

        <Route element={<ProtectedRoute allow={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="admins" element={<ManageAdminsPage />} />
            <Route path="teachers" element={<ManageTeachersPage />} />
            <Route path="explore" element={<ManageExplorePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allow={['teacher']} />}>
          <Route path="/teacher" element={<TeacherLayout />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="content/new" element={<AddContentPage />} />
            <Route path="quizzes" element={<ManageQuizzesPage />} />
            <Route path="quizzes/new" element={<AddQuizPage />} />
            <Route path="exams" element={<ManageExamsPage />} />
            <Route path="past-papers/new" element={<AddPastPaperPage />} />
            <Route path="memos/new" element={<AddMemoPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
