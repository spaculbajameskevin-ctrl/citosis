DEFAULT_ESTABLISHMENT_OPTIONS = (
    'Adlaw Diversified Agri-Farm',
    'Capistrano Farm Resort',
    'Anpas Farm',
    'PICOS',
    'Dr. Basket',
    "El Ublo's Resort",
    'Nasuli Spring Resort',
    'Kaamulan Zoo',
    'Hauz Malibu',
    'Bom-Bom Hotel',
    'Kaamulan Suites',
    'Garden Suites',
    "Luisita's Suites",
    'Bukidnon Suites',
    'Yellow Petals',
    'Nomiarc',
    'Sildimco',
    'Abbey of Transfiguration',
    'Balay Ha Buksu',
    'Malaybalay Air BNB',
    'Villa Alemania Inn',
    'Plaza Park Inn',
    'OHfath Inn',
    'Bukidnon Fine Traveller Inn',
    'Mailaz Lodging',
    'Jaymond Lodge',
    'IMK Lodging Lodge',
    'A & L Visitors',
    'Waterpool Microtel',
    "Loiza's Pavilion",
    'Veranda',
    '1st Avenue Apartel',
    'Green Ridge Apartel',
    'JB Apartelle',
    'Dorf Transient Inn',
    'Ped Xing Transient',
    'Plaza View Tourist Inn',
    "0' Suites",
    'Bukidnon Breeze',
)

ESTABLISHMENT_OPTIONS = DEFAULT_ESTABLISHMENT_OPTIONS
ESTABLISHMENT_OPTION_SET = frozenset(DEFAULT_ESTABLISHMENT_OPTIONS)


def get_establishment_options():
    from django.db.utils import OperationalError, ProgrammingError

    from accounts.models import Establishment

    try:
        names = list(Establishment.objects.values_list('name', flat=True).order_by('name'))
    except (OperationalError, ProgrammingError):
        return DEFAULT_ESTABLISHMENT_OPTIONS
    return tuple(names or DEFAULT_ESTABLISHMENT_OPTIONS)


def is_known_establishment(name):
    normalized = str(name or '').strip()
    if not normalized:
        return False
    if normalized in ESTABLISHMENT_OPTION_SET:
        return True

    from django.db.utils import OperationalError, ProgrammingError

    from accounts.models import Establishment

    try:
        return Establishment.objects.filter(name__iexact=normalized).exists()
    except (OperationalError, ProgrammingError):
        return False
