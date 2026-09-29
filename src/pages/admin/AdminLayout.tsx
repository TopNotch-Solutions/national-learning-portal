import PortalShell from '../../components/PortalShell';

const adminNav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/admins', label: 'Manage admins' },
  { to: '/admin/teachers', label: 'Manage teachers' },
];

export default function AdminLayout() {
  return <PortalShell title="Admin portal" nav={adminNav} />;
}
