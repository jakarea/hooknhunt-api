<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\Role;

class DebugAuthController extends Controller
{
    /**
     * STEP-BY-STEP LOGIN DIAGNOSTIC
     * Tests each component independently to identify the exact problem
     */
    public function diagnosticLogin(Request $request)
    {
        $loginId = $request->login_id; // email or phone
        $password = $request->password;

        $steps = [];
        $success = true;
        $errorCode = null;

        // ============================================================
        // STEP 1: Check PHP is working
        // ============================================================
        $steps[] = [
            'step' => 1,
            'name' => 'PHP Runtime Check',
            'status' => 'testing',
            'message' => 'Testing if PHP is running...',
        ];

        $phpVersion = phpversion();
        $steps[0]['status'] = 'success';
        $steps[0]['message'] = "PHP $phpVersion is working";
        $steps[0]['data'] = [
            'php_version' => $phpVersion,
            'laravel_version' => app()->version(),
            'timestamp' => now()->toDateTimeString(),
        ];


        // ============================================================
        // STEP 2: Check Database Connection
        // ============================================================
        $steps[] = [
            'step' => 2,
            'name' => 'Database Connection',
            'status' => 'testing',
            'message' => 'Testing MySQL connection...',
        ];

        try {
            $dbConfig = [
                'database' => env('DB_DATABASE'),
                'username' => env('DB_USERNAME'),
                'host' => env('DB_HOST'),
            ];

            // Test raw PDO connection
            $pdo = DB::connection()->getPdo();
            $steps[1]['status'] = 'success';
            $steps[1]['message'] = 'Database connection successful';
            $steps[1]['data'] = [
                'database' => $dbConfig['database'],
                'username' => $dbConfig['username'],
                'host' => $dbConfig['host'],
                'connection_type' => get_class($pdo),
            ];
        } catch (\Exception $e) {
            $steps[1]['status'] = 'error';
            $steps[1]['message'] = 'Database connection FAILED';
            $steps[1]['error'] = $e->getMessage();
            $success = false;
            $errorCode = 'DB_CONNECTION_ERROR';

            return response()->json([
                'success' => false,
                'error_code' => $errorCode,
                'message' => 'Cannot connect to database - Check .env DB credentials',
                'steps' => $steps,
            ], 500);
        }


        // ============================================================
        // STEP 3: Check if users table exists
        // ============================================================
        $steps[] = [
            'step' => 3,
            'name' => 'Users Table Check',
            'status' => 'testing',
            'message' => 'Checking if users table exists...',
        ];

        try {
            $tableExists = DB::select("SHOW TABLES LIKE 'users'");
            if (empty($tableExists)) {
                $steps[2]['status'] = 'error';
                $steps[2]['message'] = 'Users table does NOT exist';
                $success = false;
                $errorCode = 'TABLE_NOT_FOUND';

                return response()->json([
                    'success' => false,
                    'error_code' => $errorCode,
                    'message' => 'Users table missing - Run migrations',
                    'steps' => $steps,
                ], 500);
            }

            $steps[2]['status'] = 'success';
            $steps[2]['message'] = 'Users table exists';
            $steps[2]['data'] = [
                'table_name' => 'users',
            ];
        } catch (\Exception $e) {
            $steps[2]['status'] = 'error';
            $steps[2]['message'] = 'Error checking users table';
            $steps[2]['error'] = $e->getMessage();
            $success = false;
            $errorCode = 'TABLE_CHECK_ERROR';

            return response()->json([
                'success' => false,
                'error_code' => $errorCode,
                'message' => 'Error checking table - Permission issue',
                'steps' => $steps,
            ], 500);
        }


        // ============================================================
        // STEP 4: Count total users in database
        // ============================================================
        $steps[] = [
            'step' => 4,
            'name' => 'Users Count',
            'status' => 'testing',
            'message' => 'Counting users in database...',
        ];

        try {
            $count = DB::table('users')->count();
            $steps[3]['status'] = 'success';
            $steps[3]['message'] = "Found $count user(s) in database";
            $steps[3]['data'] = [
                'total_users' => $count,
            ];

            if ($count === 0) {
                $steps[3]['warning'] = 'No users found! Run seeders.';
            }
        } catch (\Exception $e) {
            $steps[3]['status'] = 'error';
            $steps[3]['message'] = 'Error counting users';
            $steps[3]['error'] = $e->getMessage();
            $success = false;
            $errorCode = 'COUNT_ERROR';
        }


        // ============================================================
        // STEP 5: Try to find user by email/phone (RAW SQL)
        // ============================================================
        $steps[] = [
            'step' => 5,
            'name' => 'Find User (Raw SQL)',
            'status' => 'testing',
            'message' => "Searching for user with: $loginId...",
        ];

        try {
            // Raw SQL query - no Laravel magic
            $sql = "SELECT id, name, email, phone, password, role_id, is_active
                    FROM users
                    WHERE email = ? OR phone = ?
                    LIMIT 1";

            $userRaw = DB::select($sql, [$loginId, $loginId]);

            if (empty($userRaw)) {
                $steps[4]['status'] = 'error';
                $steps[4]['message'] = "User not found with: $loginId";
                $steps[4]['data'] = [
                    'searched_for' => $loginId,
                    'found' => false,
                ];
                $success = false;
                $errorCode = 'USER_NOT_FOUND';

                return response()->json([
                    'success' => false,
                    'error_code' => $errorCode,
                    'message' => "No user found with email/phone: $loginId",
                    'steps' => $steps,
                ], 404);
            }

            $userRaw = (array) $userRaw[0];
            $steps[4]['status'] = 'success';
            $steps[4]['message'] = 'User found in database';
            $steps[4]['data'] = [
                'user_id' => $userRaw['id'],
                'name' => $userRaw['name'],
                'email' => $userRaw['email'] ?? 'NULL',
                'phone' => $userRaw['phone'] ?? 'NULL',
                'role_id' => $userRaw['role_id'],
                'is_active' => $userRaw['is_active'],
                'password_length' => strlen($userRaw['password'] ?? ''),
            ];
        } catch (\Exception $e) {
            $steps[4]['status'] = 'error';
            $steps[4]['message'] = 'Error executing SQL query';
            $steps[4]['error'] = $e->getMessage();
            $success = false;
            $errorCode = 'SQL_ERROR';

            return response()->json([
                'success' => false,
                'error_code' => $errorCode,
                'message' => 'SQL query failed',
                'steps' => $steps,
            ], 500);
        }


        // ============================================================
        // STEP 6: Check user data integrity
        // ============================================================
        $steps[] = [
            'step' => 6,
            'name' => 'User Data Integrity',
            'status' => 'testing',
            'message' => 'Checking if user data is valid...',
        ];

        $dataIssues = [];

        if (empty($userRaw['email']) || is_null($userRaw['email'])) {
            $dataIssues[] = 'email is NULL or empty';
        }

        if (empty($userRaw['phone']) || is_null($userRaw['phone'])) {
            $dataIssues[] = 'phone is NULL or empty';
        }

        if (empty($userRaw['name']) || is_null($userRaw['name'])) {
            $dataIssues[] = 'name is NULL or empty';
        }

        if (empty($userRaw['password']) || is_null($userRaw['password'])) {
            $dataIssues[] = 'password is NULL or empty';
        }

        if (!empty($dataIssues)) {
            $steps[5]['status'] = 'warning';
            $steps[5]['message'] = 'User data has issues';
            $steps[5]['data'] = [
                'issues' => $dataIssues,
                'user_data' => $userRaw,
            ];
        } else {
            $steps[5]['status'] = 'success';
            $steps[5]['message'] = 'User data is valid';
            $steps[5]['data'] = [
                'all_fields_present' => true,
            ];
        }


        // ============================================================
        // STEP 7: Check password
        // ============================================================
        $steps[] = [
            'step' => 7,
            'name' => 'Password Check',
            'status' => 'testing',
            'message' => 'Checking password...',
        ];

        $dbPassword = $userRaw['password'];
        $inputPassword = $password;

        $steps[6]['data'] = [
            'input_password' => $inputPassword,
            'db_password' => $dbPassword,
            'match' => ($dbPassword === $inputPassword),
        ];

        if ($dbPassword !== $inputPassword) {
            $steps[6]['status'] = 'error';
            $steps[6]['message'] = 'Password does NOT match';
            $steps[6]['data']['reason'] = 'Plain text comparison failed';
            $success = false;
            $errorCode = 'INVALID_PASSWORD';

            return response()->json([
                'success' => false,
                'error_code' => $errorCode,
                'message' => 'Invalid password',
                'steps' => $steps,
            ], 401);
        }

        $steps[6]['status'] = 'success';
        $steps[6]['message'] = 'Password matches';


        // ============================================================
        // STEP 8: Check if user is active
        // ============================================================
        $steps[] = [
            'step' => 8,
            'name' => 'User Status',
            'status' => 'testing',
            'message' => 'Checking if user is active...',
        ];

        if ($userRaw['is_active'] != 1) {
            $steps[7]['status'] = 'error';
            $steps[7]['message'] = 'User is NOT active';
            $steps[7]['data'] = [
                'is_active' => $userRaw['is_active'],
            ];
            $success = false;
            $errorCode = 'USER_INACTIVE';

            return response()->json([
                'success' => false,
                'error_code' => $errorCode,
                'message' => 'User account is inactive',
                'steps' => $steps,
            ], 403);
        }

        $steps[7]['status'] = 'success';
        $steps[7]['message'] = 'User is active';


        // ============================================================
        // STEP 9: Check Role exists
        // ============================================================
        $steps[] = [
            'step' => 9,
            'name' => 'Role Check',
            'status' => 'testing',
            'message' => 'Checking if role exists...',
        ];

        try {
            $roleId = $userRaw['role_id'];
            $role = DB::table('roles')->where('id', $roleId)->first();

            if (!$role) {
                $steps[8]['status'] = 'error';
                $steps[8]['message'] = "Role ID $roleId not found in roles table";
                $steps[8]['data'] = [
                    'role_id' => $roleId,
                    'exists' => false,
                ];
                $success = false;
                $errorCode = 'ROLE_NOT_FOUND';

                return response()->json([
                    'success' => false,
                    'error_code' => $errorCode,
                    'message' => "Role ID $roleId does not exist",
                    'steps' => $steps,
                ], 500);
            }

            $steps[8]['status'] = 'success';
            $steps[8]['message'] = 'Role found';
            $steps[8]['data'] = [
                'role_id' => $role->id,
                'role_name' => $role->name,
                'role_slug' => $role->slug,
            ];
        } catch (\Exception $e) {
            $steps[8]['status'] = 'error';
            $steps[8]['message'] = 'Error checking role';
            $steps[8]['error'] = $e->getMessage();
            $success = false;
            $errorCode = 'ROLE_CHECK_ERROR';
        }


        // ============================================================
        // STEP 10: Laravel Model Test
        // ============================================================
        $steps[] = [
            'step' => 10,
            'name' => 'Laravel Model Test',
            'status' => 'testing',
            'message' => 'Testing Laravel User model...',
        ];

        try {
            $userModel = User::where('email', $loginId)
                ->orWhere('phone', $loginId)
                ->first();

            if (!$userModel) {
                $steps[9]['status'] = 'error';
                $steps[9]['message'] = 'User model returned null';
                $steps[9]['data'] = [
                    'query_used' => "User::where('email', $loginId)->orWhere('phone', $loginId)->first()",
                ];
                $success = false;
                $errorCode = 'MODEL_NOT_FOUND';
            } else {
                $steps[9]['status'] = 'success';
                $steps[9]['message'] = 'Laravel User model works';
                $steps[9]['data'] = [
                    'model_id' => $userModel->id,
                    'model_email' => $userModel->email,
                    'model_phone' => $userModel->phone,
                    'model_name' => $userModel->name,
                ];
            }
        } catch (\Exception $e) {
            $steps[9]['status'] = 'error';
            $steps[9]['message'] = 'Laravel model error';
            $steps[9]['error'] = $e->getMessage();
            $steps[9]['trace'] = $e->getTraceAsString();
            $success = false;
            $errorCode = 'MODEL_ERROR';
        }


        // ============================================================
        // FINAL RESULT
        // ============================================================

        if ($success) {
            return response()->json([
                'success' => true,
                'message' => 'All diagnostic steps passed! Login should work.',
                'user' => [
                    'id' => $userRaw['id'],
                    'name' => $userRaw['name'],
                    'email' => $userRaw['email'],
                    'phone' => $userRaw['phone'],
                    'role_id' => $userRaw['role_id'],
                    'role_name' => $role->name ?? null,
                    'is_active' => $userRaw['is_active'],
                ],
                'steps' => $steps,
            ], 200);
        } else {
            return response()->json([
                'success' => false,
                'error_code' => $errorCode,
                'message' => 'Diagnostic failed at step ' . $errorCode,
                'steps' => $steps,
            ], 500);
        }
    }

    /**
     * Simple database info endpoint
     */
    public function databaseInfo()
    {
        try {
            return response()->json([
                'success' => true,
                'database' => [
                    'name' => env('DB_DATABASE'),
                    'username' => env('DB_USERNAME'),
                    'host' => env('DB_HOST'),
                    'connection' => 'connected',
                ],
                'users_count' => DB::table('users')->count(),
                'roles_count' => DB::table('roles')->count(),
                'all_users' => DB::table('users')->select('id', 'name', 'email', 'phone', 'role_id')->get(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
