from rest_framework.pagination import PageNumberPagination

class OptionalPageNumberPagination(PageNumberPagination):
    """
    Custom pagination class that only paginates querysets if the 'page' or 'page_size' 
    parameter is present in the query parameters. Otherwise, it returns the plain, 
    unpaginated list to preserve backward compatibility.
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        if 'page' not in request.query_params and 'page_size' not in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)
