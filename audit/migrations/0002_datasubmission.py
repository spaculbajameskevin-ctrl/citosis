from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('audit', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DataSubmission',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('file', models.FileField(upload_to='data_submissions/')),
                ('original_filename', models.CharField(max_length=255)),
                ('sheet_name', models.CharField(blank=True, max_length=255)),
                ('headers', models.JSONField(blank=True, default=list)),
                ('preview_rows', models.JSONField(blank=True, default=list)),
                ('total_rows', models.PositiveIntegerField(default=0)),
                ('total_columns', models.PositiveIntegerField(default=0)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Reviewed', 'Reviewed')], default='Pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('submitted_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='data_submissions', to='accounts.user')),
            ],
            options={
                'db_table': 'data_submissions',
                'ordering': ['-created_at', '-id'],
            },
        ),
    ]
