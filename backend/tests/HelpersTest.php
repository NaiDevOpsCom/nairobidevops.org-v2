<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../helpers.php';

class HelpersTest extends TestCase
{
    // ════════════════════════════════════════════════════════════════════
    // cleanDescription()
    // ════════════════════════════════════════════════════════════════════

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

    // ════════════════════════════════════════════════════════════════════
    // isNonTechRole() — the hard block list checked FIRST in mapRoleType()
    // ════════════════════════════════════════════════════════════════════

    /**
     * @dataProvider nonTechTitleProvider
     */
    public function testIsNonTechRoleBlocksNonDevOpsDisciplines(string $title): void
    {
        $this->assertTrue(
            isNonTechRole(strtolower($title)),
            "Expected '{$title}' to be blocked by isNonTechRole()"
        );
    }

    public static function nonTechTitleProvider(): array
    {
        return [
            // Non-software engineering disciplines
            'civil engineer'        => ['EIT - Civil - Anchorage, AK'],
            'electrical engineer'   => ['Electrical Engineer - Tonawanda, NY'],
            'mechanical engineer'   => ['Senior Mechanical Engineer'],

            // Sales / business / account roles — the Liquibase bug case
            'sales engineer'        => ['Sales Engineer (Remote, US Based)'],
            'director of accounts'  => ['Director of Strategic Accounts'],
            'account manager'       => ['Senior Account Manager'],
            'recruiter'             => ['Technical Recruiter'],

            // Finance / ERP — the Oracle Cloud Finance Manager bug case
            'oracle cloud finance'  => ['Oracle Cloud Finance Manager'],
            'sap finance'           => ['SAP Finance Consultant'],

            // Design / content
            'web designer'          => ['Freelance Web Designer'],
            'graphic designer'      => ['Senior Graphic Designer'],

            // Non-infra research — the AI Research Engineer bug case
            'ai research'           => ['AI Research Engineer'],
            'research scientist'    => ['Research Scientist, NLP'],

            // Mobile/web/ecommerce dev explicitly not DevOps
            'wordpress'             => ['WordPress Developer'],
            'shopify'                => ['Senior Shopify Web Developer'],
            'react native developer' => ['Senior React Native Developer'],
        ];
    }

    public function testIsNonTechRoleAllowsGenuineDevOpsTitles(): void
    {
        $this->assertFalse(isNonTechRole(strtolower('Senior DevOps Engineer')));
        $this->assertFalse(isNonTechRole(strtolower('Site Reliability Engineer')));
        $this->assertFalse(isNonTechRole(strtolower('Cloud Security Architect')));
    }

    // ════════════════════════════════════════════════════════════════════
    // mapRoleType() — positive classification
    // ════════════════════════════════════════════════════════════════════

    public function testMapRoleTypeClassifiesSreAndSecurityTitles(): void
    {
        $this->assertSame('SRE', mapRoleType('Site Reliability Engineer'));
        $this->assertSame('Security', mapRoleType('Application Security Engineer'));
    }

    public function testMapRoleTypeClassifiesCloudArchitect(): void
    {
        $this->assertSame('Cloud Architect', mapRoleType('AWS Cloud Architect'));
        $this->assertSame('Cloud Architect', mapRoleType('Staff Engineer'));
    }

    public function testMapRoleTypeClassifiesPlatformEngineering(): void
    {
        $this->assertSame('Platform Engineering', mapRoleType('Platform Engineer'));
        $this->assertSame('Platform Engineering', mapRoleType('Developer Experience Engineer'));
    }

    public function testMapRoleTypeClassifiesSysadmin(): void
    {
        $this->assertSame('Sysadmin', mapRoleType('Linux Systems Administrator'));
        $this->assertSame('Sysadmin', mapRoleType('Network Engineer'));
    }

    public function testMapRoleTypeClassifiesDevOpsEngineer(): void
    {
        $this->assertSame('DevOps Engineer', mapRoleType('DevOps Engineer'));
        $this->assertSame('DevOps Engineer', mapRoleType('Kubernetes Engineer'));
        $this->assertSame('DevOps Engineer', mapRoleType('Java/DevOps Senior Pipelines CI/CD y Docker'));
    }

    public function testMapRoleTypeClassifiesFrontendEngineer(): void
    {
        $this->assertSame('Frontend Engineer', mapRoleType('Frontend Engineer'));
        $this->assertSame('Frontend Engineer', mapRoleType('React Engineer'));
    }

    public function testMapRoleTypeClassifiesBackendEngineer(): void
    {
        $this->assertSame('Backend Engineer', mapRoleType('Backend Engineer'));
        $this->assertSame('Backend Engineer', mapRoleType('Senior Web Developer'));
    }

    public function testDevSecOpsClassifiesAsSecurityNotDevOps(): void
    {
        // 'devsecops' contains 'devops' — must not be swallowed by the DevOps branch
        $this->assertSame('Security', mapRoleType('DevSecOps Engineer'));
    }

    // ════════════════════════════════════════════════════════════════════
    // mapRoleType() — the regression-guard tests
    //
    // These are the exact bugs found during manual QA. The OLD default was
    // 'DevOps Engineer', which silently promoted any unmatched title —
    // letting civil engineers, sales reps, and AI researchers into the
    // DevOps jobs digest. The default is now 'Uncategorised'. If any of
    // these tests fail, the classification bug has been reintroduced.
    // ════════════════════════════════════════════════════════════════════

    public function testMapRoleTypeDefaultsToUncategorisedForUnknownTitles(): void
    {
        $this->assertSame('Uncategorised', mapRoleType('Operations Specialist'));
    }

    public function testMapRoleTypeNeverPromotesCivilEngineerToDevOps(): void
    {
        $this->assertSame('Uncategorised', mapRoleType('EIT - Civil - Anchorage, AK'));
        $this->assertSame('Uncategorised', mapRoleType('Licensed Civil Engineer - Site Design'));
    }

    public function testMapRoleTypeNeverPromotesElectricalEngineerToDevOps(): void
    {
        $this->assertSame('Uncategorised', mapRoleType('Electrical Engineer - Tonawanda, NY'));
    }

    public function testMapRoleTypeNeverPromotesSalesEngineerToDevOps(): void
    {
        $this->assertSame('Uncategorised', mapRoleType('Sales Engineer (Remote, US Based)'));
    }

    public function testMapRoleTypeNeverPromotesDirectorTitleToDevOps(): void
    {
        $this->assertSame('Uncategorised', mapRoleType('Director of Strategic Accounts'));
    }

    public function testMapRoleTypeNeverPromotesAiResearchToDevOps(): void
    {
        $this->assertSame('Uncategorised', mapRoleType('AI Research Engineer'));
    }

    public function testMapRoleTypeNeverPromotesOracleCloudFinanceToDevOps(): void
    {
        $this->assertSame('Uncategorised', mapRoleType('Oracle Cloud Finance Manager'));
    }

    public function testMapRoleTypeNeverPromotesShopifyDeveloperToDevOps(): void
    {
        $this->assertSame('Uncategorised', mapRoleType('Senior Shopify Web Developer'));
    }

    public function testMapRoleTypeNeverPromotesReactNativeDeveloperToFrontend(): void
    {
        // Would otherwise match isFrontendRole()'s 'react native' check —
        // isNonTechRole() must intercept it first since it's mobile dev, not DevOps
        $this->assertSame('Uncategorised', mapRoleType('Senior React Native Developer'));
    }

    public function testMapRoleTypeNeverPromotesWebDesignerToDevOps(): void
    {
        $this->assertSame('Uncategorised', mapRoleType('Freelance Web Designer'));
    }
}
