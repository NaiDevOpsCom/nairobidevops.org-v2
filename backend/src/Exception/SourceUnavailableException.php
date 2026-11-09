<?php

declare(strict_types=1);

namespace App\Exception;

use RuntimeException;

/**
 * Thrown by a fetcher when its source could not be reached after retries
 * are exhausted (timeout, connection failure, rate-limited, non-2xx status).
 *
 * The sync runner catches this per-source so one source being down never
 * prevents other sources from syncing successfully in the same run.
 */
final class SourceUnavailableException extends RuntimeException
{
}
