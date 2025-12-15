from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import JobOpening
from .serializers import JobOpeningSerializer

class JobOpeningViewSet(viewsets.ModelViewSet):
    queryset = JobOpening.objects.all()
    serializer_class = JobOpeningSerializer

    def get_queryset(self):
        """
        Optionally filter job openings by various parameters
        """
        queryset = JobOpening.objects.all()

        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Filter by company
        company = self.request.query_params.get('company', None)
        if company is not None:
            queryset = queryset.filter(company_name__icontains=company)

        # Filter by location (state or city)
        location = self.request.query_params.get('location', None)
        if location is not None:
            queryset = queryset.filter(
                Q(state__icontains=location) | Q(city__icontains=location)
            )

        # Filter by skills
        skills = self.request.query_params.get('skills', None)
        if skills is not None:
            skill_list = [skill.strip() for skill in skills.split(',')]
            for skill in skill_list:
                queryset = queryset.filter(skills__icontains=skill)

        return queryset

    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        """
        Search job openings by job title or company name
        Usage: /api/job-openings/search/?term=search_value
        """
        term = request.query_params.get('term', '').strip()

        if not term:
            return Response([])

        # Search in job title and company name
        query = Q(job_title__icontains=term) | Q(company_name__icontains=term)

        job_openings = JobOpening.objects.filter(query)
        serializer = self.get_serializer(job_openings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        """
        Toggle the active status of a job opening
        """
        job_opening = self.get_object()
        job_opening.is_active = not job_opening.is_active
        job_opening.save()

        serializer = self.get_serializer(job_opening)
        return Response({
            'message': f'Job opening {"activated" if job_opening.is_active else "deactivated"} successfully',
            'data': serializer.data
        })

    def perform_create(self, serializer):
        """
        Set created_by field when creating a job opening
        """
        # You can set this from request.user if you have authentication
        serializer.save(created_by=getattr(self.request, 'user', None))

    def perform_update(self, serializer):
        """
        Set updated_by field when updating a job opening
        """
        # You can set this from request.user if you have authentication
        serializer.save(updated_by=getattr(self.request, 'user', None))

    @action(detail=False, methods=['get'], url_path='designations')
    def get_designations(self, request):
        """
        Get distinct designation values from job openings
        Usage: /api/job-openings/designations/
        Returns: [{"value": "Software Engineer", "label": "Software Engineer"}, ...]
        """
        try:
            # Get distinct designations, excluding null/empty values
            designations = JobOpening.objects.filter(
                designation__isnull=False,
                designation__gt=''
            ).values_list('designation', flat=True).distinct().order_by('designation')

            # Format as dropdown options
            designation_options = [
                {"value": designation, "label": designation}
                for designation in designations
            ]

            return Response(designation_options)

        except Exception as e:
            return Response(
                {"error": f"Failed to fetch designations: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
