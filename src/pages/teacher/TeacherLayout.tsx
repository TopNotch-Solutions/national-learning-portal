import PortalShell from '../../components/PortalShell';

const teacherNav = [
  { to: '/teacher', label: 'Dashboard', end: true },
  { to: '/teacher/content/new', label: 'Add content' },
  { to: '/teacher/quizzes', label: 'Manage quizzes' },
  { to: '/teacher/exams', label: 'Past papers & memos' },
];

export default function TeacherLayout() {
  return <PortalShell title="Teacher portal" nav={teacherNav} />;
}
