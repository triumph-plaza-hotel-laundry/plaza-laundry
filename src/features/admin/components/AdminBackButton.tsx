import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ADMIN_DASHBOARD_PATH = '/admin';

/**
 * Shared Admin Back control.
 * Always navigates to the Admin Dashboard — never browser history.
 * Label is always Arabic "رجوع" per product requirement.
 */
export function AdminBackButton() {
  const navigate = useNavigate();

  return (
    <button
      aria-label="رجوع"
      className="admin-back-btn"
      onClick={() => navigate(ADMIN_DASHBOARD_PATH)}
      type="button"
    >
      <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
      رجوع
    </button>
  );
}
