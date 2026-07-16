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


import copy


def container_room(container):
    """Return available capacity in a container."""
    return container["capacity"] - container_used(container)


def unpacked_counts(cart, containers):
    """Per-item units in cart not yet packed. Returns dict with only positive counts."""
    packed = {}
    for c in containers:
        for i, q in c["items"].items():
            packed[i] = packed.get(i, 0) + q
    out = {}
    for i, q in cart.items():
        left = q - packed.get(i, 0)
        if left > 0:
            out[i] = left
    return out


def next_container_id(containers):
    """Return the next available container ID (max(id)+1 or 1)."""
    return max((c["id"] for c in containers), default=0) + 1


def _new_container(cid, size):
    """Create a new empty container with given ID and size."""
    spec = data.CONTAINER_SPECS[size]
    return {"id": cid, "size": size, "capacity": spec["capacity"], "fee": spec["fee"], "items": {}}


def _place_one(container, item_id):
    """Add one unit of item to container."""
    container["items"][item_id] = container["items"].get(item_id, 0) + 1


def ffd_pack(cart, containers):
    """
    First Fit Decreasing packing.
    Returns a new containers list: keeps existing containers and their packs,
    places every currently-unpacked unit, opening new containers preferring
    the LARGEST size to minimize container count. Pure; no mutation of input.
    """
    result = copy.deepcopy(containers)
    # flatten unpacked units into a list of item ids
    units = []
    for item_id, n in unpacked_counts(cart, result).items():
        units.extend([item_id] * n)
    if not units:
        return result
    # first fit into existing containers with room
    for item_id in list(units):
        for c in result:
            if container_room(c) > 0:
                _place_one(c, item_id)
                units.remove(item_id)
                break
    # remainder -> new containers, largest capacity first to minimize count
    largest = max(data.CONTAINER_SPECS, key=lambda s: data.CONTAINER_SPECS[s]["capacity"])
    while units:
        c = _new_container(next_container_id(result), largest)
        result.append(c)
        while units and container_room(c) > 0:
            _place_one(c, units.pop())
    return result
