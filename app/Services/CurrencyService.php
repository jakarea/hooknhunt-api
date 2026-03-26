<?php

namespace App\Services;

use App\Models\Currency;
use Illuminate\Support\Facades\Cache;

class CurrencyService
{
    /**
     * Convert amount from one currency to another
     */
    public function convert(float $amount, int|string|Currency $fromCurrency, int|string|Currency $toCurrency = null): float
    {
        $from = $this->resolveCurrency($fromCurrency);
        $to = $toCurrency ? $this->resolveCurrency($toCurrency) : Currency::getDefault();

        if (!$from || !$to) {
            return $amount;
        }

        // If same currency, return as is
        if ($from->id === $to->id) {
            return $amount;
        }

        // Convert to default currency (BDT) first
        $amountInDefault = $from->convertToDefault($amount);

        // Then convert from default to target currency
        return $to->convertFromDefault($amountInDefault);
    }

    /**
     * Get formatted amount with currency symbol
     */
    public function format(float $amount, int|string|Currency $currency = null): string
    {
        $currency = $currency ? $this->resolveCurrency($currency) : Currency::getDefault();

        if (!$currency) {
            return number_format($amount, 2);
        }

        return $currency->formatAmount($amount);
    }

    /**
     * Get exchange rate between two currencies
     */
    public function getExchangeRate(int|string|Currency $fromCurrency, int|string|Currency $toCurrency = null): float
    {
        $from = $this->resolveCurrency($fromCurrency);
        $to = $toCurrency ? $this->resolveCurrency($toCurrency) : Currency::getDefault();

        if (!$from || !$to) {
            return 1.0;
        }

        // If same currency, rate is 1
        if ($from->id === $to->id) {
            return 1.0;
        }

        // Calculate cross rate through default currency
        $fromRate = $from->exchange_rate ?? 1.0;
        $toRate = $to->exchange_rate ?? 1.0;

        if ($toRate == 0) {
            return 1.0;
        }

        return $fromRate / $toRate;
    }

    /**
     * Update exchange rate for a currency
     */
    public function updateExchangeRate(int|string|Currency $currency, float $rateToDefault): bool
    {
        $currency = $this->resolveCurrency($currency);

        if (!$currency) {
            return false;
        }

        // Don't update default currency rate (always 1)
        if ($currency->is_default) {
            return false;
        }

        $currency->exchange_rate = $rateToDefault;
        $currency->save();

        // Clear cache
        $this->clearCache();

        return true;
    }

    /**
     * Get all active currencies
     */
    public function getActiveCurrencies()
    {
        return Cache::remember('currencies.active', 3600, function () {
            return Currency::active()->get();
        });
    }

    /**
     * Clear currency cache
     */
    public function clearCache(): void
    {
        Cache::forget('currencies.active');
        Cache::forget('currency.default');
    }

    /**
     * Resolve currency from ID, code, or Currency model
     */
    protected function resolveCurrency(int|string|Currency $currency): ?Currency
    {
        if ($currency instanceof Currency) {
            return $currency;
        }

        if (is_int($currency)) {
            return Currency::find($currency);
        }

        if (is_string($currency)) {
            return Currency::where('code', $currency)->first();
        }

        return null;
    }
}
