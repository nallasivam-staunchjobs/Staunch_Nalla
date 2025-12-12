from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.views import APIView
from django.db import transaction
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate, update_session_auth_hash
from rest_framework.authtoken.models import Token
from django.db import models
import logging
import re

from .models import Employee
from .serializers import EmployeeSerializer
from .permissions import IsOwnerOrReadOnly

logger = logging.getLogger(__name__)

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.filter(del_state=0)
    serializer_class = EmployeeSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticated]  # Only require authentication, no owner check

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]  # Only check for authentication, not ownership

    @transaction.atomic
    def perform_create(self, serializer):
        # Level mapping from frontend UI values to database group names
        level_to_group_mapping = {
            'L1': 'employee',
            'L2': 'tl',
            'L3': 'bm',
            'L4': 'rm',
            'L5': 'ceo'
        }

        # Use phone1 or employeeCode as username since we removed username field
        phone1 = self.request.data.get('phone1')
        employee_code = self.request.data.get('employeeCode')
        password = self.request.data.get('password')
        frontend_level = self.request.data.get('level')  # L1, L2, L3, etc.

        # Convert frontend level to database group name
        group_name = level_to_group_mapping.get(frontend_level, frontend_level)

        # Generate username from phone1 or employeeCode
        username = phone1 or employee_code

        logger.info(f"Creating employee with phone1: {phone1}, employeeCode: {employee_code}, frontend_level: {frontend_level}, group_name: {group_name}")

        if not username or not password:
            raise ValueError("Phone number (phone1) or employee code and password are required.")

        if not frontend_level:
            raise ValueError("Level is required.")

        if not group_name:
            raise ValueError(f"Invalid level '{frontend_level}'. Valid levels are: L1, L2, L3, L4, L5.")

        try:
            # Check if user already exists with this username
            if User.objects.filter(username=username).exists():
                # If phone number is already taken, try with employee code
                if username == phone1 and employee_code:
                    username = employee_code
                    if User.objects.filter(username=username).exists():
                        # If both are taken, append a counter
                        counter = 1
                        original_username = username
                        while User.objects.filter(username=username).exists():
                            username = f"{original_username}_{counter}"
                            counter += 1
                else:
                    # If employee code is taken, append a counter
                    counter = 1
                    original_username = username
                    while User.objects.filter(username=username).exists():
                        username = f"{original_username}_{counter}"
                        counter += 1

            # Create the Django User object and set the password
            logger.info(f"Creating Django User with username: {username}")
            user = User.objects.create_user(username=username, password=password)

            # Set email if provided
            official_email = self.request.data.get('officialEmail')
            if official_email:
                user.email = official_email
                user.save()

            # Add the user to the appropriate group
            group = Group.objects.get(name=group_name)
            user.groups.add(group)
            user.save()

            # Link the Django User to the new Employee instance and ensure level is stored as L1, L2, L3, etc.
            instance = serializer.save(user=user, level=frontend_level)

        except Group.DoesNotExist:
            raise ValueError(f"Database group '{group_name}' for level '{frontend_level}' does not exist. Please check the level field.")
        except Exception as e:
            logger.error(f"Error creating employee: {str(e)}")
            raise ValueError(f"Error creating employee: {str(e)}")

    # Custom update method to handle password changes and level mapping correctly
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        # Level mapping from frontend UI values to database group names
        level_to_group_mapping = {
            'L1': 'employee',
            'L2': 'tl',
            'L3': 'bm',
            'L4': 'rm',
            'L5': 'ceo'
        }

        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        # Check if password is being updated
        new_password = request.data.get('password')
        if new_password:
            # Get the associated Django User and update the password securely
            user_instance = instance.user
            user_instance.set_password(new_password)
            user_instance.save()

            # The serializer should not handle the password field to avoid issues
            request.data.pop('password', None)

        # Check if level is being updated
        frontend_level = request.data.get('level')
        if frontend_level and instance.user:
            group_name = level_to_group_mapping.get(frontend_level, frontend_level)
            try:
                # Remove user from all existing groups
                instance.user.groups.clear()
                # Add user to new group
                group = Group.objects.get(name=group_name)
                instance.user.groups.add(group)
                instance.user.save()
                logger.info(f"Updated user groups: frontend_level={frontend_level}, group_name={group_name}")
            except Group.DoesNotExist:
                raise ValueError(f"Database group '{group_name}' for level '{frontend_level}' does not exist.")

        # Perform the update on the Employee model
        # Ensure level is saved as L1, L2, L3, etc. if it was updated
        if frontend_level:
            self.perform_update(serializer, level=frontend_level)
        else:
            self.perform_update(serializer)

        return Response(serializer.data)

    def perform_update(self, serializer, **kwargs):
        serializer.save(**kwargs)

    @action(detail=False, methods=['post'], url_path='convert-levels')
    def convert_levels(self, request):
        """Convert old level format (employee, tl, bm, rm, ceo) to new format (L1, L2, L3, L4, L5)"""
        # Mapping from old format to new format
        level_conversion = {
            'employee': 'L1',
            'tl': 'L2',
            'bm': 'L3',
            'rm': 'L4',
            'ceo': 'L5'
        }

        updated_count = 0
        conversion_details = []

        # Get all employees with old level format
        for old_level, new_level in level_conversion.items():
            employees = Employee.objects.filter(level=old_level)
            count = employees.count()

            if count > 0:
                # Update all employees with this old level
                employees.update(level=new_level)
                updated_count += count
                conversion_details.append(f'Updated {count} employees from "{old_level}" to "{new_level}"')

        return Response({
            "status": "success",
            "message": f"Successfully converted {updated_count} employee level records!",
            "updated_count": updated_count,
            "details": conversion_details
        })

    @action(detail=False, methods=['get', 'patch'])
    def my_profile(self, request):
        employee = Employee.objects.get(user=request.user)
        if request.method == 'PATCH':
            serializer = EmployeeSerializer(employee, data=request.data, partial=True)
            if serializer.is_valid():
                # Check for password update
                new_password = request.data.get('password')
                if new_password:
                    request.user.set_password(new_password)
                    request.user.save()
                    # After setting the password, update the session hash to prevent logout
                    update_session_auth_hash(request, request.user)

                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = EmployeeSerializer(employee)
        return Response(serializer.data)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """
        GET method for debugging - shows expected request format
        """
        return Response({
            "message": "Login endpoint is working. Use POST method to authenticate.",
            "endpoint": "/api/login/",
            "method": "POST",
            "expected_format": {
                "phone": "9876543210",
                "password": "your_password"
            },
            "alternative_format": {
                "employeeCode": "EMP00001",
                "password": "your_password"
            },
            "content_type": "application/json"
        })

    def post(self, request):
        # Enhanced debugging and error handling
        logger.info(f"Login attempt - Request data type: {type(request.data)}")
        logger.info(f"Login attempt - Request data: {request.data}")

        if not isinstance(request.data, dict):
            return Response(
                {
                    "error": "Invalid data format. Expected a JSON object or form data.",
                    "received_type": str(type(request.data)),
                    "received_data": str(request.data)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Accept phone number or employee code as login identifiers
        phone = request.data.get("phone")
        employee_code = request.data.get("employeeCode")
        password = request.data.get("password")

        # More detailed validation
        login_identifier = phone or employee_code

        if not login_identifier:
            return Response(
                {
                    "error": "Login identifier required. Please provide either 'phone' or 'employeeCode'.",
                    "received_fields": list(request.data.keys()),
                    "expected_fields": ["phone", "employeeCode", "password"]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not password:
            return Response(
                {
                    "error": "Password is required.",
                    "received_fields": list(request.data.keys())
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(f"Login attempt with identifier: {login_identifier[:3]}*** (type: {'phone' if phone else 'employeeCode'})")

        # Find user by different methods
        user = self._find_user_by_identifier(login_identifier, password)

        if user is not None:
            if not user.is_active:
                return Response(
                    {"error": "Account is inactive."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            user_role = user.groups.first().name if user.groups.exists() else "guest"

            # Get firstName and employeeCode from Employee model using user_id relationship
            try:
                employee = Employee.objects.get(user=user)

                if employee.status == "Inactive":
                    return Response(
                        {"error": "Employee is inactive."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )

                first_name = employee.firstName if employee.firstName else user.username.title()
                employee_code = employee.employeeCode if employee.employeeCode else None
                phone_number = employee.phone1 if employee.phone1 else employee.phone2
            except Employee.DoesNotExist:
                # For users without employee records, use a formatted version of username
                first_name = user.username.title()  # Capitalize first letter
                employee_code = None
                phone_number = None

            token, created = Token.objects.get_or_create(user=user)

            return Response(
                {
                    "token": token.key,
                    "firstName": first_name,
                    "employeeCode": employee_code,
                    "phone": phone_number,
                    "role": user_role,
                },
                status=status.HTTP_200_OK,
            )
        else:
            # Enhanced debugging for failed login
            logger.error(f"Login failed for identifier: {login_identifier[:3]}***")

            # Check if employee exists but authentication failed
            try:
                if phone:
                    employee_exists = Employee.objects.filter(
                        models.Q(phone1=phone) | models.Q(phone2=phone),
                        del_state=0
                    ).exists()
                else:
                    employee_exists = Employee.objects.filter(
                        employeeCode=employee_code,
                        del_state=0
                    ).exists()

                if employee_exists:
                    error_msg = "Invalid password"
                else:
                    error_msg = f"Employee not found with {'phone' if phone else 'employee code'}: {login_identifier}"

            except Exception as e:
                error_msg = f"Database error: {str(e)}"
                logger.error(f"Database error during login: {str(e)}")

            return Response(
                {"error": error_msg},
                status=status.HTTP_401_UNAUTHORIZED,
            )

    def _find_user_by_identifier(self, identifier, password):
        """
        Find user by phone number or employee code and authenticate
        """
        user = None

        # Method 1: Try to find user by phone number
        try:
            # Look for employee with matching phone1 or phone2
            employee = Employee.objects.filter(
                models.Q(phone1=identifier) | models.Q(phone2=identifier),
                del_state=0
            ).first()

            if employee and employee.user:
                # Authenticate using the found user's username
                user = authenticate(username=employee.user.username, password=password)
                if user:
                    return user
        except Exception as e:
            logger.error(f"Error finding user by phone: {str(e)}")

        # Method 2: Try to find user by employee code
        try:
            # Look for employee with matching employeeCode
            employee = Employee.objects.filter(
                employeeCode=identifier,
                del_state=0
            ).first()

            if employee and employee.user:
                # Authenticate using the found user's username
                user = authenticate(username=employee.user.username, password=password)
                if user:
                    return user

            # Also try normalized employee code formats
            if not employee:
                normalized_code = identifier.replace('/', '').replace('emp', 'EMP').replace('Emp', 'EMP')
                employee = Employee.objects.filter(
                    employeeCode=normalized_code,
                    del_state=0
                ).first()

                if employee and employee.user:
                    user = authenticate(username=employee.user.username, password=password)
                    if user:
                        return user

        except Exception as e:
            logger.error(f"Error finding user by employee code: {str(e)}")

        return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_employee_info(request):
    """
    Get employee information by employeeCode
    Usage: GET /api/empreg/employee-info/?employeeCode=EMP00001
    Supports multiple formats: EMP00001, Emp/00068, etc.
    """
    employee_code = request.query_params.get('employeeCode')

    if not employee_code:
        return Response(
            {"error": "employeeCode parameter is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Try exact match first
        employee = Employee.objects.get(employeeCode=employee_code, del_state=0)
    except Employee.DoesNotExist:
        # Try different format variations
        try:
            # Handle formats like "Emp/00068" -> try finding "EMP00068" or similar
            normalized_code = employee_code.replace('/', '').replace('emp', 'EMP').replace('Emp', 'EMP')
            employee = Employee.objects.get(employeeCode=normalized_code, del_state=0)
        except Employee.DoesNotExist:
            # Try with EMP prefix for numeric codes like "00110" -> "EMP00110"
            try:
                if employee_code.replace('/', '').isdigit():
                    emp_code = f"EMP{employee_code.replace('/', '').zfill(5)}"
                    employee = Employee.objects.get(employeeCode=emp_code, del_state=0)
                else:
                    raise Employee.DoesNotExist
            except Employee.DoesNotExist:
                # Try firstName lookup for legacy data where firstName was stored instead of employeeCode
                try:
                    # Use filter().first() to handle multiple employees with same firstName
                    employee = Employee.objects.filter(firstName=employee_code, del_state=0).first()
                    if not employee:
                        raise Employee.DoesNotExist
                except Employee.DoesNotExist:
                    # Try partial matching for legacy formats
                    try:
                        # Extract numeric part and try to find similar codes
                        import re
                        numeric_part = re.findall(r'\d+', employee_code)
                        if numeric_part:
                            # Try to find employee codes containing this number
                            possible_employees = Employee.objects.filter(
                                employeeCode__icontains=numeric_part[0],
                                del_state=0
                            )
                            if possible_employees.exists():
                                employee = possible_employees.first()
                            else:
                                return Response(
                                    {"error": f"Employee with code {employee_code} not found"},
                                    status=status.HTTP_404_NOT_FOUND
                                )
                        else:
                            return Response(
                                {"error": f"Employee with code {employee_code} not found"},
                                status=status.HTTP_404_NOT_FOUND
                            )
                    except Exception:
                        return Response(
                            {"error": f"Employee with code {employee_code} not found"},
                            status=status.HTTP_404_NOT_FOUND
                        )

    # Combine firstName and lastName to create fullName
    first_name = employee.firstName or ""
    last_name = employee.lastName or ""
    full_name = f"{first_name} {last_name}".strip()
    
    # If no names available, use employeeCode as fallback
    if not full_name:
        full_name = employee.employeeCode or "Unknown"
    
    return Response({
        "employeeCode": employee.employeeCode,
        "firstName": employee.firstName,
        "lastName": employee.lastName,
        "fullName": full_name,  # Combined first and last name
        "phone1": employee.phone1,
        "phone2": employee.phone2,
        "officialEmail": employee.officialEmail,
        "department": employee.department,
        "position": employee.position,
        "level": employee.level
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])  # Allow unauthenticated access for employee code generation
def get_next_employee_code(request, branch_code):
    """
    Generate the next employee code for a given branch
    Usage: GET /api/empreg/next-employee-code/<branch_code>/
    """
    try:
        # Get the latest employee code for this branch
        latest_employee = Employee.objects.filter(
            employeeCode__startswith=branch_code,
            del_state=0
        ).order_by('-employeeCode').first()

        if latest_employee and latest_employee.employeeCode:
            # Extract the numeric part and increment
            try:
                # Handle formats like "MDU0001", "CBE0002", etc.
                numeric_part = latest_employee.employeeCode.replace(branch_code, '')
                next_number = int(numeric_part) + 1
            except (ValueError, TypeError):
                # If parsing fails, start from 1
                next_number = 1
        else:
            # No employees found for this branch, start from 1
            next_number = 1

        # Format the employee code (e.g., "MDU0001", "CBE0002")
        next_employee_code = f"{branch_code}{next_number:04d}"

        return Response({
            "employeeCode": next_employee_code,
            "branch": branch_code,
            "nextNumber": next_number
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error generating employee code for branch {branch_code}: {str(e)}")
        return Response(
            {"error": f"Failed to generate employee code: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_employee_code(request):
    """
    Generate continuous employee code across all branches with slash format
    Usage: POST /api/empreg/generate-employee-code/
    Body: {"branch": "MDU"} or {"branch": "CBE"}
    Returns: {"employeeCode": "MDU/00126", "nextNumber": 126}
    """
    try:
        import json
        data = json.loads(request.body)
        branch_code = data.get('branch', '').upper()
        
        if not branch_code:
            return Response(
                {"error": "Branch code is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get ALL employee codes from database (across all branches)
        all_employees = Employee.objects.filter(del_state=0).exclude(employeeCode__isnull=True)
        
        max_number = 0
        
        # Extract numeric parts from all employee codes
        for employee in all_employees:
            if employee.employeeCode:
                # Use regex to find all numbers in the employee code
                # Handles formats: MDU/00125, CBE0126, EMP00127, MDU/126, etc.
                numbers = re.findall(r'\d+', employee.employeeCode)
                if numbers:
                    # Get the last (or largest) number found
                    for num_str in numbers:
                        try:
                            num = int(num_str)
                            if num > max_number:
                                max_number = num
                        except ValueError:
                            continue
        
        # Generate next sequential number
        next_number = max_number + 1
        
        # Format: BRANCH/00XXX (e.g., MDU/00126, CBE/00127)
        next_employee_code = f"{branch_code}/{next_number:05d}"
        
        logger.info(f"Generated continuous employee code: {next_employee_code} (max found: {max_number})")
        
        return Response({
            "employeeCode": next_employee_code,
            "branch": branch_code,
            "nextNumber": next_number
        }, status=status.HTTP_200_OK)
        
    except json.JSONDecodeError:
        return Response(
            {"error": "Invalid JSON in request body"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error generating continuous employee code: {str(e)}")
        return Response(
            {"error": f"Failed to generate employee code: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def fix_user_employee_mapping(request):
    """Fix user-employee mapping issues"""
    try:
        user = request.user

        # Check current employee mapping
        try:
            current_employee = Employee.objects.get(user=user)

            # If user is Siva and mapped to wrong employee, fix it
            if 'siva' in user.username.lower() and current_employee.employeeCode == "EMP20254337":
                # Unlink from Nallasivam's record
                current_employee.user = None
                current_employee.save()

                # Create new employee record for Siva
                max_id = Employee.objects.aggregate(max_id=models.Max('id'))['max_id'] or 0
                new_employee_code = f"EMP{(max_id + 1):08d}"

                siva_employee = Employee.objects.create(
                    user=user,
                    firstName="Siva Gokul",
                    employeeCode=new_employee_code
                )

                return Response({
                    "message": "User-employee mapping fixed",
                    "employeeCode": siva_employee.employeeCode,
                    "firstName": siva_employee.firstName
                })

            return Response({
                "message": "No mapping issues found",
                "employeeCode": current_employee.employeeCode,
                "firstName": current_employee.firstName
            })

        except Employee.DoesNotExist:
            # Create employee record for user
            max_id = Employee.objects.aggregate(max_id=models.Max('id'))['max_id'] or 0
            new_employee_code = f"EMP{(max_id + 1):08d}"

            employee = Employee.objects.create(
                user=user,
                firstName=user.username.title(),
                employeeCode=new_employee_code
            )

            return Response({
                "message": "Employee record created",
                "employeeCode": employee.employeeCode,
                "firstName": employee.firstName
            })

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
