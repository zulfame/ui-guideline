#!/usr/bin/env python3
"""
Backend API Test Suite - Users Module CRUD + Password Policy
Tests the NEW Users module at /api/users with comprehensive coverage.

Test areas:
1. LIST users (GET /api/users) - pagination, enrichment, password security
2. CREATE user (POST /api/users) - validation, optional fields
3. UNIQUENESS checks (409) - email, username, phone, alias, mso_code, collector_code
4. GET one user (GET /api/users/{id})
5. UPDATE user (PUT /api/users/{id})
6. CHANGE PASSWORD (POST /api/users/{id}/change-password) - no-reuse policy
7. RESET PASSWORD (POST /api/users/{id}/reset-password)
8. SOFT DELETE (DELETE /api/users/{id})
9. SECURITY - verify no password/password_history leakage
"""

import requests
import sys
from typing import List, Dict, Any, Optional

# Backend URL from frontend/.env
BASE_URL = "https://design-system-nexus-1.preview.emergentagent.com/api"

# Test data tracking for cleanup
created_users: List[str] = []
valid_role_id: Optional[str] = None
valid_office_id: Optional[str] = None

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


def setup_test_data():
    """Get valid role_id and office_id from seeded data."""
    global valid_role_id, valid_office_id
    
    print("\n" + "="*80)
    print("SETUP: Getting valid role_id and office_id from seeded data")
    print("="*80)
    
    # Get roles
    resp = requests.get(f"{BASE_URL}/roles?limit=500")
    if resp.status_code == 200:
        roles = resp.json()
        if roles:
            valid_role_id = roles[0]["id"]
            print(f"✓ Got valid role_id: {valid_role_id} ({roles[0]['name']})")
        else:
            print("✗ No roles found in database")
            return False
    else:
        print(f"✗ Failed to get roles: {resp.status_code}")
        return False
    
    # Get offices
    resp = requests.get(f"{BASE_URL}/offices?limit=500")
    if resp.status_code == 200:
        offices = resp.json()
        if offices:
            valid_office_id = offices[0]["id"]
            print(f"✓ Got valid office_id: {valid_office_id} ({offices[0]['name']})")
        else:
            print("✗ No offices found in database")
            return False
    else:
        print(f"✗ Failed to get offices: {resp.status_code}")
        return False
    
    return True


def cleanup():
    """Clean up all created test users (soft delete)."""
    print("\n" + "="*80)
    print("CLEANUP: Soft-deleting test users...")
    print("="*80)
    
    if created_users:
        try:
            resp = requests.post(f"{BASE_URL}/users/bulk-delete", json={"ids": created_users})
            if resp.status_code == 200:
                data = resp.json()
                print(f"✓ Soft-deleted {data.get('deleted', 0)} test users (status: {resp.status_code})")
            else:
                print(f"✗ Failed to bulk delete users: {resp.status_code}")
        except Exception as e:
            print(f"✗ Failed to delete users: {e}")


def test_list_users():
    """Test 1: LIST users - GET /api/users"""
    print("\n" + "="*80)
    print("TEST 1: LIST USERS (GET /api/users)")
    print("="*80)
    
    try:
        resp = requests.get(f"{BASE_URL}/users")
        
        # Check status code
        if resp.status_code != 200:
            log_test("List users status code", False, f"Expected 200, got {resp.status_code}")
            return
        
        log_test("List users status code", True, "200 OK")
        
        # Check response is JSON array
        data = resp.json()
        if not isinstance(data, list):
            log_test("List users response is array", False, f"Expected list, got {type(data).__name__}")
            return
        
        log_test("List users response is array", True, f"Returned {len(data)} users")
        
        # Check X-Total-Count header
        total_count = resp.headers.get("X-Total-Count")
        if total_count is None:
            log_test("List users X-Total-Count header", False, "Header missing")
        else:
            log_test("List users X-Total-Count header", True, f"Total count: {total_count}")
        
        # Check enrichment and security for each user
        if data:
            user = data[0]
            
            # Check enrichment: role_name and office_name present
            if "role_name" not in user:
                log_test("List users includes role_name", False, "role_name field missing")
            else:
                log_test("List users includes role_name", True, f"role_name: {user.get('role_name')}")
            
            if "office_name" not in user:
                log_test("List users includes office_name", False, "office_name field missing")
            else:
                log_test("List users includes office_name", True, f"office_name: {user.get('office_name')}")
            
            # Check password fields NOT present
            if "password" in user:
                log_test("List users NEVER returns password", False, "password field present in response")
            else:
                log_test("List users NEVER returns password", True, "password field not present")
            
            if "password_history" in user:
                log_test("List users NEVER returns password_history", False, "password_history field present in response")
            else:
                log_test("List users NEVER returns password_history", True, "password_history field not present")
            
            # Check password status fields present
            required_fields = ["password_status", "password_expired", "must_change_password", "password_expires_at"]
            for field in required_fields:
                if field not in user:
                    log_test(f"List users includes {field}", False, f"{field} field missing")
                else:
                    log_test(f"List users includes {field}", True, f"{field}: {user.get(field)}")
    
    except Exception as e:
        log_test("List users", False, f"Exception: {e}")


def test_create_user():
    """Test 2: CREATE user - POST /api/users"""
    print("\n" + "="*80)
    print("TEST 2: CREATE USER (POST /api/users)")
    print("="*80)
    
    # Test 2a: Create user with required fields only
    payload = {
        "name": "Test User Alpha",
        "email": "test.alpha@example.com",
        "role_id": valid_role_id,
        "office_id": valid_office_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload)
        
        if resp.status_code != 201:
            log_test("Create user (201)", False, f"Expected 201, got {resp.status_code}: {resp.text}")
            return
        
        log_test("Create user (201)", True, "User created successfully")
        
        user = resp.json()
        user_id = user.get("id")
        if user_id:
            created_users.append(user_id)
        
        # Check must_change_password is true
        if user.get("must_change_password") != True:
            log_test("Create user must_change_password=true", False, f"Expected true, got {user.get('must_change_password')}")
        else:
            log_test("Create user must_change_password=true", True, "must_change_password is true")
        
        # Check password_status is active
        if user.get("password_status") != "active":
            log_test("Create user password_status=active", False, f"Expected 'active', got {user.get('password_status')}")
        else:
            log_test("Create user password_status=active", True, "password_status is active")
        
        # Check NO password field
        if "password" in user:
            log_test("Create user NO password field", False, "password field present in response")
        else:
            log_test("Create user NO password field", True, "password field not present")
        
        # Check NO password_history field
        if "password_history" in user:
            log_test("Create user NO password_history field", False, "password_history field present in response")
        else:
            log_test("Create user NO password_history field", True, "password_history field not present")
    
    except Exception as e:
        log_test("Create user", False, f"Exception: {e}")
    
    # Test 2b: Create user with optional fields
    payload_with_optionals = {
        "name": "Test User Beta",
        "email": "test.beta@example.com",
        "role_id": valid_role_id,
        "office_id": valid_office_id,
        "username": "testbeta",
        "phone": "+62812345678",
        "alias": "TB",
        "mso_code": "MSO999",
        "collector_code": "COL999",
        "device_identifier": "device123",
        "device_name": "Test Device",
        "device_os": "Android 12",
        "fcm_token": "fcm_token_123"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload_with_optionals)
        
        if resp.status_code != 201:
            log_test("Create user with optional fields (201)", False, f"Expected 201, got {resp.status_code}: {resp.text}")
        else:
            log_test("Create user with optional fields (201)", True, "User created with all optional fields")
            user = resp.json()
            user_id = user.get("id")
            if user_id:
                created_users.append(user_id)
    
    except Exception as e:
        log_test("Create user with optional fields", False, f"Exception: {e}")


def test_validation():
    """Test 3: VALIDATION - missing/invalid fields"""
    print("\n" + "="*80)
    print("TEST 3: VALIDATION")
    print("="*80)
    
    # Test 3a: Missing email -> 422
    payload_no_email = {
        "name": "Test User",
        "role_id": valid_role_id,
        "office_id": valid_office_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload_no_email)
        if resp.status_code != 422:
            log_test("Missing email -> 422", False, f"Expected 422, got {resp.status_code}")
        else:
            log_test("Missing email -> 422", True, "Validation error")
    except Exception as e:
        log_test("Missing email -> 422", False, f"Exception: {e}")
    
    # Test 3b: Invalid email format -> 422
    payload_bad_email = {
        "name": "Test User",
        "email": "not-an-email",
        "role_id": valid_role_id,
        "office_id": valid_office_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload_bad_email)
        if resp.status_code != 422:
            log_test("Invalid email format -> 422", False, f"Expected 422, got {resp.status_code}")
        else:
            log_test("Invalid email format -> 422", True, "Validation error")
    except Exception as e:
        log_test("Invalid email format -> 422", False, f"Exception: {e}")
    
    # Test 3c: Missing role_id -> 422
    payload_no_role = {
        "name": "Test User",
        "email": "test@example.com",
        "office_id": valid_office_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload_no_role)
        if resp.status_code != 422:
            log_test("Missing role_id -> 422", False, f"Expected 422, got {resp.status_code}")
        else:
            log_test("Missing role_id -> 422", True, "Validation error")
    except Exception as e:
        log_test("Missing role_id -> 422", False, f"Exception: {e}")
    
    # Test 3d: Missing office_id -> 422
    payload_no_office = {
        "name": "Test User",
        "email": "test@example.com",
        "role_id": valid_role_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload_no_office)
        if resp.status_code != 422:
            log_test("Missing office_id -> 422", False, f"Expected 422, got {resp.status_code}")
        else:
            log_test("Missing office_id -> 422", True, "Validation error")
    except Exception as e:
        log_test("Missing office_id -> 422", False, f"Exception: {e}")
    
    # Test 3e: Invalid role_id (nonexistent) -> 400
    payload_bad_role = {
        "name": "Test User",
        "email": "test@example.com",
        "role_id": "nonexistent-role-id-12345",
        "office_id": valid_office_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload_bad_role)
        if resp.status_code != 400:
            log_test("Invalid role_id -> 400", False, f"Expected 400, got {resp.status_code}")
        else:
            log_test("Invalid role_id -> 400", True, "Bad request")
    except Exception as e:
        log_test("Invalid role_id -> 400", False, f"Exception: {e}")
    
    # Test 3f: Invalid office_id (nonexistent) -> 400
    payload_bad_office = {
        "name": "Test User",
        "email": "test@example.com",
        "role_id": valid_role_id,
        "office_id": "nonexistent-office-id-12345"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload_bad_office)
        if resp.status_code != 400:
            log_test("Invalid office_id -> 400", False, f"Expected 400, got {resp.status_code}")
        else:
            log_test("Invalid office_id -> 400", True, "Bad request")
    except Exception as e:
        log_test("Invalid office_id -> 400", False, f"Exception: {e}")


def test_uniqueness():
    """Test 4: UNIQUENESS checks (409)"""
    print("\n" + "="*80)
    print("TEST 4: UNIQUENESS CHECKS (409)")
    print("="*80)
    
    # Create a base user with all unique fields
    base_payload = {
        "name": "Test Unique User",
        "email": "unique@example.com",
        "role_id": valid_role_id,
        "office_id": valid_office_id,
        "username": "uniqueuser",
        "phone": "+62811111111",
        "alias": "UU",
        "mso_code": "MSO111",
        "collector_code": "COL111"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=base_payload)
        if resp.status_code != 201:
            print(f"⚠ Failed to create base user: {resp.status_code}")
            return
        
        base_user = resp.json()
        base_user_id = base_user.get("id")
        if base_user_id:
            created_users.append(base_user_id)
        
        print(f"✓ Created base user with unique fields")
        
        # Test 4a: Duplicate email -> 409
        dup_email_payload = {
            "name": "Another User",
            "email": "unique@example.com",  # Same email
            "role_id": valid_role_id,
            "office_id": valid_office_id
        }
        
        resp = requests.post(f"{BASE_URL}/users", json=dup_email_payload)
        if resp.status_code != 409:
            log_test("Duplicate email -> 409", False, f"Expected 409, got {resp.status_code}")
        else:
            log_test("Duplicate email -> 409", True, "Conflict detected")
        
        # Test 4b: Duplicate username -> 409
        dup_username_payload = {
            "name": "Another User",
            "email": "another@example.com",
            "role_id": valid_role_id,
            "office_id": valid_office_id,
            "username": "uniqueuser"  # Same username
        }
        
        resp = requests.post(f"{BASE_URL}/users", json=dup_username_payload)
        if resp.status_code != 409:
            log_test("Duplicate username -> 409", False, f"Expected 409, got {resp.status_code}")
        else:
            log_test("Duplicate username -> 409", True, "Conflict detected")
        
        # Test 4c: Duplicate phone -> 409
        dup_phone_payload = {
            "name": "Another User",
            "email": "another2@example.com",
            "role_id": valid_role_id,
            "office_id": valid_office_id,
            "phone": "+62811111111"  # Same phone
        }
        
        resp = requests.post(f"{BASE_URL}/users", json=dup_phone_payload)
        if resp.status_code != 409:
            log_test("Duplicate phone -> 409", False, f"Expected 409, got {resp.status_code}")
        else:
            log_test("Duplicate phone -> 409", True, "Conflict detected")
        
        # Test 4d: Duplicate alias -> 409
        dup_alias_payload = {
            "name": "Another User",
            "email": "another3@example.com",
            "role_id": valid_role_id,
            "office_id": valid_office_id,
            "alias": "UU"  # Same alias
        }
        
        resp = requests.post(f"{BASE_URL}/users", json=dup_alias_payload)
        if resp.status_code != 409:
            log_test("Duplicate alias -> 409", False, f"Expected 409, got {resp.status_code}")
        else:
            log_test("Duplicate alias -> 409", True, "Conflict detected")
        
        # Test 4e: Duplicate mso_code -> 409
        dup_mso_payload = {
            "name": "Another User",
            "email": "another4@example.com",
            "role_id": valid_role_id,
            "office_id": valid_office_id,
            "mso_code": "MSO111"  # Same mso_code
        }
        
        resp = requests.post(f"{BASE_URL}/users", json=dup_mso_payload)
        if resp.status_code != 409:
            log_test("Duplicate mso_code -> 409", False, f"Expected 409, got {resp.status_code}")
        else:
            log_test("Duplicate mso_code -> 409", True, "Conflict detected")
        
        # Test 4f: Duplicate collector_code -> 409
        dup_collector_payload = {
            "name": "Another User",
            "email": "another5@example.com",
            "role_id": valid_role_id,
            "office_id": valid_office_id,
            "collector_code": "COL111"  # Same collector_code
        }
        
        resp = requests.post(f"{BASE_URL}/users", json=dup_collector_payload)
        if resp.status_code != 409:
            log_test("Duplicate collector_code -> 409", False, f"Expected 409, got {resp.status_code}")
        else:
            log_test("Duplicate collector_code -> 409", True, "Conflict detected")
        
        # Test 4g: Empty-string optional fields should NOT cause conflicts
        # Create two users both omitting username (should both succeed)
        empty_user1_payload = {
            "name": "Empty User 1",
            "email": "empty1@example.com",
            "role_id": valid_role_id,
            "office_id": valid_office_id
            # username omitted
        }
        
        resp = requests.post(f"{BASE_URL}/users", json=empty_user1_payload)
        if resp.status_code != 201:
            log_test("Empty optional fields (user 1) -> 201", False, f"Expected 201, got {resp.status_code}")
        else:
            log_test("Empty optional fields (user 1) -> 201", True, "User created without username")
            user1 = resp.json()
            if user1.get("id"):
                created_users.append(user1["id"])
        
        empty_user2_payload = {
            "name": "Empty User 2",
            "email": "empty2@example.com",
            "role_id": valid_role_id,
            "office_id": valid_office_id
            # username also omitted
        }
        
        resp = requests.post(f"{BASE_URL}/users", json=empty_user2_payload)
        if resp.status_code != 201:
            log_test("Empty optional fields (user 2) -> 201", False, f"Expected 201, got {resp.status_code}: Both users without username should succeed")
        else:
            log_test("Empty optional fields (user 2) -> 201", True, "Second user created without username (no conflict)")
            user2 = resp.json()
            if user2.get("id"):
                created_users.append(user2["id"])
    
    except Exception as e:
        log_test("Uniqueness checks", False, f"Exception: {e}")


def test_get_user():
    """Test 5: GET one user - GET /api/users/{id}"""
    print("\n" + "="*80)
    print("TEST 5: GET ONE USER (GET /api/users/{id})")
    print("="*80)
    
    # Create a user to get
    payload = {
        "name": "Test Get User",
        "email": "testget@example.com",
        "role_id": valid_role_id,
        "office_id": valid_office_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload)
        if resp.status_code != 201:
            print(f"⚠ Failed to create user for GET test: {resp.status_code}")
            return
        
        user = resp.json()
        user_id = user.get("id")
        if user_id:
            created_users.append(user_id)
        
        # Test 5a: GET user by id -> 200
        resp = requests.get(f"{BASE_URL}/users/{user_id}")
        if resp.status_code != 200:
            log_test("GET user by id (200)", False, f"Expected 200, got {resp.status_code}")
        else:
            log_test("GET user by id (200)", True, f"Retrieved user {user_id}")
            
            user_data = resp.json()
            
            # Check NO password field
            if "password" in user_data:
                log_test("GET user NO password field", False, "password field present in response")
            else:
                log_test("GET user NO password field", True, "password field not present")
            
            # Check NO password_history field
            if "password_history" in user_data:
                log_test("GET user NO password_history field", False, "password_history field present in response")
            else:
                log_test("GET user NO password_history field", True, "password_history field not present")
        
        # Test 5b: GET unknown user -> 404
        resp = requests.get(f"{BASE_URL}/users/unknown-user-id-12345")
        if resp.status_code != 404:
            log_test("GET unknown user -> 404", False, f"Expected 404, got {resp.status_code}")
        else:
            log_test("GET unknown user -> 404", True, "Not found")
    
    except Exception as e:
        log_test("GET user", False, f"Exception: {e}")


def test_update_user():
    """Test 6: UPDATE user - PUT /api/users/{id}"""
    print("\n" + "="*80)
    print("TEST 6: UPDATE USER (PUT /api/users/{id})")
    print("="*80)
    
    # Create two users for update tests
    user1_payload = {
        "name": "Test Update User 1",
        "email": "update1@example.com",
        "role_id": valid_role_id,
        "office_id": valid_office_id,
        "phone": "+62822222222"
    }
    
    user2_payload = {
        "name": "Test Update User 2",
        "email": "update2@example.com",
        "role_id": valid_role_id,
        "office_id": valid_office_id
    }
    
    try:
        resp1 = requests.post(f"{BASE_URL}/users", json=user1_payload)
        resp2 = requests.post(f"{BASE_URL}/users", json=user2_payload)
        
        if resp1.status_code != 201 or resp2.status_code != 201:
            print(f"⚠ Failed to create users for UPDATE test")
            return
        
        user1 = resp1.json()
        user2 = resp2.json()
        user1_id = user1.get("id")
        user2_id = user2.get("id")
        
        if user1_id:
            created_users.append(user1_id)
        if user2_id:
            created_users.append(user2_id)
        
        # Test 6a: Update name and phone -> 200
        update_payload = {
            "name": "Updated Name",
            "phone": "+62833333333"
        }
        
        resp = requests.put(f"{BASE_URL}/users/{user1_id}", json=update_payload)
        if resp.status_code != 200:
            log_test("Update user (200)", False, f"Expected 200, got {resp.status_code}")
        else:
            log_test("Update user (200)", True, "User updated successfully")
            
            updated_user = resp.json()
            if updated_user.get("name") != "Updated Name":
                log_test("Update user name applied", False, f"Expected 'Updated Name', got {updated_user.get('name')}")
            else:
                log_test("Update user name applied", True, "Name updated correctly")
        
        # Test 6b: Change email to another user's email -> 409
        conflict_payload = {
            "email": "update2@example.com"  # User2's email
        }
        
        resp = requests.put(f"{BASE_URL}/users/{user1_id}", json=conflict_payload)
        if resp.status_code != 409:
            log_test("Update with conflicting email -> 409", False, f"Expected 409, got {resp.status_code}")
        else:
            log_test("Update with conflicting email -> 409", True, "Conflict detected")
        
        # Test 6c: Change role_id to invalid -> 400
        invalid_role_payload = {
            "role_id": "invalid-role-id-12345"
        }
        
        resp = requests.put(f"{BASE_URL}/users/{user1_id}", json=invalid_role_payload)
        if resp.status_code != 400:
            log_test("Update with invalid role_id -> 400", False, f"Expected 400, got {resp.status_code}")
        else:
            log_test("Update with invalid role_id -> 400", True, "Bad request")
    
    except Exception as e:
        log_test("Update user", False, f"Exception: {e}")


def test_change_password():
    """Test 7: CHANGE PASSWORD - POST /api/users/{id}/change-password"""
    print("\n" + "="*80)
    print("TEST 7: CHANGE PASSWORD (POST /api/users/{id}/change-password)")
    print("="*80)
    
    # Create a user for password change tests
    payload = {
        "name": "Test Password User",
        "email": "testpassword@example.com",
        "role_id": valid_role_id,
        "office_id": valid_office_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload)
        if resp.status_code != 201:
            print(f"⚠ Failed to create user for password test: {resp.status_code}")
            return
        
        user = resp.json()
        user_id = user.get("id")
        if user_id:
            created_users.append(user_id)
        
        # Test 7a: Change password to new password -> 200
        change_payload = {
            "new_password": "NewPass123"
        }
        
        resp = requests.post(f"{BASE_URL}/users/{user_id}/change-password", json=change_payload)
        if resp.status_code != 200:
            log_test("Change password (200)", False, f"Expected 200, got {resp.status_code}: {resp.text}")
        else:
            log_test("Change password (200)", True, "Password changed successfully")
            data = resp.json()
            if not data.get("success"):
                log_test("Change password returns success", False, f"Expected success:true, got {data}")
            else:
                log_test("Change password returns success", True, "success:true")
        
        # Test 7b: Attempt to change back to SAME password -> 400 (no-reuse)
        same_payload = {
            "new_password": "NewPass123"
        }
        
        resp = requests.post(f"{BASE_URL}/users/{user_id}/change-password", json=same_payload)
        if resp.status_code != 400:
            log_test("Change to same password -> 400 (no-reuse)", False, f"Expected 400, got {resp.status_code}")
        else:
            log_test("Change to same password -> 400 (no-reuse)", True, "Password reuse rejected")
        
        # Test 7c: Change to another new password -> 200
        another_payload = {
            "new_password": "AnotherPass456"
        }
        
        resp = requests.post(f"{BASE_URL}/users/{user_id}/change-password", json=another_payload)
        if resp.status_code != 200:
            log_test("Change to another password (200)", False, f"Expected 200, got {resp.status_code}")
        else:
            log_test("Change to another password (200)", True, "Password changed to AnotherPass456")
        
        # Test 7d: For freshly created user, changing to default password should be rejected
        # Create a fresh user
        fresh_payload = {
            "name": "Fresh User",
            "email": "fresh@example.com",
            "role_id": valid_role_id,
            "office_id": valid_office_id
        }
        
        resp = requests.post(f"{BASE_URL}/users", json=fresh_payload)
        if resp.status_code == 201:
            fresh_user = resp.json()
            fresh_user_id = fresh_user.get("id")
            if fresh_user_id:
                created_users.append(fresh_user_id)
            
            # Try to change to default password "bpr2026"
            default_payload = {
                "new_password": "bpr2026"
            }
            
            resp = requests.post(f"{BASE_URL}/users/{fresh_user_id}/change-password", json=default_payload)
            if resp.status_code != 400:
                log_test("Change to default password -> 400 (matches current)", False, f"Expected 400, got {resp.status_code}")
            else:
                log_test("Change to default password -> 400 (matches current)", True, "Default password reuse rejected")
        
        # Test 7e: new_password shorter than 6 chars -> 422
        short_payload = {
            "new_password": "12345"  # Only 5 chars
        }
        
        resp = requests.post(f"{BASE_URL}/users/{user_id}/change-password", json=short_payload)
        if resp.status_code != 422:
            log_test("Short password -> 422", False, f"Expected 422, got {resp.status_code}")
        else:
            log_test("Short password -> 422", True, "Validation error")
    
    except Exception as e:
        log_test("Change password", False, f"Exception: {e}")


def test_reset_password():
    """Test 8: RESET PASSWORD - POST /api/users/{id}/reset-password"""
    print("\n" + "="*80)
    print("TEST 8: RESET PASSWORD (POST /api/users/{id}/reset-password)")
    print("="*80)
    
    # Create a user for reset tests
    payload = {
        "name": "Test Reset User",
        "email": "testreset@example.com",
        "role_id": valid_role_id,
        "office_id": valid_office_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload)
        if resp.status_code != 201:
            print(f"⚠ Failed to create user for reset test: {resp.status_code}")
            return
        
        user = resp.json()
        user_id = user.get("id")
        if user_id:
            created_users.append(user_id)
        
        # Test 8a: Reset password (empty body) -> 200, must_change_password becomes true
        resp = requests.post(f"{BASE_URL}/users/{user_id}/reset-password", json={})
        if resp.status_code != 200:
            log_test("Reset password (empty body) -> 200", False, f"Expected 200, got {resp.status_code}")
        else:
            log_test("Reset password (empty body) -> 200", True, "Password reset successfully")
            
            data = resp.json()
            if not data.get("must_change_password"):
                log_test("Reset password sets must_change_password=true", False, f"Expected true, got {data.get('must_change_password')}")
            else:
                log_test("Reset password sets must_change_password=true", True, "must_change_password is true")
        
        # Test 8b: Reset with custom password -> 200
        custom_reset_payload = {
            "new_password": "CustomReset9"
        }
        
        resp = requests.post(f"{BASE_URL}/users/{user_id}/reset-password", json=custom_reset_payload)
        if resp.status_code != 200:
            log_test("Reset with custom password -> 200", False, f"Expected 200, got {resp.status_code}")
        else:
            log_test("Reset with custom password -> 200", True, "Password reset with custom password")
    
    except Exception as e:
        log_test("Reset password", False, f"Exception: {e}")


def test_soft_delete():
    """Test 9: SOFT DELETE - DELETE /api/users/{id}"""
    print("\n" + "="*80)
    print("TEST 9: SOFT DELETE (DELETE /api/users/{id})")
    print("="*80)
    
    # Create a user to delete
    payload = {
        "name": "Test Delete User",
        "email": "testdelete@example.com",
        "role_id": valid_role_id,
        "office_id": valid_office_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload)
        if resp.status_code != 201:
            print(f"⚠ Failed to create user for delete test: {resp.status_code}")
            return
        
        user = resp.json()
        user_id = user.get("id")
        
        # Test 9a: DELETE user -> 200
        resp = requests.delete(f"{BASE_URL}/users/{user_id}")
        if resp.status_code != 200:
            log_test("Soft delete user (200)", False, f"Expected 200, got {resp.status_code}")
        else:
            log_test("Soft delete user (200)", True, f"User {user_id} soft-deleted")
            
            data = resp.json()
            if not data.get("success"):
                log_test("Soft delete returns success", False, f"Expected success:true, got {data}")
            else:
                log_test("Soft delete returns success", True, "success:true")
        
        # Test 9b: GET /api/users must NOT include deleted user
        resp = requests.get(f"{BASE_URL}/users")
        if resp.status_code == 200:
            users = resp.json()
            deleted_user_in_list = any(u.get("id") == user_id for u in users)
            if deleted_user_in_list:
                log_test("Deleted user NOT in list", False, f"Deleted user {user_id} still appears in list")
            else:
                log_test("Deleted user NOT in list", True, "Deleted user excluded from list")
        
        # Test 9c: GET /api/users/{id} for deleted user -> 404
        resp = requests.get(f"{BASE_URL}/users/{user_id}")
        if resp.status_code != 404:
            log_test("GET deleted user -> 404", False, f"Expected 404, got {resp.status_code}")
        else:
            log_test("GET deleted user -> 404", True, "Deleted user returns 404")
        
        # Test 9d: DELETE already-deleted user -> 404
        resp = requests.delete(f"{BASE_URL}/users/{user_id}")
        if resp.status_code != 404:
            log_test("DELETE already-deleted user -> 404", False, f"Expected 404, got {resp.status_code}")
        else:
            log_test("DELETE already-deleted user -> 404", True, "Already-deleted user returns 404")
        
        # Test 9e: DELETE unknown user -> 404
        resp = requests.delete(f"{BASE_URL}/users/unknown-user-id-12345")
        if resp.status_code != 404:
            log_test("DELETE unknown user -> 404", False, f"Expected 404, got {resp.status_code}")
        else:
            log_test("DELETE unknown user -> 404", True, "Unknown user returns 404")
        
        # Test 9f: Bulk delete users
        # Create 3 users for bulk delete
        bulk_users = []
        for i in range(3):
            bulk_payload = {
                "name": f"Bulk Delete User {i}",
                "email": f"bulkdelete{i}@example.com",
                "role_id": valid_role_id,
                "office_id": valid_office_id
            }
            resp = requests.post(f"{BASE_URL}/users", json=bulk_payload)
            if resp.status_code == 201:
                bulk_user = resp.json()
                bulk_users.append(bulk_user["id"])
        
        if len(bulk_users) == 3:
            resp = requests.post(f"{BASE_URL}/users/bulk-delete", json={"ids": bulk_users})
            if resp.status_code != 200:
                log_test("Bulk delete users", False, f"Expected 200, got {resp.status_code}")
            else:
                data = resp.json()
                if data.get("deleted") != 3:
                    log_test("Bulk delete users", False, f"Expected 3 deleted, got {data.get('deleted')}")
                else:
                    log_test("Bulk delete users", True, f"Bulk deleted {data['deleted']} users")
    
    except Exception as e:
        log_test("Soft delete", False, f"Exception: {e}")


def test_security():
    """Test 10: SECURITY - verify no password/password_history leakage"""
    print("\n" + "="*80)
    print("TEST 10: SECURITY - NO PASSWORD LEAKAGE")
    print("="*80)
    
    # Create a user
    payload = {
        "name": "Test Security User",
        "email": "testsecurity@example.com",
        "role_id": valid_role_id,
        "office_id": valid_office_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload)
        if resp.status_code != 201:
            print(f"⚠ Failed to create user for security test: {resp.status_code}")
            return
        
        user = resp.json()
        user_id = user.get("id")
        if user_id:
            created_users.append(user_id)
        
        # Test all endpoints for password leakage
        endpoints_to_test = [
            ("POST /api/users", "create", user),
            ("GET /api/users", "list", None),
            ("GET /api/users/{id}", "get", None),
            ("PUT /api/users/{id}", "update", None)
        ]
        
        # Check CREATE response
        if "password" in user or "password_history" in user:
            log_test("CREATE endpoint NO password leakage", False, "password or password_history in response")
        else:
            log_test("CREATE endpoint NO password leakage", True, "No password fields in response")
        
        # Check LIST response
        resp = requests.get(f"{BASE_URL}/users")
        if resp.status_code == 200:
            users = resp.json()
            has_leak = any("password" in u or "password_history" in u for u in users)
            if has_leak:
                log_test("LIST endpoint NO password leakage", False, "password or password_history in response")
            else:
                log_test("LIST endpoint NO password leakage", True, "No password fields in response")
        
        # Check GET response
        resp = requests.get(f"{BASE_URL}/users/{user_id}")
        if resp.status_code == 200:
            user_data = resp.json()
            if "password" in user_data or "password_history" in user_data:
                log_test("GET endpoint NO password leakage", False, "password or password_history in response")
            else:
                log_test("GET endpoint NO password leakage", True, "No password fields in response")
        
        # Check UPDATE response
        resp = requests.put(f"{BASE_URL}/users/{user_id}", json={"name": "Updated Security User"})
        if resp.status_code == 200:
            updated_user = resp.json()
            if "password" in updated_user or "password_history" in updated_user:
                log_test("UPDATE endpoint NO password leakage", False, "password or password_history in response")
            else:
                log_test("UPDATE endpoint NO password leakage", True, "No password fields in response")
    
    except Exception as e:
        log_test("Security test", False, f"Exception: {e}")


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
    print("BACKEND API TEST SUITE - USERS MODULE")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    try:
        # Setup: get valid role_id and office_id
        if not setup_test_data():
            print("\n❌ SETUP FAILED: Cannot proceed without valid role_id and office_id")
            sys.exit(1)
        
        # Run all tests sequentially
        test_list_users()
        test_create_user()
        test_validation()
        test_uniqueness()
        test_get_user()
        test_update_user()
        test_change_password()
        test_reset_password()
        test_soft_delete()
        test_security()
        
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
