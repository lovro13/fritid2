/*M!999999\- enable the sandbox mode */
-- MariaDB dump 10.19-12.1.2-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: fritid_db
-- ------------------------------------------------------
-- Server version 12.1.2-MariaDB

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
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `order_items` VALUES
(1,1,323,1,0.19,'2025-11-13 16:36:31'),
(2,2,323,1,0.19,'2025-11-13 16:41:58'),
(3,3,323,1,0.19,'2025-11-13 16:43:40'),
(4,4,323,1,0.19,'2025-11-13 16:45:33'),
(5,5,323,1,0.19,'2025-11-13 16:47:17'),
(6,6,323,1,0.19,'2025-11-13 16:49:54'),
(7,7,323,2,0.19,'2025-11-13 16:58:02'),
(8,8,323,2,0.19,'2025-11-13 17:01:19'),
(9,11,323,2,0.19,'2025-11-13 17:23:44'),
(10,14,323,2,0.19,'2025-11-13 17:24:37'),
(11,15,323,1,0.19,'2025-11-13 17:27:15'),
(12,16,323,1,0.19,'2025-11-13 17:28:38'),
(13,17,323,1,0.19,'2025-11-13 17:29:14'),
(14,18,323,1,0.19,'2025-11-13 17:33:29'),
(15,19,323,1,0.19,'2025-11-13 17:34:40'),
(16,20,323,1,0.19,'2025-11-13 17:35:45'),
(17,21,323,1,0.19,'2025-11-13 17:36:54'),
(18,22,323,1,0.19,'2025-11-13 17:43:53'),
(19,23,323,1,0.19,'2025-11-13 17:45:51'),
(20,24,323,1,0.19,'2025-11-13 17:59:03'),
(21,25,323,1,0.19,'2025-11-13 18:04:02'),
(22,26,323,1,0.19,'2025-11-13 18:06:13'),
(23,27,323,1,0.19,'2025-11-13 18:07:21'),
(24,28,323,1,0.19,'2025-11-13 18:12:37'),
(25,29,323,1,0.19,'2025-11-13 18:14:07'),
(26,30,323,1,0.19,'2025-11-13 18:16:25'),
(27,31,323,1,0.19,'2025-11-13 18:18:17'),
(28,32,323,1,0.19,'2025-11-13 18:20:01'),
(29,33,323,1,0.19,'2025-11-13 18:22:23'),
(30,34,323,1,0.19,'2025-11-13 18:49:51'),
(31,35,323,1,0.19,'2025-11-13 18:51:45'),
(32,36,323,1,0.19,'2025-11-13 18:54:21'),
(33,37,323,1,0.19,'2025-11-13 18:55:15'),
(34,38,323,1,0.19,'2025-11-13 18:59:35'),
(35,39,323,1,0.19,'2025-11-13 18:59:57'),
(36,40,323,1,0.19,'2025-11-13 19:00:47'),
(37,41,323,1,0.19,'2025-11-13 19:02:19'),
(38,42,323,1,0.19,'2025-11-13 19:03:43'),
(39,43,323,1,0.19,'2025-11-13 19:08:02'),
(40,44,323,1,0.19,'2025-11-13 19:09:35'),
(41,45,323,1,0.19,'2025-11-13 19:11:53'),
(42,46,323,1,0.19,'2025-11-13 19:16:28'),
(43,47,323,1,0.19,'2025-11-13 19:16:50'),
(44,48,323,1,0.19,'2025-11-13 19:17:33'),
(45,49,323,1,0.19,'2025-11-13 19:46:00'),
(46,50,323,1,0.19,'2025-11-13 19:52:46'),
(47,51,323,1,0.19,'2025-11-13 19:55:17'),
(48,52,323,1,0.19,'2025-11-13 19:58:22'),
(49,53,323,1,0.19,'2025-11-13 19:59:15'),
(50,54,323,1,0.19,'2025-11-13 20:02:30'),
(51,55,323,1,0.19,'2025-11-13 20:03:49'),
(52,56,323,1,0.19,'2025-11-13 20:05:43'),
(53,57,323,1,0.19,'2025-11-15 20:33:05'),
(54,58,323,1,0.19,'2025-11-15 21:35:40'),
(55,59,323,1,0.19,'2025-11-15 21:35:59'),
(56,60,323,1,0.19,'2025-11-16 10:25:08'),
(57,61,323,1,0.19,'2025-11-16 11:16:22'),
(58,62,323,1,0.19,'2025-11-16 11:21:15'),
(59,63,323,1,0.19,'2025-11-16 11:21:29'),
(60,64,323,1,0.19,'2025-11-16 11:25:30'),
(61,65,323,1,0.19,'2025-11-16 11:32:16'),
(62,66,323,1,0.19,'2025-11-16 11:32:26'),
(63,67,323,1,0.19,'2025-11-16 11:34:43');
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
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `orders` VALUES
(1,69,0.19,'Pending','Lovro','TEST','test@gmail.com','Ulica 12','9000','Lj','011111111','DELIVERY','2025-11-13 16:36:31'),
(2,69,0.19,'Pending','Lovro','TEST','test@gmail.com','Ulica 12','9000','Lj','011111111','DELIVERY','2025-11-13 16:41:58'),
(3,70,0.19,'Pending','Lovro','TESTTT','test@lovro.com','ul 123','1000','lj','012345678','DELIVERY','2025-11-13 16:43:40'),
(4,71,0.19,'Pending','Lovro','TESTTT','l@test.si','lj 12','1000','lj','098765432','DELIVERY','2025-11-13 16:45:33'),
(5,72,0.19,'Pending','lovro','lovro','test@l.si','12 12 ','1090','lj','098765432','DELIVERY','2025-11-13 16:47:17'),
(6,73,0.19,'Pending','Lo','Test','lovro@tes.si','ul 123 ','1000','ljk','098765432','DELIVERY','2025-11-13 16:49:54'),
(7,74,0.38,'Pending','ss','TEST','mmm@test.com','ul 123','1000','lj','098765429','DELIVERY','2025-11-13 16:58:02'),
(8,75,0.38,'Pending','ss','ss','ime@test.com','ul 123','1000','ljk','098765433','DELIVERY','2025-11-13 17:01:19'),
(9,76,0.38,'Pending','ss','ss','ss@ss.si','ul 123','1000','lj','098765421','DELIVERY','2025-11-13 17:20:30'),
(10,76,0.38,'Pending','ss','ss','ss@ss.si','ul 123','1000','lj','098765421','DELIVERY','2025-11-13 17:20:45'),
(11,76,0.38,'Pending','ss','ss','ss@ss.si','ul 123','1000','lj','098765421','DELIVERY','2025-11-13 17:23:44'),
(12,76,0.38,'Pending','ss','ss','ss@ss.si','ul 123','1000','lj','098765421','DELIVERY','2025-11-13 17:24:05'),
(13,76,0.38,'Pending','ss','ss','ss@ss.si','ul 123','1000','lj','098765421','DELIVERY','2025-11-13 17:24:18'),
(14,76,0.38,'Pending','ss','ss','ss@ss.si','ul 123','1000','lj','098765421','DELIVERY','2025-11-13 17:24:37'),
(15,77,0.19,'Pending','Lovro','Test','test@testttt.si','ul 123','1000','lj','098765632','DELIVERY','2025-11-13 17:27:15'),
(16,78,0.19,'Pending','ss','ss','ss@123.si','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 17:28:38'),
(17,79,0.19,'Pending','lovro','123','lovro.zskrlj@gmail1.com','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 17:29:14'),
(18,80,0.19,'Pending','lov','test','ime@test.commmm','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 17:33:29'),
(19,81,0.19,'Pending','lo','lo','test1000@s.si','ul 123 1','1000','lk','011111111','DELIVERY','2025-11-13 17:34:40'),
(20,81,0.19,'Pending','lo','lo','test1000@s.si','ul 123 1','1000','lk','011111111','DELIVERY','2025-11-13 17:35:45'),
(21,82,0.19,'Pending','lo','lo','test1001@s.s','il 123','1000','lj','011111111','DELIVERY','2025-11-13 17:36:54'),
(22,83,0.19,'Pending','lo','lo','test1002@s.s','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 17:43:53'),
(23,84,0.19,'Pending','lo','lo','test1004@s.s','Ul 123','1000','Lk','099999999','DELIVERY','2025-11-13 17:45:51'),
(24,85,0.19,'Pending','lo','lo','test1006@s.s','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 17:59:03'),
(25,86,0.19,'Pending','lo','lo','test1007@s.s','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 18:04:02'),
(26,86,0.19,'Pending','lo','lo','test1007@s.s','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 18:06:12'),
(27,87,0.19,'Pending','lo1','lo','test1008@s.s','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 18:07:21'),
(28,88,0.19,'Pending','lo','lo','test1009@s.s','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 18:12:37'),
(29,89,0.19,'Pending','lo','lo','test1010@s.s','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 18:14:07'),
(30,90,0.19,'Pending','lo','lo','test1011@s.s','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 18:16:25'),
(31,91,0.19,'Pending','lo','lo','test1013@s.s','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 18:18:17'),
(32,92,0.19,'Pending','lo','lo','test1015@s.s','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 18:20:01'),
(33,93,0.19,'Pending','lo1','lo','test1016@s.s','ul 123','1000','lj','099999999','DELIVERY','2025-11-13 18:22:23'),
(34,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 18:49:51'),
(35,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 18:51:45'),
(36,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 18:54:21'),
(37,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 18:55:15'),
(38,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 18:59:35'),
(39,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 18:59:57'),
(40,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:00:47'),
(41,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:02:19'),
(42,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:03:43'),
(43,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:08:02'),
(44,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:09:35'),
(45,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:11:53'),
(46,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:16:28'),
(47,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:16:50'),
(48,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:17:33'),
(49,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:46:00'),
(50,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:52:46'),
(51,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:55:17'),
(52,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:58:22'),
(53,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 19:59:15'),
(54,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 20:02:30'),
(55,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 20:03:49'),
(56,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-13 20:05:43'),
(57,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-15 20:33:05'),
(58,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-15 21:35:40'),
(59,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-15 21:35:59'),
(60,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-16 10:25:08'),
(61,95,0.19,'Pending','TEST','TEST','dragonferno9@gmail.com','ul 123','1000','lj','099999999','DELIVERY','2025-11-16 11:16:22'),
(62,95,0.19,'Pending','TEST','TEST','dragonferno9@gmail.com','ul 123','1000','lj','099999999','DELIVERY','2025-11-16 11:21:15'),
(63,95,0.19,'Pending','TEST','TEST','dragonferno9@gmail.com','ul 123','1000','lj','099999999','DELIVERY','2025-11-16 11:21:29'),
(64,95,0.19,'Pending','TEST','TEST','dragonferno9@gmail.com','ul 123','1000','lj','099999999','DELIVERY','2025-11-16 11:25:30'),
(65,95,0.19,'Pending','TEST','TEST','dragonferno9@gmail.com','ul 123','1000','lj','099999999','DELIVERY','2025-11-16 11:32:16'),
(66,95,0.19,'Pending','TEST','TEST','dragonferno9@gmail.com','ul 123','1000','lj','099999999','DELIVERY','2025-11-16 11:32:26'),
(67,95,0.19,'Pending','TEST','TEST','dragonferno9@gmail.com','ul 123','1000','lj','099999999','DELIVERY','2025-11-16 11:34:43'),
(68,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-17 19:20:27'),
(69,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-17 19:22:54'),
(70,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-17 19:23:28'),
(71,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-17 19:24:47'),
(72,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-17 19:26:22'),
(73,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','DELIVERY','2025-11-17 19:27:14'),
(74,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','UPN','2025-11-17 19:27:19'),
(75,67,0.19,'Pending','Lovro','Škrlj','lovro.zskrlj@gmail.com','Trstenik 134','1000','TESTTTTTT','064226603','UPN','2025-11-17 19:28:01'),
(76,96,0.19,'Invoice Error','Lovro','TEST','l@l.si','ul 123','1000','Lj','099999999','DELIVERY','2025-11-19 20:38:50'),
(77,96,0.19,'Invoice Error','Lovro','TEST','l@l.si','ul 123','1000','Lj','099999999','DELIVERY','2025-11-19 20:39:02'),
(78,96,0.19,'Pending','Lovro','TEST','l@l.si','ul 123','1000','Lj','099999999','DELIVERY','2025-11-19 20:44:43'),
(79,67,0.19,'Pending','lovro','zupan','lovro.zskrlj@gmail.com','ul 123 ','1000','lj','099999999','UPN','2025-11-19 20:45:47'),
(80,67,0.19,'Pending','lovro','zupan','lovro.zskrlj@gmail.com','ul 123 ','1000','lj','099999999','UPN','2025-11-19 20:57:40'),
(81,67,0.19,'Invoice Error','lovro','TEST','lovro.zskrlj@gmail.com','ul 123 ','1000','lj','099999999','UPN','2025-11-19 21:00:16'),
(82,67,0.19,'Pending','lovro','TEST','lovro.zskrlj@gmail.com','ul 123 ','1000','lj','099999999','UPN','2025-11-19 21:02:44'),
(83,68,22.00,'Invoice Error','LovroTEST','Zupan Škrlj','lz58516@student.uni-lj.si','uk 123','1999','lj','099999999','UPN','2025-11-23 17:52:21'),
(84,68,22.00,'Invoice Error','LovroTEST','Zupan Škrlj','lz58516@student.uni-lj.si','uk 123','1999','lj','099999999','UPN','2025-11-23 17:54:37'),
(85,67,22.00,'Pending','LovroTEST','Zupan Škrlj','lovro.zskrlj@gmail.com','uk 123','1999','lj','099999999','UPN','2025-11-23 17:55:41'),
(86,68,22.00,'Pending','LovroTEST','Zupan Škrlj','lz58516@student.uni-lj.si','uk 123','1999','lj','099999999','UPN','2025-11-23 17:57:37'),
(87,67,22.00,'Pending','LovroTEST','Zupan Škrlj','lovro.zskrlj@gmail.com','uk 123','1999','lj','099999999','UPN','2025-11-23 18:01:23'),
(88,67,22.00,'Pending','LovroTEST','Zupan Škrlj','lovro.zskrlj@gmail.com','uk 123','1000','lj','099999999','UPN','2025-11-23 18:01:45'),
(89,67,22.00,'Pending','LovroTEST','Zupan Škrlj','lovro.zskrlj@gmail.com','uk 123','1000','lj','099999999','UPN','2025-11-23 18:03:35'),
(90,67,22.00,'Pending','LovroTEST','Zupan Škrlj','lovro.zskrlj@gmail.com','uk 123','1000','lj','099999999','UPN','2025-11-23 18:08:52'),
(91,95,0.19,'Pending','test¸','test','dragonferno9@gmail.com','ul 123','1000','lj','099999999','UPN','2025-11-24 20:56:40');
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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `minimax_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_products_active` (`is_active`),
  KEY `idx_products_price` (`price`)
) ENGINE=InnoDB AUTO_INCREMENT=328 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `products` VALUES
(302,'Pokrovček s kapalko','',0.14,'/images/pokrovcek-s-kapalko.jpeg','\"[\\\"Default\\\"]\"','',1000,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(303,'Pokrovček s stekleno pipeto 100 ml',NULL,0.43,'/images/pokrovcek-stekleno-pipeto-100ml.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(304,'Pokrovček s stekleno pipeto 10 ml',NULL,0.37,'/images/pokrovcek-stekleno-pipeto-10ml.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(305,'Pokrovček s stekleno pipeto 15 ml',NULL,0.37,'/images/pokrovcek-stekleno-pipeto-15ml.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(306,'Pokrovček s stekleno pipeto 20 ml',NULL,0.38,'/images/pokrovcek-stekleno-pipeto-20ml.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(307,'Pokrovček s stekleno pipeto 30 ml',NULL,0.39,'/images/pokrovcek-stekleno-pipeto-30ml.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(308,'Pokrovček s stekleno pipeto 50 ml',NULL,0.41,'/images/pokrovcek-stekleno-pipeto-50ml.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(309,'Pršilka univerzalna',NULL,0.68,'/images/prsilka-univerzalna.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(310,'Steklenička za kapljevine 5 ml - rjava',NULL,0.15,'/images/steklenicka-kapljevine-5ml-rjava.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(311,'Steklenička za kapljevine 20 ml - kobalt modra',NULL,0.22,'/images/steklenicka-kapljevine-20ml-kobalt-modra.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(312,'Steklenička za kapljevine 30 ml - kobalt modra',NULL,0.30,'/images/steklenicka-kapljevine-30ml-kobalt-modra.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(313,'Steklenička za kapljevine 10 ml - kobalt modra',NULL,0.18,'/images/steklenicka-kapljevine-10ml-kobalt-modra.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(314,'Steklenička za kapljevine 50 ml - kobalt modra',NULL,0.39,'/images/steklenicka-kapljevine-50ml-kobalt-modra.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(315,'Steklenička za kapljevine 100 ml - kobalt modra',NULL,0.49,'/images/steklenicka-kapljevine-100ml-kobalt-modra.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(316,'Steklenička za kapljevine 10 ml - rjava',NULL,0.16,'/images/steklenicka-kapljevine-10ml-rjava.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(317,'Steklenička za kapljevine 15 ml - rjava',NULL,0.18,'/images/steklenicka-kapljevine-15ml-rjava.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(318,'Steklenička za kapljevine 20 ml - rjava',NULL,0.19,'/images/steklenicka-kapljevine-20ml-rjava.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(319,'Steklenička za kapljevine 30 ml - rjava',NULL,0.27,'/images/steklenicka-kapljevine-30ml-rjava.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(320,'Steklenička za kapljevine 50 ml - rjava',NULL,0.29,'/images/steklenicka-kapljevine-50ml-rjava.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(321,'Steklenička za kapljevine 100 ml - rjava',NULL,0.39,'/images/steklenicka-kapljevine-100ml-rjava.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(322,'Doza za shranjevanje živil 200 m','',0.60,'/images/product-1762599361006-444496275.jpeg','[]','',0,1,'2025-08-12 12:19:43','2025-11-08 10:56:01',NULL),
(323,'ČEBELICA - embalaža za med 150 ml',NULL,0.19,'/images/cebelica-embalaza-med-150ml.jpeg','[\"default\"]',NULL,0,1,'2025-08-12 12:19:43','2025-08-16 11:56:41',NULL),
(324,'Poštnina','Stroški poštnine za dostavo naročila',5.99,NULL,'[\"Default\"]','shipping',9999,0,'2025-11-16 09:53:38','2025-11-16 09:53:38',NULL),
(325,'Hacked Product','This product was created without auth',1337.00,'http://example.com/hacked.jpg',NULL,'Hacked',100,1,'2025-11-23 17:33:06','2025-11-23 17:33:06',NULL),
(326,'Hacked Product','This product was created without auth',1337.00,'http://example.com/hacked.jpg',NULL,'Hacked',100,1,'2025-11-23 17:35:35','2025-11-23 17:35:35',NULL),
(327,'TEst','SS',11.00,'/images/product-1763919727729-389100020.png','\"[\\\"Blue\\\"]\"','TEST',1,1,'2025-11-23 17:42:07','2025-11-23 17:42:07',NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=97 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `users` VALUES
(66,'Admin','Fritid','admin@fritid.com','$2b$10$zxjeAIJqZagflNycHm9rJ.nUUeJEqrP5Oo.Ayq3NbDVb5nF9CYbHG',NULL,NULL,NULL,NULL,'admin','2025-08-16 05:29:07'),
(67,'Lovro','Škrlj','lovro.zskrlj@gmail.com','$2b$10$j2NoPUE6brRBU3zb1V.Eiekc3HxzJGMk.2DSxTw/DTMF3qmEbL8IK','uk 123','1000','lj','099999999','admin','2025-08-17 21:29:36'),
(68,'Lovro','Zupan Škrlj','lz58516@student.uni-lj.si','$2b$10$pZghRm3Ik48zteNJcDr2yO5Vw9preHxDezAkhXbrOmKe5T9fLonwG','uk 123','1999','lj','099999999','admin','2025-11-08 10:52:59'),
(69,'Lovro','TEST','test@gmail.com',NULL,'Ulica 12','9000','Lj','011111111','user','2025-11-13 16:36:31'),
(70,'Lovro','TESTTT','test@lovro.com',NULL,'ul 123','1000','lj','012345678','user','2025-11-13 16:43:40'),
(71,'Lovro','TESTTT','l@test.si',NULL,'lj 12','1000','lj','098765432','user','2025-11-13 16:45:33'),
(72,'lovro','lovro','test@l.si',NULL,'12 12 ','1090','lj','098765432','user','2025-11-13 16:47:17'),
(73,'Lo','Test','lovro@tes.si',NULL,'ul 123 ','1000','ljk','098765432','user','2025-11-13 16:49:54'),
(74,'ss','TEST','mmm@test.com',NULL,'ul 123','1000','lj','098765429','user','2025-11-13 16:58:02'),
(75,'ss','ss','ime@test.com',NULL,'ul 123','1000','ljk','098765433','user','2025-11-13 17:01:19'),
(76,'ss','ss','ss@ss.si',NULL,'ul 123','1000','lj','098765421','user','2025-11-13 17:20:30'),
(77,'Lovro','Test','test@testttt.si',NULL,'ul 123','1000','lj','098765632','user','2025-11-13 17:27:15'),
(78,'ss','ss','ss@123.si',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 17:28:38'),
(79,'lovro','123','lovro.zskrlj@gmail1.com',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 17:29:14'),
(80,'lov','test','ime@test.commmm',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 17:33:29'),
(81,'lo','lo','test1000@s.si',NULL,'ul 123 1','1000','lk','011111111','user','2025-11-13 17:34:40'),
(82,'lo','lo','test1001@s.s',NULL,'il 123','1000','lj','011111111','user','2025-11-13 17:36:54'),
(83,'lo','lo','test1002@s.s',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 17:43:53'),
(84,'lo','lo','test1004@s.s',NULL,'Ul 123','1000','Lk','099999999','user','2025-11-13 17:45:51'),
(85,'lo','lo','test1006@s.s',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 17:59:03'),
(86,'lo','lo','test1007@s.s',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 18:04:02'),
(87,'lo1','lo','test1008@s.s',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 18:07:21'),
(88,'lo','lo','test1009@s.s',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 18:12:37'),
(89,'lo','lo','test1010@s.s',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 18:14:07'),
(90,'lo','lo','test1011@s.s',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 18:16:25'),
(91,'lo','lo','test1013@s.s',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 18:18:17'),
(92,'lo','lo','test1015@s.s',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 18:20:01'),
(93,'lo1','lo','test1016@s.s',NULL,'ul 123','1000','lj','099999999','user','2025-11-13 18:22:23'),
(94,'Lovro','TESTT','lovro.zskrlj1@gmail.com','$2b$10$tHQJs2zdb4tkYvbb/ukriO2YoEyBInysne2lxVoxRVAhEPsgcJbYW',NULL,NULL,NULL,NULL,'user','2025-11-13 18:47:29'),
(95,'TEST','TEST','dragonferno9@gmail.com','$2b$10$6gKxIBwM3V4uasLoCdHae.jeKeGViNnRrcFtubnRht6tgtrLfxtqm','ul 123','1000','lj','099999999','user','2025-11-16 11:15:30'),
(96,'Lovro','TEST','l@l.si',NULL,'ul 123','1000','Lj','099999999','user','2025-11-19 20:34:10');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping events for database 'fritid_db'
--

--
-- Dumping routines for database 'fritid_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-01-05 21:17:41
