# 📚 Research Papers Manager

A research paper management system built with Javascript , MongoDB and Redis for real-time storage, caching, and data analysis.

---

## 🚀 Tech Stack

| Layer         | Technologies                        |
|---------------|-------------------------------------|
| Backend       | Node.js + Express.js                |
| Database      | MongoDB (v7.0+)                     |
| Caching       | Redis (v7.2+)                       |
| Authentication| Session-based (`X-User-ID` header) |
| Password Hash | bcryptjs (v2.4.3)                   |
| Data Generation| faker-js (v8.4.1)                  |

---

## 🔐 Authentication Endpoints

### 📝 Signup

- **Method:** `POST`  
- **Endpoint:** `/signup`  
- **Body:**
  ```json
  {
    "username": "johndoe123",
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securePass123",
    "department": "Computer Science"
  }
  ```
- **Response:**
  ```json
  {
    "message": "User registered",
    "user_id": "abc123"
  }
  ```
- **Redis Usage:**  
  Check username availability using `HEXISTS usernames <username>`  
  Store username with `HSET usernames <username> 1`

---

### 🔑 Login

- **Method:** `POST`  
- **Endpoint:** `/login`  
- **Body:**
  ```json
  {
    "username": "johndoe123",
    "password": "securePass123"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Login successful",
    "user_id": "abc123"
  }
  ```

---

## 📄 Paper Management

### ⬆️ Upload Paper

- **Method:** `POST`  
- **Endpoint:** `/papers`  
- **Headers:**
  ```json
  {
    "X-User-ID": "abc123"
  }
  ```
- **Body:**
  ```json
  {
    "title": "Deep Learning in NLP",
    "authors": ["Jane Doe", "John Smith"],
    "abstract": "This paper explores...",
    "publication_date": "2023-05-15",
    "journal_conference": "ICML",
    "keywords": ["deep learning", "NLP"],
    "citations": ["paperId1", "paperId2"]
  }
  ```
- **Response:**
  ```json
  {
    "message": "Paper uploaded",
    "paper_id": "xyz456"
  }
  ```

---

### 🔍 Search Papers

- **Method:** `GET`  
- **Endpoint:** `/papers`  
- **Query Parameters:**
  ```
  ?search=deep learning
  &sort_by=publication_date | relevance
  &order=asc | desc
  ```
- **Response:**
  ```json
  {
    "papers": [
      {
        "id": "xyz456",
        "title": "Deep Learning in NLP",
        "authors": ["Jane Doe"],
        "publication_date": "2023-05-15",
        "journal_conference": "ICML",
        "keywords": ["deep learning", "NLP"]
      }
    ]
  }
  ```
- **Redis Usage:**  
  Cache search results using key `search:<term>:<sort_by>:<order>`  
  Store with `SETEX` and TTL of 300 seconds

---

### 📑 Paper Details

- **Method:** `GET`  
- **Endpoint:** `/papers/{paper_id}`  
- **Response:**
  ```json
  {
    "id": "xyz456",
    "title": "Deep Learning in NLP",
    "authors": ["Jane Doe"],
    "abstract": "This paper explores...",
    "publication_date": "2023-05-15",
    "journal_conference": "ICML",
    "keywords": ["deep learning", "NLP"],
    "citation_count": 3,
    "views": 42
  }
  ```
- **Redis Usage:**  
  Increment view count using `INCR paper_views:<paper_id>`  
  Sync with MongoDB every 10 minutes

---

## 🧠 Redis Keys

| Purpose                  | Sample Key                            | Operations           |
|--------------------------|----------------------------------------|----------------------|
| Username availability    | `usernames`                            | `HEXISTS`, `HSET`    |
| Search result caching    | `search:deep learning:relevance:desc` | `GET`, `SETEX`       |
| Paper view tracking      | `paper_views:xyz456`                   | `INCR`, `GET`, `SET` |

---

## 🧪 Data Seeder

- Generates 100 users with unique usernames and hashed passwords  
- Generates 1000 papers with randomized metadata  
- Random citations between papers  
- Updates Redis with all usernames

---
