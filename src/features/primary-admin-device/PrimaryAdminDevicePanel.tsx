/** Primary Admin Device panel retired — linking is Notifications Center only. */
export function PrimaryAdminDevicePanel() {
  return (
    <div className="primary-admin-device" role="status">
      <p className="primary-admin-device__title">Primary Admin Device</p>
      <p className="primary-admin-device__note">
        This feature was removed. Use Admin → Notifications Center for employee
        device linking, health, and diagnostics.
      </p>
    </div>
  );
}
