<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get role IDs
        $roles = DB::table('roles')->pluck('id', 'slug');

        // Get department IDs (for staff) - will be null if no departments exist yet
        try {
            $departments = DB::table('departments')->pluck('id', 'name');
        } catch (\Exception $e) {
            $departments = collect();
        }

        // Division list of Bangladesh
        $divisions = [
            'Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Barisal',
            'Sylhet', 'Rangpur', 'Mymensingh'
        ];

        // Bengali names data
        $bengaliNames = $this->getBengaliNames();

        // Designations for staff
        $designations = [
            'Manager', 'Assistant Manager', 'Senior Executive', 'Executive',
            'Team Lead', 'Supervisor', 'Senior Officer', 'Officer'
        ];

        $users = [];
        $userProfiles = [];
        $staffProfiles = [];
        $customerProfiles = [];
        $addresses = [];
        $wallets = [];
        $usedPhones = [];
        $usedEmails = [];

        // Generate 20 Staff (admin role)
        for ($i = 0; $i < 20; $i++) {
            $userId = $this->generateUserId($users, 100);
            $name = $bengaliNames[array_rand($bengaliNames)];
            $phone = $this->generatePhone();
            $email = $this->generateEmail($name);

            // Check uniqueness - both in DB and in current batch
            while (in_array($phone, $usedPhones) || DB::table('users')->where('phone', $phone)->exists()) {
                $phone = $this->generatePhone();
            }
            while (in_array($email, $usedEmails) || DB::table('users')->where('email', $email)->exists()) {
                $email = $this->generateEmail($name);
            }

            $usedPhones[] = $phone;
            $usedEmails[] = $email;

            $users[] = [
                'id' => $userId,
                'role_id' => $roles['admin'] ?? null,
                'name' => $name,
                'phone' => $phone,
                'email' => $email,
                'password' =>'1234567890',
                'is_active' => true,
                'phone_verified_at' => Carbon::now(),
                'last_login_at' => rand(0, 1) ? Carbon::now()->subDays(rand(1, 30)) : null,
                'created_at' => Carbon::now()->subDays(rand(1, 365)),
                'updated_at' => Carbon::now(),
            ];

            // user_profiles
            $userProfiles[] = [
                'user_id' => $userId,
                'address' => rand(0, 1) ? $this->generateAddress() : null,
                'division' => $divisions[array_rand($divisions)],
                'district' => null,
                'thana' => null,
                'dob' => rand(0, 1) ? Carbon::createFromFormat('Y-m-d', rand(1980, 2000) . '-' . str_pad(rand(1, 12), 2, '0') . '-' . str_pad(rand(1, 28), 2, '0')) : null,
                'gender' => rand(0, 1) ? (rand(0, 1) ? 'male' : 'female') : null,
                'profile_photo_id' => null,
            ];

            // staff_profiles
            $joiningDate = Carbon::now()->subYears(rand(1, 10));
            $staffProfiles[] = [
                'user_id' => $userId,
                'dob' => Carbon::createFromFormat('Y-m-d', rand(1985, 1995) . '-' . str_pad(rand(1, 12), 2, '0') . '-' . str_pad(rand(1, 28), 2, '0')),
                'gender' => rand(0, 1) ? (rand(0, 1) ? 'male' : 'female') : null,
                'profile_photo_id' => null,
                'address' => rand(0, 1) ? $this->generateAddress() : null,
                'division' => $divisions[array_rand($divisions)],
                'district' => null,
                'thana' => null,
                'department_id' => $departments->isNotEmpty() ? $departments->random() : null,
                'designation' => $designations[array_rand($designations)],
                'joining_date' => $joiningDate,
                'office_email' => rand(0, 1) ? strtolower(str_replace(' ', '.', $name)) . '@hooknhunt.com' : null,
                'office_email_password' => rand(0, 1) ? 'encrypted_password' : null,
                'whatsapp_number' => rand(0, 1) ? $phone : null,
                'base_salary' => rand(15000, 50000) + rand(0, 99) / 100,
                'house_rent' => rand(2000, 8000) + rand(0, 99) / 100,
                'medical_allowance' => rand(500, 2000) + rand(0, 99) / 100,
                'conveyance_allowance' => rand(500, 1500) + rand(0, 99) / 100,
                'overtime_hourly_rate' => rand(100, 300) + rand(0, 99) / 100,
            ];
        }

        // Generate 20 Wholesale Customers
        for ($i = 0; $i < 20; $i++) {
            $userId = $this->generateUserId($users, 200);
            $name = $bengaliNames[array_rand($bengaliNames)];
            $phone = $this->generatePhone();
            $email = $this->generateEmail($name);

            while (in_array($phone, $usedPhones) || DB::table('users')->where('phone', $phone)->exists()) {
                $phone = $this->generatePhone();
            }
            while (in_array($email, $usedEmails) || DB::table('users')->where('email', $email)->exists()) {
                $email = $this->generateEmail($name);
            }

            $usedPhones[] = $phone;
            $usedEmails[] = $email;

            $users[] = [
                'id' => $userId,
                'role_id' => $roles['wholesale_customer'] ?? null,
                'name' => $name,
                'phone' => $phone,
                'email' => $email,
                'password' => Hash::make('1234567890'),
                'is_active' => true,
                'phone_verified_at' => Carbon::now(),
                'last_login_at' => rand(0, 1) ? Carbon::now()->subDays(rand(1, 30)) : null,
                'created_at' => Carbon::now()->subDays(rand(1, 365)),
                'updated_at' => Carbon::now(),
            ];

            // user_profiles
            $userProfiles[] = [
                'user_id' => $userId,
                'address' => rand(0, 1) ? $this->generateAddress() : null,
                'division' => $divisions[array_rand($divisions)],
                'district' => null,
                'thana' => null,
                'dob' => rand(0, 1) ? Carbon::createFromFormat('Y-m-d', rand(1980, 2000) . '-' . str_pad(rand(1, 12), 2, '0') . '-' . str_pad(rand(1, 28), 2, '0')) : null,
                'gender' => rand(0, 1) ? (rand(0, 1) ? 'male' : 'female') : null,
                'profile_photo_id' => null,
            ];

            // customer_profiles (wholesale)
            $customerProfiles[] = [
                'user_id' => $userId,
                'dob' => rand(0, 1) ? Carbon::createFromFormat('Y-m-d', rand(1980, 2000) . '-' . str_pad(rand(1, 12), 2, '0') . '-' . str_pad(rand(1, 28), 2, '0')) : null,
                'gender' => rand(0, 1) ? (rand(0, 1) ? 'male' : 'female') : null,
                'source' => 'website',
                'medium' => rand(0, 1) ? ['google', 'facebook', 'referral', 'direct'][array_rand([0, 1, 2, 3])] : null,
                'referral_code' => rand(0, 1) ? strtoupper(substr(md5(uniqid()), 0, 8)) : null,
                'preferred_language' => 'bn',
                'preferred_currency' => 'BDT',
                'marketing_consent' => rand(0, 1) == 1,
                'do_not_contact' => false,
                'type' => 'wholesale',
                'trade_license_no' => rand(0, 1) ? 'TRL' . rand(100000, 999999) : null,
                'tax_id' => rand(0, 1) ? 'BIN' . rand(1000000000, 9999999999) : null,
                'loyalty_tier' => ['bronze', 'silver', 'gold', 'platinum'][array_rand([0, 1, 2, 3])],
                'loyalty_points' => rand(0, 500),
                'lifetime_value' => rand(10000, 500000) + rand(0, 99) / 100,
                'total_orders' => rand(0, 100),
                'total_spent' => rand(5000, 200000) + rand(0, 99) / 100,
                'avg_order_value' => rand(1000, 20000) + rand(0, 99) / 100,
                'last_order_date' => rand(0, 1) ? Carbon::now()->subDays(rand(1, 60)) : null,
                'notes' => rand(0, 1) ? 'Wholesale customer' : null,
                'tags' => rand(0, 1) ? json_encode(['wholesale', 'bulk_buyer']) : null,
            ];

            // addresses (1-2 per wholesale customer)
            $addressCount = rand(1, 2);
            for ($j = 0; $j < $addressCount; $j++) {
                $addresses[] = [
                    'user_id' => $userId,
                    'label' => $j == 0 ? 'Home' : 'Office',
                    'full_name' => $name,
                    'phone' => $phone,
                    'address_line1' => $this->generateAddress(),
                    'address_line2' => rand(0, 1) ? $this->generateAddress() : null,
                    'area' => $divisions[array_rand($divisions)],
                    'city' => $divisions[array_rand($divisions)],
                    'postal_code' => rand(1000, 9999),
                    'division' => $divisions[array_rand($divisions)],
                    'country' => 'Bangladesh',
                    'latitude' => rand(0, 1) ? (20.0 + rand(0, 10000) / 10000) : null,
                    'longitude' => rand(0, 1) ? (90.0 + rand(0, 10000) / 10000) : null,
                    'is_default' => $j == 0,
                    'is_billing_address' => $j == 0,
                    'is_shipping_address' => true,
                ];
            }

            // wallets
            $wallets[] = [
                'user_id' => $userId,
                'balance' => rand(0, 50000) + rand(0, 99) / 100,
                'total_credited' => rand(0, 100000) + rand(0, 99) / 100,
                'total_debited' => rand(0, 50000) + rand(0, 99) / 100,
                'is_active' => true,
                'is_frozen' => false,
            ];
        }

        // Generate 160 Retail Customers
        for ($i = 0; $i < 160; $i++) {
            $userId = $this->generateUserId($users, 1000);
            $name = $bengaliNames[array_rand($bengaliNames)];
            $phone = $this->generatePhone();
            $email = $this->generateEmail($name);

            while (in_array($phone, $usedPhones) || DB::table('users')->where('phone', $phone)->exists()) {
                $phone = $this->generatePhone();
            }
            while (in_array($email, $usedEmails) || DB::table('users')->where('email', $email)->exists()) {
                $email = $this->generateEmail($name);
            }

            $usedPhones[] = $phone;
            $usedEmails[] = $email;

            $users[] = [
                'id' => $userId,
                'role_id' => $roles['retail_customer'] ?? null,
                'name' => $name,
                'phone' => $phone,
                'email' => $email,
                'password' => Hash::make('1234567890'),
                'is_active' => rand(0, 10) != 0, // 90% active
                'phone_verified_at' => rand(0, 1) == 1 ? Carbon::now() : null,
                'last_login_at' => rand(0, 1) ? Carbon::now()->subDays(rand(1, 30)) : null,
                'created_at' => Carbon::now()->subDays(rand(1, 365)),
                'updated_at' => Carbon::now(),
            ];

            // user_profiles
            $userProfiles[] = [
                'user_id' => $userId,
                'address' => rand(0, 1) ? $this->generateAddress() : null,
                'division' => $divisions[array_rand($divisions)],
                'district' => null,
                'thana' => null,
                'dob' => rand(0, 1) ? Carbon::createFromFormat('Y-m-d', rand(1980, 2005) . '-' . str_pad(rand(1, 12), 2, '0') . '-' . str_pad(rand(1, 28), 2, '0')) : null,
                'gender' => rand(0, 1) ? (rand(0, 1) ? 'male' : 'female') : null,
                'profile_photo_id' => null,
            ];

            // customer_profiles (retail)
            $customerProfiles[] = [
                'user_id' => $userId,
                'dob' => rand(0, 1) ? Carbon::createFromFormat('Y-m-d', rand(1990, 2010) . '-' . str_pad(rand(1, 12), 2, '0') . '-' . str_pad(rand(1, 28), 2, '0')) : null,
                'gender' => rand(0, 1) ? (rand(0, 1) ? 'male' : 'female') : null,
                'source' => ['website', 'facebook', 'google', 'instagram', 'referral'][array_rand([0, 1, 2, 3, 4])],
                'medium' => rand(0, 1) ? ['organic', 'paid', 'social'][array_rand([0, 1, 2])] : null,
                'referral_code' => rand(0, 1) ? strtoupper(substr(md5(uniqid()), 0, 8)) : null,
                'preferred_language' => rand(0, 1) ? 'bn' : 'en',
                'preferred_currency' => 'BDT',
                'marketing_consent' => rand(0, 1) == 1,
                'do_not_contact' => rand(0, 1) == 0,
                'type' => 'retail',
                'trade_license_no' => null,
                'tax_id' => null,
                'loyalty_tier' => ['bronze', 'silver', 'gold'][array_rand([0, 1, 2])],
                'loyalty_points' => rand(0, 200),
                'lifetime_value' => rand(1000, 100000) + rand(0, 99) / 100,
                'total_orders' => rand(0, 50),
                'total_spent' => rand(500, 50000) + rand(0, 99) / 100,
                'avg_order_value' => rand(500, 5000) + rand(0, 99) / 100,
                'last_order_date' => rand(0, 1) ? Carbon::now()->subDays(rand(1, 90)) : null,
                'notes' => null,
                'tags' => rand(0, 1) ? json_encode(['new_customer', 'repeat_customer'][array_rand([0, 1])]) : null,
            ];

            // addresses (1 per retail customer, 30% have 2)
            $addresses[] = [
                'user_id' => $userId,
                'label' => 'Home',
                'full_name' => $name,
                'phone' => $phone,
                'address_line1' => $this->generateAddress(),
                'address_line2' => null,
                'area' => $divisions[array_rand($divisions)],
                'city' => $divisions[array_rand($divisions)],
                'postal_code' => rand(1000, 9999),
                'division' => $divisions[array_rand($divisions)],
                'country' => 'Bangladesh',
                'latitude' => rand(0, 1) ? (20.0 + rand(0, 10000) / 10000) : null,
                'longitude' => rand(0, 1) ? (90.0 + rand(0, 10000) / 10000) : null,
                'is_default' => true,
                'is_billing_address' => true,
                'is_shipping_address' => true,
            ];

            // 30% have a second address
            if (rand(0, 10) < 3) {
                $addresses[] = [
                    'user_id' => $userId,
                    'label' => 'Office',
                    'full_name' => $name,
                    'phone' => $phone,
                    'address_line1' => $this->generateAddress(),
                    'address_line2' => rand(0, 1) ? $this->generateAddress() : null,
                    'area' => $divisions[array_rand($divisions)],
                    'city' => $divisions[array_rand($divisions)],
                    'postal_code' => rand(1000, 9999),
                    'division' => $divisions[array_rand($divisions)],
                    'country' => 'Bangladesh',
                    'latitude' => rand(0, 1) ? (20.0 + rand(0, 10000) / 10000) : null,
                    'longitude' => rand(0, 1) ? (90.0 + rand(0, 10000) / 10000) : null,
                    'is_default' => false,
                    'is_billing_address' => false,
                    'is_shipping_address' => true,
                ];
            }

            // wallets
            $wallets[] = [
                'user_id' => $userId,
                'balance' => rand(0, 10000) + rand(0, 99) / 100,
                'total_credited' => rand(0, 20000) + rand(0, 99) / 100,
                'total_debited' => rand(0, 10000) + rand(0, 99) / 100,
                'is_active' => true,
                'is_frozen' => false,
            ];
        }

        // Insert all data
        DB::table('users')->insert($users);
        $this->command->info('✅ Created ' . count($users) . ' users');

        DB::table('user_profiles')->insert($userProfiles);
        $this->command->info('✅ Created ' . count($userProfiles) . ' user profiles');

        DB::table('staff_profiles')->insert($staffProfiles);
        $this->command->info('✅ Created ' . count($staffProfiles) . ' staff profiles');

        DB::table('customer_profiles')->insert($customerProfiles);
        $this->command->info('✅ Created ' . count($customerProfiles) . ' customer profiles');

        DB::table('addresses')->insert($addresses);
        $this->command->info('✅ Created ' . count($addresses) . ' addresses');

        DB::table('wallets')->insert($wallets);
        $this->command->info('✅ Created ' . count($wallets) . ' wallets');

        // Generate some initial wallet transactions
        $walletTransactions = [];
        $allWallets = DB::table('wallets')->get();
        foreach ($allWallets as $wallet) {
            // 40% of wallets have transactions
            if (rand(0, 10) < 4) {
                $numTransactions = rand(1, 5);
                $currentBalance = 0;

                for ($i = 0; $i < $numTransactions; $i++) {
                    $isCredit = rand(0, 1) == 1;
                    $amount = rand(100, 5000) + rand(0, 99) / 100;

                    if ($isCredit) {
                        $currentBalance += $amount;
                    } else {
                        $currentBalance -= $amount;
                    }

                    $walletTransactions[] = [
                        'wallet_id' => $wallet->id,
                        'type' => $isCredit ? 'credit' : 'debit',
                        'amount' => $amount,
                        'balance_before' => $currentBalance - ($isCredit ? $amount : -$amount),
                        'balance_after' => $currentBalance,
                        'source_type' => ['adjustment', 'conversion'][array_rand([0, 1])],
                        'source_id' => null,
                        'description' => $isCredit ? 'Initial credit' : 'Wallet adjustment',
                        'created_by' => null,
                        'created_at' => Carbon::now()->subDays(rand(1, 60)),
                    ];
                }
            }
        }

        if (!empty($walletTransactions)) {
            DB::table('wallet_transactions')->insert($walletTransactions);
            $this->command->info('✅ Created ' . count($walletTransactions) . ' wallet transactions');
        }

        $this->command->newLine();
        $this->command->info('📊 User Generation Summary:');
        $this->command->info('   📌 Staff (Admin): 20');
        $this->command->info('   🛒 Wholesale Customers: 20');
        $this->command->info('   🛍️  Retail Customers: 160');
        $this->command->info('   ━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->command->info('   ✅ Total Users: 200');
    }

    private function generateUserId(&$users, $maxId)
    {
        $usedIds = array_column($users, 'id');
        $userId = rand(1, $maxId);
        while (in_array($userId, $usedIds)) {
            $userId = rand(1, $maxId);
        }
        return $userId;
    }

    private function generatePhone()
    {
        return '017' . str_pad(rand(0, 9999999), 7, '0');
    }

    private function generateEmail($name)
    {
        $cleanName = strtolower(str_replace(' ', '', $name));
        $domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hooknhunt.com'];
        return $cleanName . rand(1, 999) . '@' . $domains[array_rand($domains)];
    }

    private function generateAddress()
    {
        $streets = ['Road', 'Street', 'Avenue', 'Lane', 'Sarani'];
        $areas = ['Uttara', 'Dhanmondi', 'Gulshan', 'Banani', 'Mirpur', 'Paltan', 'Motijheel'];
        return $areas[array_rand($areas)] . ' ' . rand(1, 999) . ' ' . $streets[array_rand($streets)];
    }

    private function getBengaliNames()
    {
        return [
            // Bangladeshi Actors
            'Abdur Razzak', 'Alamgir', 'Sohel Rana', 'Wasim', 'Jashim', 'Bulbul Ahmed',
            'Anwar Hossain', 'Farooque', 'Humayun Faridi', 'Manna', 'Salman Shah',
            'Shakib Khan', 'Riaz', 'Ferdous Ahmed', 'Arefin Shuvo', 'Chanchal Chowdhury',
            'Mosharraf Karim', 'Siam Ahmed', 'Ziaul Faruq Apurba', 'Irfan Sajjad',
            'Mahfuz Ahmed', 'Shahiduzzaman Selim', 'Ahmed Rubel', 'Hasan Masood',
            'Toukir Ahmed', 'Azizul Hakim', 'Ali Zaker', 'Abul Hayat', 'Mamunur Rashid',
            'Tariq Anam Khan', 'Fazlur Rahman Babu', 'Jayanto Chattopadhyay',
            'Raisul Islam Asad', 'ATM Shamsuzzaman', 'Prabir Mitra', 'Miju Ahmed',
            'Kazi Hayat', 'Shahadat Hossain', 'Nasir Uddin Khan', 'Shahriar Nazim Joy',
            'Mir Sabbir', 'Iresh Zaker', 'Rashed Mamun Apu', 'Azmeri Haque Badhon',
            'Zayed Khan', 'Ananta Jalil', 'Symon Sadik', 'Yash Rohan', 'Ador Azad',

            // Bangladeshi Actresses
            'Bobita', 'Shabana', 'Kabori Sarwar', 'Rozina', 'Champa', 'Diti',
            'Anwara Begum', 'Moushumi', 'Purnima', 'Shabnur', 'Apu Biswas',
            'Mahiya Mahi', 'Pori Moni', 'Joya Ahsan', 'Bidya Sinha Mim',
            'Nusrat Faria', 'Mehazabien Chowdhury', 'Tanjin Tisha', 'Sabila Nur',
            'Zakia Bari Momo', 'Runa Khan', 'Safa Kabir', 'Sunerah Binte Kamal',

            // Indian Actors
            'Amitabh Bachchan', 'Dilip Kumar', 'Raj Kapoor', 'Dev Anand',
            'Dharmendra', 'Rajesh Khanna', 'Shatrughan Sinha', 'Jeetendra',
            'Mithun Chakraborty', 'Anil Kapoor', 'Jackie Shroff', 'Sunny Deol',
            'Sanjay Dutt', 'Aamir Khan', 'Shah Rukh Khan', 'Salman Khan',
            'Saif Ali Khan', 'Akshay Kumar', 'Ajay Devgn', 'Hrithik Roshan',
            'Ranbir Kapoor', 'Ranveer Singh', 'Varun Dhawan', 'Shahid Kapoor',
            'Tiger Shroff', 'Ayushmann Khurrana', 'Vicky Kaushal', 'Rajkummar Rao',
            'Nawazuddin Siddiqui', 'Irrfan Khan', 'Pankaj Tripathi', 'Manoj Bajpayee',
            'R Madhavan', 'Suriya', 'Vijay', 'Ajith Kumar', 'Dhanush',
            'Prabhas', 'Allu Arjun', 'Ram Charan', 'Mahesh Babu', 'Jr NTR',
            'Chiranjeevi', 'Pawan Kalyan', 'Nagarjuna', 'Venkatesh',

            // Indian Actresses
            'Nargis', 'Madhubala', 'Waheeda Rehman', 'Meena Kumari',
            'Hema Malini', 'Rekha', 'Jaya Bachchan', 'Sridevi',
            'Madhuri Dixit', 'Juhi Chawla', 'Kajol', 'Rani Mukerji',
            'Karisma Kapoor', 'Kareena Kapoor', 'Priyanka Chopra',
            'Deepika Padukone', 'Katrina Kaif', 'Alia Bhatt',
            'Anushka Sharma', 'Vidya Balan', 'Kangana Ranaut',
            'Taapsee Pannu', 'Bhumi Pednekar', 'Kiara Advani',
            'Rashmika Mandanna', 'Samantha Ruth Prabhu',
            'Nayanthara', 'Trisha Krishnan', 'Sai Pallavi',
            'Tamannaah Bhatia', 'Pooja Hegde'
        ];

    }
}
