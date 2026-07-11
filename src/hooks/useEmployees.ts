import { useCallback } from 'react';
import { employeesRepository, type LaundryEmployee } from '@/data/repositories';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStore } from '@/hooks/useSyncStore';

export function useEmployees() {
  const employees = useSyncStore(employeesRepository);
  const { assertCan, logAction } = useAuth();

  const createEmployee = useCallback(
    (employee: LaundryEmployee) => {
      assertCan('employees', 'create');
      const created = employeesRepository.create(employee);
      logAction({
        action: 'employees.create',
        page: 'employees',
        newValue: created,
      });
      return created;
    },
    [assertCan, logAction],
  );

  const updateEmployee = useCallback(
    (id: string, next: LaundryEmployee) => {
      assertCan('employees', 'update');
      const oldValue = employeesRepository.getById(id);
      const updated = employeesRepository.update(id, next);
      logAction({
        action: 'employees.update',
        page: 'employees',
        oldValue,
        newValue: updated,
      });
      return updated;
    },
    [assertCan, logAction],
  );

  const deleteEmployee = useCallback(
    (id: string) => {
      assertCan('employees', 'delete');
      const oldValue = employeesRepository.getById(id);
      employeesRepository.remove(id);
      logAction({ action: 'employees.delete', page: 'employees', oldValue });
    },
    [assertCan, logAction],
  );

  return { employees, createEmployee, updateEmployee, deleteEmployee };
}
