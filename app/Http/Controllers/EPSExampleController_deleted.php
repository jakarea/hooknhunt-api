<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\EPS\EPSPayment;

class EPSExampleController extends Controller
{
	public function index(){
		return view('payment.index');
	}
    

    public function initializePayment(Request $request)
    {
       /*$product_arr= array()*/;
			// Get and Loop Over Order Items
			/*foreach ( $order->get_items() as $item_id => $item ) {
				
				$product_arr[]=[
                "ProductName"=>(string)$product_name, 
                "NoOfItem"=> (string)$item->get_quantity(), 
                "ProductProfile"=> (string)$product_id, 
                "ProductCategory"=>(string)$item_type, 
                "ProductPrice"=> (string)$item->get_total() 
                ];
			}*/
			$product_arr = [
				[
					"ProductName" => "T-Shirt",
					"NoOfItem" => "2",
					"ProductProfile" => "101",
					"ProductCategory" => "Clothing",
					"ProductPrice" => "500"
				],
				[
					"ProductName" => "Shoes",
					"NoOfItem" => "1",
					"ProductProfile" => "205",
					"ProductCategory" => "Footwear",
					"ProductPrice" => "1200"
				]
			];
	
        $customerOrderId = uniqid('order_');
        $payload = [
            "totalAmount" => $request->amount,
            "ipAddress" => "37.111.218.149",
            
            'CustomerOrderId' => $customerOrderId,
            "successUrl" => route('payment.success'),
            "failUrl" => route('payment.fail'),
            "cancelUrl" => route('payment.cancel'),
			
            "customerName" => "Jone De",
            "customerEmail" => "JoneDe@gmail.com",
            "customerAddress" => "Looking up an address",
            "customerAddress2" => "Looking up an address",
            "customerCity" => "Dhaka",
            "customerState" => "Dhaka",
            "customerPostcode" => "1000",
            "customerCountry" => "Bangladesh",
            "customerPhone"=> "01700000000",
    
            "shipmentName"=> "shipmentName",
            "shipmentAddress"=> "Looking up an address",
            "shipmentAddress2"=> "Looking up an address",
            "shipmentCity"=> "Dhaka",
            "shipmentState"=> "Dhaka",
            "shipmentPostcode"=> "1000",
            "shipmentCountry"=> "Bangladesh",
    
            "valueA"=> "customer_id",
            "valueB"=> "local_transaction_id",
            "valueC"=> "order_id-123",
    
    
            "shippingMethod"=> "Home Delivery",
            "noOfItem"=> "2",
            "productName"=> "product name 1, product name 2",
            "productProfile"=> "product profile 1, product profile 2",
            "productCategory"=> "product Category 1, product Category 2",
			"ProductList"=>$product_arr,
        ];

        $epsPayment = new EPSPayment();
        $data = $epsPayment->CreatePayment($payload);

        if (isset($data['RedirectURL'])) {
            // Redirect the user to the payment page
            return redirect($data['RedirectURL']);
        } else {
            return response()->json(['error' => $data['ErrorMessage'] ?? 'Unknown error'], 500);
        }
    }



    public function success(Request $request)
    {
        // Save the transaction details to the database
        $transactionId = '';
        $merchantTransactionId = $_GET['MerchantTransactionId'];
        //$amount = $request->get('amount');
        $status = $_GET['Status'];

        // Save data to the database
        // Example:
        // Transaction::create([...]);

        return view('payment.success', ['transactionId' => '', 'amount' =>10]);
    }


    public function fail(Request $request)
    {
		
        $transactionId = $_GET['EPSTransactionId_'];
        $status = $_GET['Status'];

        return view('payment.fail', ['transactionId' => $transactionId]);
    }

    public function cancel(Request $request)
    {
        $transactionId = $_GET['EPSTransactionId_'];
        $status = $_GET['Status'];

        return view('payment.cancel', ['transactionId' => $transactionId]);
    }
}