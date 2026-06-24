<?php
  header('Content-Type: application/json');
  $allowedOrigins = [
    'https://nairobidevops.org',
    'https://staging.nairobidevops.org',
    'http://localhost:5173',
    'http://localhost:4000',
  ];
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
  }
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');

  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
      http_response_code(204);
      exit;
  }

  require_once __DIR__ . '/db.php';

  function respond(int $status, array $data): void {
      http_response_code($status);
      echo json_encode($data);
      exit;
  }

  $action = $_GET['action'] ?? '';

  match($action) {
      'jobs'   => require_once __DIR__ . '/endpoints/get_jobs.php',
      'submit' => require_once __DIR__ . '/endpoints/submit_job.php',
      'track'  => require_once __DIR__ . '/endpoints/track_click.php',
      default  => respond(404, ['error' => 'Unknown action'])
  };
