# 📁 File Manager App (Angular + AWS)

A cloud-based file upload and management application built using **Angular** and deployed on **AWS EC2**, with **Amazon S3** used for scalable and secure file storage.

---

## 🚀 Live Demo

👉 http://44.220.95.125/

---

## 🛠 Tech Stack

* **Frontend:** Angular, TypeScript
* **Cloud:** AWS EC2, Amazon S3
* **Server:** Nginx
* **Other:** IAM, CORS Configuration

---

## 📌 Features

* Upload files directly to cloud storage (S3)
* Secure file handling using AWS IAM policies
* Fast and responsive UI with Angular
* Scalable cloud-based architecture
* CORS-enabled secure communication
* Production deployment on EC2

---

## 🏗 Architecture

```
User (Browser)
     ↓
Angular Frontend (EC2 - Nginx)
     ↓
Backend / API (if applicable)
     ↓
Amazon S3 (File Storage)
```

---

## ☁️ AWS Services Used

### 🔹 EC2 (Elastic Compute Cloud)

* Hosted Angular application
* Configured Nginx for serving the app
* Managed inbound traffic using security groups

### 🔹 Amazon S3

* Stored uploaded files
* High durability and scalability
* Public/controlled access via bucket policies

### 🔹 IAM (Identity and Access Management)

* Controlled access between EC2 and S3
* Secured file upload permissions

---

## ⚙️ Deployment Steps

### 1. Build Angular App

```bash
ng build --configuration production
```

### 2. Setup EC2 Instance

* Launch EC2 (Ubuntu)
* Install Node.js & Nginx
* Configure security groups (HTTP/HTTPS)

### 3. Deploy to EC2

```bash
scp -r dist/ ubuntu@<EC2-IP>:/var/www/html
```

### 4. Configure Nginx

* Point root to Angular build folder
* Enable routing support

### 5. Setup S3

* Create bucket
* Configure CORS
* Add bucket policy

---

## 🔐 Security Configurations

* IAM roles for secure AWS access
* S3 bucket policies for controlled file access
* CORS configuration for frontend integration

---

## 📸 Screenshots

*Add screenshots here:*

* Upload UI
* Successful upload
* S3 bucket files view

---

## 📈 Future Improvements

* Add authentication (JWT)
* File preview support
* Drag-and-drop upload
* Progress bar for uploads

---

## 👨‍💻 Author

**Manikandan G**

* LinkedIn: https://linkedin.com/in/manikandan-g-dev23051996
* GitHub: https://github.com/mani143gg

---
