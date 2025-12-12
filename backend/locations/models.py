from django.db import models

class Country(models.Model):
    id = models.AutoField(db_column='id', primary_key=True)
    name = models.CharField(db_column='countryname', max_length=200)

    class Meta:
        managed = False
        db_table = 'tbl_country'

class State(models.Model):
    id = models.AutoField(db_column='stateid', primary_key=True)
    country = models.CharField(db_column='country', max_length=200)
    state = models.CharField(db_column='state', max_length=200)
    city = models.CharField(db_column='city', max_length=200)
    country_id = models.CharField(db_column='country_id', max_length=200)

    class Meta:
        managed = False
        db_table = 'tbl_state'

class City(models.Model):
    id = models.AutoField(db_column='city_id', primary_key=True)
    city = models.CharField(db_column='city', max_length=255)
    state_ids = models.IntegerField(db_column='state_ids')
    state = models.CharField(db_column='state', max_length=255)

    class Meta:
        managed = False
        db_table = 'tbl_city'
