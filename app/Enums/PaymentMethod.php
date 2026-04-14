<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case CARD = 'card';
    case BKASH = 'bkash';
    case NAGAD = 'nagad';
    case MOBILE_BANKING = 'mobile_banking';
    case INTERNET_BANKING = 'internet_banking';
    case WALLET = 'wallet';

    public function label(): string
    {
        return match ($this) {
            self::CARD => 'Card (Visa/Mastercard)',
            self::BKASH => 'bKash',
            self::NAGAD => 'Nagad',
            self::MOBILE_BANKING => 'Mobile Banking',
            self::INTERNET_BANKING => 'Internet Banking',
            self::WALLET => 'Wallet',
        };
    }
}
