<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Services\CurrencyService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CurrencyController extends Controller
{
    protected CurrencyService $currencyService;

    public function __construct(CurrencyService $currencyService)
    {
        $this->currencyService = $currencyService;
    }

    /**
     * Get all currencies
     */
    public function index(Request $request): JsonResponse
    {
        $query = Currency::query();

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $currencies = $query->orderBy('is_default', 'desc')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $currencies,
        ]);
    }

    /**
     * Get single currency
     */
    public function show(int $id): JsonResponse
    {
        $currency = Currency::find($id);

        if (!$currency) {
            return response()->json([
                'success' => false,
                'message' => 'Currency not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $currency,
        ]);
    }

    /**
     * Get default currency
     */
    public function getDefault(): JsonResponse
    {
        $currency = Currency::getDefault();

        if (!$currency) {
            return response()->json([
                'success' => false,
                'message' => 'Default currency not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $currency,
        ]);
    }

    /**
     * Create new currency
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:3|unique:currencies,code',
            'name' => 'required|string|max:255',
            'symbol' => 'required|string|max:10',
            'symbol_position' => 'required|in:left,right',
            'decimal_places' => 'required|integer|min:0|max:6',
            'exchange_rate' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = auth()->id();
        $validated['updated_by'] = auth()->id();

        $currency = Currency::create($validated);

        $this->currencyService->clearCache();

        return response()->json([
            'success' => true,
            'message' => 'Currency created successfully',
            'data' => $currency,
        ], 201);
    }

    /**
     * Update currency
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $currency = Currency::find($id);

        if (!$currency) {
            return response()->json([
                'success' => false,
                'message' => 'Currency not found',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'symbol' => 'sometimes|string|max:10',
            'symbol_position' => 'sometimes|in:left,right',
            'decimal_places' => 'sometimes|integer|min:0|max:6',
            'exchange_rate' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        // Prevent modifying default currency code and rate
        if ($currency->is_default) {
            unset($validated['exchange_rate']);
        }

        $validated['updated_by'] = auth()->id();

        // If setting this currency as default, remove default flag from all others
        if (isset($validated['is_default']) && $validated['is_default'] === true) {
            Currency::where('id', '!=', $id)->update(['is_default' => false]);
        }

        $currency->update($validated);

        $this->currencyService->clearCache();

        return response()->json([
            'success' => true,
            'message' => 'Currency updated successfully',
            'data' => $currency->fresh(),
        ]);
    }

    /**
     * Delete currency
     */
    public function destroy(int $id): JsonResponse
    {
        $currency = Currency::find($id);

        if (!$currency) {
            return response()->json([
                'success' => false,
                'message' => 'Currency not found',
            ], 404);
        }

        // Prevent deleting default currency
        if ($currency->is_default) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete default currency',
            ], 400);
        }

        $currency->delete();

        $this->currencyService->clearCache();

        return response()->json([
            'success' => true,
            'message' => 'Currency deleted successfully',
        ]);
    }

    /**
     * Convert amount between currencies
     */
    public function convert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric',
            'from_currency' => 'required|exists:currencies,code',
            'to_currency' => 'nullable|exists:currencies,code',
            'format' => 'boolean',
        ]);

        $fromCurrency = $validated['from_currency'];
        $toCurrency = $validated['to_currency'] ?? null;
        $amount = (float) $validated['amount'];

        $converted = $this->currencyService->convert($amount, $fromCurrency, $toCurrency);
        $rate = $this->currencyService->getExchangeRate($fromCurrency, $toCurrency);

        $response = [
            'success' => true,
            'data' => [
                'from' => $fromCurrency,
                'to' => $toCurrency ?? 'BDT',
                'amount' => $amount,
                'converted_amount' => $converted,
                'exchange_rate' => $rate,
            ],
        ];

        if ($request->boolean('format')) {
            $response['data']['formatted_original'] = $this->currencyService->format($amount, $fromCurrency);
            $response['data']['formatted_converted'] = $this->currencyService->format($converted, $toCurrency);
        }

        return response()->json($response);
    }

    /**
     * Update exchange rate
     */
    public function updateExchangeRate(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'exchange_rate' => 'required|numeric|min:0',
        ]);

        $currency = Currency::find($id);

        if (!$currency) {
            return response()->json([
                'success' => false,
                'message' => 'Currency not found',
            ], 404);
        }

        $success = $this->currencyService->updateExchangeRate($currency, $validated['exchange_rate']);

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update default currency exchange rate',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Exchange rate updated successfully',
            'data' => $currency->fresh(),
        ]);
    }
}
