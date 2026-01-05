/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.1.2-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: fritid_db
-- ------------------------------------------------------
-- Server version	12.1.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_product_id` (`product_id`),
  CONSTRAINT `1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `payment_method` enum('DELIVERY','UPN') NOT NULL DEFAULT 'DELIVERY',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_id` (`user_id`),
  KEY `idx_orders_status` (`status`),
  CONSTRAINT `1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `orders` VALUES
(1,1,0.95,'Invoice Error','Lovro','ZS','lovro.zskrlj@gmail.com','ul 123','1000','Lj','099999999','UPN','2026-01-02 18:10:24');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `image_url` varchar(512) DEFAULT NULL,
  `colors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`colors`)),
  `category` varchar(100) DEFAULT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `minimax_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_products_active` (`is_active`),
  KEY `idx_products_price` (`price`)
) ENGINE=InnoDB AUTO_INCREMENT=324 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `products` VALUES
(302,'Pokrovček s kapalko','',0.14,'/images/pokrovcek-s-kapalko.jpeg','\"[\\\"Default\\\"]\"','',1000,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(303,'Pokrovček s stekleno pipeto 100 ml',NULL,0.43,'/images/pokrovcek-stekleno-pipeto-100ml.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(304,'Pokrovček s stekleno pipeto 10 ml',NULL,0.37,'/images/pokrovcek-stekleno-pipeto-10ml.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(305,'Pokrovček s stekleno pipeto 15 ml',NULL,0.37,'/images/pokrovcek-stekleno-pipeto-15ml.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(306,'Pokrovček s stekleno pipeto 20 ml',NULL,0.38,'/images/pokrovcek-stekleno-pipeto-20ml.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(307,'Pokrovček s stekleno pipeto 30 ml',NULL,0.39,'/images/pokrovcek-stekleno-pipeto-30ml.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(308,'Pokrovček s stekleno pipeto 50 ml',NULL,0.41,'/images/pokrovcek-stekleno-pipeto-50ml.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(309,'Pršilka univerzalna',NULL,0.68,'/images/prsilka-univerzalna.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(310,'Steklenička za kapljevine 5 ml - rjava',NULL,0.15,'/images/steklenicka-kapljevine-5ml-rjava.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(311,'Steklenička za kapljevine 20 ml - kobalt modra',NULL,0.22,'/images/steklenicka-kapljevine-20ml-kobalt-modra.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(312,'Steklenička za kapljevine 30 ml - kobalt modra',NULL,0.30,'/images/steklenicka-kapljevine-30ml-kobalt-modra.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(313,'Steklenička za kapljevine 10 ml - kobalt modra',NULL,0.18,'/images/steklenicka-kapljevine-10ml-kobalt-modra.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(314,'Steklenička za kapljevine 50 ml - kobalt modra',NULL,0.39,'/images/steklenicka-kapljevine-50ml-kobalt-modra.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(315,'Steklenička za kapljevine 100 ml - kobalt modra',NULL,0.49,'/images/steklenicka-kapljevine-100ml-kobalt-modra.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(316,'Steklenička za kapljevine 10 ml - rjava',NULL,0.16,'/images/steklenicka-kapljevine-10ml-rjava.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(317,'Steklenička za kapljevine 15 ml - rjava',NULL,0.18,'/images/steklenicka-kapljevine-15ml-rjava.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(318,'Steklenička za kapljevine 20 ml - rjava',NULL,0.19,'/images/steklenicka-kapljevine-20ml-rjava.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(319,'Steklenička za kapljevine 30 ml - rjava',NULL,0.27,'/images/steklenicka-kapljevine-30ml-rjava.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(320,'Steklenička za kapljevine 50 ml - rjava',NULL,0.29,'/images/steklenicka-kapljevine-50ml-rjava.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(321,'Steklenička za kapljevine 100 ml - rjava',NULL,0.39,'/images/steklenicka-kapljevine-100ml-rjava.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41'),
(322,'Doza za shranjevanje živil 200 m','',0.60,'/images/product-1755607838427-718645919.jpeg','[]','',0,1,NULL,'2025-08-12 10:19:43','2025-08-19 10:50:38'),
(323,'ČEBELICA - embalaža za med 150 ml',NULL,0.19,'/images/cebelica-embalaza-med-150ml.jpeg','[\"default\"]',NULL,0,1,NULL,'2025-08-12 10:19:43','2025-08-16 09:56:41');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `role` varchar(20) DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `users` VALUES
(1,'Lovro','ZS','lovro.zskrlj@gmail.com','$2b$10$XZ1fxteq9pJ.in4Qa25ub.dtdoSKEHb/srb2XkcXWLEChVHoHErcq','ul 123','1000','Lj','099999999','admin','2026-01-02 17:58:54');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-01-05 21:29:47
