package platform

import "testing"

func TestCalculateCommission(t *testing.T) {
	split, err := CalculateCommission(500000, 3000, "KES")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if split.CommissionMinor != 150000 {
		t.Fatalf("commission = %d, want 150000", split.CommissionMinor)
	}
	if split.PlatformMinor != 350000 {
		t.Fatalf("platform = %d, want 350000", split.PlatformMinor)
	}
}

func TestCalculateCommissionRejectsInvalidRate(t *testing.T) {
	if _, err := CalculateCommission(500000, 10001, "KES"); err == nil {
		t.Fatal("expected invalid rate error")
	}
}
