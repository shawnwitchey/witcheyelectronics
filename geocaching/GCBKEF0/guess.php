<?php
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('html_errors', '0');
ob_start();

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$hiddenLat = 39.768700;
$hiddenLng = -86.157900;
$solveDistanceMeters = 15.0;

function send_json(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    echo json_encode($data);
    exit;
}

function haversine_meters(float $lat1, float $lon1, float $lat2, float $lon2): float {
    $earthRadius = 6371000.0;

    $lat1Rad = deg2rad($lat1);
    $lat2Rad = deg2rad($lat2);
    $deltaLat = deg2rad($lat2 - $lat1);
    $deltaLon = deg2rad($lon2 - $lon1);

    $a = sin($deltaLat / 2) ** 2
       + cos($lat1Rad) * cos($lat2Rad) * sin($deltaLon / 2) ** 2;

    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

    return $earthRadius * $c;
}

function reset_game_state(): void {
    unset($_SESSION['previous_distance']);
    unset($_SESSION['attempt_count']);
    unset($_SESSION['best_distance']);
    unset($_SESSION['solved']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(['error' => 'Method not allowed'], 405);
}

$rawInput = file_get_contents('php://input');
$jsonData = json_decode($rawInput, true);
$data = [];

if (is_array($_POST) && !empty($_POST)) {
    $data = $_POST;
} elseif (is_array($jsonData)) {
    $data = $jsonData;
} else {
    send_json(['error' => 'Invalid request body'], 400);
}

if (isset($data['action']) && $data['action'] === 'reset') {
    reset_game_state();
    send_json([
        'ok' => true,
        'attempt' => 0,
        'best_distance' => null,
        'solved' => false,
        'solve_distance' => $solveDistanceMeters
    ]);
}

if (!isset($data['lat'], $data['lng'])) {
    send_json(['error' => 'Latitude and longitude are required'], 400);
}

if (!is_numeric($data['lat']) || !is_numeric($data['lng'])) {
    send_json(['error' => 'Latitude and longitude must be numeric'], 400);
}

$guessLat = (float)$data['lat'];
$guessLng = (float)$data['lng'];

if ($guessLat < -90 || $guessLat > 90) {
    send_json(['error' => 'Latitude out of range'], 400);
}

if ($guessLng < -180 || $guessLng > 180) {
    send_json(['error' => 'Longitude out of range'], 400);
}

$currentDistance = haversine_meters($guessLat, $guessLng, $hiddenLat, $hiddenLng);
$attemptCount = isset($_SESSION['attempt_count']) && is_numeric($_SESSION['attempt_count'])
    ? ((int)$_SESSION['attempt_count'] + 1)
    : 1;

$hint = 'First guess';

if (isset($_SESSION['previous_distance']) && is_numeric($_SESSION['previous_distance'])) {
    $previousDistance = (float)$_SESSION['previous_distance'];

    if ($currentDistance < $previousDistance) {
        $hint = 'Warmer';
    } elseif ($currentDistance > $previousDistance) {
        $hint = 'Colder';
    } else {
        $hint = 'Same distance';
    }
}

$bestDistance = isset($_SESSION['best_distance']) && is_numeric($_SESSION['best_distance'])
    ? min((float)$_SESSION['best_distance'], $currentDistance)
    : $currentDistance;

$solved = ($currentDistance <= $solveDistanceMeters);

$_SESSION['previous_distance'] = $currentDistance;
$_SESSION['attempt_count'] = $attemptCount;
$_SESSION['best_distance'] = $bestDistance;
$_SESSION['solved'] = $solved;

$response = [
    'distance' => round($currentDistance, 2),
    'hint' => $hint,
    'solved' => $solved,
    'attempt' => $attemptCount,
    'best_distance' => round($bestDistance, 2),
    'solve_distance' => $solveDistanceMeters
];

if ($solved) {
    $response['final_coordinates'] = [
        'lat' => $hiddenLat,
        'lng' => $hiddenLng
    ];
}

send_json($response);
