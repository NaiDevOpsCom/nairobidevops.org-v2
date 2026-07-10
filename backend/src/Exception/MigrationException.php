<?php

declare(strict_types=1);

namespace App\Exception;

use RuntimeException;

/**
 * Thrown when a migration file fails validation — invalid filename format,
 * duplicate version, unreadable file, or execution failure.
 *
 * The migration runner stops at the first failure to avoid leaving the
 * database in a partially-migrated state.
 */
final class MigrationException extends RuntimeException
{
}
