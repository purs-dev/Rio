<?php
declare(strict_types=1);

// Website backend (API): receives requests from website.js and reads/writes MySQL.
// Handles customer accounts, checkout, demo payments, loyalty, and vouchers.
// This returns data, not a page layout. Page layouts are in pages/.

// XAMPP defaults. Change these if your local MySQL credentials differ.
const DB_HOST = '127.0.0.1';
const DB_PORT = 3306;
const DB_NAME = 'rio_street';
const DB_USER = 'root';
const DB_PASSWORD = '';

ini_set('display_errors', '0');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$_SESSION['csrf'] ??= bin2hex(random_bytes(24));

function respond(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
function reject(string $message, int $status = 422): never {
    throw new RuntimeException($message, $status);
}
function query(string $sql, array $values = []): PDOStatement {
    global $db;
    $statement = $db->prepare($sql);
    $statement->execute($values);
    return $statement;
}
function customerId(): int {
    if (empty($_SESSION['customer_id'])) reject('Please sign in to continue.', 401);
    return (int) $_SESSION['customer_id'];
}
function code(int $length): string {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $result = '';
    for ($i = 0; $i < $length; $i++) $result .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    return $result;
}
function account(): ?array {
    if (empty($_SESSION['customer_id'])) return null;
    return query('SELECT id, name, email, points FROM customers WHERE id = ?', [$_SESSION['customer_id']])->fetch() ?: null;
}
function dashboard(int $id): array {
    $orders = query('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 50', [$id])->fetchAll();
    foreach ($orders as &$order) {
        unset($order['checkout_key']);
        $order['items'] = query('SELECT name, unit_price, quantity FROM order_items WHERE order_id = ?', [$order['id']])->fetchAll();
    }
    return [
        'user' => account(),
        'orders' => $orders,
        'vouchers' => query('SELECT v.id, v.code, v.used_at, r.name, r.discount FROM vouchers v JOIN rewards r ON r.id = v.reward_id WHERE v.customer_id = ? ORDER BY v.id DESC', [$id])->fetchAll(),
        'activity' => query('SELECT description, points, created_at FROM point_activity WHERE customer_id = ? ORDER BY id DESC LIMIT 50', [$id])->fetchAll()
    ];
}

$db = null;
try {
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';charset=utf8mb4';
    $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
    $db = new PDO($dsn, DB_USER, DB_PASSWORD, $options);
    // The first local visit installs the schema; later requests only select it.
    try {
        $db->exec('USE `' . DB_NAME . '`');
        $db->query('SELECT id FROM point_activity LIMIT 1');
    } catch (PDOException $e) {
        if (!in_array((int) ($e->errorInfo[1] ?? 0), [1049, 1146], true)) throw $e;
        $db->exec(file_get_contents(__DIR__ . '/database.sql'));
    }
    $action = $_GET['action'] ?? 'bootstrap';
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'bootstrap') respond([
            'csrf' => $_SESSION['csrf'], 'user' => account(),
            'products' => query('SELECT * FROM products WHERE available = 1 ORDER BY id')->fetchAll(),
            'rewards' => query('SELECT * FROM rewards ORDER BY points')->fetchAll()
        ]);
        if ($action === 'dashboard') respond(dashboard(customerId()));
        reject('This endpoint was not found.', 404);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') reject('Method not allowed.', 405);
    if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) reject('Your session changed. Refresh the page and try again.', 403);
    $body = json_decode(file_get_contents('php://input'), true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($body)) reject('Please send a valid request.');

    if ($action === 'register' || $action === 'login') {
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) reject('Enter a valid email address.');
        if (strlen($password) > 72) reject('Please use a password of at most 72 bytes.');
        if ($action === 'register') {
            $name = trim((string) ($body['name'] ?? ''));
            if (strlen($name) < 2 || strlen($name) > 80) reject('Your name must be between 2 and 80 characters.');
            if (strlen($password) < 8) reject('Use at least 8 characters for your password.');
            if (query('SELECT id FROM customers WHERE email = ?', [$email])->fetch()) reject('That email already has an account. Please sign in.');
            query('INSERT INTO customers (name, email, password_hash) VALUES (?, ?, ?)', [$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
            $id = (int) $db->lastInsertId();
        } else {
            if (($_SESSION['login_block_until'] ?? 0) > time()) reject('Too many attempts. Please try again in a minute.', 429);
            $customer = query('SELECT * FROM customers WHERE email = ?', [$email])->fetch();
            if (!$customer || !password_verify($password, $customer['password_hash'])) {
                $_SESSION['login_attempts'] = ($_SESSION['login_attempts'] ?? 0) + 1;
                if ($_SESSION['login_attempts'] >= 5) {
                    $_SESSION['login_block_until'] = time() + 60;
                    $_SESSION['login_attempts'] = 0;
                }
                reject('The email or password is incorrect.', 401);
            }
            $id = (int) $customer['id'];
        }
        session_regenerate_id(true);
        $_SESSION['customer_id'] = $id;
        $_SESSION['login_attempts'] = 0;
        respond(['user' => account()]);
    }
    if ($action === 'logout') {
        unset($_SESSION['customer_id']);
        session_regenerate_id(true);
        respond(['ok' => true]);
    }

    $id = customerId();
    $db->beginTransaction();
    // Serialize balance and voucher changes for this customer across sessions.
    query('SELECT id FROM customers WHERE id = ? FOR UPDATE', [$id]);

    if ($action === 'checkout') {
        $key = (string) ($body['key'] ?? '');
        if (!preg_match('/^[a-f0-9-]{36}$/', $key)) reject('Invalid checkout reference.');
        $existing = query('SELECT id FROM orders WHERE checkout_key = ? AND customer_id = ?', [$key, $id])->fetch();
        if ($existing) { $db->commit(); respond(['order_id' => $existing['id']]); }
        $items = $body['items'] ?? [];
        if (!is_array($items) || count($items) < 1 || count($items) > 20) reject('Add something to your bag first.');
        $method = (string) ($body['method'] ?? '');
        if (!in_array($method, ['gcash', 'maya', 'card'], true)) reject('Choose a payment method.');
        $notes = trim((string) ($body['notes'] ?? ''));
        if (strlen($notes) > 300) reject('Keep your order note under 300 characters.');
        $subtotal = 0; $lines = []; $seen = [];
        foreach ($items as $item) {
            $productId = (int) ($item['id'] ?? 0);
            $qty = filter_var($item['qty'] ?? 0, FILTER_VALIDATE_INT);
            if (!$qty || $qty < 1 || $qty > 20 || isset($seen[$productId])) reject('Choose between 1 and 20 of each item.');
            $seen[$productId] = true;
            $product = query('SELECT * FROM products WHERE id = ? AND available = 1', [$productId])->fetch();
            if (!$product) reject('An item is no longer available. Refresh your menu.');
            $subtotal += (int) $product['price'] * $qty;
            $lines[] = [$productId, $product['name'], $product['price'], $qty];
        }
        $voucherId = null; $discount = 0;
        if (!empty($body['voucher_id'])) {
            $voucher = query('SELECT v.*, r.discount FROM vouchers v JOIN rewards r ON r.id = v.reward_id WHERE v.id = ? AND v.customer_id = ? AND v.used_at IS NULL FOR UPDATE', [(int) $body['voucher_id'], $id])->fetch();
            if (!$voucher) reject('This voucher is no longer available.');
            $voucherId = $voucher['id'];
            $discount = min($subtotal, (int) $voucher['discount']);
        }
        query('INSERT INTO orders (customer_id, checkout_key, subtotal, discount, total, voucher_id, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [$id, $key, $subtotal, $discount, $subtotal - $discount, $voucherId, $method, $notes]);
        $orderId = (int) $db->lastInsertId();
        foreach ($lines as $line) query('INSERT INTO order_items (order_id, product_id, name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)', array_merge([$orderId], $line));
        $db->commit(); respond(['order_id' => $orderId]);
    }

    if ($action === 'payment') {
        $order = query('SELECT * FROM orders WHERE id = ? AND customer_id = ? FOR UPDATE', [(int) ($body['order_id'] ?? 0), $id])->fetch();
        if (!$order) reject('Order not found.', 404);
        if ($order['payment_status'] === 'paid') { $db->commit(); respond(dashboard($id)); }
        $outcome = $body['outcome'] ?? '';
        if (!in_array($outcome, ['paid', 'failed', 'cancelled'], true)) reject('Choose a simulator result.');
        if ($outcome === 'paid') {
            if ($order['voucher_id']) {
                $voucher = query('SELECT * FROM vouchers WHERE id = ? FOR UPDATE', [$order['voucher_id']])->fetch();
                if ($voucher['used_at']) reject('That voucher was used on another order. Create a new order without it.');
                query('UPDATE vouchers SET used_at = NOW() WHERE id = ?', [$voucher['id']]);
            }
            do { $loyalty = code(6); } while (query('SELECT id FROM orders WHERE loyalty_code = ?', [$loyalty])->fetch());
            query("UPDATE orders SET payment_status = 'paid', loyalty_code = ?, earned_points = ? WHERE id = ?", [$loyalty, intdiv((int) $order['total'], 10), $order['id']]);
        } else {
            query('UPDATE orders SET payment_status = ? WHERE id = ?', [$outcome, $order['id']]);
        }
        $db->commit(); respond(dashboard($id));
    }

    if ($action === 'claim') {
        $claimCode = strtoupper(trim((string) ($body['code'] ?? '')));
        if (!preg_match('/^[A-Z0-9]{6}$/', $claimCode)) reject('Enter the six-character code from your receipt.');
        $order = query("SELECT * FROM orders WHERE loyalty_code = ? AND customer_id = ? AND payment_status = 'paid' FOR UPDATE", [$claimCode, $id])->fetch();
        if (!$order) reject('No paid order on your account matches this code.');
        if ($order['claimed_at']) reject('You already claimed this code. Your points are safe!');
        query('UPDATE orders SET claimed_at = NOW() WHERE id = ?', [$order['id']]);
        query('UPDATE customers SET points = points + ? WHERE id = ?', [$order['earned_points'], $id]);
        query('INSERT INTO point_activity (customer_id, description, points) VALUES (?, ?, ?)', [$id, 'Order RIO-' . $order['id'] . ' · ' . $claimCode, $order['earned_points']]);
    } elseif ($action === 'redeem') {
        $reward = query('SELECT * FROM rewards WHERE id = ?', [(int) ($body['reward_id'] ?? 0)])->fetch();
        if (!$reward) reject('Reward not found.');
        $balance = account();
        if ((int) $balance['points'] < (int) $reward['points']) reject('A few more coffee runs! You do not have enough points yet.');
        query('UPDATE customers SET points = points - ? WHERE id = ?', [$reward['points'], $id]);
        query('INSERT INTO vouchers (customer_id, reward_id, code) VALUES (?, ?, ?)', [$id, $reward['id'], code(12)]);
        query('INSERT INTO point_activity (customer_id, description, points) VALUES (?, ?, ?)', [$id, 'Redeemed: ' . $reward['name'], -(int) $reward['points']]);
    } elseif ($action === 'advance') {
        $order = query("SELECT * FROM orders WHERE id = ? AND customer_id = ? AND payment_status = 'paid' FOR UPDATE", [(int) ($body['order_id'] ?? 0), $id])->fetch();
        if (!$order) reject('Paid order not found.');
        $next = ['placed' => 'preparing', 'preparing' => 'ready', 'ready' => 'collected', 'collected' => 'collected'];
        query('UPDATE orders SET fulfillment = ? WHERE id = ?', [$next[$order['fulfillment']], $order['id']]);
    } else {
        reject('This endpoint was not found.', 404);
    }
    $db->commit();
    respond(dashboard($id));
} catch (JsonException $e) {
    if ($db && $db->inTransaction()) $db->rollBack();
    respond(['error' => 'The request could not be read.'], 400);
} catch (PDOException $e) {
    if ($db && $db->inTransaction()) $db->rollBack();
    error_log('Rio database: ' . $e->getMessage());
    respond(['error' => 'Cannot complete the database request. Check that XAMPP MySQL is running and the credentials in server.php are correct.'], 503);
} catch (RuntimeException $e) {
    if ($db && $db->inTransaction()) $db->rollBack();
    respond(['error' => $e->getMessage()], ($e->getCode() >= 400 && $e->getCode() <= 499) ? $e->getCode() : 422);
} catch (Throwable $e) {
    if ($db && $db->inTransaction()) $db->rollBack();
    error_log('Rio: ' . $e->getMessage());
    respond(['error' => 'Something went wrong. Please try again.'], 500);
}
