import { Navigate } from 'react-router-dom';

/** @deprecated Use Manage Quizzes at /teacher/quizzes */
export default function AddQuizPage() {
  return <Navigate to="/teacher/quizzes" replace />;
}
