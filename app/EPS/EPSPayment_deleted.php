<?php 

namespace App\EPS;
use Illuminate\Support\Facades\Http;

class EPSPayment {

    protected $config = [];

    protected $baseUrl;
    protected $userName;
    protected $password;
    protected $deviceTypeId;
    protected $hashkey;
    protected $merchent_id;
    protected $store_id;
  
      /**
     * EPSPayment constructor.
     */
    public function __construct()
    {
        $this->config = config('epsPayment');

        $this->baseUrl = $this->config['EPSBaseURL'];
        $this->userName = $this->config['apiCredentials']['EPSUserName'];
        $this->password = $this->config['apiCredentials']['EPSPassword'];
        $this->deviceTypeId = $this->config['apiCredentials']['EPSDeviceTypeID'];
        $this->hashkey = $this->config['apiCredentials']['EPSHashkey'];
        $this->merchent_id = $this->config['apiCredentials']['EPSMerchentID'];
        $this->store_id = $this->config['apiCredentials']['EPSStoreID'];
        
    }


    protected function GenerateHash($payload,$hashkey){
        $utf8_key = utf8_encode($hashkey);
        $utf8_payload = utf8_encode($payload);
        $data = hash_hmac('sha512', $utf8_payload, $utf8_key,true);
        $hmac = base64_encode($data);
        return $hmac;
    } 

    protected function GetToken() {

        $req_body = array(    
            "userName"=>$this->userName, 
            "password"=>$this->password
        );        
        $x_hash = $this->GenerateHash($this->userName,$this->hashkey);
    
        $response = Http::withHeaders([
            "x-hash" => $x_hash,
            "Content-Type" => "application/json"
        ])->post($this->baseUrl.$this->config['apiUrl']['GetToken'],$req_body);

        if($response->status() == 200 && isset(($response->json($key = null))['token']) ){

            return $response->json($key = null);
        }
        else {
            die("Access Denied!");
            //return false;
        }
        
    }
    
    public function CreatePayment(array $payload) {

        $getToken_response = $this->GetToken();
        $invoice_id = (string)time() ;
        $req_body = array(
 
                "deviceTypeId"=> $this->deviceTypeId,
				"merchantId" => $this->merchent_id,
                "storeId" => $this->store_id,
                "transactionTypeId" => 1,
                "financialEntityId" => 0,
                "version"=> "1",
                "transactionDate" => date('c'),
                "transitionStatusId" => 0,
                "valueD"=> "",
				"merchantTransactionId" => $invoice_id,
        );

$payload['totalAmount'] = 1200;
        $req_body = array_merge($req_body, $payload);

        $x_hash = $this->GenerateHash($invoice_id,$this->hashkey);
        $token = $getToken_response['token'];


        $response = Http::withHeaders([
            "x-hash" => $x_hash,
            "Authorization" => "Bearer $token",
            "Content-Type" => "application/json"
        ])->post($this->baseUrl.$this->config['apiUrl']['Initialize'],$req_body);

 $data = $response->json($key = null);
 
        if($response->status() == 200 ){

            $data = $response->json($key = null);
            $data['isSuccess'] = true;
            return $data;
        }
        else {

            $data = $response->json($key = null);
            $data['isSuccess'] = false;
            return $data;
        }

    }

    //After payment check the payment status ...
    public function CheckPaymentStatus($invoice_id) {

        $getToken_response = $this->GetToken();

        $x_hash = $this->GenerateHash($invoice_id,$this->hashkey);
        $token = $getToken_response['token'];

        $response = Http::withHeaders([
            "x-hash" => $x_hash,
            "Authorization" => "Bearer $token",
            "Content-Type" => "application/json"
        ])->get($this->baseUrl.$this->config['apiUrl']['CheckPaymentStatus'].$invoice_id);

        return $response->json($key = null);

    }
}