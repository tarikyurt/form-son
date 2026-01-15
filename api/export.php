<?php
// api/export.php
require 'db.php';

$formId = $_GET['form_id'] ?? null;

if (!$formId) {
    die('Form ID required');
}

try {
    // Fields
    $stmtFields = $pdo->prepare('SELECT id, label FROM fields WHERE form_id = ? ORDER BY order_index ASC');
    $stmtFields->execute([$formId]);
    $fields = $stmtFields->fetchAll();

    // Headers
    $headers = ['Submission ID', 'Date'];
    foreach ($fields as $f) {
        $headers[] = $f['label'];
    }

    // Submissions
    $stmtSubs = $pdo->prepare('SELECT * FROM submissions WHERE form_id = ? ORDER BY submitted_at DESC');
    $stmtSubs->execute([$formId]);
    $submissions = $stmtSubs->fetchAll();

    // Answers
    if (!empty($submissions)) {
        $subIds = array_column($submissions, 'id');
        $inQuery = implode(',', array_fill(0, count($subIds), '?'));
        $stmtAns = $pdo->prepare("SELECT * FROM submission_answers WHERE submission_id IN ($inQuery)");
        $stmtAns->execute($subIds);
        $allAnswers = $stmtAns->fetchAll();
    } else {
        $allAnswers = [];
    }

    // Output Excel (XLS)
    header('Content-Type: application/vnd.ms-excel; charset=utf-8');
    header('Content-Disposition: attachment; filename=submissions_form_' . $formId . '.xls');
    header('Pragma: no-cache');
    header('Expires: 0');

    // BOM for proper char encoding in some Excel versions, but UTF-8 meta tag is better for HTML
    // We output an HTML Table which Excel opens gracefully
    echo '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    echo '<head><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body>';
    echo '<table border="1">';

    // Header Row
    echo '<tr>';
    foreach ($headers as $h) {
        echo '<th style="background-color: #f2f2f2;">' . htmlspecialchars($h) . '</th>';
    }
    echo '</tr>';

    // Data Rows
    foreach ($submissions as $sub) {
        echo '<tr>';

        // Static columns: ID, Date
        echo '<td>' . htmlspecialchars($sub['id']) . '</td>';
        echo '<td>' . htmlspecialchars($sub['submitted_at']) . '</td>';

        // Dynamic fields
        foreach ($fields as $f) {
            $val = '';
            foreach ($allAnswers as $ans) {
                if ($ans['submission_id'] == $sub['id'] && $ans['field_id'] == $f['id']) {
                    $val = $ans['answer_value'];
                    break;
                }
            }
            echo '<td>' . htmlspecialchars($val) . '</td>';
        }
        echo '</tr>';
    }
    echo '</table>';
    echo '</body></html>';

} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
?>