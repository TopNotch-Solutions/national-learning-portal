import { Navigate } from 'react-router-dom';

/** @deprecated Use /teacher/exams */
export default function AddPastPaperPage() {
  return <Navigate to="/teacher/exams" replace />;
}
