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
                'group' => 'Dashboard',
                'modules' => [
                    [
                        'name' => 'Dashboard',
                        'permissions' => [
                            // Dashboard permissions - add as needed
                        ],
                    ],
                ],
            ],
            [
                'group' => 'HRM',
                'modules' => [
                    [
                        'name' => 'Staff',
                        'permissions' => [
                            ['label' => 'View Staff', 'key' => 'hrm_staff_view', 'slug' => 'hrm.staff.index'],
                            ['label' => 'Create Staff', 'key' => 'hrm_staff_create', 'slug' => 'hrm.staff.create'],
                            ['label' => 'Edit Staff', 'key' => 'hrm_staff_edit', 'slug' => 'hrm.staff.edit'],
                            ['label' => 'Delete Staff', 'key' => 'hrm_staff_delete', 'slug' => 'hrm.staff.delete']
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
                            ['label' => 'Create Attendance', 'key' => 'hrm_attendance_create', 'slug' => 'hrm.attendance.create'],
                            ['label' => 'Edit Attendance', 'key' => 'hrm_attendance_edit', 'slug' => 'hrm.attendance.edit'],
                            ['label' => 'Approve Attendance', 'key' => 'hrm_attendance_approve', 'slug' => 'hrm.attendance.approve'],
                        ],
                    ],
                    [
                        'name' => 'Payroll',
                        'permissions' => [
                            ['label' => 'View Payroll', 'key' => 'hrm_payroll_view', 'slug' => 'hrm.payroll.index'],
                            ['label' => 'Create Payroll', 'key' => 'hrm_payroll_create', 'slug' => 'hrm.payroll.create'],
                            ['label' => 'Edit Payroll', 'key' => 'hrm_payroll_edit', 'slug' => 'hrm.payroll.edit'],
                            ['label' => 'Process Payroll', 'key' => 'hrm_payroll_process', 'slug' => 'hrm.payroll.process'],
                            ['label' => 'Approve Payroll', 'key' => 'hrm_payroll_approve', 'slug' => 'hrm.payroll.approve'],
                        ],
                    ],
                    [
                        'name' => 'Roles',
                        'permissions' => [
                            ['label' => 'View Roles', 'key' => 'hrm_role_view', 'slug' => 'hrm.role.index'],
                            ['label' => 'Create Role', 'key' => 'hrm_role_create', 'slug' => 'hrm.role.create'],
                            ['label' => 'Edit Role', 'key' => 'hrm_role_edit', 'slug' => 'hrm.role.edit'],
                            ['label' => 'Delete Role', 'key' => 'hrm_role_delete', 'slug' => 'hrm.role.delete'],
                            ['label' => 'Assign Role to User', 'key' => 'hrm_role_assign', 'slug' => 'hrm.role.assign'],
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