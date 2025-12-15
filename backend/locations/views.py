from rest_framework import viewsets, mixins
from .models import State, City
from .serializers import StateSerializer, CitySerializer

class StateViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = State.objects.all().order_by('state')
    serializer_class = StateSerializer

class CityViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = CitySerializer

    def get_queryset(self):
        qs = City.objects.all().order_by('city')
        state_id = self.request.query_params.get('state_id')
        search = self.request.query_params.get('q')
        if state_id:
            qs = qs.filter(state_ids=state_id)
        if search:
            qs = qs.filter(city__icontains=search)
              # Debug info before returning
        print("[DEBUG] [CityViewSet] state_id:", state_id)
        print("[DEBUG] [CityViewSet] search query:", search)
        print("[DEBUG] [CityViewSet] Final SQL:", str(qs.query))
        print("[DEBUG] [CityViewSet] Total results:", qs.count())
        return qs
