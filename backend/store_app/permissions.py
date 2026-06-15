from rest_framework import permissions

class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access only to admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'ADMIN')

class IsCustomerUserRole(permissions.BasePermission):
    """
    Allows access only to customer users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'CUSTOMER')

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Allows customers to view/edit their own profiles, but admin has full access.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.role == 'ADMIN':
            return True
            
        # If the object is a CustomUser
        if hasattr(obj, 'role'):
            return obj.id == request.user.id
            
        # If the object is a KhataProfile
        if hasattr(obj, 'user'):
            return obj.user.id == request.user.id
            
        return False
