<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

/**
 * CRM Web Controller
 *
 * Handles web routes for CRM functionality including customer management.
 * This controller works with the CRM API to provide a seamless CRM experience.
 */
class CRMController extends Controller
{
    /**
     * Display CRM dashboard/index page
     *
     * @return \Illuminate\View\View
     */
    public function index()
    {
        return view('crm::index');
    }

    /**
     * Display CRM customers page (Single Page Application style)
     *
     * Can show:
     * - List view of all customers (when no ID provided)
     * - Single customer details (when ID is provided)
     *
     * @param  int|null  $id  Customer ID (optional)
     * @return \Illuminate\View\View
     */
    public function customers($id = null)
    {
        // If customer ID is provided, show single customer details
        if ($id) {
            $customer = DB::table('customers')->where('id', $id)->first();

            if (!$customer) {
                abort(404, 'Customer not found');
            }

            return view('crm::customers', [
                'mode' => 'single',
                'customer' => $customer,
                'customerId' => $id
            ]);
        }

        // Show all customers list
        return view('crm::customers', [
            'mode' => 'list'
        ]);
    }

    /**
     * Display single customer details (alias for customers method)
     *
     * @param  int  $id Customer ID
     * @return \Illuminate\View\View
     */
    public function customerDetails($id)
    {
        return $this->customers($id);
    }

    /**
     * Show the form for creating a new customer
     *
     * @return \Illuminate\View\View
     */
    public function create()
    {
        return view('crm::create');
    }

    /**
     * Store a newly created customer in storage
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        // Validation and creation handled by API
        return redirect()->route('crm.customers')
            ->with('success', 'Customer created successfully');
    }

    /**
     * Display the specified customer
     *
     * @param  int  $id
     * @return \Illuminate\View\View
     */
    public function show($id)
    {
        return redirect()->route('crm.customers.show', $id);
    }

    /**
     * Show the form for editing the specified customer
     *
     * @param  int  $id
     * @return \Illuminate\View\View
     */
    public function edit($id)
    {
        // Validate customer exists
        $customer = DB::table('customers')->where('id', $id)->first();

        if (!$customer) {
            abort(404, 'Customer not found');
        }

        return view('crm::edit', [
            'customerId' => $id,
            'customer' => $customer
        ]);
    }

    /**
     * Update the specified customer in storage
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        // Validation and update handled by API
        return redirect()->route('crm.customers.show', $id)
            ->with('success', 'Customer updated successfully');
    }

    /**
     * Remove the specified customer from storage
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        // Deletion handled by API
        return redirect()->route('crm.customers')
            ->with('success', 'Customer deleted successfully');
    }
}
