from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
import requests
import os
import logging
import time
from typing import List, Optional
import json
import uvicorn
from pathlib import Path
from fastapi import File, UploadFile
import pandas as pd
from pipeline import preprocessing

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



app = FastAPI(title="AI-Powered Database Query API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://appuser:apppassword@mysql:3306/company_db")
SQL_MODEL_URL = os.getenv("SQL_MODEL_URL", "http://model-runner.docker.internal")
SQL_MODEL_NAME = os.getenv("SQL_MODEL_NAME", "hf.co/unsloth/gemma-3-270m-it-GGUF")

# Create database engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Pydantic models
class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    question: str
    sql_query: str
    results: List[dict]
    success: bool
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    database: str
    ai_model: str

class Provider(BaseModel):
    provider_id: Optional[str] = None
    npi: Optional[int] = None
    full_name: Optional[str] = None
    primary_specialty: Optional[str] = None
    license_number: Optional[str] = None
    license_state: Optional[str] = None

class ProvidersResponse(BaseModel):
    providers: List[Provider]
    total: int
    page: int
    limit: int
    total_pages: int

class Duplicate(BaseModel):
    i1: Optional[int] = None
    i2: Optional[int] = None
    provider_id_1: Optional[str] = None
    provider_id_2: Optional[str] = None
    name_1: Optional[str] = None
    name_2: Optional[str] = None
    score: Optional[float] = None
    name_score: Optional[float] = None
    npi_match: Optional[bool] = None
    addr_score: Optional[float] = None
    phone_match: Optional[bool] = None
    license_score: Optional[float] = None

class ClusterInfo(BaseModel):
    cluster_id: str
    members: List[int]
    representative: int
    providers: List[Provider]
    duplicates: List[Duplicate]

class DuplicatesResponse(BaseModel):
    clusters: List[ClusterInfo]
    total_clusters: int
    total_duplicates: int

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper function to call AI model
def generate_sql_query(question: str) -> str:
    """Generate SQL query using the AI model"""
    try:
        # Prepare the prompt for SQLCoder with actual database schema
        schema_context = """
        Database Schema:
        
        Table: duplicates
        Columns: i1 (BIGINT), i2 (BIGINT), provider_id_1 (TEXT), provider_id_2 (TEXT), 
                name_1 (TEXT), name_2 (TEXT), score (DOUBLE), name_score (DOUBLE), 
                npi_match (TINYINT(1)), addr_score (DOUBLE), phone_match (TINYINT(1)), 
                license_score (DOUBLE)
        Description: Contains duplicate provider records with similarity scores
        
        Table: merged_roster
        Columns: provider_id (TEXT), npi (BIGINT), first_name (TEXT), last_name (TEXT), 
                credential (TEXT), full_name (TEXT), primary_specialty (TEXT), 
                practice_address_line1 (TEXT), practice_address_line2 (TEXT), 
                practice_city (TEXT), practice_state (TEXT), practice_zip (TEXT), 
                practice_phone (TEXT), mailing_address_line1 (TEXT), 
                mailing_address_line2 (TEXT), mailing_city (TEXT), mailing_state (TEXT), 
                mailing_zip (TEXT), license_number (TEXT), license_state (TEXT), 
                license_expiration (TEXT), accepting_new_patients (TEXT), 
                board_certified (TINYINT(1)), years_in_practice (BIGINT), 
                medical_school (TEXT), residency_program (TEXT), last_updated (TEXT), 
                taxonomy_code (TEXT), status (TEXT), npi_present (TINYINT(1))
        Description: Contains healthcare provider information and demographics
        """
        
        system_prompt = """You are a SQL assistant for a healthcare provider database. Generate only valid MySQL queries based on the schema provided. Focus on:
        - Provider data quality analysis
        - Duplicate detection and resolution
        - Compliance reporting (license expiration, missing data)
        - Provider demographics and distribution
        - Data validation and integrity checks
        
        Return only the SQL query without explanations, comments, or formatting."""
        
        prompt = f"""{schema_context}
        
        Question: {question}
        
        Generate a MySQL query to answer this question. Return only the SQL query.
        """
        # Call the AI model
        url = "http://model-runner.docker.internal:12434/engines/llama.cpp/v1/chat/completions"
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json={
                "model": SQL_MODEL_NAME,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 500,
                "temperature": 0.1,
                "stop": ["--", "/*", "Question:"]
            },
            timeout=30.0
        )
        
        if response.status_code == 200:
            result = response.json()
            sql_query = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            
            # Clean up the SQL query
            sql_query = sql_query.replace("```sql", "").replace("```", "").strip()
            
            # Remove any trailing semicolon for safety
            if sql_query.endswith(";"):
                sql_query = sql_query[:-1]
            
            return sql_query
        else:
            logger.error(f"AI model error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail="Failed to generate SQL query")
            
    except requests.exceptions.Timeout:
        logger.error("AI model timeout")
        raise HTTPException(status_code=500, detail="AI model request timeout")
    except Exception as e:
        logger.error(f"Error calling AI model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI model error: {str(e)}")

# Routes
@app.get("/")
async def root():
    return {"message": "AI-Powered Database Query API", "docs": "/docs"}

@app.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    # Test AI model connection
    try:
        response = requests.get(f"{SQL_MODEL_URL}/health", timeout=5.0)
        ai_status = "connected" if response.status_code == 200 else "error"
    except Exception:
        ai_status = "unavailable"
    
    return HealthResponse(
        status="healthy" if db_status == "connected" and ai_status == "connected" else "degraded",
        database=db_status,
        ai_model=ai_status
    )

@app.post("/query", response_model=QueryResponse)
async def query_database(request: QueryRequest, db: Session = Depends(get_db)):
    """Generate SQL query from natural language and execute it"""
    try:
        # Generate SQL query using AI model
        sql_query = generate_sql_query(request.question)
        
        if not sql_query:
            return QueryResponse(
                question=request.question,
                sql_query="",
                results=[],
                success=False,
                error="Failed to generate SQL query"
            )
        
        logger.info(f"Generated SQL: {sql_query}")
        
        # Execute the query
        try:
            result = db.execute(text(sql_query))
            rows = result.fetchall()
            
            # Convert to list of dictionaries
            columns = result.keys()
            results = [dict(zip(columns, row)) for row in rows]
            
            return QueryResponse(
                question=request.question,
                sql_query=sql_query,
                results=results,
                success=True
            )
            
        except Exception as db_error:
            logger.error(f"Database execution error: {str(db_error)}")
            return QueryResponse(
                question=request.question,
                sql_query=sql_query,
                results=[],
                success=False,
                error=f"Database error: {str(db_error)}"
            )
    
    except Exception as e:
        logger.error(f"Query processing error: {str(e)}")
        return QueryResponse(
            question=request.question,
            sql_query="",
            results=[],
            success=False,
            error=str(e)
        )
    

# Endpoint to process uploaded CSV file
@app.post("/process_csv")
async def process_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Process uploaded CSV file using preprocessing function"""
    try:
        # Read uploaded file into pandas DataFrame
        contents = await file.read()
        df = pd.read_csv(pd.io.common.BytesIO(contents))
        # Use data/ as base path for merge_roster
        # Use environment variable or fallback to relative path
        base_path = os.getenv("DATA_PATH", "/app/data")
        
        # If environment variable not set, try relative path
        if base_path == "/app/data" and not os.path.exists(base_path):
            current_dir = os.path.dirname(os.path.abspath(__file__))
            base_path = os.path.join(current_dir, "..", "data")
            base_path = os.path.abspath(base_path)
        
        # Ensure directory exists
        os.makedirs(base_path, exist_ok=True)
        
        logger.info(f"Base path resolved to: {base_path}")
        logger.info(f"Base path exists: {os.path.exists(base_path)}")
        
        dup_df, clusters, summary, merged_df = preprocessing(df, base_path)

        # Save tables to database using the session
        try:
            # Save duplicates
            if not dup_df.empty:
                dup_df.to_sql("duplicates", con=db.bind, if_exists="replace", index=False)
            
            # Save merged_df
            if not merged_df.empty:
                merged_df.to_sql("merged_roster", con=db.bind, if_exists="replace", index=False)
            
            # Commit the transaction
            db.commit()
            
        except Exception as db_error:
            db.rollback()
            logger.error(f"Database save error: {str(db_error)}")
            raise HTTPException(status_code=500, detail=f"Database save error: {str(db_error)}")
            
        # Convert results to JSON serializable
        result = {
            "clusters": clusters,
            "summary": summary,
        }
        return result
    except Exception as e:
        logger.error(f"Error processing CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")


@app.get("/providers", response_model=ProvidersResponse)
async def get_providers(
    page: int = 1, 
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get paginated list of providers with specific columns"""
    try:
        # Calculate offset
        offset = (page - 1) * limit
        
        # Get total count
        count_query = text("SELECT COUNT(*) FROM merged_roster")
        total_result = db.execute(count_query)
        total = total_result.scalar()
        
        # Get providers with pagination
        query = text("""
            SELECT 
                provider_id,
                npi,
                full_name,
                primary_specialty,
                license_number,
                license_state
            FROM merged_roster 
            ORDER BY provider_id
            LIMIT :limit OFFSET :offset
        """)
        
        result = db.execute(query, {"limit": limit, "offset": offset})
        rows = result.fetchall()
        
        # Convert to Provider objects
        providers = []
        for row in rows:
            provider = Provider(
                provider_id=row[0],
                npi=row[1],
                full_name=row[2],
                primary_specialty=row[3],
                license_number=row[4],
                license_state=row[5]
            )
            providers.append(provider)
        
        # Calculate total pages
        total_pages = (total + limit - 1) // limit
        
        return ProvidersResponse(
            providers=providers,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Error fetching providers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching providers: {str(e)}")


@app.get("/duplicates", response_model=DuplicatesResponse)
async def get_duplicates(db: Session = Depends(get_db)):
    """Get duplicate clusters with provider information"""
    try:
        # Get all duplicates from the database
        duplicates_query = text("""
            SELECT 
                i1, i2, provider_id_1, provider_id_2, name_1, name_2,
                score, name_score, npi_match, addr_score, phone_match, license_score
            FROM duplicates
            ORDER BY score DESC
        """)
        
        duplicates_result = db.execute(duplicates_query)
        duplicates_rows = duplicates_result.fetchall()
        
        # Build clusters from duplicates
        clusters_map = {}
        processed_pairs = set()
        
        for row in duplicates_rows:
            i1, i2 = row[0], row[1]
            if (i1, i2) in processed_pairs or (i2, i1) in processed_pairs:
                continue
                
            processed_pairs.add((i1, i2))
            
            # Find existing cluster or create new one
            cluster_id = None
            for cid, cluster_data in clusters_map.items():
                if i1 in cluster_data['members'] or i2 in cluster_data['members']:
                    cluster_id = cid
                    break
            
            if cluster_id is None:
                cluster_id = f"cluster_{min(i1, i2)}"
                clusters_map[cluster_id] = {
                    'members': set(),
                    'representative': min(i1, i2),
                    'duplicates': []
                }
            
            clusters_map[cluster_id]['members'].add(i1)
            clusters_map[cluster_id]['members'].add(i2)
            
            duplicate = Duplicate(
                i1=row[0], i2=row[1], provider_id_1=row[2], provider_id_2=row[3],
                name_1=row[4], name_2=row[5], score=row[6], name_score=row[7],
                npi_match=bool(row[8]) if row[8] is not None else None,
                addr_score=row[9], phone_match=bool(row[10]) if row[10] is not None else None,
                license_score=row[11]
            )
            clusters_map[cluster_id]['duplicates'].append(duplicate)
        
        # Get provider details for each cluster
        cluster_infos = []
        for cluster_id, cluster_data in clusters_map.items():
            member_ids = list(cluster_data['members'])
            
            # Get provider details for cluster members
            if member_ids:
                # Create a query to get providers by their row position (0-indexed)
                # We'll use LIMIT and OFFSET to get specific rows
                cluster_providers = []
                
                for member_id in member_ids:
                    provider_query = text("""
                        SELECT 
                            provider_id, npi, full_name, primary_specialty, license_number, license_state
                        FROM merged_roster 
                        ORDER BY provider_id
                        LIMIT 1 OFFSET :offset
                    """)
                    
                    try:
                        provider_result = db.execute(provider_query, {"offset": member_id})
                        provider_row = provider_result.fetchone()
                        
                        if provider_row:
                            provider = Provider(
                                provider_id=provider_row[0],
                                npi=provider_row[1], 
                                full_name=provider_row[2],
                                primary_specialty=provider_row[3], 
                                license_number=provider_row[4], 
                                license_state=provider_row[5]
                            )
                            cluster_providers.append(provider)
                    except Exception as e:
                        logger.warning(f"Could not fetch provider at index {member_id}: {str(e)}")
                        continue
                
                if cluster_providers:  # Only create cluster if we found providers
                    cluster_info = ClusterInfo(
                        cluster_id=cluster_id,
                        members=member_ids,
                        representative=cluster_data['representative'],
                        providers=cluster_providers,
                        duplicates=cluster_data['duplicates']
                    )
                    cluster_infos.append(cluster_info)
        
        return DuplicatesResponse(
            clusters=cluster_infos,
            total_clusters=len(cluster_infos),
            total_duplicates=len(duplicates_rows)
        )
        
    except Exception as e:
        logger.error(f"Error fetching duplicates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching duplicates: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
