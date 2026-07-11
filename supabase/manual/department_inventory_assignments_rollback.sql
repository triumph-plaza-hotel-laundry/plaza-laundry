-- Reversible rollback for department_inventory_assignments migration only.
-- Does not modify inventory_items, department_items, or plan documents.

DROP TABLE IF EXISTS department_inventory_assignments CASCADE;
