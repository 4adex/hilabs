from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
import requests
import os
import logging
from typing import List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI-Powered Database Query API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
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
        # Prepare the prompt for SQLCoder
        schema_context = """
        Database Schema:
        
        Table: employees
        Columns: id (INT, PRIMARY KEY), first_name (VARCHAR), last_name (VARCHAR), 
                email (VARCHAR), department (VARCHAR), position (VARCHAR), 
                salary (DECIMAL), hire_date (DATE), manager_id (INT), active (BOOLEAN)
        
        Table: departments  
        Columns: id (INT, PRIMARY KEY), name (VARCHAR), description (TEXT), 
                budget (DECIMAL), head_id (INT)
        
        Table: projects
        Columns: id (INT, PRIMARY KEY), name (VARCHAR), description (TEXT), 
                start_date (DATE), end_date (DATE), budget (DECIMAL), 
                status (ENUM), department_id (INT)
        
        Table: employee_projects
        Columns: employee_id (INT), project_id (INT), role (VARCHAR), 
                hours_allocated (DECIMAL), start_date (DATE), end_date (DATE)
        """
        
        prompt = f"""{schema_context}
        
        Question: {question}
        
        Please generate a MySQL query to answer this question. Return only the SQL query without any explanations.
        """
                # Call the AI model
        url = "http://model-runner.docker.internal:12434/engines/llama.cpp/v1/chat/completions"
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json={
                "model": SQL_MODEL_NAME,
                "messages": [
                    {"role": "system", "content": "You are a helpful SQL assistant. Generate only valid MySQL queries without explanations."},
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

@app.get("/employees")
async def get_employees(limit: int = 10, db: Session = Depends(get_db)):
    """Get all employees (mock endpoint)"""
    try:
        result = db.execute(text(f"SELECT * FROM employees LIMIT {limit}"))
        rows = result.fetchall()
        columns = result.keys()
        employees = [dict(zip(columns, row)) for row in rows]
        return {"employees": employees, "count": len(employees)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/departments")
async def get_departments(db: Session = Depends(get_db)):
    """Get all departments (mock endpoint)"""
    try:
        result = db.execute(text("SELECT * FROM departments"))
        rows = result.fetchall()
        columns = result.keys()
        departments = [dict(zip(columns, row)) for row in rows]
        return {"departments": departments, "count": len(departments)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects")
async def get_projects(db: Session = Depends(get_db)):
    """Get all projects (mock endpoint)"""
    try:
        result = db.execute(text("SELECT * FROM projects"))
        rows = result.fetchall()
        columns = result.keys()
        projects = [dict(zip(columns, row)) for row in rows]
        return {"projects": projects, "count": len(projects)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
