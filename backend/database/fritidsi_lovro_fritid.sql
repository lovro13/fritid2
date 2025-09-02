-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 31, 2025 at 10:17 AM
-- Server version: 11.4.8-MariaDB
-- PHP Version: 8.3.23

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fritidsi_lovro_fritid`
--

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `shipping_first_name` varchar(255) NOT NULL,
  `shipping_last_name` varchar(255) NOT NULL,
  `shipping_email` varchar(255) NOT NULL,
  `shipping_address` text NOT NULL,
  `shipping_postal_code` varchar(20) NOT NULL,
  `shipping_city` varchar(100) NOT NULL,
  `shipping_phone_number` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `user_id`, `total_amount`, `status`, `shipping_first_name`, `shipping_last_name`, `shipping_email`, `shipping_address`, `shipping_postal_code`, `shipping_city`, `shipping_phone_number`, `created_at`) VALUES
(3, 67, 0.76, 'Pending', 'Lovro', 'Škrlj', 'lovro.zskrlj@gmail.com', 'Trstenik 134', '4204', 'Golnik', '+38664226603', '2025-08-17 21:30:15'),
(4, 67, 2.08, 'Pending', 'Lovro', 'Škrlj', 'lovro.zskrlj@gmail.com', 'Trstenik 134', '4204', 'Golnik', '+38664226603', '2025-08-19 12:57:45'),
(5, NULL, 39.00, 'Pending', 'Lovro', 'Škrlj', 'lovro.zskrlj@gmail.com', 'Trstenik 134', '4204', 'Golnik', '+38664226603', '2025-08-24 14:15:09');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `quantity`, `price`, `created_at`) VALUES
(14, 3, 323, 4, 0.19, '2025-08-17 21:30:15'),
(15, 4, 304, 4, 0.37, '2025-08-19 12:57:45'),
(16, 4, 322, 1, 0.60, '2025-08-19 12:57:45'),
(17, 5, 307, 100, 0.39, '2025-08-24 14:15:09');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `image_url` varchar(512) DEFAULT NULL,
  `colors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`colors`)),
  `category` varchar(100) DEFAULT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `colors`, `category`, `stock_quantity`, `is_active`, `created_at`, `updated_at`) VALUES
(302, 'Pokrovček s kapalko', '', 0.14, '/images/pokrovcek-s-kapalko.jpeg', '\"[\\\"Default\\\"]\"', '', 1000, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(303, 'Pokrovček s stekleno pipeto 100 ml', NULL, 0.43, '/images/pokrovcek-stekleno-pipeto-100ml.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(304, 'Pokrovček s stekleno pipeto 10 ml', NULL, 0.37, '/images/pokrovcek-stekleno-pipeto-10ml.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(305, 'Pokrovček s stekleno pipeto 15 ml', NULL, 0.37, '/images/pokrovcek-stekleno-pipeto-15ml.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(306, 'Pokrovček s stekleno pipeto 20 ml', NULL, 0.38, '/images/pokrovcek-stekleno-pipeto-20ml.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(307, 'Pokrovček s stekleno pipeto 30 ml', NULL, 0.39, '/images/pokrovcek-stekleno-pipeto-30ml.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(308, 'Pokrovček s stekleno pipeto 50 ml', NULL, 0.41, '/images/pokrovcek-stekleno-pipeto-50ml.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(309, 'Pršilka univerzalna', NULL, 0.68, '/images/prsilka-univerzalna.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(310, 'Steklenička za kapljevine 5 ml - rjava', NULL, 0.15, '/images/steklenicka-kapljevine-5ml-rjava.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(311, 'Steklenička za kapljevine 20 ml - kobalt modra', NULL, 0.22, '/images/steklenicka-kapljevine-20ml-kobalt-modra.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(312, 'Steklenička za kapljevine 30 ml - kobalt modra', NULL, 0.30, '/images/steklenicka-kapljevine-30ml-kobalt-modra.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(313, 'Steklenička za kapljevine 10 ml - kobalt modra', NULL, 0.18, '/images/steklenicka-kapljevine-10ml-kobalt-modra.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(314, 'Steklenička za kapljevine 50 ml - kobalt modra', NULL, 0.39, '/images/steklenicka-kapljevine-50ml-kobalt-modra.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(315, 'Steklenička za kapljevine 100 ml - kobalt modra', NULL, 0.49, '/images/steklenicka-kapljevine-100ml-kobalt-modra.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(316, 'Steklenička za kapljevine 10 ml - rjava', NULL, 0.16, '/images/steklenicka-kapljevine-10ml-rjava.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(317, 'Steklenička za kapljevine 15 ml - rjava', NULL, 0.18, '/images/steklenicka-kapljevine-15ml-rjava.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(318, 'Steklenička za kapljevine 20 ml - rjava', NULL, 0.19, '/images/steklenicka-kapljevine-20ml-rjava.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(319, 'Steklenička za kapljevine 30 ml - rjava', NULL, 0.27, '/images/steklenicka-kapljevine-30ml-rjava.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(320, 'Steklenička za kapljevine 50 ml - rjava', NULL, 0.29, '/images/steklenicka-kapljevine-50ml-rjava.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(321, 'Steklenička za kapljevine 100 ml - rjava', NULL, 0.39, '/images/steklenicka-kapljevine-100ml-rjava.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41'),
(322, 'Doza za shranjevanje živil 200 m', '', 0.60, '/images/product-1755607838427-718645919.jpeg', '[]', '', 0, 1, '2025-08-12 12:19:43', '2025-08-19 12:50:38'),
(323, 'ČEBELICA - embalaža za med 150 ml', NULL, 0.19, '/images/cebelica-embalaza-med-150ml.jpeg', '[\"default\"]', NULL, 0, 1, '2025-08-12 12:19:43', '2025-08-16 11:56:41');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `role` varchar(20) DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `password_hash`, `address`, `postal_code`, `city`, `phone_number`, `role`, `created_at`) VALUES
(66, 'Admin', 'Fritid', 'admin@fritid.com', '$2b$10$zxjeAIJqZagflNycHm9rJ.nUUeJEqrP5Oo.Ayq3NbDVb5nF9CYbHG', NULL, NULL, NULL, NULL, 'admin', '2025-08-16 05:29:07'),
(67, 'Lovro', 'Škrlj', 'lovro.zskrlj@gmail.com', '$2b$10$j2NoPUE6brRBU3zb1V.Eiekc3HxzJGMk.2DSxTw/DTMF3qmEbL8IK', NULL, NULL, NULL, NULL, 'admin', '2025-08-17 21:29:36');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_orders_user_id` (`user_id`),
  ADD KEY `idx_orders_status` (`status`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_items_order_id` (`order_id`),
  ADD KEY `idx_order_items_product_id` (`product_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_products_active` (`is_active`),
  ADD KEY `idx_products_price` (`price`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=324;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=68;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
