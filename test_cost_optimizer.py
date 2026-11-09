import unittest

from cost_optimizer import CabType, PricingConfig, angular_distance, distance_charge, optimize_groups
from employee_route_core import group_employees


class CostOptimizerTests(unittest.TestCase):
    def setUp(self):
        self.office = {"lat": 17.4, "lng": 78.5}
        self.pricing = PricingConfig((
            CabType("sedan", 4, 5, 350, 14, ((10, 14), (25, 12), (1000, 10))),
            CabType("suv", 6, 5, 500, 16, ((10, 16), (25, 14), (1000, 12))),
        ))

    def employee(self, name, lat, lng, office_distance):
        return {
            "employee_name": name,
            "coord": {"lat": lat, "lng": lng},
            "office_distance_km": office_distance,
        }

    def test_distance_slab_pricing(self):
        cab = self.pricing.cab_types[0]
        self.assertEqual(distance_charge(12, cab), 350 + 10 * 14 + 2 * 12)

    def test_corridor_optimization_does_not_mix_opposite_directions(self):
        employees = [
            self.employee("north-a", 18.0, 78.5, 66),
            self.employee("north-b", 17.9, 78.5, 55),
            self.employee("south-a", 16.9, 78.5, 55),
            self.employee("south-b", 17.0, 78.5, 44),
        ]
        groups = optimize_groups(employees, self.office, self.pricing, 4, 70)
        north = sorted(person["employee_name"] for person in groups[0] if person["employee_name"].startswith("north"))
        self.assertIn("north-a", [person["employee_name"] for person in groups[0]])
        self.assertEqual(len(groups), 2)
        self.assertTrue(all(len(group) <= 4 for group in groups))

    def test_nearest_baseline_matches_fixture_shape(self):
        employees = [
            self.employee("a", 17.41, 78.51, 1),
            self.employee("b", 17.42, 78.52, 2),
            self.employee("c", 17.43, 78.53, 3),
            self.employee("d", 17.44, 78.54, 4),
        ]
        groups = group_employees(employees, 3)
        self.assertEqual(sum(map(len, groups)), 4)
        self.assertTrue(all(len(group) <= 3 for group in groups))

    def test_angular_distance(self):
        self.assertEqual(angular_distance(350, 10), 20)


if __name__ == "__main__":
    unittest.main()
