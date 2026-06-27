<?php
declare(strict_types=1);

// Helper functions for CRUD routes.

function crud_get_all(PDO $pdo, string $table): array {
  $stmt = $pdo->query("SELECT * FROM {$table} ORDER BY id DESC");
  return $stmt ? $stmt->fetchAll() : [];
}

function crud_get_by_id(PDO $pdo, string $table, int $id): ?array {
  $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE id = ? LIMIT 1");
  $stmt->execute([$id]);
  $r = $stmt->fetch();
  return $r ?: null;
}

function crud_insert(PDO $pdo, string $table, array $row): int {
  $cols = array_keys($row);
  $placeholders = implode(',', array_fill(0, count($cols), '?'));
  $sql = sprintf(
    'INSERT INTO %s (%s) VALUES (%s)',
    $table,
    implode(',', $cols),
    $placeholders
  );
  $stmt = $pdo->prepare($sql);
  $stmt->execute(array_values($row));
  return (int)$pdo->lastInsertId();
}

function crud_update(PDO $pdo, string $table, int $id, array $patch): bool {
  if (!$patch) return false;
  $cols = array_keys($patch);
  $set = implode(',', array_map(fn($c) => "{$c} = ?", $cols));
  $sql = sprintf('UPDATE %s SET %s WHERE id = ?', $table, $set);
  $stmt = $pdo->prepare($sql);
  $stmt->execute(array_values($patch) + [$id]);
  return $stmt->rowCount() > 0;
}

function crud_delete(PDO $pdo, string $table, int $id): bool {
  $stmt = $pdo->prepare("DELETE FROM {$table} WHERE id = ?");
  $stmt->execute([$id]);
  return $stmt->rowCount() > 0;
}

