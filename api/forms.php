<?php
// api/forms.php
header('Content-Type: application/json');
require 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // List all forms
    try {
        $stmt = $pdo->query('SELECT * FROM forms ORDER BY created_at DESC');
        $forms = $stmt->fetchAll();
        echo json_encode($forms);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Check Auth
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        http_response_code(401);
        echo json_encode(['message' => 'Unauthorized']);
        exit;
    }

    // Handle Multipart Form Data
    $formId = $_POST['form_id'] ?? null; // ID determines Update vs Create
    $title = $_POST['title'] ?? 'Untitled';
    $description = $_POST['description'] ?? '';
    // fields come as stringified JSON in multipart
    $fields = isset($_POST['fields']) ? json_decode($_POST['fields'], true) : [];

    // Handle Image Upload
    $headerImagePath = null;
    if (isset($_FILES['header_image']) && $_FILES['header_image']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = '../uploads/';
        if (!is_dir($uploadDir))
            mkdir($uploadDir, 0777, true);

        $ext = pathinfo($_FILES['header_image']['name'], PATHINFO_EXTENSION);
        $filename = 'header_' . time() . '.' . $ext;
        $targetPath = $uploadDir . $filename;

        if (move_uploaded_file($_FILES['header_image']['tmp_name'], $targetPath)) {
            $headerImagePath = 'uploads/' . $filename;
        }
    }

    try {
        $pdo->beginTransaction();

        if ($formId) {
            // --- UPDATE EXISTING FORM ---

            // 1. Update form details
            $sql = 'UPDATE forms SET title = ?, description = ?';
            $params = [$title, $description];

            if ($headerImagePath) {
                $sql .= ', header_image = ?';
                $params[] = $headerImagePath;
            }

            $sql .= ' WHERE id = ?';
            $params[] = $formId;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            // 2. Update Fields
            // Strategy: Get existing field IDs. Compare with incoming. 
            // - Present in both: Update
            // - New in incoming: Insert
            // - Missing in incoming: Delete

            // Get existing IDs
            $stmtIds = $pdo->prepare('SELECT id FROM fields WHERE form_id = ?');
            $stmtIds->execute([$formId]);
            $existingIds = $stmtIds->fetchAll(PDO::FETCH_COLUMN);

            $incomingIds = [];

            $sqlInsert = 'INSERT INTO fields (form_id, label, field_type, options, required, order_index, has_details) VALUES (?, ?, ?, ?, ?, ?, ?)';
            $stmtInsert = $pdo->prepare($sqlInsert);

            $sqlUpdate = 'UPDATE fields SET label = ?, field_type = ?, options = ?, required = ?, order_index = ?, has_details = ? WHERE id = ?';
            $stmtUpdate = $pdo->prepare($sqlUpdate);

            foreach ($fields as $index => $f) {
                $options = isset($f['options']) ? json_encode($f['options']) : null;
                $required = isset($f['required']) && $f['required'] ? 1 : 0;
                $hasDetails = isset($f['has_details']) && $f['has_details'] ? 1 : 0;

                if (isset($f['id']) && in_array($f['id'], $existingIds)) {
                    // Update
                    $stmtUpdate->execute([
                        $f['label'],
                        $f['type'],
                        $options,
                        $required,
                        $index,
                        $hasDetails,
                        $f['id']
                    ]);
                    $incomingIds[] = $f['id'];
                } else {
                    // Insert
                    $stmtInsert->execute([
                        $formId,
                        $f['label'],
                        $f['type'],
                        $options,
                        $required,
                        $index,
                        $hasDetails
                    ]);
                }
            }

            // Delete removed fields
            $toDelete = array_diff($existingIds, $incomingIds);
            if (!empty($toDelete)) {
                $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
                $stmtDelete = $pdo->prepare("DELETE FROM fields WHERE id IN ($placeholders)");
                $stmtDelete->execute(array_values($toDelete));
            }

            $pdo->commit();
            echo json_encode(['message' => 'Form updated']);

        } else {
            // --- CREATE NEW FORM ---
            $stmt = $pdo->prepare('INSERT INTO forms (title, description, header_image) VALUES (?, ?, ?)');
            $stmt->execute([$title, $description, $headerImagePath]);
            $formId = $pdo->lastInsertId();

            if (!empty($fields)) {
                $sqlField = 'INSERT INTO fields (form_id, label, field_type, options, required, order_index, has_details) VALUES (?, ?, ?, ?, ?, ?, ?)';
                $stmtField = $pdo->prepare($sqlField);

                foreach ($fields as $index => $f) {
                    $options = isset($f['options']) ? json_encode($f['options']) : null;
                    $required = isset($f['required']) && $f['required'] ? 1 : 0;
                    $hasDetails = isset($f['has_details']) && $f['has_details'] ? 1 : 0;

                    $stmtField->execute([
                        $formId,
                        $f['label'],
                        $f['type'],
                        $options,
                        $required,
                        $index,
                        $hasDetails
                    ]);
                }
            }

            $pdo->commit();
            http_response_code(201);
            echo json_encode(['message' => 'Form created', 'formId' => $formId]);
        }

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['message' => 'ID required']);
        exit;
    }

    try {
        $stmt = $pdo->prepare('DELETE FROM forms WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['message' => 'Form deleted']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>