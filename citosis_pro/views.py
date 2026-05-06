from django.shortcuts import render

from accounts.establishments import ESTABLISHMENT_OPTIONS


def index(request):
    return render(
        request,
        'citosis/index.html',
        {
            'api_base': '/api',
            'establishment_options': ESTABLISHMENT_OPTIONS,
        },
    )
