import { Navigate } from 'react-router-dom';

/** @deprecated Use /teacher/exams */
export default function AddMemoPage() {
  return <Navigate to="/teacher/exams" replace />;
}
