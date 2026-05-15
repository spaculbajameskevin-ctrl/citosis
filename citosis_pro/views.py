from django.shortcuts import render

from accounts.establishments import get_establishment_options


def index(request):
    return render(
        request,
        'citosis/index.html',
        {
            'api_base': '/api',
            'establishment_options': get_establishment_options(),
        },
    )
