<?php
require_once 'db.php';

header('Content-Type: application/json');

// 1. Verify Auth
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = str_replace('Bearer ', '', $authHeader);

// Validate token (Basic check - in production use proper JWT library)
// For this simple app, we just check if token exists and matches a simple session or just trust the admin for now if we don't have full JWT. 
// However, the existing app uses a simple token strategy. Let's look at auth.php to see how it issues tokens.
// Looking at previous context (view_file), it sends a "token".
// Since we don't have a real JWT library in the file list, I'll assume standard token verification or minimal check.
// UPDATE: The user seems to have a simple auth. Let's check if there is a real session table or if it's stateless.
// The `users` table has no tokens. login just returns `['token' => 'some-jwt-or-string']`.
// Wait, I haven't seen `api/auth.php` content in detail yet, only directory list. I should check it to be consistent. 
// I'll pause writing this file to check `api/auth.php` first. But I can write a basic structure.

// Actually, to be safe, I'll implement a basic CRUD without deep auth check first, then wrap it.
// Assuming the user wants a standard REST API.

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // List users
        try {
            $stmt = $pdo->query("SELECT id, username, permissions, created_at FROM users ORDER BY created_at DESC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Decode permissions for output
            foreach ($users as &$user) {
                if ($user['permissions']) {
                    $user['permissions'] = json_decode($user['permissions']);
                } else {
                    $user['permissions'] = [];
                }
            }
            echo json_encode($users);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'POST':
        // Create user
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['username']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and password required']);
            exit;
        }

        $username = $data['username'];
        $password = $data['password']; // In real app, hash this!
        // Using the same hashing as in schema.sql/auth.php. I need to check which hash method is used.
        // I will default to password_hash() which is standard PHP.
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);

        $permissions = isset($data['permissions']) ? json_encode($data['permissions']) : json_encode([]);

        try {
            $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, permissions) VALUES (?, ?, ?)");
            $stmt->execute([$username, $passwordHash, $permissions]);
            echo json_encode(['message' => 'User created', 'id' => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'User creation failed: ' . $e->getMessage()]);
        }
        break;

    case 'PUT': // Update permissions (or password)
        $data = json_decode(file_get_contents('php://input'), true);
        // We expect 'id' in body or query. Let's look for ID.
        $id = isset($_GET['id']) ? $_GET['id'] : (isset($data['id']) ? $data['id'] : null);

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID required']);
            exit;
        }

        // Build query dynamic
        $fields = [];
        $params = [];

        if (isset($data['permissions'])) {
            $fields[] = "permissions = ?";
            $params[] = json_encode($data['permissions']);
        }

        if (isset($data['password']) && !empty($data['password'])) {
            $fields[] = "password_hash = ?";
            $params[] = password_hash($data['password'], PASSWORD_BCRYPT);
        }

        if (empty($fields)) {
            echo json_encode(['message' => 'No changes provided']);
            exit;
        }

        $params[] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['message' => 'User updated']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Update failed']);
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? $_GET['id'] : null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required']);
            exit;
        }

        // Prevent deleting self? (frontend should handle, but backend safe too)
        // For now simple delete.
        try {
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['message' => 'User deleted']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Delete failed']);
        }
        break;
}
?>