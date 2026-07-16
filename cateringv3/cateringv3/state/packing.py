"""Pure logic for totals, fees, capacity and bin-packing. No Reflex imports."""
import random
from cateringv3 import data


def items_total(cart):
    """Sum price * quantity for all items in cart."""
    return sum(data.ITEMS_BY_ID[i]["price"] * q for i, q in cart.items())


def total_portions(cart):
    """Count total units (portions) in cart."""
    return sum(cart.values())


def container_fee(size):
    """Get fee for a container size."""
    return data.CONTAINER_SPECS[size]["fee"]


def packing_fee(containers):
    """Sum fees for all containers."""
    return sum(c["fee"] for c in containers)


def container_used(container):
    """Count items packed in a single container."""
    return sum(container["items"].values())


def portions_packed(containers):
    """Count total items packed across all containers."""
    return sum(container_used(c) for c in containers)


def grand_total(cart, containers):
    """Total cost: items + packing fees."""
    return items_total(cart) + packing_fee(containers)


def money(n):
    """Format rupees as string with sign."""
    return f"₹{n}"


def make_order_number():
    """Generate order number: SAR-#### (4 random digits, zero-padded)."""
    return f"SAR-{random.randint(0, 9999):04d}"
