"""
Test script to verify audit field updates
Run with: python manage.py shell < test_audit_update.py
"""

from candidate.models import Candidate
from django.utils import timezone

print("=" * 50)
print("Testing Audit Field Update")
print("=" * 50)

try:
    # Get the candidate
    candidate = Candidate.objects.get(mobile1="9658752101")
    
    print(f"\n[BEFORE UPDATE]")
    print(f"Name: {candidate.candidate_name}")
    print(f"Updated by: {candidate.updated_by}")
    print(f"Updated at: {candidate.updated_at}")
    
    # Manually update
    candidate.candidate_name = "John Doe_TEST"
    candidate.updated_by = "EMP00052"
    candidate.updated_at = timezone.now()
    
    print(f"\n[SAVING WITH update_fields]")
    candidate.save(update_fields=['candidate_name', 'updated_by', 'updated_at'])
    
    # Refresh from database
    candidate.refresh_from_db()
    
    print(f"\n[AFTER UPDATE - FROM DATABASE]")
    print(f"Name: {candidate.candidate_name}")
    print(f"Updated by: {candidate.updated_by}")
    print(f"Updated at: {candidate.updated_at}")
    
    if candidate.updated_by == "EMP00052":
        print(f"\n✅ SUCCESS! Audit fields updated correctly!")
    else:
        print(f"\n❌ FAILED! updated_by is still: {candidate.updated_by}")
        
except Candidate.DoesNotExist:
    print("❌ Candidate not found with mobile1='9658752101'")
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print("=" * 50)
