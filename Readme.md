# Provider Data Quality Analytics & Dashboard

![HiLabs Logo](assets/hilabs.png)

**Team:** beetrootRaita  
**Members:** [Adesh Gupta](https://github.com/4adex), [Aman Behera](https://github.com/beingamanforever), [Pratham Singla](https://github.com/PrathamSingla15)

## 🎯 Overview

Healthcare provider data often suffers from duplication, inconsistent formatting, missing identifiers, and invalid or expired licenses, making reliable analysis and compliance tracking challenging. Our comprehensive data analytics and visualization platform streamlines the entire workflow from raw data to actionable insights.

The pipeline includes:
- **Entity Resolution & Deduplication** to eliminate redundant records
- **Data Quality Assessment & Standardization** for consistent formatting
- **License Validation & Compliance Tracking** against state-specific medical boards
- **Natural Language Query Interface** powered by a small language model
- **Interactive Analytics Dashboard** for real-time insights

## 📋 Table of Contents

1. [Requirements](#requirements)
2. [Dataset](#dataset)
3. [Preprocessing Pipeline](#preprocessing-pipeline)
   - Provider Entity Resolution & Deduplication
   - Data Quality Assessment & Standardization
   - License Validation & Compliance Tracking
   - Compliance Score Calculation
   - NPI Matching
   - Outlier Removal
4. [Natural Language Queries](#natural-language-queries)
5. [Interactive Dashboard](#interactive-dashboard)
6. [Getting Started](#getting-started)

## 🔧 Requirements

- Docker
- Docker Compose
- Docker Model Runner
- NVIDIA-supported GPUs

## 📊 Dataset

The project utilizes four main datasets:

1. **Provider Directory Dataset** (`provider_roster_with_errors.csv`)
   - 500+ provider records with various data quality issues
   - Contains duplicates, expired licenses, missing information, formatting inconsistencies

2. **NY State Medical License Database** (`ny_medical_license_database.csv`)
   - Official NY State Medical Board licensing records
   - Used for license validation and cross-checking

3. **CA State Medical License Database** (`ca_medical_license_database.csv`)
   - California State Medical Board licensing records
   - Similar validation purpose as NY dataset

4. **Mock NPI Registry** (`mock_npi_registry.csv`)
   - Simulated National Provider Identifier registry
   - Validates NPI numbers and provider details

## 🔄 Preprocessing Pipeline

### 1. Provider Entity Resolution & Deduplication

We implemented an efficient **blocking-based deduplication pipeline** that dramatically improves performance over naive approaches.

![Deduplication Approaches](assets/3.png)

**Performance Improvement:**
- **Naive Approach:** O(n²) complexity, 45-50 seconds for 500 records
- **Blocking-Based:** Near-linear complexity, 5-7 seconds for same dataset
- **10x+ speedup** with maintained accuracy

![Performance Stats](assets/4.png)

The algorithm uses:
- High-precision blocking keys (NPI, phone, zip3+name, practice address)
- String similarity measures (Levenshtein/Jaccard)
- Address and specialty consistency scoring

### 2. Data Quality Assessment & Standardization

Standardization pipeline ensures consistent formatting:

- **Phone Numbers:** `(123)-456-7890` → `1234567890`
- **ZIP Codes:** `123` → `00123`, `123456789` → `12345-6789`
- **Names & Addresses:** Converted to title case
- **Full Name Reconstruction:** Dynamic rebuilding from components

### 3. License Validation & Compliance Tracking

State-specific license validation with different join strategies:

![License Validation](assets/5.png)

- **California:** Join on `license_number`
- **New York:** Composite join on `license_number` + `expiration_date`

### 4. Compliance Score Calculation

Multi-dimensional scoring system:

![Compliance Pipeline](assets/7.png)

Metrics include: completeness, validity, consistency, uniqueness, accuracy, NPI presence, and license status.

### 5. NPI Matching

![NPI Matching](assets/8.png)

Fuzzy matching using multiple identifiers:
- Names, phone numbers, license numbers
- Addresses and city-state combinations
- Boolean `npi_present` flag for tracking

### 6. Final Data Format

After preprocessing, the dataset contains 30 columns:
- 28 original provider fields
- 1 license status indicator
- 1 NPI presence flag

**Sample Summary Output:**
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

## 🤖 Natural Language Queries

![System Flow](assets/6.png)

### Small Language Model
- Locally hosted `gemma3n` model using `llama.cpp`
- Converts natural language to SQL queries
- Dockerized for easy integration

### SQL Engine
- MySQL service storing original and preprocessed data
- Executes generated SQL statements
- Results interpreted and presented by the language model

## 📱 Interactive Dashboard

Built with **Next.js** and **shadcn** for optimal user experience.

### Analytics Dashboard
![Analytics Dashboard](assets/10.png)

### Duplicate Analysis
![Duplicate Analysis](assets/11.png)

### Provider Directory
![Provider Directory](assets/12.png)

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/4adex/hilabs.git
   cd hilabs
   ```

2. **Start the services:**
   ```bash
   docker-compose up -d
   ```

3. **Access the dashboard:**
   - Open your browser and navigate to the provided URL
   - Use the natural language interface to query your data
   - Explore analytics and compliance reports

## 🏗️ Architecture

### Frontend
- **Next.js** with **shadcn** components
- High-quality visualizations for data analysis
- Responsive design for optimal user experience

### Backend
- **FastAPI** for robust API endpoints
- Handles preprocessing pipeline
- Manages SQL connections and query execution
- Dockerized for consistent deployment

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and enhancement requests.

## 📄 License

This project is part of the HiLabs challenge and follows their terms and conditions.

---

**Complete implementation and training pipeline available at:** [GitHub Repository](https://github.com/4adex/hilabs)
