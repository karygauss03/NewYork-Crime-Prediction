def get_age_category(age):
    if not age or age <= 0 or age >= 65:
        return "UNKNOWN"
    elif age < 18:
        return "<18"
    elif age >= 18 and age <= 24:
        return "18-24"
    elif age >= 25 and age <= 44:
        return "25-44"
    else:
        return "45-64"

def normalize(feature: str, value: float, min_max_dict: dict):
    liste = min_max_dict[feature]
    return ((value-liste[0])/(liste[1]-liste[0]))

