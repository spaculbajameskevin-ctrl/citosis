from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('audit', '0002_datasubmission'),
    ]

    operations = [
        migrations.AddField(
            model_name='datasubmission',
            name='submission_notes',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='datasubmission',
            name='version_number',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AlterField(
            model_name='datasubmission',
            name='status',
            field=models.CharField(
                choices=[('Draft', 'Draft'), ('Pending', 'Pending'), ('Reviewed', 'Reviewed')],
                default='Pending',
                max_length=20,
            ),
        ),
    ]
