/**
 * Pure isolation rules used by notification identity redesign.
 * Run: node --test scripts/test-notification-identity-isolation.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Heal candidates must be the same laundry employee only.
 * @param {Array<{ onesignal_player_id?: string, laundry_employee_id?: string | null, is_valid?: boolean | null, ownership?: string | null, employee_id?: string | null }>} rows
 * @param {string} laundryEmployeeId
 * @param {string | null} pairedByAdminId
 */
export function selectHealCandidates(rows, laundryEmployeeId, pairedByAdminId) {
  return rows.filter((row) => {
    const id = row.onesignal_player_id?.trim();
    if (!id || row.is_valid === false) {
      return false;
    }
    // Forbidden: admin pool / other employees
    if (row.ownership === 'admin') {
      return false;
    }
    if (
      row.laundry_employee_id &&
      row.laundry_employee_id !== laundryEmployeeId
    ) {
      return false;
    }
    if (pairedByAdminId && row.employee_id === pairedByAdminId && !row.laundry_employee_id) {
      return false;
    }
    return row.laundry_employee_id === laundryEmployeeId;
  });
}

/**
 * Pairing must refuse when player id is active for a different employee.
 */
export function shouldRefusePairForForeignOwner(
  activeOwnerLaundryId,
  targetLaundryId,
) {
  return Boolean(
    activeOwnerLaundryId &&
      targetLaundryId &&
      activeOwnerLaundryId !== targetLaundryId,
  );
}

/**
 * Rotation must not reassign when new id is owned by another laundry employee.
 */
export function shouldBlockRotationReassignment(
  newIdOwnerLaundryId,
  requestingLaundryId,
) {
  return Boolean(
    newIdOwnerLaundryId &&
      requestingLaundryId &&
      newIdOwnerLaundryId !== requestingLaundryId,
  );
}

describe('notification identity isolation', () => {
  it('heal ignores admin-owned and other-employee subscriptions', () => {
    const rows = [
      {
        onesignal_player_id: 'admin-phone',
        employee_id: 'admin-1',
        laundry_employee_id: null,
        ownership: 'admin',
        is_valid: true,
      },
      {
        onesignal_player_id: 'salama-phone',
        employee_id: null,
        laundry_employee_id: 'emp-salama',
        ownership: 'laundry_employee',
        is_valid: true,
      },
      {
        onesignal_player_id: 'sayed-phone',
        employee_id: null,
        laundry_employee_id: 'emp-sayed',
        ownership: 'laundry_employee',
        is_valid: true,
      },
    ];

    const forSayed = selectHealCandidates(rows, 'emp-sayed', 'admin-1');
    assert.deepEqual(
      forSayed.map((r) => r.onesignal_player_id),
      ['sayed-phone'],
    );
  });

  it('pairing refuses foreign active owner', () => {
    assert.equal(
      shouldRefusePairForForeignOwner('emp-a', 'emp-b'),
      true,
    );
    assert.equal(
      shouldRefusePairForForeignOwner('emp-a', 'emp-a'),
      false,
    );
    assert.equal(shouldRefusePairForForeignOwner(null, 'emp-b'), false);
  });

  it('rotation blocks cross-employee reassignment', () => {
    assert.equal(
      shouldBlockRotationReassignment('emp-ahmed', 'emp-sayed'),
      true,
    );
    assert.equal(
      shouldBlockRotationReassignment('emp-sayed', 'emp-sayed'),
      false,
    );
    assert.equal(shouldBlockRotationReassignment(null, 'emp-sayed'), false);
  });
});
