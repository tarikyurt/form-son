<?php
// api/submissions.php
header('Content-Type: application/json');
require 'db.php';

$formId = $_GET['form_id'] ?? null;

if (!$formId) {
    http_response_code(400);
    echo json_encode(['message' => 'Form ID required']);
    exit;
}

try {
    // 1. Get Fields
    $stmtFields = $pdo->prepare('SELECT id, label FROM fields WHERE form_id = ? ORDER BY order_index ASC');
    $stmtFields->execute([$formId]);
    $fields = $stmtFields->fetchAll();

    // 2. Get Submissions
    $stmtSubs = $pdo->prepare('SELECT * FROM submissions WHERE form_id = ? ORDER BY submitted_at DESC');
    $stmtSubs->execute([$formId]);
    $submissions = $stmtSubs->fetchAll();

    if (empty($submissions)) {
        echo json_encode(['fields' => $fields, 'submissions' => []]);
        exit;
    }

    // 3. Get Answers
    // For performance, getting all answers for these submissions
    // In strict sql: WHERE submission_id IN (...)
    $subIds = array_column($submissions, 'id');
    $inQuery = implode(',', array_fill(0, count($subIds), '?'));

    $stmtAns = $pdo->prepare("SELECT * FROM submission_answers WHERE submission_id IN ($inQuery)");
    $stmtAns->execute($subIds);
    $answers = $stmtAns->fetchAll();

    // 4. Map
    $resultSubmissions = [];
    foreach ($submissions as $sub) {
        $subAnswers = [];
        foreach ($answers as $ans) {
            if ($ans['submission_id'] == $sub['id']) {
                $subAnswers[$ans['field_id']] = $ans['answer_value'];
            }
        }
        $sub['answers'] = $subAnswers;
        $resultSubmissions[] = $sub;
    }

    echo json_encode(['fields' => $fields, 'submissions' => $resultSubmissions]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>