from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import create_engine, String, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column







# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DATABASE_URL = "sqlite:///./catering.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=True
)


# ============================================================
# SQLALCHEMY BASE
# ============================================================

class Base(DeclarativeBase):
    pass


# ============================================================
# DATABASE MODEL
# ============================================================

class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    phone: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False
    )

    address: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# CREATE DATABASE TABLE
# ============================================================

Base.metadata.create_all(engine)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Catering Management API",
    version="1.0.0"
)


# ============================================================
# REQUEST MODELS
# ============================================================

class CustomerCreate(BaseModel):
    name: str
    email: str
    phone: str
    address: str | None = None




# ============================================================
# HOMEPAGE
# ============================================================

@app.get("/", response_class=HTMLResponse)
def home():

    return """
    <!DOCTYPE html>
    <html>

    <head>

        <title>Catering Management System</title>

        <style>

            body {
                font-family: Arial, sans-serif;
                margin: 0;
                background: #f4f6f8;
            }

            header {
                background: #222;
                color: white;
                padding: 25px;
                text-align: center;
            }

            main {
                max-width: 1000px;
                margin: 40px auto;
                padding: 20px;
            }

            .card-container {
                display: flex;
                gap: 20px;
            }

            .card {
                background: white;
                padding: 25px;
                border-radius: 10px;
                flex: 1;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .card h2 {
                margin-top: 0;
            }

            a {
                display: inline-block;
                margin-top: 10px;
                padding: 10px 15px;
                background: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
            }

            footer {
                text-align: center;
                margin-top: 50px;
                color: #666;
            }

        </style>

    </head>

    <body>

        <header>
            <h1>Welcome to the Catering Management System</h1>
        </header>

        <main>

            <p>
                Manage customers and catering operations
                through the REST API.
            </p>

            <div class="card-container">

                <div class="card">
                    <h2>Customers</h2>

                    <p>
                        Create, retrieve, update and delete
                        customer information.
                    </p>

                    <a href="/docs">
                        Open REST API
                    </a>

                </div>

                <div class="card">

                    <h2>Database</h2>

                    <p>
                        SQLite database connected through SQLAlchemy.
                    </p>

                    <a href="/customers">
                        View Customers
                    </a>

                </div>

            </div>

        </main>

        <footer>
            Catering Management System
        </footer>

    </body>

    </html>
    """
@app.get("/customers")
def get_all_customers():

    with Session(engine) as session:

        customers = session.query(Customer).all()

        return [
            {
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
                "phone": customer.phone,
                "address": customer.address,
                "created_at": customer.created_at
            }
            for customer in customers
        ]  
# ============================================================
# CREATE CUSTOMER
# POST /customers
# ============================================================

@app.post("/customers", status_code=201)
def add_customer(customer_data: CustomerCreate):

    with Session(engine) as session:

        # Check email uniqueness before inserting.
        existing_email = (
            session.query(Customer)
            .filter(Customer.email == customer_data.email)
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=409,
                detail="Email already exists."
            )

        # Check phone uniqueness before inserting.
        existing_phone = (
            session.query(Customer)
            .filter(Customer.phone == customer_data.phone)
            .first()
        )

        if existing_phone:
            raise HTTPException(
                status_code=409,
                detail="Phone number already exists."
            )

        new_customer = Customer(
            name=customer_data.name,
            email=customer_data.email,
            phone=customer_data.phone,
            address=customer_data.address
        )

        session.add(new_customer)
        session.commit()

        # Refresh retrieves generated values such as ID
        # and created_at from the database.
        session.refresh(new_customer)

        return {
            "message": "Customer added successfully.",
            "customer": {
                "id": new_customer.id,
                "name": new_customer.name,
                "email": new_customer.email,
                "phone": new_customer.phone,
                "address": new_customer.address,
                "created_at": new_customer.created_at
            }
        }

# ============================================================
# GET ONE CUSTOMER
# GET /customers/{customer_id}
# ============================================================

@app.get("/customers/{customer_id}")
def get_customer(customer_id: int):

    with Session(engine) as session:

        customer = session.get(Customer, customer_id)

        if customer is None:
            raise HTTPException(
                status_code=404,
                detail="Customer not found."
            )

        return {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "address": customer.address,
            "created_at": customer.created_at
        }


# ============================================================
# REPLACE CUSTOMER
# PUT /customers/{customer_id}
# ============================================================

@app.put("/customers/{customer_id}")
def update_customer(
    customer_id: int,
    customer_data: CustomerCreate
):

    with Session(engine) as session:

        customer = session.get(Customer, customer_id)

        if customer is None:
            raise HTTPException(
                status_code=404,
                detail="Customer not found."
            )

        # Make sure another customer isn't already using
        # this email.
    
        existing_email = (
            session.query(Customer)
            .filter(
                Customer.email == customer_data.email,
                Customer.id != customer_id
            )
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=409,
                detail="Email already belongs to another customer."
            )

        # Make sure another customer isn't already using
        # this phone.
        existing_phone = (
            session.query(Customer)
            .filter(
                Customer.phone == customer_data.phone,
                Customer.id != customer_id
            )
            .first()
        )

        if existing_phone:
            raise HTTPException(
                status_code=409,
                detail="Phone number already belongs to another customer."
            )

        customer.name = customer_data.name
        customer.email = customer_data.email
        customer.phone = customer_data.phone
        customer.address = customer_data.address

        session.commit()
        session.refresh(customer)

        return {
            "message": "Customer {customer.name} updated successfully.",
            "customer": {
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
                "phone": customer.phone,
                "address": customer.address,
                "created_at": customer.created_at
            }
        }


# ============================================================
# DELETE CUSTOMER
# DELETE /customers/{customer_id}
# ============================================================

@app.delete("/customers/{customer_id}")
def delete_customer(customer_id: int):

    with Session(engine) as session:

        customer = session.get(Customer, customer_id)

        if customer is None:
            raise HTTPException(
                status_code=404,
                detail="Customer not found."
            )

        session.delete(customer)
        session.commit()

        return {
            "message": "Customer {customer.name} , {customer.id} deleted successfully."
        }
@app.patch("/customers/{customer_id}")
def patch_customer(
    customer_id: int,
    customer_data: CustomerCreate 
):
    with Session(engine) as session:

        customer = session.get(Customer, customer_id)

        if customer is None:
            raise HTTPException(
                status_code=404,
                detail="Customer not found."
            )

        # Only update fields that were actually provided.
        updates = customer_data.model_dump(exclude_unset=True)

        # Check email only if the client is changing email.
        if "email" in updates:
            existing_email = (
                session.query(Customer)
                .filter(
                    Customer.email == updates["email"],
                    Customer.id != customer_id
                )
                .first()
            )

            if existing_email:
                raise HTTPException(
                    status_code=409,
                    detail="Email already belongs to another customer."
                )

        # Check phone only if the client is changing phone.
        if "phone" in updates:
            existing_phone = (
                session.query(Customer)
                .filter(
                    Customer.phone == updates["phone"],
                    Customer.id != customer_id
                )
                .first()
            )

            if existing_phone:
                raise HTTPException(
                    status_code=409,
                    detail="Phone number already belongs to another customer."
                )

        # Apply only the fields supplied by the client.
        for field, value in updates.items():
            setattr(customer, field, value)

        session.commit()
        session.refresh(customer)

        return {
            "message": "Customer updated successfully.",
            "customer": {
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
                "phone": customer.phone,
                "address": customer.address,
                "created_at": customer.created_at
            }
        }