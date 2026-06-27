<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

function route_realisations_list(): void {
  $pdo = get_db();
  $items = $pdo->query('SELECT id, title, category, dateLabel, imageUrl FROM realisations ORDER BY id DESC')->fetchAll();
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['items' => array_map(fn($r) => [
    'id' => (int)$r['id'],
    'title' => $r['title'],
    'category' => $r['category'],
    'dateLabel' => $r['dateLabel'],
    'imageUrl' => $r['imageUrl']
  ], $items)], JSON_UNESCAPED_UNICODE);
}

function route_realisations_create(array $body): void {
  $title = trim((string)($body['title'] ?? ''));
  $category = trim((string)($body['category'] ?? ''));
  $dateLabel = trim((string)($body['dateLabel'] ?? ''));
  $imageUrl = trim((string)($body['imageUrl'] ?? ''));

  if ($title === '' || $category === '') throw new ApiError('missing_title_or_category', 400);

  $pdo = get_db();
  $now = (new DateTime('now'))->format('c');

  $stmt = $pdo->prepare('INSERT INTO realisations (title, category, dateLabel, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?)');
  $stmt->execute([$title, $category, $dateLabel, $imageUrl, $now]);

  $id = (int)$pdo->lastInsertId();
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['item' => ['id' => $id]], JSON_UNESCAPED_UNICODE);
}

function route_realisations_update(int $id, array $body): void {
  $patch = [];
  if (isset($body['title'])) $patch['title'] = trim((string)$body['title']);
  if (isset($body['category'])) $patch['category'] = trim((string)$body['category']);
  if (isset($body['dateLabel'])) $patch['dateLabel'] = trim((string)$body['dateLabel']);
  if (isset($body['imageUrl'])) $patch['imageUrl'] = trim((string)$body['imageUrl']);

  if (!$patch) throw new ApiError('missing_patch', 400);

  $pdo = get_db();
  $cols = array_keys($patch);
  $set = implode(',', array_map(fn($c) => "$c = ?", $cols));
  $sql = "UPDATE realisations SET {$set} WHERE id = ?";
  $stmt = $pdo->prepare($sql);
  $vals = array_values($patch);
  $vals[] = $id;
  $stmt->execute($vals);

  if ($stmt->rowCount() === 0) throw new ApiError('not_found', 404);

  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['item' => ['id' => $id]], JSON_UNESCAPED_UNICODE);
}

function route_realisations_delete(int $id): void {
  $pdo = get_db();
  $stmt = $pdo->prepare('DELETE FROM realisations WHERE id = ?');
  $stmt->execute([$id]);
  if ($stmt->rowCount() === 0) throw new ApiError('not_found', 404);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
}

