from rest_framework import serializers
from .models import State, City

class StateSerializer(serializers.ModelSerializer):
    state_id = serializers.IntegerField(source="id", read_only=True)
    
    class Meta:
        model = State
        fields = ["id", "state_id", "state"]

class CitySerializer(serializers.ModelSerializer):
    state_id = serializers.IntegerField(source="state_ids", read_only=True)

    class Meta:
        model = City
        fields = ["id", "city", "state_id", "state"]
