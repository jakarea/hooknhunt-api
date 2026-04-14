<?php

namespace App\Enums;

enum PaymentGateway: string
{
    case SSLCOMMERZ = 'sslcommerz';
    case BKASH = 'bkash';
    case NAGAD = 'nagad';
    case ROCKET = 'rocket';
    case UPAY = 'upay';
    case TAP = 'tap';

    public function label(): string
    {
        return match ($this) {
            self::SSLCOMMERZ => 'SSL Commerz',
            self::BKASH => 'bKash',
            self::NAGAD => 'Nagad',
            self::ROCKET => 'Rocket',
            self::UPAY => 'Upay',
            self::TAP => 'Tap',
        };
    }

    public static function toArray(): array
    {
        return array_map(fn ($case) => $case->value, self::cases());
    }
}
