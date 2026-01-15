<?php
// api/db.php

$host = '127.0.0.1';
$db   = 'sth_forms';
$user = 'root';
$pass = ''; // Default XAMPP password is empty
$charset = 'utf8mb4';

// For production (e.g. Turhost), change these values:
// $user = 'turhost_user_name';
// $pass = 'turhost_password';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Return JSON error if connection fails
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}
?>
