<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../helpers.php';

class HelpersTest extends TestCase
{
    public function testCleanDescriptionStripsHtmlTags(): void
    {
        $input = '<p>Hello <b>World</b></p>';
        $expected = 'Hello World';
        $this->assertSame($expected, cleanDescription($input));
    }

    public function testCleanDescriptionDecodesEntities(): void
    {
        $input = 'AT&amp;T &amp; Sony';
        $expected = 'AT&T & Sony';
        $this->assertSame($expected, cleanDescription($input));
    }

    public function testCleanDescriptionHandlesEmptyString(): void
    {
        $this->assertSame('', cleanDescription(''));
    }

    public function testCleanDescriptionCollapsesExcessNewlines(): void
    {
        $input = "<p>Line one</p>\n\n\n\n<p>Line two</p>";
        $result = cleanDescription($input);
        $this->assertStringNotContainsString("\n\n\n", $result);
    }
}
