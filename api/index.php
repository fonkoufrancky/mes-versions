<?php
declare(strict_types=1);

// Minimal PHP router to serve the existing JS frontend endpoints under /api/*
// Supports only the subset needed for devis + admin actions.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '';
$base = '/api';
$path = '';
if (str_starts_with($uri, $base)) {
  $path = substr($uri, strlen($base));
}
$path = $path === '' ? '/' : $path;

// Normalize: /devis/12 -> /devis/12

require_once __DIR__ . '/lib.php';

try {
  if ($method === 'POST' && $path === '/auth/login') {
    $body = json_body();
    $email = trim((string)($body['email'] ?? ''));
    $password = (string)($body['password'] ?? '');
    require_jwt_secret();
    route_login($email, $password);
    exit;
  }

  require_jwt_secret();

  // Public-ish (but protected by JWT) routes
  if ($path === '/dashboard/kpis' && $method === 'GET') {
    require_auth();
    route_kpis();
    exit;
  }

  if ($path === '/dashboard/devis-last' && $method === 'GET') {
    require_auth();
    route_devis_last();
    exit;
  }

  if ($path === '/devis' && $method === 'GET') {
    require_auth();
    route_devis_list();
    exit;
  }

  if ($path === '/devis' && $method === 'POST') {
    // Public creation (no admin required) to allow front form to submit.
    // JS sends token:null.
    $body = json_body();
    route_devis_create($body);
    exit;
  }

  // PUT /devis/:id
  if ($method === 'PUT' && preg_match('#^/devis/(\d+)$#', $path, $m)) {
    require_auth();
    require_admin_role();
    $id = (int)$m[1];
    $body = json_body();
    route_devis_update_status($id, $body);
    exit;
  }

  // =====================
  // Admin CRUD (JWT)
  // =====================

  // Services
  if ($path === '/services' && $method === 'GET') {
    require_auth();
    require_admin_role();
    require_once __DIR__ . '/lib_services.php';
    route_services_list();
    exit;
  }

  if ($path === '/services' && $method === 'POST') {
    require_auth();
    require_admin_role();
    $body = json_body();
    require_once __DIR__ . '/lib_services.php';
    route_services_create($body);
    exit;
  }

  if ($method === 'PUT' && preg_match('#^/services/(\d+)$#', $path, $m)) {
    require_auth();
    require_admin_role();
    $id = (int)$m[1];
    $body = json_body();
    require_once __DIR__ . '/lib_services.php';
    route_services_update($id, $body);
    exit;
  }

  if ($method === 'DELETE' && preg_match('#^/services/(\d+)$#', $path, $m)) {
    require_auth();
    require_admin_role();
    $id = (int)$m[1];
    require_once __DIR__ . '/lib_services.php';
    route_services_delete($id);
    exit;
  }

  // Realisations
  if ($path === '/realisations' && $method === 'GET') {
    require_auth();
    require_admin_role();
    require_once __DIR__ . '/lib_realisations.php';
    route_realisations_list();
    exit;
  }

  if ($path === '/realisations' && $method === 'POST') {
    require_auth();
    require_admin_role();
    $body = json_body();
    require_once __DIR__ . '/lib_realisations.php';
    route_realisations_create($body);
    exit;
  }

  if ($method === 'PUT' && preg_match('#^/realisations/(\d+)$#', $path, $m)) {
    require_auth();
    require_admin_role();
    $id = (int)$m[1];
    $body = json_body();
    require_once __DIR__ . '/lib_realisations.php';
    route_realisations_update($id, $body);
    exit;
  }

  if ($method === 'DELETE' && preg_match('#^/realisations/(\d+)$#', $path, $m)) {
    require_auth();
    require_admin_role();
    $id = (int)$m[1];
    require_once __DIR__ . '/lib_realisations.php';
    route_realisations_delete($id);
    exit;
  }

  // Blog
  if ($path === '/blog' && $method === 'GET') {
    require_auth();
    require_admin_role();
    require_once __DIR__ . '/lib_blog.php';
    route_blog_list();
    exit;
  }

  if ($path === '/blog' && $method === 'POST') {
    require_auth();
    require_admin_role();
    $body = json_body();
    require_once __DIR__ . '/lib_blog.php';
    route_blog_create($body);
    exit;
  }

  if ($method === 'PUT' && preg_match('#^/blog/(\d+)$#', $path, $m)) {
    require_auth();
    require_admin_role();
    $id = (int)$m[1];
    $body = json_body();
    require_once __DIR__ . '/lib_blog.php';
    route_blog_update($id, $body);
    exit;
  }

  if ($method === 'DELETE' && preg_match('#^/blog/(\d+)$#', $path, $m)) {
    require_auth();
    require_admin_role();
    $id = (int)$m[1];
    require_once __DIR__ . '/lib_blog.php';
    route_blog_delete($id);
    exit;
  }

  // GET /services etc not matched
  not_found();
} catch (ApiError $e) {
  http_response_code($e->status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['error' => $e->message], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['error' => 'server_error'], JSON_UNESCAPED_UNICODE);
}


