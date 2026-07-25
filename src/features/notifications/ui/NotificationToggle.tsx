import '@/features/notifications/ui/notification-toggle.css';

type NotificationToggleProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  labelledBy?: string;
};

/**
 * Premium Plaza Laundry ON/OFF switch — not a native checkbox/switch.
 */
export function NotificationToggle({
  checked,
  disabled = false,
  onChange,
  labelledBy,
}: NotificationToggleProps) {
  return (
    <button
      aria-checked={checked}
      aria-labelledby={labelledBy}
      className={`notif-toggle${checked ? ' is-on' : ' is-off'}${
        disabled ? ' is-disabled' : ''
      }`}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      role="switch"
      type="button"
    >
      <span className="notif-toggle__track" aria-hidden="true">
        <span className="notif-toggle__thumb" />
      </span>
      <span className="notif-toggle__label">{checked ? 'ON' : 'OFF'}</span>
    </button>
  );
}

export function isBooleanSettingValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === 'false' || normalized === '1' || normalized === '0';
}

export function settingValueAsBool(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}
