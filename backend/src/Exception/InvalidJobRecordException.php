<?php

declare(strict_types=1);

namespace App\Exception;

use RuntimeException;

/**
 * Thrown by a normalizer when a single raw record is missing required
 * fields or has a shape that can't be safely normalized.
 *
 * The sync runner catches this per-record — one malformed listing from a
 * source is logged and skipped, it never aborts the rest of that source's
 * batch.
 */
final class InvalidJobRecordException extends RuntimeException
{
}
