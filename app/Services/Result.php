<?php

namespace App\Services;

/**
 * Result object for Railway Oriented Programming.
 *
 * This class encapsulates the result of an operation that can either succeed or fail.
 * It follows the Railway Oriented Programming pattern where errors are handled
 * predictably without exceptions.
 *
 * @template T
 * @template E
 */
class Result
{
    private function __construct(
        public readonly bool $isSuccess,
        public readonly mixed $value,
        public readonly mixed $error,
    ) {}

    /**
     * Create a successful result with a value.
     *
     * @param T $value
     * @return self<T, E>
     */
    public static function success(mixed $value = null): self
    {
        return new self(true, $value, null);
    }

    /**
     * Create a failed result with an error.
     *
     * @param E $error
     * @return self<T, E>
     */
    public static function failure(mixed $error): self
    {
        return new self(false, null, $error);
    }

    /**
     * Get the value if successful, or throw an exception.
     *
     * @return T
     * @throws \RuntimeException
     */
    public function getValue(): mixed
    {
        if (!$this->isSuccess) {
            throw new \RuntimeException('Cannot get value from a failed result. Use getError() instead.');
        }

        return $this->value;
    }

    /**
     * Get the error if failed, or throw an exception.
     *
     * @return E
     * @throws \RuntimeException
     */
    public function getError(): mixed
    {
        if ($this->isSuccess) {
            throw new \RuntimeException('Cannot get error from a successful result. Use getValue() instead.');
        }

        return $this->error;
    }

    /**
     * Execute callback if successful, return failure otherwise.
     *
     * @param callable $callback
     * @return self
     */
    public function onSuccess(callable $callback): self
    {
        if ($this->isSuccess) {
            $callback($this->value);
        }

        return $this;
    }

    /**
     * Execute callback if failed, return success otherwise.
     *
     * @param callable $callback
     * @return self
     */
    public function onFailure(callable $callback): self
    {
        if (!$this->isSuccess) {
            $callback($this->error);
        }

        return $this;
    }

    /**
     * Transform the value if successful using a callback.
     *
     * @param callable $callback
     * @return self
     */
    public function map(callable $callback): self
    {
        if (!$this->isSuccess) {
            return $this;
        }

        try {
            return self::success($callback($this->value));
        } catch (\Exception $e) {
            return self::failure($e->getMessage());
        }
    }

    /**
     * Chain operations that return Results.
     *
     * @param callable $callback
     * @return self
     */
    public function flatMap(callable $callback): self
    {
        if (!$this->isSuccess) {
            return $this;
        }

        $result = $callback($this->value);

        if (!$result instanceof self) {
            return self::failure('flatMap callback must return a Result');
        }

        return $result;
    }

    /**
     * Get value or return default if failed.
     *
     * @param mixed $default
     * @return T|mixed
     */
    public function getValueOr(mixed $default): mixed
    {
        return $this->isSuccess ? $this->value : $default;
    }

    /**
     * Check if result is successful.
     */
    public function isSuccess(): bool
    {
        return $this->isSuccess;
    }

    /**
     * Check if result is failed.
     */
    public function isFailure(): bool
    {
        return !$this->isSuccess;
    }
}
