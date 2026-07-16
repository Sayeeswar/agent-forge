# tests/test_ffd_pack.py
from cateringv3.state import packing

def _small(id, items=None):
    return {"id": id, "size": "Small", "capacity": 3, "fee": 5, "items": dict(items or {})}

def test_unpacked_counts_subtracts_packed():
    cart = {"puri": 5, "aloo-paratha": 2}
    containers = [_small(1, {"puri": 2})]
    assert packing.unpacked_counts(cart, containers) == {"puri": 3, "aloo-paratha": 2}

def test_unpacked_counts_never_negative():
    assert packing.unpacked_counts({"puri": 1}, [_small(1, {"puri": 3})]) == {}

def test_container_room():
    assert packing.container_room(_small(1, {"puri": 1})) == 2

def test_next_container_id():
    assert packing.next_container_id([]) == 1
    assert packing.next_container_id([_small(1), _small(4)]) == 5

def test_ffd_fills_existing_before_opening_new():
    cart = {"puri": 4}
    containers = [_small(1, {"puri": 1})]  # room for 2 more
    out = packing.ffd_pack(cart, containers)
    assert packing.portions_packed(out) == 4
    # existing small filled to 3, remainder in a new container
    assert out[0]["items"]["puri"] == 3

def test_ffd_minimizes_containers_prefers_large():
    cart = {"puri": 12}
    out = packing.ffd_pack(cart, [])
    assert len(out) == 1 and out[0]["size"] == "Large"

def test_ffd_noop_when_nothing_unpacked():
    cart = {"puri": 3}
    containers = [_small(1, {"puri": 3})]
    out = packing.ffd_pack(cart, containers)
    assert packing.portions_packed(out) == 3 and len(out) == 1

def test_ffd_does_not_mutate_input():
    cart = {"puri": 2}
    containers = [_small(1)]
    packing.ffd_pack(cart, containers)
    assert containers[0]["items"] == {}
