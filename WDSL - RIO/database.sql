CREATE DATABASE IF NOT EXISTS rio_street CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rio_street;

CREATE TABLE IF NOT EXISTS customers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    points INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL,
    description VARCHAR(255) NOT NULL,
    price INT UNSIGNED NOT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

INSERT IGNORE INTO products (id, name, category, description, price) VALUES
(1, 'Spanish Latte', 'Coffee', 'Espresso, milk, and a little condensed-milk sweetness. Your slow-afternoon companion.', 140),
(2, 'Iced Americano', 'Coffee', 'A double shot over cold water and ice. Clean, bold, beautifully uncomplicated.', 100),
(3, 'Caramel Latte', 'Coffee', 'Smooth espresso and milk with a buttery caramel finish.', 150),
(4, 'Café Latte', 'Coffee', 'The everyday classic. Espresso softened with silky milk.', 130),
(5, 'Mocha', 'Coffee', 'Chocolate meets espresso, finished with creamy milk.', 150),
(6, 'Matcha Latte', 'Non-coffee', 'Earthy green tea and creamy milk, whisked into a gentle pick-me-up.', 160),
(7, 'Chocolate Milk', 'Non-coffee', 'Rich chocolate, cold milk, and a little childhood nostalgia.', 130),
(8, 'Strawberry Milk', 'Non-coffee', 'A bright berry swirl in cold, creamy milk.', 140),
(9, 'Butter Croissant', 'Pastries', 'Golden layers, a buttery middle. Made for your coffee break.', 95),
(10, 'Chocolate Cookie', 'Pastries', 'A soft-centered cookie with generous chocolate chunks.', 75);

CREATE TABLE IF NOT EXISTS rewards (
    id INT UNSIGNED PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    points INT UNSIGNED NOT NULL,
    discount INT UNSIGNED NOT NULL,
    description VARCHAR(255) NOT NULL
) ENGINE=InnoDB;
INSERT IGNORE INTO rewards VALUES
(1, 'A little extra', 30, 30, '₱30 off your next coffee run.'),
(2, 'A pastry on us', 80, 95, '₱95 off your next order — a croissant-sized treat.'),
(3, 'Your next cup', 120, 160, '₱160 off your next order. Find a new favorite.'),
(4, 'The perfect pair', 200, 255, '₱255 off a coffee-and-pastry kind of day.');

CREATE TABLE IF NOT EXISTS vouchers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    reward_id INT UNSIGNED NOT NULL,
    code CHAR(12) NOT NULL UNIQUE,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (reward_id) REFERENCES rewards(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    checkout_key CHAR(36) NOT NULL UNIQUE,
    subtotal INT UNSIGNED NOT NULL,
    discount INT UNSIGNED NOT NULL DEFAULT 0,
    total INT UNSIGNED NOT NULL,
    voucher_id INT UNSIGNED NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_status ENUM('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
    fulfillment ENUM('placed','preparing','ready','collected') NOT NULL DEFAULT 'placed',
    notes VARCHAR(300) NOT NULL DEFAULT '',
    loyalty_code CHAR(6) NULL UNIQUE,
    earned_points INT UNSIGNED NOT NULL DEFAULT 0,
    claimed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    unit_price INT UNSIGNED NOT NULL,
    quantity TINYINT UNSIGNED NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS point_activity (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    description VARCHAR(150) NOT NULL,
    points INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;
