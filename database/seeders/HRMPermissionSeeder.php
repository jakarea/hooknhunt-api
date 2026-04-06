<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class HRMPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This seeder matches the structure from frontend/src/config/fr_permissions.ts
     */
    public function run(): void
    {
        $permissions = [
            [
                'group' => 'HRM',
                'modules' => [
                    [
                        'name' => 'Staff',
                        'permissions' => [
                            ['label' => 'View Staff', 'key' => 'hrm_staff_view', 'slug' => 'hrm.staff.index'],
                            ['label' => 'Create Staff', 'key' => 'hrm_staff_create', 'slug' => 'hrm.staff.create'],
                            ['label' => 'Edit Staff', 'key' => 'hrm_staff_edit', 'slug' => 'hrm.staff.edit'],
                            ['label' => 'Delete Staff', 'key' => 'hrm_staff_delete', 'slug' => 'hrm.staff.delete'],
                            ['label' => 'View Staff Stats', 'key' => 'hrm_staff_stats', 'slug' => 'hrm.staff.stats'],
                            ['label' => 'Change Staff Password', 'key' => 'hrm_staff_change_password', 'slug' => 'hrm.staff.change-password'],
                            ['label' => 'Send Password SMS', 'key' => 'hrm_staff_send_password_sms', 'slug' => 'hrm.staff.send-password-sms'],
                        ],
                    ],
                    [
                        'name' => 'Departments',
                        'permissions' => [
                            ['label' => 'View Departments', 'key' => 'hrm_department_view', 'slug' => 'hrm.department.index'],
                            ['label' => 'Create Department', 'key' => 'hrm_department_create', 'slug' => 'hrm.department.create'],
                            ['label' => 'Edit Department', 'key' => 'hrm_department_edit', 'slug' => 'hrm.department.edit'],
                            ['label' => 'Delete Department', 'key' => 'hrm_department_delete', 'slug' => 'hrm.department.delete'],
                        ],
                    ],
                    [
                        'name' => 'Leaves',
                        'permissions' => [
                            ['label' => 'View Leaves', 'key' => 'hrm_leave_view', 'slug' => 'hrm.leave.index'],
                            ['label' => 'Create Leave', 'key' => 'hrm_leave_create', 'slug' => 'hrm.leave.create'],
                            ['label' => 'Approve Leave', 'key' => 'hrm_leave_approve', 'slug' => 'hrm.leave.approve'],
                            ['label' => 'Reject Leave', 'key' => 'hrm_leave_reject', 'slug' => 'hrm.leave.reject'],
                            ['label' => 'Cancel Leave', 'key' => 'hrm_leave_cancel', 'slug' => 'hrm.leave.cancel'],
                        ],
                    ],
                    [
                        'name' => 'Attendance',
                        'permissions' => [
                            ['label' => 'View Attendance', 'key' => 'hrm_attendance_view', 'slug' => 'hrm.attendance.index'],
                            ['label' => 'View My Attendance Status', 'key' => 'hrm_attendance_my_status', 'slug' => 'hrm.attendance.my-status'],
                            ['label' => 'Create Attendance', 'key' => 'hrm_attendance_create', 'slug' => 'hrm.attendance.create'],
                            ['label' => 'Clock In', 'key' => 'hrm_attendance_clock_in', 'slug' => 'hrm.attendance.clock-in'],
                            ['label' => 'Clock Out', 'key' => 'hrm_attendance_clock_out', 'slug' => 'hrm.attendance.clock-out'],
                            ['label' => 'Break In', 'key' => 'hrm_attendance_break_in', 'slug' => 'hrm.attendance.break-in'],
                            ['label' => 'Break Out', 'key' => 'hrm_attendance_break_out', 'slug' => 'hrm.attendance.break-out'],
                        ],
                    ],
                    [
                        'name' => 'Payroll',
                        'permissions' => [
                            ['label' => 'View Payroll', 'key' => 'hrm_payroll_view', 'slug' => 'hrm.payroll.index'],
                            ['label' => 'Generate Payroll', 'key' => 'hrm_payroll_generate', 'slug' => 'hrm.payroll.generate'],
                            ['label' => 'Edit Payroll', 'key' => 'hrm_payroll_edit', 'slug' => 'hrm.payroll.edit'],
                            ['label' => 'Pay Payroll', 'key' => 'hrm_payroll_pay', 'slug' => 'hrm.payroll.pay'],
                            ['label' => 'Process Salary Sheet', 'key' => 'hrm_payroll_process_sheet', 'slug' => 'hrm.payroll.process-sheet'],
                            ['label' => 'Confirm Payment', 'key' => 'hrm_payroll_confirm_payment', 'slug' => 'hrm.payroll.confirm-payment'],
                        ],
                    ],
                    [
                        'name' => 'Roles',
                        'permissions' => [
                            ['label' => 'View Roles', 'key' => 'hrm_role_view', 'slug' => 'hrm.role.index'],
                            ['label' => 'Create Role', 'key' => 'hrm_role_create', 'slug' => 'hrm.role.create'],
                            ['label' => 'Edit Role', 'key' => 'hrm_role_edit', 'slug' => 'hrm.role.edit'],
                            ['label' => 'Delete Role', 'key' => 'hrm_role_delete', 'slug' => 'hrm.role.delete'],
                            ['label' => 'Restore Role', 'key' => 'hrm_role_restore', 'slug' => 'hrm.role.restore'],
                            ['label' => 'Force Delete Role', 'key' => 'hrm_role_force_delete', 'slug' => 'hrm.role.force-delete'],
                            ['label' => 'View Role Permissions', 'key' => 'hrm_role_view_permissions', 'slug' => 'hrm.role.view-permissions'],
                            ['label' => 'Sync Role Permissions', 'key' => 'hrm_role_sync_permissions', 'slug' => 'hrm.role.sync-permissions'],
                        ],
                    ],
                ],
            ],
        ];

        $count = 0;
        foreach ($permissions as $groupData) {
            $groupName = $groupData['group'];

            foreach ($groupData['modules'] as $moduleData) {
                $moduleName = $moduleData['name'];

                foreach ($moduleData['permissions'] as $permData) {
                    Permission::updateOrCreate(
                        ['slug' => $permData['slug']],
                        [
                            'name' => $permData['label'],
                            'key' => $permData['key'] ?? null,
                            'slug' => $permData['slug'] ?? null,
                            'group_name' => $groupName,
                            'module_name' => $moduleName,
                        ]
                    );
                    $count++;
                }
            }
        }

        $this->command->info("Seeded {$count} HRM permissions matching frontend config.");
    }
}