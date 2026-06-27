<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

function route_blog_list(): void {
  $pdo = get_db();
  $items = $pdo->query('SELECT id, title, category, dateLabel, content FROM blog_posts ORDER BY id DESC')->fetchAll();
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['items' => array_map(fn($r) => [
    'id' => (int)$r['id'],
    'title' => $r['title'],
    'category' => $r['category'],
    'dateLabel' => $r['dateLabel'] ?? null,
    'content' => $r['content'] ?? null
  ], $items)], JSON_UNESCAPED_UNICODE);
}

function route_blog_create(array $body): void {
  $title = trim((string)($body['title'] ?? ''));
  $category = trim((string)($body['category'] ?? ''));
  $dateLabel = trim((string)($body['dateLabel'] ?? ''));
  $content = (string)($body['content'] ?? '');

  if ($title === '' || $category === '') throw new ApiError('missing_title_or_category', 400);

  $pdo = get_db();
  $now = (new DateTime('now'))->format('c');

  $stmt = $pdo->prepare('INSERT INTO blog_posts (title, category, dateLabel, content, createdAt) VALUES (?, ?, ?, ?, ?)');
  $stmt->execute([$title, $category, $dateLabel, $content, $now]);
  $id = (int)$pdo->lastInsertId();

  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['item' => ['id' => $id]], JSON_UNESCAPED_UNICODE);
}

function route_blog_update(int $id, array $body): void {
  $patch = [];
  if (isset($body['title'])) $patch['title'] = trim((string)$body['title']);
  if (isset($body['category'])) $patch['category'] = trim((string)$body['category']);
  if (isset($body['dateLabel'])) $patch['dateLabel'] = trim((string)$body['dateLabel']);
  if (isset($body['content'])) $patch['content'] = (string)$body['content'];

  if (!$patch) throw new ApiError('missing_patch', 400);

  $pdo = get_db();
  $cols = array_keys($patch);
  $set = implode(',', array_map(fn($c) => "$c = ?", $cols));
  $sql = "UPDATE blog_posts SET {$set} WHERE id = ?";
  $stmt = $pdo->prepare($sql);
  $vals = array_values($patch);
  $vals[] = $id;
  $stmt->execute($vals);

  if ($stmt->rowCount() === 0) throw new ApiError('not_found', 404);

  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['item' => ['id' => $id]], JSON_UNESCAPED_UNICODE);
}

function route_blog_delete(int $id): void {
  $pdo = get_db();
  $stmt = $pdo->prepare('DELETE FROM blog_posts WHERE id = ?');
  $stmt->execute([$id]);
  if ($stmt->rowCount() === 0) throw new ApiError('not_found', 404);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
}

