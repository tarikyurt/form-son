<?php
// api/submit.php
header('Content-Type: application/json');
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$formId = $input['form_id'] ?? null;
$answers = $input['answers'] ?? [];

if (!$formId) {
    http_response_code(400);
    echo json_encode(['message' => 'Form ID required']);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('INSERT INTO submissions (form_id) VALUES (?)');
    $stmt->execute([$formId]);
    $submissionId = $pdo->lastInsertId();

    $stmtAns = $pdo->prepare('INSERT INTO submission_answers (submission_id, field_id, answer_value) VALUES (?, ?, ?)');

    foreach ($answers as $ans) {
        $val = $ans['value'];
        if (is_array($val)) {
            $val = json_encode($val);
        }
        $stmtAns->execute([$submissionId, $ans['field_id'], $val]);
    }

    $pdo->commit();
    http_response_code(201);
    echo json_encode(['message' => 'Submission successful']);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>