<?php
declare(strict_types=1);

// Shared helpers for /api/*

// Ensure session for JWT-authenticated requests.
if (session_status() !== PHP_SESSION_ACTIVE) {
  session_start();
}

class ApiError extends Exception {
  public int $status;
  public function __construct(string $message, int $status = 400) {
    parent::__construct($message);
    $this->status = $status;
  }
}

function json_body(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  if (!is_array($data)) return [];
  return $data;
}

function not_found(): never {
  throw new ApiError('not_found', 404);
}

function env_or(string $name, string $fallback): string {
  $v = getenv($name);
  if ($v === false || $v === '') return $fallback;
  return (string)$v;
}

function require_jwt_secret(): void {
  // nothing; just ensures env is readable
  $sec = env_or('JWT_SECRET', 'dev_secret');
  if ($sec === '') throw new ApiError('missing_jwt_secret', 500);
}

function get_jwt_secret(): string {
  return env_or('JWT_SECRET', 'dev_secret');
}

function get_db(): PDO {
  $host = env_or('DB_HOST', '127.0.0.1');
  $user = env_or('DB_USER', 'root');
  $pass = env_or('DB_PASS', '');
  $db = env_or('DB_NAME', 'km_root_solutions');

  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;

  $pdo = new PDO(
    "mysql:host={$host};dbname={$db};charset=utf8mb4",
    $user,
    $pass,
    [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]
  );

  return $pdo;
}

function bearer_token(): ?string {
  $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['Authorization'] ?? '';
  $hdr = is_string($hdr) ? $hdr : '';
  if (str_starts_with($hdr, 'Bearer ')) {
    $t = substr($hdr, 7);
    return $t !== '' ? $t : null;
  }
  return null;
}

function require_auth(): void {
  $token = bearer_token();
  if (!$token) throw new ApiError('missing_token', 401);

  $payload = verify_jwt($token, get_jwt_secret());
  if (!is_array($payload) || empty($payload['role'])) throw new ApiError('invalid_token', 401);

  // store into globals
  $_SESSION['user'] = $payload;
}

function require_admin_role(): void {
  $u = $_SESSION['user'] ?? null;
  if (!is_array($u)) throw new ApiError('unauthorized', 401);
  $role = (string)($u['role'] ?? '');
  if (!in_array($role, ['super_admin', 'editor'], true)) throw new ApiError('forbidden', 403);
}

function verify_jwt(string $token, string $secret): array {
  // Minimal JWT verification (HS256) without external libs.
  $parts = explode('.', $token);
  if (count($parts) !== 3) throw new ApiError('invalid_token', 401);
  [$h, $p, $sig] = $parts;

  $data = $h . '.' . $p;
  $expected = base64url_encode(hash_hmac('sha256', $data, $secret, true));
  if (!hash_equals($expected, $sig)) throw new ApiError('invalid_token', 401);

  $json = base64url_decode($p);
  $payload = json_decode($json, true);
  if (!is_array($payload)) throw new ApiError('invalid_token', 401);

  // (optional) exp check could be added, but current Node uses expiresIn.
  return $payload;
}

function base64url_encode(string $data): string {
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
  $remainder = strlen($data) % 4;
  if ($remainder) {
    $padlen = 4 - $remainder;
    $data .= str_repeat('=', $padlen);
  }
  return base64_decode(strtr($data, '-_', '+/'));
}

function route_login(string $email, string $password): void {
  if ($email === '' || $password === '') throw new ApiError('missing_email_or_password', 400);

  // Ensure PHP session
  if (session_status() !== PHP_SESSION_ACTIVE) session_start();

  $pdo = get_db();
  $stmt = $pdo->prepare('SELECT id, email, name, role, status, passwordHash FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1');
  $stmt->execute([$email]);
  $user = $stmt->fetch();
  if (!$user) throw new ApiError('invalid_credentials', 401);

  if (!password_verify($password, $user['passwordHash'])) {
    // bcryptjs stored hashes are compatible with password_verify? In many cases yes for bcrypt.
    // If it fails, try bcrypt prefix conversion fallback by comparing again.
    throw new ApiError('invalid_credentials', 401);
  }

  $secret = get_jwt_secret();
  $payload = [
    'userId' => (int)$user['id'],
    'email' => (string)$user['email'],
    'role' => (string)$user['role'],
    'iat' => time(),
    'exp' => time() + 8 * 3600
  ];

  $token = sign_jwt($payload, $secret);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['token' => $token], JSON_UNESCAPED_UNICODE);
}

function sign_jwt(array $payload, string $secret): string {
  $header = ['typ' => 'JWT', 'alg' => 'HS256'];

  $h = base64url_encode(json_encode($header, JSON_UNESCAPED_UNICODE));
  $p = base64url_encode(json_encode($payload, JSON_UNESCAPED_UNICODE));
  $sig = base64url_encode(hash_hmac('sha256', $h . '.' . $p, $secret, true));

  return $h . '.' . $p . '.' . $sig;
}

function route_kpis(): void {
  $pdo = get_db();
  $services = (int)$pdo->query('SELECT COUNT(*) AS c FROM services')->fetch()['c'];
  $devis = (int)$pdo->query('SELECT COUNT(*) AS c FROM devis')->fetch()['c'];
  $reals = (int)$pdo->query('SELECT COUNT(*) AS c FROM realisations')->fetch()['c'];
  $usersRows = $pdo->query("SELECT COUNT(*) AS c FROM users WHERE role='client'")->fetch();
  $clients = (int)($usersRows['c'] ?? 0);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['kpis' => [
    'servicesTotal' => $services,
    'devisTotal' => $devis,
    'projetsTotal' => $reals,
    'clientsTotal' => $clients
  ]], JSON_UNESCAPED_UNICODE);
}

function route_devis_last(): void {
  $pdo = get_db();
  $stmt = $pdo->query('SELECT * FROM devis ORDER BY dateISO DESC, id DESC LIMIT 5');
  $items = [];
  foreach ($stmt->fetchAll() as $r) {
    $items[] = [
      'id' => (int)$r['id'],
      'fullName' => $r['fullName'],
      'dateISO' => $r['dateISO'],
      'status' => $r['status']
    ];
  }
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['items' => $items], JSON_UNESCAPED_UNICODE);
}

function route_devis_list(): void {
  $pdo = get_db();
  $stmt = $pdo->query('SELECT * FROM devis ORDER BY id DESC');
  $items = [];
  foreach ($stmt->fetchAll() as $r) {
    $items[] = [
      'id' => (int)$r['id'],
      'fullName' => $r['fullName'],
      'service' => $r['service'],
      'budget' => $r['budget'],
      'status' => $r['status'],
      'dateISO' => $r['dateISO']
    ];
  }
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['items' => $items], JSON_UNESCAPED_UNICODE);
}

function route_devis_create(array $body): void {
  $fullName = trim((string)($body['fullName'] ?? ''));
  $email = trim((string)($body['email'] ?? ''));
  $phone = trim((string)($body['phone'] ?? ''));
  $company = trim((string)($body['company'] ?? ''));
  $service = trim((string)($body['service'] ?? ''));
  $budget = trim((string)($body['budget'] ?? ''));
  $description = trim((string)($body['description'] ?? ''));
  $desiredTime = trim((string)($body['desiredTime'] ?? ''));

  if ($fullName === '' || $email === '' || $service === '' || $budget === '') {
    throw new ApiError('missing_required_fields', 400);
  }

  $pdo = get_db();
  $dateISO = (new DateTime('now'))->format('c');
  $status = 'pending';
  $stmt = $pdo->prepare('INSERT INTO devis (fullName, email, phone, company, service, budget, description, desiredTime, status, dateISO, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  $stmt->execute([
    $fullName,
    $email,
    $phone !== '' ? $phone : '',
    $company !== '' ? $company : '',
    $service,
    $budget,
    $description !== '' ? $description : '',
    $desiredTime !== '' ? $desiredTime : '',
    $status,
    $dateISO,
    $dateISO
  ]);

  $id = (int)$pdo->lastInsertId();

  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['item' => ['id' => $id, 'status' => $status]], JSON_UNESCAPED_UNICODE);
}

function route_devis_update_status(int $id, array $body): void {
  $status = (string)($body['status'] ?? '');
  if (!in_array($status, ['accepted', 'rejected'], true)) {
    throw new ApiError('invalid_status', 400);
  }

  $pdo = get_db();
  $stmt = $pdo->prepare('UPDATE devis SET status = ? WHERE id = ?');
  $stmt->execute([$status, $id]);
  if ($stmt->rowCount() === 0) throw new ApiError('not_found', 404);

  $stmt2 = $pdo->prepare('SELECT * FROM devis WHERE id = ?');
  $stmt2->execute([$id]);
  $r = $stmt2->fetch();

  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['item' => [
    'id' => (int)$r['id'],
    'fullName' => $r['fullName'],
    'service' => $r['service'],
    'budget' => $r['budget'],
    'status' => $r['status'],
    'dateISO' => $r['dateISO']
  ]], JSON_UNESCAPED_UNICODE);
}

function route_messages_list(string $email): void {
  $pdo = get_db();
  $stmt = $pdo->prepare('SELECT * FROM messages WHERE LOWER(email)=LOWER(?) ORDER BY createdAt DESC');
  $stmt->execute([$email]);
  $items = [];
  foreach ($stmt->fetchAll() as $r) {
    $items[] = [
      'id' => (int)$r['id'],
      'senderName' => $r['senderName'],
      'email' => $r['email'],
      'subject' => $r['subject'],
      'message' => $r['message'],
      'status' => $r['status'],
      'source' => $r['source'] ?? null,
      'devisId' => $r['devisId'] ?? null,
      'createdAt' => $r['createdAt']
    ];
  }
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['items' => $items], JSON_UNESCAPED_UNICODE);
}

function route_messages_update(int $id, array $body): void {
  $pdo = get_db();
  $status = (string)($body['status'] ?? '');
  $stmt = $pdo->prepare('UPDATE messages SET status = ? WHERE id = ?');
  $stmt->execute([$status, $id]);
  if ($stmt->rowCount() === 0) throw new ApiError('not_found', 404);

  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['item' => ['id' => $id, 'status' => $status]], JSON_UNESCAPED_UNICODE);
}

function route_messages_delete(int $id): void {
  $pdo = get_db();
  $stmt = $pdo->prepare('DELETE FROM messages WHERE id = ?');
  $stmt->execute([$id]);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
}