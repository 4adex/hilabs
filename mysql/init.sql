-- Initialize the company database with sample data

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(50),
    position VARCHAR(100),
    salary DECIMAL(10, 2),
    hire_date DATE,
    manager_id INT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES employees(id)
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    budget DECIMAL(12, 2),
    head_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (head_id) REFERENCES employees(id)
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12, 2),
    status ENUM('planning', 'active', 'on-hold', 'completed', 'cancelled') DEFAULT 'planning',
    department_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Create employee_projects junction table
CREATE TABLE IF NOT EXISTS employee_projects (
    employee_id INT,
    project_id INT,
    role VARCHAR(100),
    hours_allocated DECIMAL(5, 2),
    start_date DATE,
    end_date DATE,
    PRIMARY KEY (employee_id, project_id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Insert sample departments
INSERT INTO departments (name, description, budget) VALUES
('Engineering', 'Software development and technical operations', 2500000.00),
('Marketing', 'Brand promotion and customer acquisition', 800000.00),
('Sales', 'Revenue generation and client relationships', 1200000.00),
('Human Resources', 'Employee management and organizational development', 600000.00),
('Finance', 'Financial planning and accounting', 700000.00);

-- Insert sample employees
INSERT INTO employees (first_name, last_name, email, department, position, salary, hire_date, manager_id) VALUES
('John', 'Smith', 'john.smith@company.com', 'Engineering', 'Senior Software Engineer', 95000.00, '2022-01-15', NULL),
('Sarah', 'Johnson', 'sarah.johnson@company.com', 'Engineering', 'Tech Lead', 120000.00, '2021-03-10', NULL),
('Mike', 'Davis', 'mike.davis@company.com', 'Engineering', 'Software Engineer', 80000.00, '2023-02-20', 2),
('Emily', 'Brown', 'emily.brown@company.com', 'Marketing', 'Marketing Manager', 85000.00, '2022-05-01', NULL),
('David', 'Wilson', 'david.wilson@company.com', 'Sales', 'Sales Director', 110000.00, '2021-08-15', NULL),
('Lisa', 'Anderson', 'lisa.anderson@company.com', 'Sales', 'Sales Representative', 65000.00, '2023-01-10', 5),
('Robert', 'Taylor', 'robert.taylor@company.com', 'Human Resources', 'HR Manager', 75000.00, '2022-09-01', NULL),
('Jennifer', 'Martinez', 'jennifer.martinez@company.com', 'Finance', 'Financial Analyst', 70000.00, '2023-03-15', NULL),
('Christopher', 'Garcia', 'christopher.garcia@company.com', 'Engineering', 'DevOps Engineer', 90000.00, '2022-11-20', 2),
('Amanda', 'Rodriguez', 'amanda.rodriguez@company.com', 'Marketing', 'Content Specialist', 55000.00, '2023-04-05', 4);

-- Update department heads
UPDATE departments SET head_id = 2 WHERE name = 'Engineering';
UPDATE departments SET head_id = 4 WHERE name = 'Marketing';
UPDATE departments SET head_id = 5 WHERE name = 'Sales';
UPDATE departments SET head_id = 7 WHERE name = 'Human Resources';
UPDATE departments SET head_id = 8 WHERE name = 'Finance';

-- Insert sample projects
INSERT INTO projects (name, description, start_date, end_date, budget, status, department_id) VALUES
('Customer Portal Redesign', 'Modernize the customer-facing web portal', '2024-01-01', '2024-06-30', 350000.00, 'active', 1),
('Mobile App Development', 'Build native mobile apps for iOS and Android', '2024-02-15', '2024-12-31', 500000.00, 'active', 1),
('Brand Awareness Campaign', 'Q2 marketing campaign to increase brand recognition', '2024-04-01', '2024-06-30', 150000.00, 'planning', 2),
('Sales CRM Implementation', 'Deploy new CRM system for sales team', '2024-03-01', '2024-08-31', 200000.00, 'active', 3),
('Employee Onboarding System', 'Digital platform for new employee onboarding', '2024-05-01', '2024-09-30', 100000.00, 'planning', 4);

-- Insert employee project assignments
INSERT INTO employee_projects (employee_id, project_id, role, hours_allocated, start_date, end_date) VALUES
(1, 1, 'Backend Developer', 30.00, '2024-01-01', '2024-06-30'),
(2, 1, 'Technical Lead', 25.00, '2024-01-01', '2024-06-30'),
(3, 1, 'Frontend Developer', 35.00, '2024-01-01', '2024-06-30'),
(2, 2, 'Project Lead', 20.00, '2024-02-15', '2024-12-31'),
(9, 2, 'DevOps Engineer', 25.00, '2024-02-15', '2024-12-31'),
(4, 3, 'Campaign Manager', 40.00, '2024-04-01', '2024-06-30'),
(10, 3, 'Content Creator', 35.00, '2024-04-01', '2024-06-30'),
(5, 4, 'Project Sponsor', 10.00, '2024-03-01', '2024-08-31'),
(6, 4, 'User Training', 15.00, '2024-06-01', '2024-08-31'),
(7, 5, 'Process Design', 30.00, '2024-05-01', '2024-09-30');
