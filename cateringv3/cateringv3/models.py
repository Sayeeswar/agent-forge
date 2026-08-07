"""
Database schema for the e-catering app (Reflex + PostgreSQL).

Reflex's rx.Model is built on SQLModel, so every class below becomes
a real Postgres table. Run:

    reflex db makemigrations --message "initial schema"
    reflex db migrate

to create/apply the tables. Make sure rxconfig.py has:

    db_url = "postgresql+psycopg2://user:password@host:5432/dbname"
    # or your Neon connection string
"""

import enum
import uuid
from datetime import datetime
from typing import List, Optional

import reflex as rx
from sqlalchemy import Column
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentStatus(str, enum.Enum):
    CREATED = "created"      # razorpay order created, not yet paid
    PAID = "paid"             # signature verified
    FAILED = "failed"
    REFUNDED = "refunded"


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------

class Customer(rx.Model, table=True):
    __tablename__ = "customers"

    name: str
    email: str = Field(unique=True, index=True)
    phone: str = Field(unique=True, index=True)
    password_hash: str
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    orders: List["Order"] = Relationship(back_populates="customer")


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

class Order(rx.Model, table=True):
    __tablename__ = "orders"

    order_number: str = Field(unique=True, index=True)   # e.g. ZS-20260807-0001
    customer_id: int = Field(foreign_key="customers.id", index=True)
    status: OrderStatus = Field(
        default=OrderStatus.PENDING,
        sa_column=Column(
            SAEnum(
                OrderStatus,
                values_callable=lambda enum_cls: [e.value for e in enum_cls],
                name="orderstatus",
            ),
            nullable=False,
        ),
    )
    ordered_at: datetime = Field(default_factory=datetime.utcnow)   # "time of order"
    delivery_date: Optional[datetime] = None
    total_amount: float
    notes: Optional[str] = None

    customer: Customer = Relationship(back_populates="orders")
    items: List["OrderItem"] = Relationship(back_populates="order")
    payment: Optional["Payment"] = Relationship(back_populates="order")


class OrderItem(rx.Model, table=True):
    __tablename__ = "order_items"

    order_id: int = Field(foreign_key="orders.id", index=True)
    product_name: str
    quantity: int
    unit_price: float

    order: Order = Relationship(back_populates="items")


# ---------------------------------------------------------------------------
# Payments (Razorpay)
# ---------------------------------------------------------------------------

class Payment(rx.Model, table=True):
    """
    One-to-one with an Order. Razorpay's flow is: you create an
    'order' on their side first (razorpay_order_id), the customer
    pays, then Razorpay sends back a payment_id + signature that you
    verify server-side before marking status = PAID.
    """
    __tablename__ = "payments"

    order_id: int = Field(foreign_key="orders.id", unique=True, index=True)
    razorpay_order_id: str = Field(unique=True, index=True)
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    amount: float
    currency: str = Field(default="INR")
    status: PaymentStatus = Field(
        default=PaymentStatus.CREATED,
        sa_column=Column(
            SAEnum(
                PaymentStatus,
                values_callable=lambda enum_cls: [e.value for e in enum_cls],
                name="paymentstatus",
            ),
            nullable=False,
        ),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None

    order: Order = Relationship(back_populates="payment")