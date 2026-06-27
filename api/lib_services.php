<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

function route_services_list(): void {
  $pdo = get_db();
  $items = $pdo->query('SELECT id, name, category, status FROM services ORDER BY id DESC')->fetchAll();
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['items' => array_map(fn($r) => [
    'id' => (int)$r['id'],
    'name' => $r['name'],
    'category' => $r['category'],
    'status' => $r['status']
  ], $items)], JSON_UNESCAPED_UNICODE);
}

function route_services_create(array $body): void {
  $name = trim((string)($body['name'] ?? ''));
  $category = trim((string)($body['category'] ?? ''));
  $status = trim((string)($body['status'] ?? 'active'));
  if ($name === '' || $category === '') throw new ApiError('missing_name_or_category', 400);

  $pdo = get_db();
  $stmt = $pdo->prepare('INSERT INTO services (name, category, status, createdAt) VALUES (?, ?, ?, ?)');
  $now = (new DateTime('now'))->format('c');
  $stmt->execute([$name, $category, $status !== '' ? $status : 'active', $now]);
  $id = (int)$pdo->lastInsertId();

  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['item' => ['id' => $id]], JSON_UNESCAPED_UNICODE);
}

function route_services_update(int $id, array $body): void {
  $patch = [];
  if (isset($body['name'])) $patch['name'] = trim((string)$body['name']);
  if (isset($body['category'])) $patch['category'] = trim((string)$body['category']);
  if (isset($body['status'])) $patch['status'] = trim((string)$body['status']);

  if (!$patch) throw new ApiError('missing_patch', 400);

  $pdo = get_db();
  $cols = array_keys($patch);
  $set = implode(',', array_map(fn($c) => "$c = ?", $cols));
  $sql = "UPDATE services SET {$set} WHERE id = ?";
  $stmt = $pdo->prepare($sql);
  $vals = array_values($patch);
  $vals[] = $id;
  $stmt->execute($vals);

  if ($stmt->rowCount() === 0) throw new ApiError('not_found', 404);

  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['item' => ['id' => $id]], JSON_UNESCAPED_UNICODE);
}

function route_services_delete(int $id): void {
  $pdo = get_db();
  $stmt = $pdo->prepare('DELETE FROM services WHERE id = ?');
  $stmt->execute([$id]);
  if ($stmt->rowCount() === 0) throw new ApiError('not_found', 404);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
}

