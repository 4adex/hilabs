# Provider Data Quality Analytics & Dashboard
<img width="443" height="114" alt="image" src="https://github.com/user-attachments/assets/aa636af1-00da-420e-85df-fc78979d41e2" />

**Team Name:**  beetrootRaita  , **Team Members:**   [Adesh Gupta](https://github.com/4adex)  , [Aman Behera](https://github.com/beingamanforever)  , [Pratham Singla](https://github.com/PrathamSingla15)  

Video Submission: https://vimeo.com/1116586005?share=copy

# Introduction

Healthcare provider data often suffers from duplication, inconsistent formatting, missing identifiers, and invalid or expired licenses, making reliable analysis and compliance tracking challenging. To address this, we developed a comprehensive data analytics and visualization platform that streamlines the workflow:

1. Data Cleaning & Deduplication: Resolves entities and removes redundant records.

2. Standardization & Quality Assessment: Ensures consistency across phone numbers, ZIP codes, and provider names.

3. License Validation & Compliance: Checks state-specific medical board databases, with tailored logic for California and New York.

3. Interactive Queries: Allows natural language queries via a small language model integrated with a SQL engine.

4. Analytics Dashboard: Provides real-time insights to support credentialing and compliance management.

# Table of Contents

The pipeline of the platform can be divided into the following parts:

1. [Dataset](#dataset)  
2. [Preprocessing](#preprocessing)  
   2.1. [Provider Entity Resolution & Deduplication](#provider-entity-resolution--deduplication)  
   2.2. [Data Quality Assessment & Standardization](#data-quality-assessment--standardization)  
   2.3. [License Validation & Compliance Tracking](#license-validation--compliance-tracking)  
   2.4. [Compliance Score Calculation](#compliance-score-calculation)  
   2.5. [NPI Matching (Present/Not Present)](#npi-matching-presentnot-present)  
   2.6. [Outlier Removal](#outlier-removal)  
   2.7. [Final Preprocessed Data Format & Summary](#final-preprocessed-data-format--summary)  
3. [Catering Natural Language Queries](#catering-natural-language-queries)  
   3.1. [Small Language Model](#small-language-model)  
   3.2. [SQL Engine](#sql-engine)  
4. [Interactive Analytics Dashboard](#interactive-analytics-dashboard)  
   4.1. [Frontend](#frontend)  
   4.2. [Backend](#backend)  


# Requirements

1. Docker
2. Docker Compose
3. Docker Model Runner
4. NVIDIA-supported GPUs

# Dataset

The datasets used in this project include:

1. **Provider Directory Dataset** (`provider roster with errors.csv`)  
   Contains 500+ provider records with issues like duplicates, expired licenses, missing information, and formatting inconsistencies.  

2. **NY State Medical License Database** (`ny medical license database.csv`)  
   Official NY medical license records with license numbers, expiration dates, provider names, and specialties. Used to validate provider licenses in the main directory.  

3. **CA State Medical License Database** (`ca medical license database.csv`)  
   Similar to the NY dataset but for California. Used for license validation and detecting expired or mismatched records.  

4. **Mock NPI Registry** (`mock npi registry.csv`)  
   Simulated NPI Registry for validating provider identifiers, checking missing NPIs, and cross-verifying basic details like name and specialty.


# Preprocessing

## Provider Entity Resolution & Deduplication

The dataset contained multiple records referring to the same healthcare provider, requiring duplicate removal. A naive O(n²) approach for 500 records involved ~125,000 comparisons and took 40–45 seconds. To improve efficiency, we implemented a blocking-based deduplication pipeline, grouping records by keys like NPI, phone, ZIP3 + name, and address. Comparisons were limited to each block, and candidate pairs were scored using string and address similarity. This approach reduced runtime to 5–7 seconds while maintaining high accuracy, achieving over 10× speedup compared to the naive method.

<img width="2054" height="1120" alt="image" src="https://github.com/user-attachments/assets/b200b5e9-76ee-46d9-9018-d35597165b08" />

<img width="1502" height="680" alt="image" src="https://github.com/user-attachments/assets/f506292b-f4cb-401f-ad9a-7aa8a89bc6a7" />


## Data Quality Assessment & Standardization


Raw provider data often contained inconsistencies in phone numbers, ZIP codes, names, and addresses, making cross-database matching unreliable. To address this, we designed a standardization pipeline to enforce consistent formatting before downstream processing:

- **Phone Numbers:** Retain only digits, removing symbols and spaces.  
  Example: `(123)-456-7890` → `1234567890`  

- **ZIP Codes:** Normalized with zero-padding and converted ZIP+4 codes into standard format.  
  Examples: `123` → `00123`, `123456789` → `12345-6789`  

- **Name & Address Fields:** Converted to title case to eliminate formatting discrepancies.  
  Example: `JOHN DOE` → `John Doe`  

- **Full Name Reconstruction:** Rebuilt full name dynamically from first name, last name, and credential to ensure consistency across records.


## License Validation & Compliance Tracking

For license validation, we needed to merge two tables, each having a different key structure. Providers
are first filtered based on license state:

1. California (CA): System looks up the CA License Table using license number as join key.
2. New York (NY): The system queries the NY License Table using a composite join key of license number plus expiration date to identify the correct record.
   
This ensures that license status is retrieved accurately according to state-specific requirements.

<img width="1972" height="800" alt="image" src="https://github.com/user-attachments/assets/310b1e47-8113-4717-8558-9fe584bce287" />

## Compliance Score Calculation
The compliance score was calculated using a combination of data quality metrics: completeness, validity, consistency, uniqueness, accuracy, missing NPI records & expired licenses. Each metric was measured independently, and the overall score was computed as the average of these dimensions.

<img width="1532" height="946" alt="image" src="https://github.com/user-attachments/assets/dc6fe9b2-6070-4371-93b0-b69a7e76f5dc" />


## NPI Matching (Present/Not Present)
NPI was used as the primary identifier for providers. For missing NPIs, fuzzy matching using names, phone numbers, license numbers, addresses, and city-state combinations ensured reliable linkage. The merged dataset includes a boolean npi present flag indicating whether the provider’s NPI exists in the reference NPI roster, helping identify missing or unmatched records.


<img width="1532" height="1114" alt="image" src="https://github.com/user-attachments/assets/20c2f9e4-1f99-4ab7-bd94-ab4020086baf" />

## Outlier Removal
Outliers and invalid entries were filtered from the dataset. Records with unrealistic values in `years_in_practice` (outside 0–60) were removed. Missing or malformed entries in practice phone, ZIP code, and other key fields were standardized or cleaned to ensure data consistency.

### Final preprocessed data format & Summary
The dataset contains 30 columns: 28 from the original provider dataset, 1 indicating the license status (from the combined CA and NY datasets), and 1 indicating whether the NPI is present.

| #  | Column                     | Non-Null Count | Dtype  |
|----|----------------------------|----------------|--------|
| 0  | provider_id                | 500 non-null   | object |
| 1  | npi                        | 500 non-null   | int64  |
| 2  | first_name                 | 500 non-null   | object |
| 3  | last_name                  | 500 non-null   | object |
| 4  | credential                 | 500 non-null   | object |
| 5  | full_name                  | 500 non-null   | object |
| 6  | primary_specialty          | 500 non-null   | object |
| 7  | practice_address_line1     | 500 non-null   | object |
| 8  | practice_address_line2     | 159 non-null   | object |
| 9  | practice_city              | 500 non-null   | object |
| 10 | practice_state             | 500 non-null   | object |
| 11 | practice_zip               | 500 non-null   | object |
| 12 | practice_phone             | 500 non-null   | object |
| 13 | mailing_address_line1      | 500 non-null   | object |
| 14 | mailing_address_line2      | 154 non-null   | object |
| 15 | mailing_city               | 500 non-null   | object |
| 16 | mailing_state              | 500 non-null   | object |
| 17 | mailing_zip                | 500 non-null   | object |
| 18 | license_number             | 500 non-null   | object |
| 19 | license_state              | 500 non-null   | object |
| 20 | license_expiration         | 500 non-null   | object |
| 21 | accepting_new_patients     | 500 non-null   | object |
| 22 | board_certified            | 500 non-null   | bool   |
| 23 | years_in_practice          | 500 non-null   | int64  |
| 24 | medical_school             | 500 non-null   | object |
| 25 | residency_program          | 500 non-null   | object |
| 26 | last_updated               | 500 non-null   | object |
| 27 | taxonomy_code              | 500 non-null   | object |
| 28 | status                     | 500 non-null   | object |
| 29 | npi_present                | 500 non-null   | bool   |

As shown in the table, the dataset contains 30 columns: 28 from the original provider dataset, 1 indicating the license status (from the combined CA and NY datasets), and 1 indicating whether the NPI is present or not.

> **Important:** Why do we only store the relevant columns?  
> 
> We limit the schema to relevant columns because the data will be passed to the small language model (SLM). Including hundreds of columns can easily exceed the SLM’s context window, which may lead to incoherent responses or even no response at all.

While preprocessing, we also generate a structured summary that is passed to the frontend for displaying the analysis. This ensures the schema is followed, keeping the data consistent and easily interpretable.

> **Example of Summary Passed to the Frontend:**

```json
{
  "total_records": 524,
  "candidate_pairs": 46229,
  "duplicate_pairs": 28,
  "unique_involved": 44,
  "clusters": 20,
  "outliers_removed": 0,
  "final_records": 500,
  "expired_licenses": 459,
  "missing_npi": 0,
  "providers_available": 165,
  "ca_state": 188,
  "ny_state": 312,
  "formatting_issues": 59,
  "compliance_rate": 8.2,
  "data_quality_score": 87.73
}
```

# Catering Natural Language Queries

## Small Language Model
We hosted a locally optimized small language model (gemma2-it-GGUF) using the llama.cpp engine via a Docker model runner service for easy integration. It takes the Natural Language Query and generates the SQL query which is fed into the SQL Engine, which runs the commands and returns the fetched results.

<img width="1602" height="280" alt="image" src="https://github.com/user-attachments/assets/e525a08b-f1c7-4130-939b-b3afd0e39422" />


## SQL Engine
A Dockerized MySQL service stores both the original and preprocessed data for the model to query. The model converts natural language queries into SQL statements, which are executed by the SQL engine. The results are then interpreted by the small language model and presented to the user.

<img width="1520" height="786" alt="image" src="https://github.com/user-attachments/assets/47465a90-ebeb-43ec-8793-7ca4e47f0d39" />

# Interactive Analytics Dashboard
## Frontend

The frontend consists of an analytics dashboard , duplicate analysis page, provider directory page, AI Assistant built using Next.js and shadcn. It includes high-quality plots for deduplication, duplicate analysis, anomaly detection, ensuring a smooth user experience and in-depth insights.

**Analysis Dashboard**

<img width="1600" height="809" alt="image" src="https://github.com/user-attachments/assets/ff697997-4b80-4976-a7ca-2f12c769033e" />

**Duplicate Analysis Page**

<img width="1600" height="809" alt="image" src="https://github.com/user-attachments/assets/40d3f64b-4735-4c3f-b8f3-139a26e78654" />

**Provider Directort Page**

<img width="1600" height="809" alt="image" src="https://github.com/user-attachments/assets/f1ef3127-a7db-49ae-a44d-215724350a3b" />

**AI Assistant Page**

<img width="1600" height="809" alt="image" src="https://github.com/user-attachments/assets/bed704f1-bc48-4574-b001-8048b5a20971" />

# Plots for insights

Several plots have been included to illustrate the results of the data analysis.These visualizations help highlight key trends and patterns observed in the dataset. Examples are shown below:

**Experience distribution by speciality**

<img width="1512" height="924" alt="image" src="https://github.com/user-attachments/assets/1c7f8cbc-0429-425f-a039-4f92d55f3b5b" />

**Provider count by city (Top 20)**

<img width="1514" height="898" alt="image" src="https://github.com/user-attachments/assets/e5c584cf-f152-4428-880c-37e0f4511425" />

**Duplicate provider detection network**

<img width="1590" height="1140" alt="image" src="https://github.com/user-attachments/assets/1eb5f749-16e1-48b9-95ce-04d76c4ea2ef" />

## 🚀 Setup Instructions

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Docker** (version 20.10.0 or higher)
- **Docker Compose** (version 2.0.0 or higher)
- **Docker Model Runner** (for AI model hosting)
- **Git** (for cloning the repository)
- **NVIDIA GPU** (recommended for optimal AI model performance)

### System Requirements

- **Memory:** Minimum 8GB RAM (16GB recommended)
- **Storage:** At least 10GB free disk space
- **CPU:** Multi-core processor (4+ cores recommended)
- **GPU:** NVIDIA GPU with CUDA support (optional but recommended)

### Installation Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/4adex/hilabs.git
cd docker-compose-ai-app
```

#### 2. Verify Project Structure

Ensure your project directory contains:
```
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── main.py
│   ├── pipeline.py
│   └── requirements.txt
├── dash-hilabs/
│   ├── Dockerfile
│   ├── package.json
│   └── app/
├── data/
│   ├── ca.csv
│   ├── ny.csv
│   ├── npi.csv
│   └── provider_roster_with_errors.csv
└── assets/
```

#### 3. Set Up Docker Model Runner

Install and configure Docker Model Runner for AI model hosting:

```bash
# Install Docker Model Runner (if not already installed)
# Follow the official installation guide for your OS
# Ensure it's running on the default port 12434
```

#### 4. Configure Environment Variables (Optional)

Create a `.env` file in the project root for custom configurations:

```bash
# Database Configuration
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=company_db
MYSQL_USER=appuser
MYSQL_PASSWORD=apppassword

# API Configuration
BACKEND_PORT=8000
FRONTEND_PORT=3000
MYSQL_PORT=3307

# AI Model Configuration
SQL_MODEL_URL=http://model-runner.docker.internal:12434
SQL_MODEL_NAME=hf.co/unsloth/gemma-3-270m-it-gguf
```

#### 5. Build and Start Services

```bash
# Build and start all services in detached mode
docker-compose up --build -d

# Alternative: Start with live logs
docker-compose up --build
```

#### 6. Verify Service Status

Check that all services are running correctly:

```bash
# Check service status
docker-compose ps

# View logs for specific services
docker-compose logs backend
docker-compose logs frontend-new
docker-compose logs mysql
```

#### 7. Initialize Database

The database will be automatically initialized when the backend service starts. You can verify the initialization:

```bash
# Check backend logs for database initialization
docker-compose logs backend | grep -i "database\|mysql\|table"
```

#### 8. Access the Application

Once all services are running:

- **Frontend Dashboard:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **MySQL Database:** localhost:3307

### Troubleshooting

#### Common Issues and Solutions

**1. Port Conflicts**
```bash
# Check if ports are already in use
sudo netstat -tulpn | grep -E ':(3000|8000|3307)'

# Stop conflicting services or change ports in docker-compose.yml
```

**2. Docker Model Runner Connection Issues**
```bash
# Verify Docker Model Runner is running
curl http://localhost:12434/health

# Restart Docker Model Runner if needed
# Check Docker Model Runner documentation for specific commands
```

**3. Database Connection Issues**
```bash
# Restart MySQL service
docker-compose restart mysql

# Check MySQL logs
docker-compose logs mysql
```

**4. Frontend Build Issues**
```bash
# Rebuild frontend with no cache
docker-compose build --no-cache frontend-new
```

**5. Memory Issues**
```bash
# Check Docker memory usage
docker stats

# Increase Docker memory limits in Docker Desktop settings
```

#### Service Health Checks

```bash
# Check if backend API is responsive
curl http://localhost:8000/health

# Check frontend accessibility
curl http://localhost:3000

# Test database connection
docker-compose exec mysql mysql -u appuser -p -e "SHOW DATABASES;"
```

### Development Setup

For development purposes, you can run services individually:

#### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Development

```bash
cd dash-hilabs
npm install
npm run dev
```

### Data Management

#### Loading Custom Data

1. Place your CSV files in the `data/` directory
2. Update the data paths in the backend configuration
3. Restart the backend service

```bash
# Restart backend to reload data
docker-compose restart backend
```

#### Backup and Restore

```bash
# Backup database
docker-compose exec mysql mysqldump -u root -p company_db > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u root -p company_db < backup.sql
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v

# Stop and remove all containers, networks, and images
docker-compose down --rmi all
```

### Getting Started with the Application

1. **Access the Dashboard:** Open http://localhost:3000 in your browser
2. **Explore Analytics:** Navigate through the analytics dashboard to view data insights
3. **Use Natural Language Queries:** Try asking questions like "Show me providers in California" or "How many licenses are expired?"
4. **Review Data Quality:** Check the data quality reports and duplicate detection results
5. **Manage Providers:** Use the provider directory to search and filter healthcare providers



# Backend
The backend is implemented with FastAPI and handles the preprocessing pipeline as well as SQL connections, providing APIs for the dashboard and the natural language query engine.

