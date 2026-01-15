<?php
// api/get_form.php
header('Content-Type: application/json');
require 'db.php';

$id = $_GET['id'] ?? null;

// Allow accessing via /forms/1 using path info trick if supported, or just forms.php?id=1
// If coming from get_form.php?id=1
if (!$id) {
    http_response_code(400);
    echo json_encode(['message' => 'ID required']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT * FROM forms WHERE id = ?');
    $stmt->execute([$id]);
    $form = $stmt->fetch();

    if (!$form) {
        http_response_code(404);
        echo json_encode(['message' => 'Form not found']);
        exit;
    }

    $stmtFields = $pdo->prepare('SELECT * FROM fields WHERE form_id = ? ORDER BY order_index ASC');
    $stmtFields->execute([$id]);
    $fields = $stmtFields->fetchAll();

    // Parse JSON options
    foreach ($fields as &$field) {
        if ($field['options']) {
            $field['options'] = json_decode($field['options']);
        }
    }

    $form['fields'] = $fields;
    echo json_encode($form);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>