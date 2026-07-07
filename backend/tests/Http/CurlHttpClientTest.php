<?php

declare(strict_types=1);

namespace Tests\Http;

use App\Http\CurlHttpClient;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class CurlHttpClientTest extends TestCase
{
    #[Test]
    #[DataProvider('environments')]
    public function forEnvironmentEnablesSslVerificationOnlyForProtectedEnvironments(
        ?string $appEnv,
        bool $expectedVerifySsl,
    ): void {
        $client = CurlHttpClient::forEnvironment($appEnv);

        self::assertSame($expectedVerifySsl, $client->verifiesSsl());
    }

    /**
     * @return array<string, array{0: string|null, 1: bool}>
     */
    public static function environments(): array
    {
        return [
            'production always verifies' => ['production', true],
            'staging always verifies' => ['staging', true],
            'local does not verify' => ['local', false],
            'undefined APP_ENV does not verify' => [null, false],
            'unrecognized value does not verify' => ['qa', false],
        ];
    }

    #[Test]
    public function defaultConstructorVerifiesSslUnlessToldOtherwise(): void
    {
        $client = new CurlHttpClient();

        self::assertTrue($client->verifiesSsl());
    }

    #[Test]
    public function explicitFalseDisablesVerification(): void
    {
        $client = new CurlHttpClient(false);

        self::assertFalse($client->verifiesSsl());
    }
}
