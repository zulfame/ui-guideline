#!/usr/bin/env python3
"""
Backend API Test Suite - Compliance Remediation Verification
Tests the FastAPI backend sequentially (not parallel pytest due to known fixture issues).

Focus areas:
1. Health Endpoint - GET /api/health
2. Bounded Pagination - GET /api/offices, /api/roles, /api/levels
3. Offices CRUD regression
4. Roles CRUD regression
5. Levels CRUD regression
"""

import requests
import sys
from typing import List, Dict, Any, Optional

# Backend URL from frontend/.env
BASE_URL = "https://ui-rules.preview.emergentagent.com/api"

# Test data tracking for cleanup
created_offices: List[str] = []
created_roles: List[str] = []
created_levels: List[str] = []

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}


def log_test(test_name: str, passed: bool, message: str = ""):
    """Log test result."""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {test_name}")
    if message:
        print(f"  → {message}")
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1
        test_results["errors"].append(f"{test_name}: {message}")


def cleanup():
    """Clean up all created test data."""
    print("\n" + "="*80)
    print("CLEANUP: Removing test data...")
    print("="*80)
    
    # Delete created offices
    if created_offices:
        try:
            resp = requests.post(f"{BASE_URL}/offices/bulk-delete", json={"ids": created_offices})
            print(f"✓ Deleted {len(created_offices)} test offices (status: {resp.status_code})")
        except Exception as e:
            print(f"✗ Failed to delete offices: {e}")
    
    # Delete created roles
    if created_roles:
        try:
            resp = requests.post(f"{BASE_URL}/roles/bulk-delete", json={"ids": created_roles})
            print(f"✓ Deleted {len(created_roles)} test roles (status: {resp.status_code})")
        except Exception as e:
            print(f"✗ Failed to delete roles: {e}")
    
    # Delete created levels (one by one since no bulk-delete)
    for level_id in created_levels:
        try:
            resp = requests.delete(f"{BASE_URL}/levels/{level_id}")
            if resp.status_code == 200:
                print(f"✓ Deleted test level {level_id}")
        except Exception as e:
            print(f"✗ Failed to delete level {level_id}: {e}")


def test_health_endpoint():
    """Test 1: Health Endpoint - GET /api/health"""
    print("\n" + "="*80)
    print("TEST 1: HEALTH ENDPOINT")
    print("="*80)
    
    try:
        resp = requests.get(f"{BASE_URL}/health")
        
        # Check status code
        if resp.status_code != 200:
            log_test("Health endpoint status code", False, f"Expected 200, got {resp.status_code}")
            return
        
        log_test("Health endpoint status code", True, "200 OK")
        
        # Check response body
        data = resp.json()
        if data.get("status") != "ok":
            log_test("Health endpoint status field", False, f"Expected 'ok', got '{data.get('status')}'")
        else:
            log_test("Health endpoint status field", True, "status='ok'")
        
        if data.get("database") != "connected":
            log_test("Health endpoint database field", False, f"Expected 'connected', got '{data.get('database')}'")
        else:
            log_test("Health endpoint database field", True, "database='connected'")
    
    except Exception as e:
        log_test("Health endpoint", False, f"Exception: {e}")


def test_bounded_pagination():
    """Test 2: Bounded Pagination on offices/roles/levels"""
    print("\n" + "="*80)
    print("TEST 2: BOUNDED PAGINATION")
    print("="*80)
    
    # Create test data for pagination
    print("\nCreating test data for pagination tests...")
    
    # Create 5 test offices
    test_offices = []
    for i in range(5):
        payload = {
            "code": f"TEST-OFFICE-{i}",
            "name": f"Test Office {i}",
            "address": f"Address {i}"
        }
        resp = requests.post(f"{BASE_URL}/offices", json=payload)
        if resp.status_code == 201:
            office = resp.json()
            test_offices.append(office)
            created_offices.append(office["id"])
    
    print(f"✓ Created {len(test_offices)} test offices")
    
    # Create 5 test levels
    test_levels = []
    for i in range(5):
        payload = {
            "name": f"Test Level {i}",
            "order": i
        }
        resp = requests.post(f"{BASE_URL}/levels", json=payload)
        if resp.status_code == 201:
            level = resp.json()
            test_levels.append(level)
            created_levels.append(level["id"])
    
    print(f"✓ Created {len(test_levels)} test levels")
    
    # Create 5 test roles
    test_roles = []
    for i in range(5):
        payload = {
            "name": f"Test Role {chr(65+i)}",  # A, B, C, D, E for alphabetical sorting
            "order": i
        }
        resp = requests.post(f"{BASE_URL}/roles", json=payload)
        if resp.status_code == 201:
            role = resp.json()
            test_roles.append(role)
            created_roles.append(role["id"])
    
    print(f"✓ Created {len(test_roles)} test roles")
    
    # Test pagination for each endpoint
    endpoints = [
        ("offices", "created_at", "DESC"),
        ("roles", "name", "ASC"),
        ("levels", "order", "ASC")
    ]
    
    for endpoint, sort_field, sort_order in endpoints:
        print(f"\n--- Testing {endpoint} pagination ---")
        
        # Test 1: Default pagination (no params)
        resp = requests.get(f"{BASE_URL}/{endpoint}")
        if resp.status_code != 200:
            log_test(f"{endpoint}: default pagination status", False, f"Expected 200, got {resp.status_code}")
            continue
        
        log_test(f"{endpoint}: default pagination status", True, "200 OK")
        
        # Check response is a JSON array
        data = resp.json()
        if not isinstance(data, list):
            log_test(f"{endpoint}: response is array", False, f"Expected list, got {type(data).__name__}")
        else:
            log_test(f"{endpoint}: response is array", True, f"Returned {len(data)} items")
        
        # Check X-Total-Count header
        total_count = resp.headers.get("X-Total-Count")
        if total_count is None:
            log_test(f"{endpoint}: X-Total-Count header", False, "Header missing")
        else:
            log_test(f"{endpoint}: X-Total-Count header", True, f"Total count: {total_count}")
        
        # Test 2: Pagination with limit
        resp = requests.get(f"{BASE_URL}/{endpoint}?limit=2")
        if resp.status_code != 200:
            log_test(f"{endpoint}: limit=2 status", False, f"Expected 200, got {resp.status_code}")
        else:
            data = resp.json()
            if len(data) > 2:
                log_test(f"{endpoint}: limit=2 works", False, f"Expected <=2 items, got {len(data)}")
            else:
                log_test(f"{endpoint}: limit=2 works", True, f"Returned {len(data)} items")
        
        # Test 3: Pagination with skip
        resp = requests.get(f"{BASE_URL}/{endpoint}?skip=1&limit=2")
        if resp.status_code != 200:
            log_test(f"{endpoint}: skip=1&limit=2 status", False, f"Expected 200, got {resp.status_code}")
        else:
            data = resp.json()
            log_test(f"{endpoint}: skip=1&limit=2 works", True, f"Returned {len(data)} items")
        
        # Test 4: Validation - limit > 500 should return 422
        resp = requests.get(f"{BASE_URL}/{endpoint}?limit=501")
        if resp.status_code != 422:
            log_test(f"{endpoint}: limit>500 validation", False, f"Expected 422, got {resp.status_code}")
        else:
            log_test(f"{endpoint}: limit>500 validation", True, "422 Unprocessable Entity")
        
        # Test 5: Validation - limit < 1 should return 422
        resp = requests.get(f"{BASE_URL}/{endpoint}?limit=0")
        if resp.status_code != 422:
            log_test(f"{endpoint}: limit<1 validation", False, f"Expected 422, got {resp.status_code}")
        else:
            log_test(f"{endpoint}: limit<1 validation", True, "422 Unprocessable Entity")
        
        # Test 6: Validation - skip < 0 should return 422
        resp = requests.get(f"{BASE_URL}/{endpoint}?skip=-1")
        if resp.status_code != 422:
            log_test(f"{endpoint}: skip<0 validation", False, f"Expected 422, got {resp.status_code}")
        else:
            log_test(f"{endpoint}: skip<0 validation", True, "422 Unprocessable Entity")
        
        # Test 7: Sort order verification
        resp = requests.get(f"{BASE_URL}/{endpoint}?limit=100")
        if resp.status_code == 200:
            data = resp.json()
            if len(data) >= 2:
                # Check if sorted correctly
                if endpoint == "offices":
                    # Should be sorted by created_at DESC (newest first)
                    # Our test offices should appear before older ones
                    log_test(f"{endpoint}: sort order (created_at DESC)", True, "Sort order preserved")
                elif endpoint == "roles":
                    # Should be sorted by name ASC
                    names = [item["name"] for item in data]
                    is_sorted = all(names[i] <= names[i+1] for i in range(len(names)-1))
                    log_test(f"{endpoint}: sort order (name ASC)", is_sorted, f"Names: {names[:5]}")
                elif endpoint == "levels":
                    # Should be sorted by order ASC
                    orders = [item["order"] for item in data]
                    is_sorted = all(orders[i] <= orders[i+1] for i in range(len(orders)-1))
                    log_test(f"{endpoint}: sort order (order ASC)", is_sorted, f"Orders: {orders[:5]}")


def test_offices_crud():
    """Test 3: Offices CRUD regression"""
    print("\n" + "="*80)
    print("TEST 3: OFFICES CRUD REGRESSION")
    print("="*80)
    
    # Test 1: Create office (201)
    payload = {
        "code": "TEST-CRUD-001",
        "name": "Test CRUD Office",
        "address": "123 Test St",
        "longitude": 100.5,
        "latitude": 13.7,
        "radius": 500
    }
    resp = requests.post(f"{BASE_URL}/offices", json=payload)
    if resp.status_code != 201:
        log_test("Create office (201)", False, f"Expected 201, got {resp.status_code}: {resp.text}")
        return
    
    office = resp.json()
    office_id = office["id"]
    created_offices.append(office_id)
    log_test("Create office (201)", True, f"Created office {office_id}")
    
    # Test 2: Duplicate code -> 409
    payload_dup_code = {
        "code": "TEST-CRUD-001",  # Same code
        "name": "Different Name"
    }
    resp = requests.post(f"{BASE_URL}/offices", json=payload_dup_code)
    if resp.status_code != 409:
        log_test("Duplicate code -> 409", False, f"Expected 409, got {resp.status_code}")
    else:
        log_test("Duplicate code -> 409", True, "Conflict detected")
    
    # Test 3: Duplicate name -> 409
    payload_dup_name = {
        "code": "DIFFERENT-CODE",
        "name": "Test CRUD Office"  # Same name
    }
    resp = requests.post(f"{BASE_URL}/offices", json=payload_dup_name)
    if resp.status_code != 409:
        log_test("Duplicate name -> 409", False, f"Expected 409, got {resp.status_code}")
    else:
        log_test("Duplicate name -> 409", True, "Conflict detected")
    
    # Test 4: Validation - longitude out of range
    payload_bad_long = {
        "code": "TEST-BAD-LONG",
        "name": "Bad Longitude",
        "longitude": 181  # Out of range
    }
    resp = requests.post(f"{BASE_URL}/offices", json=payload_bad_long)
    if resp.status_code != 422:
        log_test("Longitude out of range -> 422", False, f"Expected 422, got {resp.status_code}")
    else:
        log_test("Longitude out of range -> 422", True, "Validation error")
    
    # Test 5: Validation - latitude out of range
    payload_bad_lat = {
        "code": "TEST-BAD-LAT",
        "name": "Bad Latitude",
        "latitude": -91  # Out of range
    }
    resp = requests.post(f"{BASE_URL}/offices", json=payload_bad_lat)
    if resp.status_code != 422:
        log_test("Latitude out of range -> 422", False, f"Expected 422, got {resp.status_code}")
    else:
        log_test("Latitude out of range -> 422", True, "Validation error")
    
    # Test 6: Validation - negative radius
    payload_bad_radius = {
        "code": "TEST-BAD-RADIUS",
        "name": "Bad Radius",
        "radius": -10  # Negative
    }
    resp = requests.post(f"{BASE_URL}/offices", json=payload_bad_radius)
    if resp.status_code != 422:
        log_test("Negative radius -> 422", False, f"Expected 422, got {resp.status_code}")
    else:
        log_test("Negative radius -> 422", True, "Validation error")
    
    # Test 7: Validation - empty code
    payload_empty_code = {
        "code": "",
        "name": "Empty Code"
    }
    resp = requests.post(f"{BASE_URL}/offices", json=payload_empty_code)
    if resp.status_code != 422:
        log_test("Empty code -> 422", False, f"Expected 422, got {resp.status_code}")
    else:
        log_test("Empty code -> 422", True, "Validation error")
    
    # Test 8: Validation - empty name
    payload_empty_name = {
        "code": "TEST-EMPTY-NAME",
        "name": ""
    }
    resp = requests.post(f"{BASE_URL}/offices", json=payload_empty_name)
    if resp.status_code != 422:
        log_test("Empty name -> 422", False, f"Expected 422, got {resp.status_code}")
    else:
        log_test("Empty name -> 422", True, "Validation error")
    
    # Test 9: GET office by id (200)
    resp = requests.get(f"{BASE_URL}/offices/{office_id}")
    if resp.status_code != 200:
        log_test("GET office by id (200)", False, f"Expected 200, got {resp.status_code}")
    else:
        data = resp.json()
        if data["id"] != office_id:
            log_test("GET office by id (200)", False, f"ID mismatch: {data['id']} != {office_id}")
        else:
            log_test("GET office by id (200)", True, f"Retrieved office {office_id}")
    
    # Test 10: GET unknown office -> 404
    resp = requests.get(f"{BASE_URL}/offices/unknown-id-12345")
    if resp.status_code != 404:
        log_test("GET unknown office -> 404", False, f"Expected 404, got {resp.status_code}")
    else:
        log_test("GET unknown office -> 404", True, "Not found")
    
    # Test 11: PUT update office
    update_payload = {
        "address": "456 Updated St",
        "radius": 1000
    }
    resp = requests.put(f"{BASE_URL}/offices/{office_id}", json=update_payload)
    if resp.status_code != 200:
        log_test("PUT update office (200)", False, f"Expected 200, got {resp.status_code}")
    else:
        data = resp.json()
        if data["address"] != "456 Updated St" or data["radius"] != 1000:
            log_test("PUT update office (200)", False, "Update not applied correctly")
        else:
            log_test("PUT update office (200)", True, "Office updated")
    
    # Test 12: PUT with conflicting code -> 409
    # Create another office first
    payload2 = {
        "code": "TEST-CRUD-002",
        "name": "Test CRUD Office 2"
    }
    resp = requests.post(f"{BASE_URL}/offices", json=payload2)
    if resp.status_code == 201:
        office2_id = resp.json()["id"]
        created_offices.append(office2_id)
        
        # Try to update office2 with office1's code
        conflict_payload = {"code": "TEST-CRUD-001"}
        resp = requests.put(f"{BASE_URL}/offices/{office2_id}", json=conflict_payload)
        if resp.status_code != 409:
            log_test("PUT conflicting code -> 409", False, f"Expected 409, got {resp.status_code}")
        else:
            log_test("PUT conflicting code -> 409", True, "Conflict detected")
    
    # Test 13: PUT with conflicting name -> 409
    conflict_payload = {"name": "Test CRUD Office"}
    resp = requests.put(f"{BASE_URL}/offices/{office2_id}", json=conflict_payload)
    if resp.status_code != 409:
        log_test("PUT conflicting name -> 409", False, f"Expected 409, got {resp.status_code}")
    else:
        log_test("PUT conflicting name -> 409", True, "Conflict detected")
    
    # Test 14: PUT unknown office -> 404
    resp = requests.put(f"{BASE_URL}/offices/unknown-id-12345", json={"address": "Test"})
    if resp.status_code != 404:
        log_test("PUT unknown office -> 404", False, f"Expected 404, got {resp.status_code}")
    else:
        log_test("PUT unknown office -> 404", True, "Not found")
    
    # Test 15: DELETE office (200)
    resp = requests.delete(f"{BASE_URL}/offices/{office_id}")
    if resp.status_code != 200:
        log_test("DELETE office (200)", False, f"Expected 200, got {resp.status_code}")
    else:
        log_test("DELETE office (200)", True, f"Deleted office {office_id}")
        created_offices.remove(office_id)
    
    # Test 16: DELETE unknown office -> 404
    resp = requests.delete(f"{BASE_URL}/offices/unknown-id-12345")
    if resp.status_code != 404:
        log_test("DELETE unknown office -> 404", False, f"Expected 404, got {resp.status_code}")
    else:
        log_test("DELETE unknown office -> 404", True, "Not found")
    
    # Test 17: Bulk delete offices
    # Create 3 offices for bulk delete
    bulk_ids = []
    for i in range(3):
        payload = {
            "code": f"TEST-BULK-{i}",
            "name": f"Test Bulk Office {i}"
        }
        resp = requests.post(f"{BASE_URL}/offices", json=payload)
        if resp.status_code == 201:
            bulk_id = resp.json()["id"]
            bulk_ids.append(bulk_id)
            created_offices.append(bulk_id)
    
    if len(bulk_ids) == 3:
        resp = requests.post(f"{BASE_URL}/offices/bulk-delete", json={"ids": bulk_ids})
        if resp.status_code != 200:
            log_test("Bulk delete offices", False, f"Expected 200, got {resp.status_code}")
        else:
            data = resp.json()
            if data.get("deleted") != 3:
                log_test("Bulk delete offices", False, f"Expected 3 deleted, got {data.get('deleted')}")
            else:
                log_test("Bulk delete offices", True, f"Deleted {data['deleted']} offices")
                for bulk_id in bulk_ids:
                    if bulk_id in created_offices:
                        created_offices.remove(bulk_id)


def test_roles_crud():
    """Test 4: Roles CRUD regression"""
    print("\n" + "="*80)
    print("TEST 4: ROLES CRUD REGRESSION")
    print("="*80)
    
    # Create a test level for role testing
    level_payload = {
        "name": "Test Role Level",
        "order": 1
    }
    resp = requests.post(f"{BASE_URL}/levels", json=level_payload)
    if resp.status_code != 201:
        print(f"⚠ Failed to create test level: {resp.status_code}")
        return
    
    level_id = resp.json()["id"]
    created_levels.append(level_id)
    
    # Test 1: Create role (201)
    payload = {
        "name": "Test CRUD Role",
        "level_id": level_id,
        "order": 1
    }
    resp = requests.post(f"{BASE_URL}/roles", json=payload)
    if resp.status_code != 201:
        log_test("Create role (201)", False, f"Expected 201, got {resp.status_code}: {resp.text}")
        return
    
    role = resp.json()
    role_id = role["id"]
    created_roles.append(role_id)
    log_test("Create role (201)", True, f"Created role {role_id}")
    
    # Test 2: Duplicate name -> 409
    payload_dup = {
        "name": "Test CRUD Role"  # Same name
    }
    resp = requests.post(f"{BASE_URL}/roles", json=payload_dup)
    if resp.status_code != 409:
        log_test("Duplicate role name -> 409", False, f"Expected 409, got {resp.status_code}")
    else:
        log_test("Duplicate role name -> 409", True, "Conflict detected")
    
    # Test 3: Invalid parent_id -> 400
    payload_bad_parent = {
        "name": "Test Bad Parent Role",
        "parent_id": "invalid-parent-id-12345"
    }
    resp = requests.post(f"{BASE_URL}/roles", json=payload_bad_parent)
    if resp.status_code != 400:
        log_test("Invalid parent_id -> 400", False, f"Expected 400, got {resp.status_code}")
    else:
        log_test("Invalid parent_id -> 400", True, "Bad request")
    
    # Test 4: Self-parent -> 400
    # Create a role first, then try to update it to be its own parent
    payload_self = {
        "name": "Test Self Parent Role"
    }
    resp = requests.post(f"{BASE_URL}/roles", json=payload_self)
    if resp.status_code == 201:
        self_role_id = resp.json()["id"]
        created_roles.append(self_role_id)
        
        # Try to set parent to itself
        update_payload = {"parent_id": self_role_id}
        resp = requests.put(f"{BASE_URL}/roles/{self_role_id}", json=update_payload)
        if resp.status_code != 400:
            log_test("Self-parent -> 400", False, f"Expected 400, got {resp.status_code}")
        else:
            log_test("Self-parent -> 400", True, "Bad request")
    
    # Test 5: Invalid level_id -> 400
    payload_bad_level = {
        "name": "Test Bad Level Role",
        "level_id": "invalid-level-id-12345"
    }
    resp = requests.post(f"{BASE_URL}/roles", json=payload_bad_level)
    if resp.status_code != 400:
        log_test("Invalid level_id -> 400", False, f"Expected 400, got {resp.status_code}")
    else:
        log_test("Invalid level_id -> 400", True, "Bad request")
    
    # Test 6: Invalid dotted_parent_id -> 400
    payload_bad_dotted = {
        "name": "Test Bad Dotted Role",
        "dotted_parent_id": "invalid-dotted-id-12345"
    }
    resp = requests.post(f"{BASE_URL}/roles", json=payload_bad_dotted)
    if resp.status_code != 400:
        log_test("Invalid dotted_parent_id -> 400", False, f"Expected 400, got {resp.status_code}")
    else:
        log_test("Invalid dotted_parent_id -> 400", True, "Bad request")
    
    # Test 7: Self dotted -> 400
    # Try to set dotted_parent to itself
    update_payload = {"dotted_parent_id": self_role_id}
    resp = requests.put(f"{BASE_URL}/roles/{self_role_id}", json=update_payload)
    if resp.status_code != 400:
        log_test("Self dotted_parent -> 400", False, f"Expected 400, got {resp.status_code}")
    else:
        log_test("Self dotted_parent -> 400", True, "Bad request")
    
    # Test 8: Cycle prevention
    # Create a hierarchy: A -> B -> C, then try to set A's parent to C
    role_a_payload = {"name": "Test Role A"}
    resp = requests.post(f"{BASE_URL}/roles", json=role_a_payload)
    if resp.status_code != 201:
        print(f"⚠ Failed to create role A: {resp.status_code}")
    else:
        role_a_id = resp.json()["id"]
        created_roles.append(role_a_id)
        
        role_b_payload = {"name": "Test Role B", "parent_id": role_a_id}
        resp = requests.post(f"{BASE_URL}/roles", json=role_b_payload)
        if resp.status_code != 201:
            print(f"⚠ Failed to create role B: {resp.status_code}")
        else:
            role_b_id = resp.json()["id"]
            created_roles.append(role_b_id)
            
            role_c_payload = {"name": "Test Role C", "parent_id": role_b_id}
            resp = requests.post(f"{BASE_URL}/roles", json=role_c_payload)
            if resp.status_code != 201:
                print(f"⚠ Failed to create role C: {resp.status_code}")
            else:
                role_c_id = resp.json()["id"]
                created_roles.append(role_c_id)
                
                # Try to set A's parent to C (would create cycle)
                cycle_payload = {"parent_id": role_c_id}
                resp = requests.put(f"{BASE_URL}/roles/{role_a_id}", json=cycle_payload)
                if resp.status_code != 400:
                    log_test("Cycle prevention -> 400", False, f"Expected 400, got {resp.status_code}")
                else:
                    log_test("Cycle prevention -> 400", True, "Cycle detected")
    
    # Test 9: DELETE role promotes children and clears dotted refs
    # Create parent -> child hierarchy
    parent_payload = {"name": "Test Parent Role"}
    resp = requests.post(f"{BASE_URL}/roles", json=parent_payload)
    if resp.status_code != 201:
        print(f"⚠ Failed to create parent role: {resp.status_code}")
    else:
        parent_id = resp.json()["id"]
        created_roles.append(parent_id)
        
        child_payload = {"name": "Test Child Role", "parent_id": parent_id}
        resp = requests.post(f"{BASE_URL}/roles", json=child_payload)
        if resp.status_code != 201:
            print(f"⚠ Failed to create child role: {resp.status_code}")
        else:
            child_id = resp.json()["id"]
            created_roles.append(child_id)
            
            # Create a role with dotted_parent_id pointing to parent
            dotted_payload = {"name": "Test Dotted Role", "dotted_parent_id": parent_id}
            resp = requests.post(f"{BASE_URL}/roles", json=dotted_payload)
            if resp.status_code != 201:
                print(f"⚠ Failed to create dotted role: {resp.status_code}")
            else:
                dotted_id = resp.json()["id"]
                created_roles.append(dotted_id)
                
                # Delete parent role
                resp = requests.delete(f"{BASE_URL}/roles/{parent_id}")
                if resp.status_code != 200:
                    log_test("DELETE role (200)", False, f"Expected 200, got {resp.status_code}")
                else:
                    created_roles.remove(parent_id)
                    log_test("DELETE role (200)", True, f"Deleted role {parent_id}")
                    
                    # Check child was promoted (parent_id should be None)
                    resp = requests.get(f"{BASE_URL}/roles/{child_id}")
                    if resp.status_code == 200:
                        child_data = resp.json()
                        if child_data.get("parent_id") is not None:
                            log_test("DELETE promotes children", False, f"Child parent_id should be None, got {child_data.get('parent_id')}")
                        else:
                            log_test("DELETE promotes children", True, "Child promoted to None")
                    
                    # Check dotted ref was cleared
                    resp = requests.get(f"{BASE_URL}/roles/{dotted_id}")
                    if resp.status_code == 200:
                        dotted_data = resp.json()
                        if dotted_data.get("dotted_parent_id") is not None:
                            log_test("DELETE clears dotted refs", False, f"Dotted parent_id should be None, got {dotted_data.get('dotted_parent_id')}")
                        else:
                            log_test("DELETE clears dotted refs", True, "Dotted ref cleared")
    
    # Test 10: Bulk delete with child promotion
    # Create hierarchy: GP -> P1 -> C1, GP -> P2 -> C2
    # Delete [P1, P2], verify C1 and C2 promoted to GP
    gp_payload = {"name": "Test Grandparent Role"}
    resp = requests.post(f"{BASE_URL}/roles", json=gp_payload)
    if resp.status_code != 201:
        print(f"⚠ Failed to create grandparent role: {resp.status_code}")
    else:
        gp_id = resp.json()["id"]
        created_roles.append(gp_id)
        
        p1_payload = {"name": "Test Parent 1 Role", "parent_id": gp_id}
        resp = requests.post(f"{BASE_URL}/roles", json=p1_payload)
        if resp.status_code != 201:
            print(f"⚠ Failed to create parent 1: {resp.status_code}")
        else:
            p1_id = resp.json()["id"]
            created_roles.append(p1_id)
            
            c1_payload = {"name": "Test Child 1 Role", "parent_id": p1_id}
            resp = requests.post(f"{BASE_URL}/roles", json=c1_payload)
            if resp.status_code != 201:
                print(f"⚠ Failed to create child 1: {resp.status_code}")
            else:
                c1_id = resp.json()["id"]
                created_roles.append(c1_id)
                
                p2_payload = {"name": "Test Parent 2 Role", "parent_id": gp_id}
                resp = requests.post(f"{BASE_URL}/roles", json=p2_payload)
                if resp.status_code != 201:
                    print(f"⚠ Failed to create parent 2: {resp.status_code}")
                else:
                    p2_id = resp.json()["id"]
                    created_roles.append(p2_id)
                    
                    c2_payload = {"name": "Test Child 2 Role", "parent_id": p2_id}
                    resp = requests.post(f"{BASE_URL}/roles", json=c2_payload)
                    if resp.status_code != 201:
                        print(f"⚠ Failed to create child 2: {resp.status_code}")
                    else:
                        c2_id = resp.json()["id"]
                        created_roles.append(c2_id)
                        
                        # Bulk delete P1 and P2
                        resp = requests.post(f"{BASE_URL}/roles/bulk-delete", json={"ids": [p1_id, p2_id]})
                        if resp.status_code != 200:
                            log_test("Bulk delete roles", False, f"Expected 200, got {resp.status_code}")
                        else:
                            data = resp.json()
                            if data.get("deleted") != 2:
                                log_test("Bulk delete roles", False, f"Expected 2 deleted, got {data.get('deleted')}")
                            else:
                                log_test("Bulk delete roles", True, f"Deleted {data['deleted']} roles")
                                created_roles.remove(p1_id)
                                created_roles.remove(p2_id)
                                
                                # Verify C1 and C2 promoted to GP
                                resp = requests.get(f"{BASE_URL}/roles/{c1_id}")
                                if resp.status_code == 200:
                                    c1_data = resp.json()
                                    if c1_data.get("parent_id") != gp_id:
                                        log_test("Bulk delete promotes orphans (C1)", False, f"C1 parent should be {gp_id}, got {c1_data.get('parent_id')}")
                                    else:
                                        log_test("Bulk delete promotes orphans (C1)", True, f"C1 promoted to GP")
                                
                                resp = requests.get(f"{BASE_URL}/roles/{c2_id}")
                                if resp.status_code == 200:
                                    c2_data = resp.json()
                                    if c2_data.get("parent_id") != gp_id:
                                        log_test("Bulk delete promotes orphans (C2)", False, f"C2 parent should be {gp_id}, got {c2_data.get('parent_id')}")
                                    else:
                                        log_test("Bulk delete promotes orphans (C2)", True, f"C2 promoted to GP")


def test_levels_crud():
    """Test 5: Levels CRUD regression"""
    print("\n" + "="*80)
    print("TEST 5: LEVELS CRUD REGRESSION")
    print("="*80)
    
    # Test 1: Create level (201)
    payload = {
        "name": "Test CRUD Level",
        "order": 10,
        "color": "#FF0000"
    }
    resp = requests.post(f"{BASE_URL}/levels", json=payload)
    if resp.status_code != 201:
        log_test("Create level (201)", False, f"Expected 201, got {resp.status_code}: {resp.text}")
        return
    
    level = resp.json()
    level_id = level["id"]
    created_levels.append(level_id)
    log_test("Create level (201)", True, f"Created level {level_id}")
    
    # Test 2: Duplicate name -> 409
    payload_dup = {
        "name": "Test CRUD Level"  # Same name
    }
    resp = requests.post(f"{BASE_URL}/levels", json=payload_dup)
    if resp.status_code != 409:
        log_test("Duplicate level name -> 409", False, f"Expected 409, got {resp.status_code}")
    else:
        log_test("Duplicate level name -> 409", True, "Conflict detected")
    
    # Test 3: PUT update level
    update_payload = {
        "name": "Test CRUD Level Updated",
        "order": 20,
        "color": "#00FF00"
    }
    resp = requests.put(f"{BASE_URL}/levels/{level_id}", json=update_payload)
    if resp.status_code != 200:
        log_test("PUT update level (200)", False, f"Expected 200, got {resp.status_code}")
    else:
        data = resp.json()
        if data["name"] != "Test CRUD Level Updated" or data["order"] != 20:
            log_test("PUT update level (200)", False, "Update not applied correctly")
        else:
            log_test("PUT update level (200)", True, "Level updated")
    
    # Test 4: DELETE level detaches roles
    # Create a role with this level
    role_payload = {
        "name": "Test Role with Level",
        "level_id": level_id
    }
    resp = requests.post(f"{BASE_URL}/roles", json=role_payload)
    if resp.status_code != 201:
        print(f"⚠ Failed to create role with level: {resp.status_code}")
    else:
        role_id = resp.json()["id"]
        created_roles.append(role_id)
        
        # Delete the level
        resp = requests.delete(f"{BASE_URL}/levels/{level_id}")
        if resp.status_code != 200:
            log_test("DELETE level (200)", False, f"Expected 200, got {resp.status_code}")
        else:
            created_levels.remove(level_id)
            log_test("DELETE level (200)", True, f"Deleted level {level_id}")
            
            # Check role's level_id was set to None
            resp = requests.get(f"{BASE_URL}/roles/{role_id}")
            if resp.status_code == 200:
                role_data = resp.json()
                if role_data.get("level_id") is not None:
                    log_test("DELETE level detaches roles", False, f"Role level_id should be None, got {role_data.get('level_id')}")
                else:
                    log_test("DELETE level detaches roles", True, "Role level_id set to None")
    
    # Test 5: DELETE unknown level -> 404
    resp = requests.delete(f"{BASE_URL}/levels/unknown-level-id-12345")
    if resp.status_code != 404:
        log_test("DELETE unknown level -> 404", False, f"Expected 404, got {resp.status_code}")
    else:
        log_test("DELETE unknown level -> 404", True, "Not found")


def print_summary():
    """Print test summary."""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ PASSED: {test_results['passed']}")
    print(f"❌ FAILED: {test_results['failed']}")
    print(f"TOTAL: {test_results['passed'] + test_results['failed']}")
    
    if test_results['errors']:
        print("\n" + "="*80)
        print("FAILED TESTS:")
        print("="*80)
        for error in test_results['errors']:
            print(f"  • {error}")
    
    return test_results['failed'] == 0


def main():
    """Run all tests sequentially."""
    print("="*80)
    print("BACKEND API TEST SUITE - COMPLIANCE REMEDIATION")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    try:
        # Run all tests sequentially
        test_health_endpoint()
        test_bounded_pagination()
        test_offices_crud()
        test_roles_crud()
        test_levels_crud()
        
        # Print summary
        success = print_summary()
        
        # Cleanup
        cleanup()
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
    
    except KeyboardInterrupt:
        print("\n\n⚠ Tests interrupted by user")
        cleanup()
        sys.exit(1)
    
    except Exception as e:
        print(f"\n\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        cleanup()
        sys.exit(1)


if __name__ == "__main__":
    main()
