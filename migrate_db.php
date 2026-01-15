<?php
require_once 'api/db.php';

try {
    // Check if column exists
    $check = $pdo->query("SHOW COLUMNS FROM users LIKE 'permissions'");
    if ($check->rowCount() == 0) {
        // Add column
        $pdo->exec("ALTER TABLE users ADD COLUMN permissions JSON DEFAULT NULL AFTER password_hash");
        echo "Successfully added 'permissions' column to 'users' table.<br>";
        
        // Update admin to have all permissions
        $allPermissions = json_encode(['fill', 'edit', 'delete']);
        $stmt = $pdo->prepare("UPDATE users SET permissions = ? WHERE username = 'admin'");
        $stmt->execute([$allPermissions]);
        echo "Updated 'admin' user with all permissions.<br>";
    } else {
        echo "Column 'permissions' already exists.<br>";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
